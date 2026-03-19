import { useState, useRef, useCallback } from 'react';
import { extractPricesFromCanvas } from '../utils/recognition';

const CAPTURE_INTERVAL_MS = 2000; // capture every 2s regardless of OCR time

export default function WindowCapture({ onPricesExtracted }) {
  const [capturing, setCapturing] = useState(false);
  const [status, setStatus] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));
  const intervalRef = useRef(null);
  const processingRef = useRef(false); // drop frame if OCR is still running

  const processFrame = useCallback(async () => {
    if (processingRef.current) return; // drop — still processing last frame

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || video.videoWidth === 0) return; // no valid frame yet

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    processingRef.current = true;
    setStatus('scanning...');
    try {
      const { prices, rawText, debugCrops } = await extractPricesFromCanvas(canvas);
      const count = Object.keys(prices).length;
      setStatus(count > 0 ? `found ${count} price${count !== 1 ? 's' : ''}` : 'no match');
      onPricesExtracted(prices, rawText, debugCrops, 'Live Capture');
    } catch {
      setStatus('error');
    } finally {
      processingRef.current = false;
    }
  }, [onPricesExtracted]);

  const stopCapture = useCallback(() => {
    clearInterval(intervalRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    videoRef.current = null;
    processingRef.current = false;
    setCapturing(false);
    setStatus('');
  }, []);

  const startCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });

      const video = document.createElement('video');
      video.srcObject = stream;

      // Wait for the stream to have actual frame dimensions before starting
      await new Promise((resolve) => {
        video.onloadedmetadata = () => video.play().then(resolve);
      });

      videoRef.current = video;
      streamRef.current = stream;
      stream.getVideoTracks()[0].addEventListener('ended', stopCapture);

      setCapturing(true);
      // Fixed-interval capture — drops frames while OCR is busy
      intervalRef.current = setInterval(processFrame, CAPTURE_INTERVAL_MS);
      processFrame(); // kick off first scan immediately
    } catch (e) {
      if (e.name !== 'NotAllowedError') console.error(e);
    }
  };

  return (
    <div className="window-capture">
      {!capturing ? (
        <button className="btn-capture" onClick={startCapture}>
          Start Live Capture
        </button>
      ) : (
        <div className="capture-active">
          <span className="capture-dot" />
          <span className="capture-live">Live</span>
          <span className="capture-status">{status}</span>
          <button className="btn-stop" onClick={stopCapture}>Stop</button>
        </div>
      )}
    </div>
  );
}
