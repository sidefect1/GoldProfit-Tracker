
import { ProjectSettings, GramAnchors, KaratEnum, ProductType, MarketplaceRates, ProfitConfig } from './types';

export const KARATS: KaratEnum[] = ['10K', '14K', '18K', '22K'];

export const DENSITIES: Record<string, number> = {
  '10K': 11.5,
  '14K': 13.5,
  '18K': 15.5,
  '22K': 17.8,
  '24K': 19.32 
};

export const DEFAULT_PURITIES: Record<KaratEnum, number> = {
  '10K': 0.4167,
  '14K': 0.585,
  '18K': 0.75,
  '22K': 0.9167,
};

export const DEFAULT_MARKETPLACE_RATES: MarketplaceRates = {
  etsy: 9.7,
  shopify: 5.0
};

export const PRODUCT_STYLES: Record<ProductType, {
  colorBg: string;
  colorText: string;
  ringColor: string;
  label: string;
}> = {
  RING: { colorBg: 'bg-purple-100', colorText: 'text-purple-800', ringColor: 'ring-purple-500', label: 'Ring' },
  NECKLACE: { colorBg: 'bg-blue-100', colorText: 'text-blue-800', ringColor: 'ring-blue-500', label: 'Necklace' },
  // Changed from Orange to Teal to avoid "Yellow" confusion
  BRACELET: { colorBg: 'bg-teal-100', colorText: 'text-teal-800', ringColor: 'ring-teal-500', label: 'Bracelet' },
  EARRING: { colorBg: 'bg-green-100', colorText: 'text-green-800', ringColor: 'ring-green-500', label: 'Earring' }
};

export const PRODUCT_CONFIGS: Record<ProductType, {
  label: string;
  minSize: number;
  maxSize: number;
  step: number;
  anchors: [number, number, number];
  sizeLabel: string;
  widthLabel: string;
  defaultWidths: number[];
}> = {
  RING: {
    label: 'Ring', minSize: 4, maxSize: 14, step: 0.25, anchors: [4, 8, 12],
    sizeLabel: 'US Size', widthLabel: 'Width (mm)', defaultWidths: [2, 3, 4, 5, 6, 7, 8]
  },
  NECKLACE: {
    label: 'Necklace', minSize: 14, maxSize: 28, step: 1, anchors: [14, 20, 26],
    sizeLabel: 'Length (inch)', widthLabel: 'Thickness (mm)', defaultWidths: [] // Removed defaults
  },
  BRACELET: {
    label: 'Bracelet', minSize: 5.5, maxSize: 10, step: 0.5, anchors: [6, 8, 10],
    sizeLabel: 'Length (inch)', widthLabel: 'Thickness (mm)', defaultWidths: [] // Removed defaults
  },
  EARRING: {
    label: 'Earring/Piercing', minSize: 1, maxSize: 1, step: 1, anchors: [1, 1, 1],
    sizeLabel: 'One Size', widthLabel: 'Style', defaultWidths: [1]
  }
};

export const WEIGHT_RANGES: Record<ProductType, { min: number, max: number }> = {
  RING: { min: 2.0, max: 15.0 },
  NECKLACE: { min: 5.0, max: 40.0 },
  BRACELET: { min: 4.0, max: 25.0 },
  EARRING: { min: 0.5, max: 5.0 }
};

export const AVAILABLE_NECKLACE_LENGTHS = [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28];
export const AVAILABLE_BRACELET_LENGTHS = [5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0];

export const getSizesForProduct = (type: ProductType) => {
  if (type === 'RING') {
      const config = PRODUCT_CONFIGS[type];
      const sizes = [];
      for (let s = config.minSize; s <= config.maxSize; s += config.step) {
        sizes.push(s);
      }
      return sizes.map(s => parseFloat(s.toFixed(2)));
  }
  // For non-rings, return empty array to enforce explicit user selection
  if (type === 'NECKLACE') return [];
  if (type === 'BRACELET') return [];
  if (type === 'EARRING') return [1];
  return [];
};

