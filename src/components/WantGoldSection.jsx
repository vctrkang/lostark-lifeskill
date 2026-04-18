export default function WantGoldSection({ results, fusionCount }) {
  const ready = results.filter(r => r.hasSufficientData);
  if (ready.length === 0) return null;

  const count = Math.min(400, Math.max(10, Number(fusionCount) || 400));
  const scale = count / ready[0].expectedOutput;
  const fusionPrice = ready[0].fusionPrice;

  // Section 1: Life Skill Energy Use — sell raw vs craft-and-sell baseline
  const craftAndSell = Math.round((ready[0].profitFromCrafting + ready[0].matCost) * scale);
  const haveMatsRanked = [...ready]
    .map(r => {
      const sellRaw = Math.round(r.rawSellValue * scale);
      return { ...r, sellRaw, shouldCraft: sellRaw < craftAndSell };
    })
    .sort((a, b) => b.sellRaw - a.sellRaw);

  // Section 2: Material Flipping — buy mats, craft, sell fusion
  // Baseline is sell-side revenue: what you earn from selling N fusions after market tax.
  // Each row's craft cost vs this baseline gives the actual profit/loss directly.
  const MARKET_TAX = 0.05;
  const flipBaseline = Math.round(fusionPrice * count * (1 - MARKET_TAX));
  const haveGoldRanked = [...ready]
    .map(r => ({
      ...r,
      totalCraftCost: Math.round(r.costPerFusionViaCraft * count),
      profit: Math.round(r.profitFromCrafting * scale),
    }))
    .sort((a, b) => b.profit - a.profit);

  const fmt = v => Math.abs(v).toLocaleString();

  return (
    <div className="gold-sections-grid">

      {/* ── Life Skill Energy Use (amber) ── */}
      <div className="section-card">
        <div className="section-header-card amber">
          <div className="section-eyebrow amber">Life Skill Energy Use</div>
          <div className="section-title">Sell raw vs craft into fusion</div>
          <div className="section-desc">Compare raw sell value of your mats against the craft-and-sell baseline.</div>
        </div>

        <div className="summary-ref-row">
          <div className="summary-ref-label-group">
            <span className="summary-ref-label">Baseline — craft and sell {count} fusions</span>
            <span className="summary-ref-sub">Sell revenue − craft fee</span>
          </div>
          <span className="summary-ref-val">{craftAndSell.toLocaleString()}g</span>
        </div>

        <div className="rank-table">
          <div className="have-rank-col-headers">
            <span /><span /><span>Raw sell</span><span>vs craft</span>
          </div>
          <div className="buy-rank-list">
            {haveMatsRanked.map((r, i) => {
              const delta = r.sellRaw - craftAndSell;
              return (
                <div key={r.skillId} className={`have-rank-row ${delta > 0 ? 'row-win' : 'row-loss'}`}>
                  <span className="buy-rank-pos">{i + 1}</span>
                  <span className="buy-rank-name">{r.skillName}</span>
                  <span className={`have-rank-val ${!r.shouldCraft ? 'have-winner' : 'have-loser'}`}>
                    {r.sellRaw.toLocaleString()}g
                  </span>
                  <span className="have-rank-delta">
                    {delta === 0 ? '—' : `${delta > 0 ? '+' : '-'}${fmt(delta)}g`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Material Flipping (emerald) ── */}
      <div className="section-card">
        <div className="section-header-card emerald">
          <div className="section-eyebrow emerald">Material Flipping</div>
          <div className="section-title">Buy mats, craft fusion, resell</div>
          <div className="section-desc">Profit after mat purchase cost and crafting fee.</div>
        </div>

        <div className="summary-ref-row">
          <div className="summary-ref-label-group">
            <span className="summary-ref-label">Revenue — sell {count} fusions</span>
            <span className="summary-ref-sub">Market price × {count} after 5% tax</span>
          </div>
          <span className="summary-ref-val">{flipBaseline.toLocaleString()}g</span>
        </div>

        <div className="rank-table">
          <div className="have-rank-col-headers">
            <span /><span /><span>Total cost</span><span>Profit</span>
          </div>
          <div className="buy-rank-list">
            {haveGoldRanked.map((r, i) => (
              <div key={r.skillId} className={`have-rank-row ${r.profit > 0 ? 'row-win' : 'row-loss'}`}>
                <span className="buy-rank-pos">{i + 1}</span>
                <span className="buy-rank-name">{r.skillName}</span>
                <span className={`have-rank-val ${r.profit > 0 ? 'have-winner' : 'have-loser'}`}>
                  {r.totalCraftCost.toLocaleString()}g
                </span>
                <span className={`have-rank-delta ${r.profit > 0 ? 'delta-profit' : 'delta-loss'}`}>
                  {r.profit > 0 ? '+' : '-'}{fmt(r.profit)}g
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
