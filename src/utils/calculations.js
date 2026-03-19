import { CRAFT_OUTPUT, CRAFT_GOLD_COST, MARKET_TAX } from '../data/recipes';

/**
 * @param {object} skill        - skill definition from SKILLS array
 * @param {object} prices       - { [materialId]: number, fusion: number }
 * @param {number} greatSuccess - great success rate as decimal (e.g. 0.3 for 30%)
 * @returns {object} calculated results for this skill
 */
export function calcSkill(skill, prices, greatSuccess, craftCostReduction = 0) {
  const fusionPrice = prices['fusion'] ?? 0;
  const gsRate = Math.max(0, Math.min(1, greatSuccess));
  const reductionRate = Math.max(0, Math.min(1, craftCostReduction));

  // Cost to buy all materials for one craft batch (produces CRAFT_OUTPUT fusions).
  // prices are per bundle of 100 units; qty is the item count (e.g. 33 units per batch).
  const matCost = skill.materials.reduce((sum, mat) => {
    return sum + (prices[mat.id] ?? 0) * mat.qty / 100;
  }, 0);

  const craftFee = CRAFT_GOLD_COST * (1 - reductionRate);
  const craftCost = matCost + craftFee;

  // Expected fusion output accounting for great success (doubles output)
  const expectedOutput = CRAFT_OUTPUT * (1 + gsRate);

  // Revenue from selling expected output after market tax
  const sellRevenue = expectedOutput * fusionPrice * (1 - MARKET_TAX);

  // --- Category 1: profit play ---
  // Profit if you buy mats, craft, and sell fusion
  const profitFromCrafting = sellRevenue - craftCost;
  const profitPerFusion = profitFromCrafting / expectedOutput;

  // Value of selling raw mats per craft attempt (after tax).
  const rawSellValue = matCost * (1 - MARKET_TAX);

  // Is crafting better than just selling the raw mats?
  const craftVsRaw = sellRevenue - rawSellValue - CRAFT_GOLD_COST;

  // --- Category 2: personal use ---
  // Cost per fusion if you craft (using purchased mats)
  const costPerFusionViaCraft = craftCost / expectedOutput;
  // Cost to buy fusion directly = fusionPrice (you pay listed price, no extra tax as buyer)
  const savings = fusionPrice - costPerFusionViaCraft;

  const materialBreakdown = skill.materials.map(mat => ({
    name: mat.name,
    qty: mat.qty,
    price: prices[mat.id] ?? 0,
    cost: (prices[mat.id] ?? 0) * mat.qty,
  }));

  const missingMaterials = skill.materials
    .filter(mat => !(prices[mat.id] > 0))
    .map(mat => mat.name);
  const missingFusion = !(fusionPrice > 0);
  const hasSufficientData = !missingFusion && missingMaterials.length === 0;

  return {
    skillId: skill.id,
    skillName: skill.name,
    hasSufficientData,
    missingMaterials,
    missingFusion,
    materialBreakdown,
    matCost,
    craftCost,
    expectedOutput,
    sellRevenue,
    fusionPrice,
    // Category 1
    profitFromCrafting,     // net gold if buy mats → craft → sell
    profitPerFusion,        // per fusion unit
    rawSellValue,           // gold from selling mats raw
    craftVsRaw,             // positive = crafting beats selling raw
    worthCraftingForSale: profitFromCrafting > 0,
    worthCraftingOverRaw: craftVsRaw > 0,
    // Category 2
    costPerFusionViaCraft,
    savingsPerFusion: savings,  // positive = crafting cheaper than buying
    worthCraftingForSelf: savings > 0,
  };
}
