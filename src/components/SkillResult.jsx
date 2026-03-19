import { useState } from 'react';
import { SKILLS } from '../data/recipes';

const SKILL_MAP = Object.fromEntries(SKILLS.map(s => [s.id, s]));

function Gold({ value }) {
  const abs = Math.abs(value);
  const formatted = abs >= 1_000_000
    ? `${(abs / 1_000_000).toFixed(2)}M`
    : abs >= 1_000
      ? `${(abs / 1_000).toFixed(1)}K`
      : abs.toFixed(0);
  const sign = value >= 0 ? '+' : '-';
  const cls = value >= 0 ? 'positive' : 'negative';
  return <span className={`gold ${cls}`}>{sign}{formatted}g</span>;
}

function Decision({ question, recommendation, detail }) {
  return (
    <div className="decision-row">
      <span className="decision-question">{question}</span>
      <div className="decision-answer">
        <span className="decision-badge">{recommendation}</span>
        <span className="decision-detail">{detail}</span>
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="result-row">
      <span className="result-label">{label}</span>
      <span className="result-value">{children}</span>
    </div>
  );
}

export default function SkillResult({ result }) {
  const [expanded, setExpanded] = useState(false);
  const {
    skillId, skillName, hasSufficientData,
    missingMaterials, missingFusion,
    materialBreakdown, craftCost, expectedOutput, fusionPrice,
    profitPerFusion, rawSellValue, craftVsRaw,
    worthCraftingForSale, worthCraftingOverRaw,
    costPerFusionViaCraft, savingsPerFusion, worthCraftingForSelf,
  } = result;

  const skill = SKILL_MAP[skillId];

  const per10 = v => Math.round(v * 10).toLocaleString();

  return (
    <div className={`skill-card ${hasSufficientData ? '' : 'no-data'}`}>
      <div className="skill-header">
        <h3>
          <span className="skill-icon">{skill?.icon}</span>
          {skillName}
        </h3>
      </div>

      {!hasSufficientData ? (
        <div className="missing-data">
          <p className="missing-data-title">Missing prices:</p>
          <ul className="missing-data-list">
            {missingFusion && <li>Fusion Material</li>}
            {missingMaterials.map(name => <li key={name}>{name}</li>)}
          </ul>
        </div>
      ) : (
        <>
          <div className="decisions">
            <Decision
              question="Have mats"
              recommendation={worthCraftingOverRaw ? 'Craft & sell' : 'Sell raw'}
              detail={worthCraftingOverRaw
                ? <>{per10(craftVsRaw / expectedOutput)}g more per 10 vs selling raw</>
                : <>{per10(-craftVsRaw / expectedOutput)}g more per 10 by selling raw</>}
            />
          </div>

          <button className="result-expand-btn" onClick={() => setExpanded(e => !e)}>
            {expanded ? 'Hide details ▲' : 'Show details ▼'}
          </button>

          {expanded && (
            <div className="result-details">
              {materialBreakdown.map(m => (
                <Row key={m.name} label={m.name}>
                  {m.price.toLocaleString()}g × {m.qty} = {m.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}g
                </Row>
              ))}
              <Row label="Craft fee">{(craftCost - result.matCost).toLocaleString()}g</Row>
              <Row label="Total craft cost">{craftCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}g</Row>
              <Row label="Expected output">{expectedOutput.toFixed(1)} fusion</Row>
              <Row label="Craft cost per 10">{per10(costPerFusionViaCraft)}g</Row>
              <Row label="Buy price per 10">{per10(fusionPrice)}g</Row>
              <Row label="Raw mat sell value">{rawSellValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}g</Row>
            </div>
          )}
        </>
      )}
    </div>
  );
}
