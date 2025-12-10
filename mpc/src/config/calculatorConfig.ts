// Базові налаштування цін
export const PRICE_PER_DAY_ADJUSTMENT = 6; // Ціна за день прискорення/сповільнення ($)
export const MINIMUM_TOTAL_PRICE = 30; // Мінімальна загальна ціна ($)

// Налаштування розмірів карти
export const MAP_SIZE_CONFIG = {
  min: 100, // Мінімальний розмір карти
  max: 35000, // Максимальний розмір карти
  default: 1000, // Розмір за замовчуванням
  snapPoints: [1000, 5000, 10000, 20000, 25000], // Точки прив'язки на слайдері
  snapThreshold: 200, // Відстань для прив'язки до точок
};

// Налаштування часу доставки
export const DELIVERY_CONFIG = {
  min: 1, // Мінімальна кількість днів
  max: 120, // Максимальна кількість днів
  defaultDays: 5, // Дні за замовчуванням
  marks: [ // Мітки на слайдері часу доставки
    { value: 1, label: '1d' },
    { value: 30, label: '30d' },
    { value: 60, label: '60d' },
    { value: 120, label: '120d' },
  ],
};

// Налаштування всіх функцій
export const FEATURES_CONFIG = {
  // Основні функції
  customCaves: {
    name: "Custom Caves",
    pricePerUnit: 150,
    daysPerUnit: 2,
    description: "Specially designed cave systems with unique layouts and vanilla biomes (DeepDark, LuchCave, normal cave)"
  },
  customBiomes: {
    name: "Custom Biomes",
    pricePerUnit: 70,
    daysPerUnit: 3,
    description: "Unique biomes crafted to your specifications"
  },
  
  // Структури
  structures: {
    villages: {
      name: "Villages",
      pricePerUnit: 40,
      daysPerUnit: 2,
      description: "Custom designed villages (7 small builds) with unique architecture"
    },
    strongholds: {
      name: "Strongholds",
      pricePerUnit: 60,
      daysPerUnit: 2,
      description: "End portals and strongholds in the world"
    },
    netherPortals: {
      name: "Nether Portals",
      pricePerUnit: 30,
      daysPerUnit: 1,
      description: "Adding custom nether portals to the world"
    }
  },
  
  // Додаткові функції
  useCustomMods: {
    name: "Custom Mods Support",
    pricePerUnit: 100,
    daysPerUnit: 4,
    description: "Create a map using blocks from mods"
  },
  customTerrainSculpting: {
    name: "Custom Terrain Sculpting",
    pricePerUnit: 10,
    daysPerUnit: 1,
    description: "Hand-detailed areas like epic mountains, waterfalls, or cliffs (150x150 blocks per unit)"
  },
  seasonalVariants: {
    name: "Seasonal Variants",
    pricePerUnit: 10,
    daysPerUnit: 1,
    description: "Seasonal styling (autumn, winter, spring, or summer) for 1000x1000 blocks area"
  },
  customOreGeneration: {
    name: "Custom Ore Generation",
    pricePerUnit: 0,
    daysPerUnit: 0,
    description: "Balanced ore placement throughout the map"
  },
  undergroundBiomes: {
    name: "Underground Biomes",
    pricePerUnit: 30,
    daysPerUnit: 5,
    description: "Custom underground biomes like crystal caves or underground forests (500x500 blocks per unit)"
  },
  survivalFriendly: {
    name: "Survival-Friendly",
    pricePerUnit: 0,
    daysPerUnit: 0,
    description: "Map optimized for survival gameplay (without the use of high-end blocks)"
  },
  floatingIslands: {
    name: "Floating Islands",
    pricePerUnit: 30,
    daysPerUnit: 5,
    description: "Custom floating islands with unique biomes (500x500 blocks per unit)"
  }
};

// Make sure floatingIslands is properly exported as part of FEATURES_CONFIG
if (!(FEATURES_CONFIG as any).floatingIslands) {
  (FEATURES_CONFIG as any).floatingIslands = {
    name: "Floating Islands",
    pricePerUnit: 30,
    daysPerUnit: 5,
    description: "Custom floating islands with unique biomes (500x500 blocks per unit)"
  };
}

// Налаштування користувацької функції
export const CUSTOM_FEATURE_DEFAULT = {
  name: "Custom Feature",
  pricePerUnit: 0,
  daysPerUnit: 0,
  description: "Custom feature with manual price and time settings"
}; 