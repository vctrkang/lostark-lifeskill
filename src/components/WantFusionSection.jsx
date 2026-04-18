export default function WantFusionSection({ results, fusionCount }) {
  const ready = results.filter(r => r.hasSufficientData);
  if (ready.length === 0) return null;

  const count = Math.min(400, Math.max(10, Number(fusionCount) || 400));
  const fusionPrice = ready[0].fusionPrice;
  const totalBuyPrice = Math.round(fusionPrice * count);

  const ranked = [...ready]
    .map(r => ({ ...r, totalCraftCost: Math.round(r.costPerFusionViaCraft * count) }))
    .sort((a, b) => a.totalCraftCost - b.totalCraftCost);

  const fmt = v => v.toLocaleString();

  return (
    <div className="section-card">
      <div className="section-header-card accent">
        <div className="section-eyebrow accent">Fusion Material</div>
        <div className="section-title">Cheapest way to acquire {count} fusions</div>
        <div className="section-desc">Compare crafting cost against buying directly from the market.</div>
      </div>

      <div className="summary-ref-row">
        <div className="summary-ref-label-group">
          <span className="summary-ref-label">Baseline — buy {count} fusions directly</span>
          <span className="summary-ref-sub">Market price × {count}</span>
        </div>
        <span className="summary-ref-val">{fmt(totalBuyPrice)}g</span>
      </div>

      <div className="rank-table">
        <div className="have-rank-col-headers">
          <span /><span /><span>Craft cost</span><span>Savings</span>
        </div>
        <div className="buy-rank-list">
          {ranked.map((r, i) => {
            const cheaper = r.totalCraftCost < totalBuyPrice;
            const delta = totalBuyPrice - r.totalCraftCost;
            return (
              <div key={r.skillId} className={`have-rank-row ${cheaper ? 'row-win' : 'row-loss'}`}>
                <span className="buy-rank-pos">{i + 1}</span>
                <span className="buy-rank-name">{r.skillName}</span>
                <span className={`have-rank-val ${cheaper ? 'have-winner' : 'have-loser'}`}>
                  {fmt(r.totalCraftCost)}g
                </span>
                <span className={`have-rank-delta ${delta > 0 ? 'delta-profit' : 'delta-loss'}`}>
                  {delta === 0 ? '—' : `${delta > 0 ? '+' : '-'}${Math.abs(delta).toLocaleString()}g`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
