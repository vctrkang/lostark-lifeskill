export const MARKET_TAX = 0.05;

export const FUSIONS = [
  {
    id: 'fusion',
    name: 'Abidos Fusion Material',
    shortName: 'Abidos',
    icon: '💎',
    craftOutput: 10,
    craftGoldCost: 400,
    matQtys: [33, 45, 86],
  },
  {
    id: 'fusion_superior',
    name: 'Superior Abidos Fusion Material',
    shortName: 'Superior',
    icon: '💠',
    craftOutput: 10,
    craftGoldCost: 520,
    matQtys: [43, 59, 112],
  },
];

// Backward-compat aliases used by PriceTable and ocr.js
export const FUSION = FUSIONS[0];
export const CRAFT_OUTPUT = FUSIONS[0].craftOutput;
export const CRAFT_GOLD_COST = FUSIONS[0].craftGoldCost;

export const SKILLS = [
  {
    id: 'gathering',
    name: 'Gathering',
    icon: '🌿',
    materials: [
      { id: 'abidos_wild_flower', name: 'Abidos Wild Flower', icon: '🌺' },
      { id: 'shy_wild_flower',    name: 'Shy Wild Flower',    icon: '🌷' },
      { id: 'wild_flower',        name: 'Wild Flower',        icon: '🌸' },
    ],
  },
  {
    id: 'logging',
    name: 'Logging',
    icon: '🪓',
    materials: [
      { id: 'abidos_timber', name: 'Abidos Timber', icon: '🟧' },
      { id: 'tender_timber', name: 'Tender Timber', icon: '🟫' },
      { id: 'timber',        name: 'Timber',        icon: '🪵' },
    ],
  },
  {
    id: 'mining',
    name: 'Mining',
    icon: '⛏️',
    materials: [
      { id: 'abidos_iron_ore', name: 'Abidos Iron Ore', icon: '🔶' },
      { id: 'heavy_iron_ore',  name: 'Heavy Iron Ore',  icon: '🪨' },
      { id: 'iron_ore',        name: 'Iron Ore',        icon: '🩶' },
    ],
  },
  {
    id: 'hunting',
    name: 'Hunting',
    icon: '🏹',
    materials: [
      { id: 'abidos_thick_raw_meat', name: 'Abidos Thick Raw Meat', icon: '🥩' },
      { id: 'treated_meat',          name: 'Treated Meat',          icon: '🍖' },
      { id: 'thick_raw_meat',        name: 'Thick Raw Meat',        icon: '🥩' },
    ],
  },
  {
    id: 'fishing',
    name: 'Fishing',
    icon: '🎣',
    materials: [
      { id: 'abidos_solar_carp', name: 'Abidos Solar Carp', icon: '🐠' },
      { id: 'redflesh_fish',     name: 'Redflesh Fish',     icon: '🦞' },
      { id: 'fish',              name: 'Fish',              icon: '🐟' },
    ],
  },
  {
    id: 'excavating',
    name: 'Excavating',
    icon: '🔍',
    materials: [
      { id: 'abidos_relic',  name: 'Abidos Relic',  icon: '🔮' },
      { id: 'rare_relic',    name: 'Rare Relic',    icon: '🏺' },
      { id: 'ancient_relic', name: 'Ancient Relic', icon: '🗿' },
    ],
  },
];

// Flat list of all material ids for OCR matching
export const ALL_MATERIAL_IDS = SKILLS.flatMap(s => s.materials.map(m => m.id));
export const FUSION_ID = FUSION.id;
