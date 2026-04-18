import { MARKET_TAX, FUSIONS } from '../data/recipes';

/**
 * @param {object} skill              - skill definition from SKILLS array
 * @param {object} prices             - { [materialId]: number, [fusionId]: number }
 * @param {number} greatSuccess       - great success rate as decimal (e.g. 0.3 for 30%)
 * @param {number} craftCostReduction - craft fee reduction as decimal
 * @param {object} fusion             - fusion type definition from FUSIONS array
 */
export function calcSkill(skill, prices, greatSuccess, craftCostReduction = 0, fusion = FUSIONS[0]) {
  const fusionPrice = prices[fusion.id] ?? 0;
  const gsRate = Math.max(0, Math.min(1, greatSuccess));
  const reductionRate = Math.max(0, Math.min(1, craftCostReduction));

  // Cost to buy all materials for one craft batch (produces fusion.craftOutput fusions).
  // prices are per bundle of 100 units; matQtys[i] is the item count for tier i.
  const matCost = skill.materials.reduce((sum, mat, i) => {
    return sum + (prices[mat.id] ?? 0) * fusion.matQtys[i] / 100;
  }, 0);

  const craftFee = fusion.craftGoldCost * (1 - reductionRate);
  const craftCost = matCost + craftFee;

  // Expected fusion output accounting for great success (doubles output)
  const expectedOutput = fusion.craftOutput * (1 + gsRate);

  // Revenue from selling expected output after market tax
  const sellRevenue = expectedOutput * fusionPrice * (1 - MARKET_TAX);

  // --- Category 1: profit play ---
  // Profit if you buy mats, craft, and sell fusion
  const profitFromCrafting = sellRevenue - craftCost;
  const profitPerFusion = profitFromCrafting / expectedOutput;

  // Value of selling raw mats per craft attempt (after tax).
  const rawSellValue = matCost * (1 - MARKET_TAX);

  // Is crafting better than just selling the raw mats?
  const craftVsRaw = sellRevenue - rawSellValue - craftFee;

  // --- Category 2: personal use ---
  // Cost per fusion if you craft (using purchased mats)
  const costPerFusionViaCraft = craftCost / expectedOutput;
  // Cost to buy fusion directly = fusionPrice (you pay listed price, no extra tax as buyer)
  const savings = fusionPrice - costPerFusionViaCraft;

  const materialBreakdown = skill.materials.map((mat, i) => ({
    name: mat.name,
    qty: fusion.matQtys[i],
    price: prices[mat.id] ?? 0,
    cost: (prices[mat.id] ?? 0) * fusion.matQtys[i],
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
    profitFromCrafting,
    profitPerFusion,
    rawSellValue,
    craftVsRaw,
    worthCraftingForSale: profitFromCrafting > 0,
    worthCraftingOverRaw: craftVsRaw > 0,
    // Category 2
    costPerFusionViaCraft,
    savingsPerFusion: savings,
    worthCraftingForSelf: savings > 0,
  };
}
