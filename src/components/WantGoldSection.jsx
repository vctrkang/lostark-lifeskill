export default function WantGoldSection({ results }) {
  const ready = results.filter(r => r.hasSufficientData);
  if (ready.length === 0) return null;

  // Craft+sell value is identical for all skills (same fusion price, output, and fee)
  // = sellRevenue - CRAFT_GOLD_COST (mats assumed free since you farmed them)
  const craftAndSell = Math.round(ready[0].profitFromCrafting + ready[0].matCost);
  const outputCount = Math.round(ready[0].expectedOutput);

  // Rank by best achievable gold: whichever is higher — sell raw or craft+sell
  const haveMatsRanked = [...ready]
    .map(r => {
      const sellRaw = Math.round(r.rawSellValue);
      const shouldCraft = sellRaw < craftAndSell;
      return { ...r, sellRaw, shouldCraft, bestGold: Math.max(sellRaw, craftAndSell) };
    })
    .sort((a, b) => b.bestGold - a.bestGold);

  // Rank by net profit when buying mats, crafting, and selling fusion
  const haveGoldRanked = [...ready]
    .map(r => ({ ...r, profit: Math.round(r.profitFromCrafting) }))
    .sort((a, b) => b.profit - a.profit);

  const fmt = v => Math.abs(v).toLocaleString();

  return (
    <div className="buy-summary">
      <div className="have-summary-header">
        <span className="buy-summary-title">I want Gold</span>
      </div>

      {/* Sub-section A: Have mats (farmed) */}
      <div className="goal-sub">
        <div className="goal-sub-header">
          <span className="goal-sub-label">If you have mats</span>
        </div>
        <div className="summary-ref-row">
          <span className="summary-ref-label">Craft + sell fusion (×{outputCount})</span>
          <span className="summary-ref-val">{craftAndSell.toLocaleString()}g</span>
        </div>
        <div className="have-rank-col-headers">
          <span /><span /><span>Sell raw</span><span>vs craft</span>
        </div>
        <div className="buy-rank-list">
          {haveMatsRanked.map((r, i) => {
            const delta = r.sellRaw - craftAndSell;
            return (
              <div key={r.skillId} className="have-rank-row">
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

      {/* Sub-section B: Have gold to invest */}
      <div className="goal-sub">
        <div className="goal-sub-header">
          <span className="goal-sub-label">If you have gold</span>
          <span className="goal-sub-ref">buy mats → craft → sell fusion (×{outputCount})</span>
        </div>
        <div className="have-rank-col-headers">
          <span /><span /><span>Net profit</span><span />
        </div>
        <div className="buy-rank-list">
          {haveGoldRanked.map((r, i) => (
            <div key={r.skillId} className={`have-rank-row ${r.profit <= 0 ? 'row-dim' : ''}`}>
              <span className="buy-rank-pos">{i + 1}</span>
              <span className="buy-rank-name">{r.skillName}</span>
              <span className={`have-rank-val ${r.profit > 0 ? 'have-winner' : 'val-loss'}`}>
                {r.profit > 0 ? '+' : '-'}{fmt(r.profit)}g
              </span>
              <span className={`goal-tag ${r.profit > 0 ? 'tag-profit' : 'tag-loss'}`}>
                {r.profit > 0 ? 'profit' : 'loss'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
