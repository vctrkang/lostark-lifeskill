import { useState, useEffect } from 'react';
import { SKILLS, CRAFT_GOLD_COST } from './data/recipes';
import { calcSkill } from './utils/calculations';
import ScreenshotUploader from './components/ScreenshotUploader';
import WindowCapture from './components/WindowCapture';
import PriceTable from './components/PriceTable';
import WantGoldSection from './components/WantGoldSection';
import WantFusionSection from './components/WantFusionSection';
import './App.css';

export default function App() {
  const [prices, setPrices] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lifeskill_prices') || '{}'); }
    catch { return {}; }
  });
  const [timestamps, setTimestamps] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lifeskill_timestamps') || '{}'); }
    catch { return {}; }
  });
  const [greatSuccess, setGreatSuccess] = useState('');
  const [craftReduction, setCraftReduction] = useState('');
  const [rawText, setRawText] = useState('');
  const [debugCrops, setDebugCrops] = useState([]);
  const [showLog, setShowLog] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    localStorage.setItem('lifeskill_prices', JSON.stringify(prices));
  }, [prices]);

  useEffect(() => {
    localStorage.setItem('lifeskill_timestamps', JSON.stringify(timestamps));
  }, [timestamps]);

  const handleClearPrices = () => {
    setPrices({});
    setTimestamps({});
    localStorage.removeItem('lifeskill_prices');
    localStorage.removeItem('lifeskill_timestamps');
    setLastUpdated(null);
  };

  const handlePriceChange = (id, value) => {
    const now = Date.now();
    setPrices(prev => ({ ...prev, [id]: value }));
    setTimestamps(prev => ({ ...prev, [id]: value != null ? now : null }));
  };

  const handlePricesExtracted = (extractedPrices, raw, crops = [], label = 'Scan') => {
    const now = Date.now();
    setPrices(prev => {
      const merged = { ...prev };
      for (const [id, price] of Object.entries(extractedPrices)) {
        if (price > 0) merged[id] = price;
      }
      return merged;
    });
    setTimestamps(prev => {
      const merged = { ...prev };
      for (const [id, price] of Object.entries(extractedPrices)) {
        if (price > 0) merged[id] = now;
      }
      return merged;
    });
    const header = `=== ${label} @ ${new Date().toLocaleTimeString()} ===`;
    setRawText(prev => prev ? `${header}\n${raw}\n\n${prev}` : `${header}\n${raw}`);
    setDebugCrops(prev => {
      const merged = Object.fromEntries(prev.map(c => [c.matId, c]));
      for (const crop of crops) merged[crop.matId] = crop;
      return Object.values(merged);
    });
    if (Object.keys(extractedPrices).some(id => extractedPrices[id] > 0)) {
      setLastUpdated(Date.now());
    }
  };

  const gsRate = greatSuccess === '' ? 0 : Number(greatSuccess) / 100;
  const reductionRate = craftReduction === '' ? 0 : Number(craftReduction) / 100;
  const results = SKILLS.map(skill => calcSkill(skill, prices, gsRate, reductionRate));

  return (
    <div className="app">
      <header className="app-header">
        <h1>Life Skill Efficiency Calculator</h1>
        <p className="subtitle">
          Determine when it&apos;s worth crafting Abidos Fusion Materials
        </p>
      </header>

      <main>
        <section className="controls-section">
          <div className="global-controls">
            <div className="control-group">
              <label htmlFor="gs-input">Great Success Chance (%)</label>
              <input
                id="gs-input"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={greatSuccess}
                placeholder="0"
                onChange={e => setGreatSuccess(e.target.value)}
              />
              {greatSuccess !== '' && Number(greatSuccess) > 0 && (
                <span className="gs-hint">
                  → avg {(1 + Number(greatSuccess) / 100).toFixed(2)}x output per craft
                </span>
              )}
            </div>
            <div className="control-group">
              <label htmlFor="craft-reduction-input">Craft Cost Reduction (%)</label>
              <input
                id="craft-reduction-input"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={craftReduction}
                placeholder="0"
                onChange={e => setCraftReduction(e.target.value)}
              />
              {craftReduction !== '' && Number(craftReduction) > 0 && (
                <span className="gs-hint">
                  → {Math.round(CRAFT_GOLD_COST * (1 - Number(craftReduction) / 100))}g craft fee
                </span>
              )}
            </div>
          </div>

          <div className="capture-row">
            <ScreenshotUploader onPricesExtracted={handlePricesExtracted} />
            <WindowCapture onPricesExtracted={handlePricesExtracted} />
          </div>

          {rawText && (
            <div className="ocr-debug">
              <button className="btn-link" onClick={() => setShowLog(v => !v)}>
                {showLog ? 'Hide' : 'Show'} detection log
              </button>
              {showLog && (
                <>
                  <pre className="ocr-raw">{rawText}</pre>
                  {debugCrops.length > 0 && (
                    <div className="ocr-crops-grid">
                      {debugCrops.map(({ matId, dataUrl, raw, price }) => (
                        <div key={matId} className={`ocr-crop-card ${price === null ? 'crop-fail' : ''}`}>
                          <div className="crop-label">{matId}</div>
                          <img className="crop-img" src={dataUrl} alt={matId} />
                          <div className="crop-raw">
                            raw: <span>{raw || '(empty)'}</span>
                            {' → '}
                            <span className={price === null ? 'crop-price-fail' : 'crop-price-ok'}>
                              {price ?? 'FAIL'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        <div className="main-columns">
          <section className="prices-section">
            <div className="prices-header">
              <h2>Prices</h2>
              {lastUpdated && (
                <span className="prices-updated">
                  last updated {new Date(lastUpdated).toLocaleTimeString()}
                </span>
              )}
              {Object.keys(prices).length > 0 && (
                <button className="btn-clear-prices" onClick={handleClearPrices}>
                  Clear all
                </button>
              )}
            </div>
            <PriceTable prices={prices} timestamps={timestamps} onPriceChange={handlePriceChange} debugCrops={debugCrops} />
          </section>

          <section className="results-section">
            <WantGoldSection results={results} />
            <WantFusionSection results={results} />
          </section>
        </div>
      </main>
    </div>
  );
}
