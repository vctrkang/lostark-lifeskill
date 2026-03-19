import { SKILLS, FUSION } from '../data/recipes';

function relativeTime(ts) {
  if (!ts) return null;
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function confidenceLevel(score) {
  if (score >= 0.90) return 'high';
  if (score >= 0.70) return 'mid';
  return 'low';
}


function PriceInput({ id, label, icon, value, timestamp, onChange, crop }) {
  const age = relativeTime(timestamp);
  return (
    <div className="price-row">
      <label htmlFor={id}>
        {icon && <span className={`mat-icon ${icon}`} />}
        {label}
      </label>
      <div className="price-input-wrap">
        {age && <span className="price-age">{age}</span>}
        <span className="price-input-inner">
          <input
            id={id}
            type="number"
            min="0"
            step="1"
            value={value ?? ''}
            placeholder="—"
            onChange={(e) => onChange(id, e.target.value === '' ? null : Number(e.target.value))}
          />
          <span className={crop ? `conf-dot conf-${confidenceLevel(crop.ocrConf ?? 0)}` : 'conf-dot conf-empty'}>
            {crop && (
              <span className="conf-tooltip">
                <img className="price-crop-thumb" src={crop.dataUrl} alt="scan" />
              </span>
            )}
          </span>
        </span>
      </div>
    </div>
  );
}

export default function PriceTable({ prices, timestamps, onPriceChange, debugCrops = [] }) {
  const cropByMatId = Object.fromEntries(debugCrops.map(c => [c.matId, c]));

  return (
    <div className="price-table">
      <div className="price-section fusion-section">
        <h3><span className="mat-icon">{FUSION.icon}</span> Fusion Material</h3>
        <PriceInput
          id={FUSION.id}
          label={FUSION.name}
          value={prices[FUSION.id]}
          timestamp={timestamps[FUSION.id]}
          onChange={onPriceChange}
          crop={cropByMatId[FUSION.id]}
        />
      </div>

      <div className="skills-grid">
        {SKILLS.map(skill => (
          <div key={skill.id} className="price-section">
            <h3><span className="mat-icon">{skill.icon}</span> {skill.name}</h3>
            {skill.materials.map((mat, i) => (
              <PriceInput
                key={mat.id}
                id={mat.id}
                icon={['mat-tier-blue', 'mat-tier-green', 'mat-tier-grey'][i]}
                label={mat.name}
                value={prices[mat.id]}
                timestamp={timestamps[mat.id]}
                onChange={onPriceChange}
                crop={cropByMatId[mat.id]}
              />
            ))}
            <div className="bundle-note">Price entered per bundle of 100 units</div>
          </div>
        ))}
      </div>
    </div>
  );
}
