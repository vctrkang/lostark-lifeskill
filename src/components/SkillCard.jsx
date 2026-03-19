import { SKILLS } from '../data/recipes';

export default function SkillCard({ result, mode, ownedMats, setOwnedMats, expanded, setExpanded, cheapestMarketPerBatch, swapTargetLabel }) {
  const skillDef = SKILLS.find(s => s.id === result.skillId);
  const isExpanded = expanded[result.skillId] ?? false;
  const { expectedOutput } = result;

  const batches = skillDef
    ? Math.min(...skillDef.materials.map(mat => (parseFloat(ownedMats[mat.id]) || 0) / (mat.qty * 1000)))
    : 0;
  const safeBatches = isFinite(batches) && batches > 0 ? batches : 0;
  const totalFusion = Math.round(expectedOutput * safeBatches);

  const fmt = v => Math.abs(Math.round(v)).toLocaleString();

  // Gold
  // Per craft: gold from selling exactly 33/45/86 units worth of mats
  const craftAndSellGold = Math.round(result.profitFromCrafting + result.matCost);
  const rawSellGold = Math.round(result.rawSellValue);
  const goldCraftWins = craftAndSellGold >= rawSellGold;

  // Fusion (no owned)
  const craftCostPerFusion = Math.round(result.costPerFusionViaCraft);
  const buyDirectPerFusion = Math.round(result.fusionPrice);
  const buyCraftWins = craftCostPerFusion <= buyDirectPerFusion;

  // Fusion (owned)
  const craftFeePerBatch = result.craftCost - result.matCost;
  const sellAndSwapPerBatch = cheapestMarketPerBatch - result.rawSellValue;
  const ownedCraftWins = craftFeePerBatch <= sellAndSwapPerBatch;

  return (
    <div className="skill-card">
      <div className="skill-header">
        <h3>{result.skillName}</h3>
        <button
          className={`owned-toggle ${isExpanded ? 'active' : ''}`}
          onClick={() => setExpanded(prev => ({ ...prev, [result.skillId]: !isExpanded }))}
        >
          owned
        </button>
      </div>

      {isExpanded && skillDef && (
        <div className="owned-mat-inputs">
          {skillDef.materials.map(mat => (
            <div key={mat.id} className="owned-mat-row">
              <span className="owned-mat-name">{mat.name}</span>
              <span className="owned-mat-qty">{(mat.qty * 1000 / expectedOutput).toFixed(1)} / fusion</span>
              <input
                type="number"
                className="owned-input"
                min="0"
                placeholder="0"
                value={ownedMats[mat.id] ?? ''}
                onChange={e => setOwnedMats(prev => ({ ...prev, [mat.id]: e.target.value }))}
              />
            </div>
          ))}
          {safeBatches > 0 && (
            <div className="owned-batch-count">→ {totalFusion} fusion craftable</div>
          )}
        </div>
      )}

      {!result.hasSufficientData ? (
        <div className="missing-data">
          <div className="missing-data-title">Missing prices</div>
          <ul className="missing-data-list">
            {result.missingMaterials.map(m => <li key={m}>{m}</li>)}
            {result.missingFusion && <li>Fusion material</li>}
          </ul>
        </div>
      ) : mode === 'gold' ? (
        <div className="owned-analysis">
          <div className="owned-section">
            <span className="owned-section-label">
              {safeBatches > 0 ? `${totalFusion} fusion` : 'per fusion'}
            </span>
            <div className="owned-pair">
              <div className={`owned-option ${!goldCraftWins ? 'owned-winner' : 'owned-loser'}`}>
                <span className="owned-option-label">Sell raw</span>
                <span className="owned-option-val">
                  {safeBatches > 0 ? `${fmt(result.rawSellValue * safeBatches)}g` : `${fmt(rawSellGold)}g`}
                </span>
              </div>
              <div className={`owned-option ${goldCraftWins ? 'owned-winner' : 'owned-loser'}`}>
                <span className="owned-option-label">Craft &amp; sell</span>
                <span className="owned-option-val">
                  {safeBatches > 0 ? `${fmt((result.profitFromCrafting + result.matCost) * safeBatches)}g` : `${fmt(craftAndSellGold)}g`}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="owned-analysis">
          <div className="owned-section">
            <span className="owned-section-label">per fusion</span>
            <div className="owned-pair">
              <div className={`owned-option ${buyCraftWins ? 'owned-winner' : 'owned-loser'}`}>
                <span className="owned-option-label">Buy &amp; craft</span>
                <span className="owned-option-val">{fmt(craftCostPerFusion)}g</span>
              </div>
              <div className={`owned-option ${!buyCraftWins ? 'owned-winner' : 'owned-loser'}`}>
                <span className="owned-option-label">Buy direct</span>
                <span className="owned-option-val">{fmt(buyDirectPerFusion)}g</span>
              </div>
            </div>
          </div>
          {safeBatches > 0 && (
            <div className="owned-section">
              <span className="owned-section-label">{totalFusion} fusion</span>
              <div className="owned-pair">
                <div className={`owned-option ${ownedCraftWins ? 'owned-winner' : 'owned-loser'}`}>
                  <span className="owned-option-label">Craft owned</span>
                  <span className="owned-option-val">{fmt(craftFeePerBatch * safeBatches)}g</span>
                </div>
                <div className={`owned-option ${!ownedCraftWins ? 'owned-winner' : 'owned-loser'}`}>
                  <span className="owned-option-label">Sell → {swapTargetLabel}</span>
                  <span className="owned-option-val">
                    {sellAndSwapPerBatch * safeBatches < 0
                      ? `${fmt(Math.abs(sellAndSwapPerBatch * safeBatches))}g profit`
                      : `${fmt(sellAndSwapPerBatch * safeBatches)}g`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
