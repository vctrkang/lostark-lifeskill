import { useState, useCallback, useEffect } from 'react';
import { extractPricesFromImage } from '../utils/recognition';

export default function ScreenshotUploader({ onPricesExtracted }) {
  const [dragging, setDragging] = useState(false);
  // screenshots: [{ url, name, status: 'processing'|'done'|'error', progress }]
  const [screenshots, setScreenshots] = useState([]);

  const processFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return;

    const url = URL.createObjectURL(file);
    const id = url; // use object URL as stable key

    setScreenshots(prev => [...prev, { id, url, name: file.name || 'screenshot', status: 'processing', progress: 0 }]);

    try {
      const { prices, rawText, debugCrops } = await extractPricesFromImage(file, (pct) => {
        setScreenshots(prev => prev.map(s => s.id === id ? { ...s, progress: pct } : s));
      });
      setScreenshots(prev => prev.map(s => s.id === id ? { ...s, status: 'done', progress: 100 } : s));
      onPricesExtracted(prices, rawText, debugCrops, file.name);
    } catch (err) {
      console.error('extractPricesFromImage failed:', err);
      setScreenshots(prev => prev.map(s => s.id === id ? { ...s, status: 'error' } : s));
    }
  }, [onPricesExtracted]);

  const processFiles = useCallback((files) => {
    Array.from(files).forEach(f => processFile(f));
  }, [processFile]);

  useEffect(() => {
    const onPaste = (e) => {
      const items = Array.from(e.clipboardData?.items ?? []).filter(i => i.type.startsWith('image/'));
      items.forEach(i => processFile(i.getAsFile()));
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [processFile]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  };

  const removeScreenshot = (id) => {
    setScreenshots(prev => prev.filter(s => s.id !== id));
  };

  const processing = screenshots.some(s => s.status === 'processing');

  return (
    <div className="uploader-section">
      <div
        className={`drop-zone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById('screenshot-input').click()}
      >
        <input
          id="screenshot-input"
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files.length) processFiles(e.target.files); e.target.value = ''; }}
        />
        {processing ? (
          <span className="upload-hint">Processing... add more or wait</span>
        ) : screenshots.length > 0 ? (
          <span className="upload-hint done">✓ Done — drop, paste, or click to add more</span>
        ) : (
          <span className="upload-hint">Drop, paste (Ctrl+V), or click to browse</span>
        )}
      </div>

      {screenshots.length > 0 && (
        <div className="screenshot-list">
          {screenshots.map(s => (
            <div key={s.id} className={`screenshot-thumb ${s.status}`}>
              <img src={s.url} alt={s.name} />
              <div className="thumb-overlay">
                {s.status === 'processing' && (
                  <div className="thumb-progress">
                    <div className="spinner small" />
                    <span>{s.progress}%</span>
                  </div>
                )}
                {s.status === 'done' && <span className="thumb-status done">✓</span>}
                {s.status === 'error' && <span className="thumb-status error">✗</span>}
              </div>
              <button
                className="thumb-remove"
                onClick={(e) => { e.stopPropagation(); removeScreenshot(s.id); }}
                title="Remove"
              >×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
