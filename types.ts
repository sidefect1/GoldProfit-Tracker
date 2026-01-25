
export type KaratEnum = '10K' | '14K' | '18K' | '22K';

export type ProductType = 'RING' | 'NECKLACE' | 'BRACELET' | 'EARRING';

export type MarketplaceType = 'etsy' | 'shopify';

export interface AnchorPoints {
  p1: number; // Low point (e.g. Size 4)
  p2: number; // Mid point (e.g. Size 8)
  p3: number; // High point (e.g. Size 12)
}

// Map width (mm) to AnchorPoints
export type GramAnchors = Record<number, AnchorPoints>;

export interface ProfitConfig {
  profitTargetMode: 'USD' | 'PERCENT' | 'VARIABLE_PERCENT';
  profitTargetValue: number; // USD amount or Percentage (e.g. 30 for 30%)
  
  // Piecewise Variable Profit Config (Start -> End only)
  variableProfit: {
    minWeight: number;    // Start of curve (g)
    maxWeight: number;    // End of curve (g)
    percentAtMin: number; // e.g. 12%
    percentAtMax: number; // e.g. 8%
    fixedAddon?: number;  // Extra fixed USD profit added on top of the percentage
  };
  
  psychologicalRounding: boolean;
}

export interface ProjectSnapshot {
  date: number;
  laborModel: 'MILYEM_PER_ITEM' | 'MILYEM_PER_GRAM';
  laborMilyem: number;
  shippingCost: number;
  packagingCost: number;
  overheadCost: number;
  purities: Record<KaratEnum, number>;
  anchors: Record<KaratEnum, GramAnchors>;
  referenceAnchors: GramAnchors; // 24K Master
  exactWeights?: Record<string, number>;
  referenceExactWeights?: Record<string, number>; // 24K Master Exact
  marketplaceRates: MarketplaceRates; // Snapshot of rates at time of save
  profitStrategyByKarat?: Record<string, ProfitConfig>; // Snapshot of strategies per karat
  marketplaceDiscount?: number; // Snapshot of the planned discount used to generate list prices
}

export interface PriceBook {
  id: string;
  name: string;
  createdAt: number;
  // Key format: `${karat}:${width}:${size}` -> price
  prices: Record<string, number>;
  snapshot?: ProjectSnapshot; // New: Locked cost data
}

export interface MarketplaceRates {
  etsy: number; // Base fee
  shopify: number; // Base fee
  // Removed global coupon/offsite rates, moved to ProjectSettings
}

export interface Store {
  id: string;
  name: string;
  goldPrice24k: number;
  createdAt: number;
  updatedAt: number;
  // Audit Fields
  lastEditorName?: string;
  lastEditorId?: string;
  dbUpdatedAt?: number; // From DB updated_at column
}

export interface ProjectSettings {
  id: string;
  storeId?: string; // Linked Store ID
  name: string;
  productType: ProductType;
  marketplace: MarketplaceType; // New required field
  createdAt: number;
  lastModified: number;
  isArchived?: boolean;
  isSetupComplete?: boolean; // New: Setup Wizard Completion Flag
  activePriceBookId?: string;
  
  // Audit Fields
  lastEditorName?: string;
  lastEditorId?: string;
  dbUpdatedAt?: number; // From DB updated_at column

  // Configuration
  activeKarats: KaratEnum[];

  // Financial Inputs
  goldPricePerGram: number; // 24K basis
  marketplaceFeePercentage: number; // Deprecated but kept for compatibility, prefer global
  
  // Costs (Milyem System) - Global
  laborModel: 'MILYEM_PER_ITEM' | 'MILYEM_PER_GRAM';
  laborMilyem: number; // 0 - 1000

  shippingCost: number;
  packagingCost: number;
  overheadCost: number;

  // Profit Strategy - Scoped by Karat (New)
  profitStrategyByKarat: Record<string, ProfitConfig>; // Keyed by KaratEnum

  // Marketplace Simulation Settings (Per Project)
  marketplaceDiscount: number; // Planned Discount % (Generates List Price)
  couponDiscountPercent?: number; // Simulation: Coupon Code %
  offsiteAdsPercent?: number; // Simulation: Offsite Ads Fee %
  
  // Data Model Config
  widths: number[]; // e.g. [2,3,4,5,6,7,8]
  sizes: number[];  // Active rows (Ring sizes or Lengths)
  
  // Gram Estimation Data
  anchors: Record<KaratEnum, GramAnchors>;
  
  // Master Reference (24K) - This drives the calculation for all other karats based on density
  referenceAnchors: GramAnchors;

  // Exact Weight Maps (For Non-Ring precise calibration)
  referenceExactWeights?: Record<string, number>; // 24K Master Exact
  referenceExactWeightSources?: Record<string, 'manual' | 'auto'>;
  referenceExactWeightMethods?: Record<string, 'row' | 'col' | 'avg'>;

  // Key format: `${karat}:${width}:${size}` for specific karats
  exactWeights?: Record<string, number>;

  // Purity Overrides
  purities: Record<KaratEnum, number>;

  // Saved Price Books
  priceBooks: PriceBook[];
  
  // Manual Price Overrides (Builder Mode)
  // Key: `${karat}:${width}:${size}` -> price
  priceOverrides?: Record<string, number>;

  // Visual Thresholds
  colorThresholds: {
    darkRed: number;    // <=
    lightRed: number;   // < 0
    lightGreen: number; // < X
    darkGreen: number;  // >=
  };
}

export interface CalculationResult {
  karat: KaratEnum;
  size: number;
  width: number;
  estimatedGram: number; // Display weight (24k * purity)
  w24: number; // 24K Master Weight
  metalCost: number;
  laborCost: number;
  otherCosts: number; // Shipping + Packaging + Overhead
  baseCost: number; // Metal + Labor + Other
  salePrice: number;
  marketplaceSalePrice: number; // List Price before discount
  commissionCost: number;
  totalCost: number;
  profitUSD: number;
  profitPercent: number;
  isOverridden?: boolean;
  // Context for Tooltip
  goldPriceUsed: number;
  purityUsed: number;
  // Break-even
  breakEvenPrice: number;
  breakEvenDelta: number; // How much needed to reach break-even (0 if profitable)
  
  // Debug info for Monitor Mode
  _debug?: {
    source: 'SNAPSHOT' | 'LIVE';
    baseFeeRate: number;
    metalCostFormula: string;
    totalFeeRate: number;
    lockedPrice?: number;
    rawNetRevenue: number;
  }
}

export interface SummaryStats {
  minProfit: { val: number; label: string };
  maxProfit: { val: number; label: string };
  avgProfit: { val: number; label: string };
  breakEven: { val: number; label: string };
}

export interface ExportPayload {
  payloadType: 'gold-profit-export';
  schemaVersion: number;
  exportedAt: number;
  stores?: Store[];
  projects: ProjectSettings[];
}
