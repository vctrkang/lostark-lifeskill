export default function WantFusionSection({ results }) {
  const ready = results.filter(r => r.hasSufficientData);
  if (ready.length === 0) return null;

  const fusionPrice = ready[0].fusionPrice;

  const ranked = [...ready]
    .map(r => ({ ...r, costPerFusion: Math.round(r.costPerFusionViaCraft) }))
    .sort((a, b) => a.costPerFusion - b.costPerFusion);

  const fmt = v => v.toLocaleString();

  return (
    <div className="buy-summary">
      <div className="have-summary-header">
        <span className="buy-summary-title">I want Fusion Material</span>
      </div>

      <div className="summary-ref-row">
        <span className="summary-ref-label">Buy direct from market</span>
        <span className="summary-ref-val">{fmt(fusionPrice)}g / fusion</span>
      </div>

      <div className="have-rank-col-headers">
        <span /><span /><span>Buy &amp; craft / fusion</span><span>vs direct</span>
      </div>
      <div className="buy-rank-list">
        {ranked.map((r, i) => {
          const cheaper = r.costPerFusion < fusionPrice;
          const delta = fusionPrice - r.costPerFusion;
          return (
            <div key={r.skillId} className="have-rank-row">
              <span className="buy-rank-pos">{i + 1}</span>
              <span className="buy-rank-name">{r.skillName}</span>
              <span className={`have-rank-val ${cheaper ? 'have-winner' : 'have-loser'}`}>
                {fmt(r.costPerFusion)}g
              </span>
              <span className="have-rank-delta">
                {delta === 0 ? '—' : `${delta > 0 ? '+' : '-'}${Math.abs(delta).toLocaleString()}g`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