export const generateDefaultAnchors = (widths: number[], type: ProductType = 'RING'): GramAnchors => {
  const anchors: GramAnchors = {};
  const config = PRODUCT_CONFIGS[type];
  widths.forEach(w => {
    const factor = type === 'RING' ? 1 : (type === 'EARRING' ? 0.5 : 2); 
    anchors[w] = {
      p1: parseFloat((w * 0.5 * factor + 0.5).toFixed(2)),
      p2: parseFloat((w * 0.6 * factor + 0.8).toFixed(2)),
      p3: parseFloat((w * 0.7 * factor + 1.1).toFixed(2)),
    };
  });
  return anchors;
};

// 24K Master reference generator updated to use Purity (1 / 0.585) instead of Density
const generateDefaultReferenceAnchors = (widths: number[], type: ProductType = 'RING'): GramAnchors => {
   const baseAnchors = generateDefaultAnchors(widths, type); // Current 14K defaults
   const referenceAnchors: GramAnchors = {};
   // 14K (0.585) to 24K (1.0) ratio
   const ratio = 1 / DEFAULT_PURITIES['14K'];

   widths.forEach(w => {
       const b = baseAnchors[w];
       referenceAnchors[w] = {
           p1: parseFloat((b.p1 * ratio).toFixed(2)),
           p2: parseFloat((b.p2 * ratio).toFixed(2)),
           p3: parseFloat((b.p3 * ratio).toFixed(2)),
       };
   });
   return referenceAnchors;
};

export const DEFAULT_PROFIT_CONFIG: ProfitConfig = {
  profitTargetMode: 'PERCENT',
  profitTargetValue: 30,
  variableProfit: { minWeight: 2.0, maxWeight: 15.0, percentAtMin: 12, percentAtMax: 8, fixedAddon: 0 },
  psychologicalRounding: true,
};

const defaultProfitStrategy: Record<string, ProfitConfig> = {};
KARATS.forEach(k => {
    defaultProfitStrategy[k] = { ...DEFAULT_PROFIT_CONFIG };
});

export const DEFAULT_PROJECT: ProjectSettings = {
  id: 'default',
  name: 'New Project',
  productType: 'RING',
  marketplace: 'etsy',
  createdAt: Date.now(),
  lastModified: Date.now(),
  activeKarats: ['10K', '14K', '18K', '22K'],
  goldPricePerGram: 80,
  marketplaceFeePercentage: 9.7,
  
  // New Milyem Defaults
  laborModel: 'MILYEM_PER_ITEM',
  laborMilyem: 100, // 10%
  
  shippingCost: 10,
  packagingCost: 3,
  overheadCost: 5,
  
  // Scoped Profit Strategy
  profitStrategyByKarat: defaultProfitStrategy,

  // Simulation Defaults
  marketplaceDiscount: 25,
  couponDiscountPercent: 30,
  offsiteAdsPercent: 15,

  widths: PRODUCT_CONFIGS.RING.defaultWidths,
  sizes: getSizesForProduct('RING'),
  anchors: {
    '10K': generateDefaultAnchors(PRODUCT_CONFIGS.RING.defaultWidths),
    '14K': generateDefaultAnchors(PRODUCT_CONFIGS.RING.defaultWidths),
    '18K': generateDefaultAnchors(PRODUCT_CONFIGS.RING.defaultWidths),
    '22K': generateDefaultAnchors(PRODUCT_CONFIGS.RING.defaultWidths),
  },
  referenceAnchors: generateDefaultReferenceAnchors(PRODUCT_CONFIGS.RING.defaultWidths),
  purities: DEFAULT_PURITIES,
  priceBooks: [],
  priceOverrides: {},
  colorThresholds: { darkRed: -10, lightRed: 0, lightGreen: 20, darkGreen: 20 }
};

export const RING_SIZES = getSizesForProduct('RING');
