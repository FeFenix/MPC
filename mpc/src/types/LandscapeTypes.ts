import { FEATURES_CONFIG, CUSTOM_FEATURE_DEFAULT } from '../config/calculatorConfig';

export interface LandscapeSize {
  width: number;
  length: number;
  deliveryDays: number;
}

export interface Feature {
  enabled: boolean;
  quantity: number;
  pricePerUnit: number;
  daysPerUnit: number;
  description: string;
  name?: string;
}

export interface CustomFeatures {
  customCaves: Feature;
  customBiomes: Feature;
  structures: {
    villages: Feature;
    strongholds: Feature;
    netherPortals: Feature;
  };
  useCustomMods: Feature;
  customTerrainSculpting: Feature;
  seasonalVariants: Feature;
  customOreGeneration: Feature;
  undergroundBiomes: Feature;
  survivalFriendly: Feature;
  floatingIslands: Feature;
  customFeature: Feature;
}

export interface LandscapeCalculatorState {
  size: LandscapeSize;
  features: CustomFeatures;
  basePrice: number;
  recommendedDays: number;
  totalPrice: number;
  totalDays: number;
  area: number;
}

// Create initial state from configuration
const createFeature = (config: typeof FEATURES_CONFIG.customCaves): Feature => ({
  enabled: false,
  quantity: 1,
  pricePerUnit: config.pricePerUnit,
  daysPerUnit: config.daysPerUnit,
  description: config.description,
  name: config.name
});

// Function to generate fresh state from config
export const generateFreshState = (): LandscapeCalculatorState => ({
  size: {
    width: 1000,
    length: 1000,
    deliveryDays: 5
  },
  features: {
    customCaves: createFeature(FEATURES_CONFIG.customCaves),
    customBiomes: createFeature(FEATURES_CONFIG.customBiomes),
    structures: {
      villages: createFeature(FEATURES_CONFIG.structures.villages),
      strongholds: createFeature(FEATURES_CONFIG.structures.strongholds),
      netherPortals: createFeature(FEATURES_CONFIG.structures.netherPortals)
    },
    useCustomMods: createFeature(FEATURES_CONFIG.useCustomMods),
    customTerrainSculpting: createFeature(FEATURES_CONFIG.customTerrainSculpting),
    seasonalVariants: createFeature(FEATURES_CONFIG.seasonalVariants),
    customOreGeneration: createFeature(FEATURES_CONFIG.customOreGeneration),
    undergroundBiomes: createFeature(FEATURES_CONFIG.undergroundBiomes),
    survivalFriendly: createFeature(FEATURES_CONFIG.survivalFriendly),
    floatingIslands: createFeature(FEATURES_CONFIG.floatingIslands),
    customFeature: createFeature(CUSTOM_FEATURE_DEFAULT)
  },
  basePrice: 10.55,
  recommendedDays: 5,
  totalPrice: 10.55,
  totalDays: 5,
  area: 1000000
});

export const DEFAULT_STATE = generateFreshState(); 