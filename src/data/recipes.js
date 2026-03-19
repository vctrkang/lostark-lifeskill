export const CRAFT_OUTPUT = 10;
export const CRAFT_GOLD_COST = 400;
export const MARKET_TAX = 0.05;

export const FUSION = {
  id: 'fusion',
  name: 'Abidos Fusion Material',
  icon: '💎',
};

export const SKILLS = [
  {
    id: 'gathering',
    name: 'Gathering',
    icon: '🌿',
    materials: [
      { id: 'abidos_wild_flower', name: 'Abidos Wild Flower', qty: 33, icon: '🌺' },
      { id: 'shy_wild_flower',    name: 'Shy Wild Flower',    qty: 45, icon: '🌷' },
      { id: 'wild_flower',        name: 'Wild Flower',        qty: 86, icon: '🌸' },
    ],
  },
  {
    id: 'logging',
    name: 'Logging',
    icon: '🪓',
    materials: [
      { id: 'abidos_timber',  name: 'Abidos Timber', qty: 33, icon: '🟧' },
      { id: 'tender_timber',  name: 'Tender Timber', qty: 45, icon: '🟫' },
      { id: 'timber',         name: 'Timber',        qty: 86, icon: '🪵' },
    ],
  },
  {
    id: 'mining',
    name: 'Mining',
    icon: '⛏️',
    materials: [
      { id: 'abidos_iron_ore', name: 'Abidos Iron Ore', qty: 33, icon: '🔶' },
      { id: 'heavy_iron_ore',  name: 'Heavy Iron Ore',  qty: 45, icon: '🪨' },
      { id: 'iron_ore',        name: 'Iron Ore',        qty: 86, icon: '🩶' },
    ],
  },
  {
    id: 'hunting',
    name: 'Hunting',
    icon: '🏹',
    materials: [
      { id: 'abidos_thick_raw_meat', name: 'Abidos Thick Raw Meat', qty: 33, icon: '🥩' },
      { id: 'treated_meat',          name: 'Treated Meat',          qty: 45, icon: '🍖' },
      { id: 'thick_raw_meat',        name: 'Thick Raw Meat',        qty: 86, icon: '🥩' },
    ],
  },
  {
    id: 'fishing',
    name: 'Fishing',
    icon: '🎣',
    materials: [
      { id: 'abidos_solar_carp', name: 'Abidos Solar Carp', qty: 33, icon: '🐠' },
      { id: 'redflesh_fish',     name: 'Redflesh Fish',     qty: 45, icon: '🦞' },
      { id: 'fish',              name: 'Fish',              qty: 86, icon: '🐟' },
    ],
  },
  {
    id: 'excavating',
    name: 'Excavating',
    icon: '🔍',
    materials: [
      { id: 'abidos_relic',  name: 'Abidos Relic',  qty: 33, icon: '🔮' },
      { id: 'rare_relic',    name: 'Rare Relic',    qty: 45, icon: '🏺' },
      { id: 'ancient_relic', name: 'Ancient Relic', qty: 86, icon: '🗿' },
    ],
  },
];

// Flat list of all material ids for OCR matching
export const ALL_MATERIAL_IDS = SKILLS.flatMap(s => s.materials.map(m => m.id));
export const FUSION_ID = FUSION.id;
