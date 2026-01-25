
import { CalculationResult, ProjectSettings, AnchorPoints, KaratEnum, ProductType, MarketplaceRates, ProjectSnapshot, ProfitConfig } from '../types';
import { PRODUCT_CONFIGS, getSizesForProduct, WEIGHT_RANGES, DEFAULT_PROFIT_CONFIG } from '../constants';

/**
 * Calculates estimated gram weight based on 3-point interpolation strategy.
 * This should PRIMARILY be used for 24K Master Weights (referenceAnchors).
 */
export const calculateGram = (
  size: number, 
  anchors: AnchorPoints | undefined,
  productType: ProductType,
  extrapolateFixed: boolean = false
): number => {
  if (!anchors) return 0;

  const { p1, p2, p3 } = anchors;
  const config = PRODUCT_CONFIGS[productType];
  const [ref1, ref2, ref3] = config.anchors;

  // If all reference points are same (Earring), just return p1
  if (ref1 === ref3) return p1;

  if (size <= ref1) return p1; // Clamp low end
  
  if (size <= ref2) {
    // Linear ref1 -> ref2
    const slope = (p2 - p1) / (ref2 - ref1);
    return p1 + slope * (size - ref1);
  } else if (size <= ref3) {
    // Linear ref2 -> ref3
    const slope = (p3 - p2) / (ref3 - ref2);
    return p2 + slope * (size - ref2);
  } else {
    // > ref3
    if (extrapolateFixed) {
      return p3;
    } else {
      // Continue slope of ref2->ref3
      const slope = (p3 - p2) / (ref3 - ref2);
      return p3 + slope * (size - ref3);
    }
  }
};

/**
 * Applies psychological pricing (e.g. 142.3 -> 144.99 or 145)
 */
const applyRounding = (price: number): number => {
  const rounded = Math.ceil(price);
  return rounded - 0.01; 
};

export interface CalculateRowOptions {
    settings: ProjectSettings;
    karat: KaratEnum;
    size: number;
    width: number;
    lockedSalePrice?: number; // From active book
    overrideGoldPrice?: number; // Monitor Mode global gold
    customTargetProfitPercent?: number; // Variable profit curve
    globalMarketplaceRates?: MarketplaceRates; // Fallback rates
    snapshot?: ProjectSnapshot; // Locked data from Monitor
    profitMode?: 'standard' | 'coupon' | 'offsite'; // Etsy specific logic
}

export const calculateRow = (
  karat: KaratEnum,
  size: number,
  width: number,
  settings: ProjectSettings,
  lockedSalePrice?: number,
  overrideGoldPrice?: number,
  customTargetProfitPercent?: number,
  globalMarketplaceRates?: MarketplaceRates,
  snapshot?: ProjectSnapshot,
  profitMode: 'standard' | 'coupon' | 'offsite' = 'standard'
): CalculationResult => {
  
  // --- DATA SOURCE SELECTION (Settings vs Snapshot) ---
  const source = snapshot || settings;
  const purity = source.purities[karat];
  const goldPrice = overrideGoldPrice !== undefined ? overrideGoldPrice : settings.goldPricePerGram;

  // Retrieve Karat-Specific Profit Strategy (or default if missing)
  const profitConfig: ProfitConfig = snapshot?.profitStrategyByKarat?.[karat] || settings.profitStrategyByKarat?.[karat] || DEFAULT_PROFIT_CONFIG;

  // 1. Determine 24K Master Weight (w24)
  let w24 = 0;
  const exactKey = `${width}:${size}`;
  const exactKeyWithKarat = `${karat}:${width}:${size}`; // Legacy check

  if (source.referenceExactWeights && source.referenceExactWeights[exactKey] !== undefined) {
      // Direct 24K lookup
      w24 = source.referenceExactWeights[exactKey];
  } else if (source.exactWeights && source.exactWeights[exactKeyWithKarat] !== undefined) {
      // Legacy
      w24 = source.exactWeights[exactKeyWithKarat] / purity;
  } else {
      // Interpolate
      const anchors = source.referenceAnchors ? source.referenceAnchors[width] : undefined;
      w24 = calculateGram(size, anchors, settings.productType);
  }

  // 2. Metal Cost (Single Purity Application)
  const metalCost = w24 * goldPrice * purity;
  const estimatedGram = w24 * purity; // For display only

  // 3. Labor Cost (Milyem System)
  let laborCost = 0;
  const laborMilyem = source.laborMilyem || 0;
  
  if (source.laborModel === 'MILYEM_PER_GRAM') {
      laborCost = w24 * goldPrice * (laborMilyem / 1000);
  } else {
      laborCost = goldPrice * (laborMilyem / 1000);
  }

  // 4. Other Base Costs
  const otherCosts = source.shippingCost + source.packagingCost + source.overheadCost;
  const baseCost = metalCost + laborCost + otherCosts;

  // 5. Rates & Fees Setup
  const rates = snapshot?.marketplaceRates || globalMarketplaceRates || { 
      etsy: 9.7, shopify: 5.0
  };
  const isEtsy = settings.marketplace === 'etsy';
  const baseFeeRate = isEtsy ? rates.etsy : rates.shopify;

  // 6. PRICE DETERMINATION (Standard Base vs Marketplace List vs Effective Sale)
  
  // A) Determine STANDARD BASE PRICE (The price in the Active Book or being Built)
  let standardBasePrice = 0;
  let isOverridden = false;
  const overrideKey = `${karat}:${width}:${size}`;
  const overridePrice = settings.priceOverrides?.[overrideKey];

  if (lockedSalePrice !== undefined) {
      // Monitor Mode: Use the active book price as the standard reference
      standardBasePrice = lockedSalePrice;
  } else if (overridePrice !== undefined) {
      // Builder Mode: Manual Override
      standardBasePrice = overridePrice;
      isOverridden = true;
  } else {
      // Builder Mode: Auto Calculation
      let rawSalePrice = 0;
      const feeDecimal = baseFeeRate / 100;
      
      if (profitConfig.profitTargetMode === 'USD') {
        rawSalePrice = (baseCost + profitConfig.profitTargetValue) / (1 - feeDecimal);
      } else if (profitConfig.profitTargetMode === 'VARIABLE_PERCENT' && profitConfig.variableProfit) {
        const targetPercent = customTargetProfitPercent !== undefined 
            ? customTargetProfitPercent 
            : profitConfig.variableProfit.percentAtMin;
        const { fixedAddon = 0 } = profitConfig.variableProfit;
        const targetDecimal = targetPercent / 100;
        const denominator = 1 - feeDecimal - targetDecimal;
        if (denominator <= 0) rawSalePrice = (baseCost + fixedAddon) * 1.5; 
        else rawSalePrice = (baseCost + fixedAddon) / denominator;
      } else {
        const targetDecimal = profitConfig.profitTargetValue / 100;
        const denominator = 1 - feeDecimal - targetDecimal;
        if (denominator <= 0) rawSalePrice = baseCost * 1.5;
        else rawSalePrice = baseCost / denominator;
      }
      standardBasePrice = profitConfig.psychologicalRounding ? applyRounding(rawSalePrice) : rawSalePrice;
  }

  // B) Determine MARKETPLACE LIST PRICE
  // Use snapshot discount if available (stability), otherwise current settings
  // The list price is ALWAYS derived from the Standard Base Price.
  const discountPercent = snapshot?.marketplaceDiscount ?? settings.marketplaceDiscount ?? 0;
  const discountDecimal = discountPercent / 100;
  const divisor = 1 - discountDecimal;
  const marketplaceListPrice = (divisor > 0.001) ? standardBasePrice / divisor : standardBasePrice;

  // C) Determine EFFECTIVE SALE PRICE (Based on Simulation Mode)
  let effectiveSalePrice = standardBasePrice; // Default to Standard

  if (profitMode === 'coupon' && isEtsy) {
      // Coupon Mode: Apply coupon discount to the LIST PRICE
      // Get Coupon Rate from PROJECT SETTINGS (not global rates anymore)
      const couponPercent = settings.couponDiscountPercent ?? 30;
      const couponRate = couponPercent / 100;
      effectiveSalePrice = marketplaceListPrice * (1 - couponRate);
  } else if (profitMode === 'offsite' && isEtsy) {
      // Offsite Ads: We sell at Standard Price (typically)
      effectiveSalePrice = standardBasePrice;
  } else {
      // Standard Mode
      effectiveSalePrice = standardBasePrice;
  }

  // 7. Calculate Fees & Profit
  let totalFeeRate = baseFeeRate;
  if (profitMode === 'offsite' && isEtsy) {
      // Get Offsite Rate from PROJECT SETTINGS
      const offsitePercent = settings.offsiteAdsPercent ?? 15;
      totalFeeRate += offsitePercent;
  }

  const commissionCost = effectiveSalePrice * (totalFeeRate / 100);
  const totalCost = baseCost + commissionCost;
  const profitUSD = effectiveSalePrice - totalCost;
  const profitPercent = effectiveSalePrice > 0 ? (profitUSD / effectiveSalePrice) * 100 : 0;

  // 8. Break-Even Analysis
  const beFeeDecimal = totalFeeRate / 100;
  const beDenominator = 1 - beFeeDecimal;
  const breakEvenPrice = beDenominator > 0 ? baseCost / beDenominator : baseCost * 2;
  const breakEvenDelta = Math.max(0, breakEvenPrice - effectiveSalePrice);

  return {
    karat, size, width, 
    estimatedGram, w24,
    metalCost, laborCost, otherCosts, baseCost,
    salePrice: effectiveSalePrice, // The actual revenue amount for this simulation
    marketplaceSalePrice: marketplaceListPrice, // The persistent list price
    commissionCost, totalCost, profitUSD, profitPercent,
    isOverridden, goldPriceUsed: goldPrice, purityUsed: purity,
    breakEvenPrice, breakEvenDelta,
    _debug: {
        source: snapshot ? 'SNAPSHOT' : 'LIVE',
        baseFeeRate,
        metalCostFormula: `${w24.toFixed(3)}g(24K) * ${goldPrice} * ${purity}`,
        totalFeeRate,
        lockedPrice: lockedSalePrice,
        rawNetRevenue: effectiveSalePrice - commissionCost
    }
  };
};

// ... exports remain same
export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(val);
};

export const formatNumber = (val: number, decimals: number = 2) => {
  return val.toFixed(decimals);
};

export const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Europe/Istanbul',
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  };
  return new Intl.DateTimeFormat('en-GB', options).format(date);
};

export interface ProjectHealth {
  status: 'LOSS' | 'OK' | 'SETUP';
  minProfit: number;
  itemCount: number;
}

export const calculateProjectHealth = (
  project: ProjectSettings, 
  globalGoldPrice: number,
  profitThreshold: number = 0,
  globalMarketplaceRates?: MarketplaceRates
): ProjectHealth => {
  if (!project.activePriceBookId) return { status: 'SETUP', minProfit: 0, itemCount: 0 };
  const activeBook = project.priceBooks.find(b => b.id === project.activePriceBookId);
  if (!activeBook) return { status: 'SETUP', minProfit: 0, itemCount: 0 };

  let minProfit = Infinity;
  let itemCount = 0;
  const sizes = project.sizes && project.sizes.length > 0 
    ? project.sizes 
    : (project.productType === 'EARRING' ? [1] : getSizesForProduct(project.productType));
  const karats = project.activeKarats || [];

  for (const karat of karats) {
    for (const width of project.widths) {
      for (const size of sizes) {
        const key = `${karat}:${width}:${size}`;
        const lockedPrice = activeBook.prices[key];
        if (lockedPrice !== undefined) {
          const res = calculateRow(karat, size, width, project, lockedPrice, globalGoldPrice, undefined, globalMarketplaceRates, activeBook.snapshot);
          if (res.profitUSD < minProfit) minProfit = res.profitUSD;
          itemCount++;
        }
      }
    }
  }
  if (itemCount === 0) return { status: 'SETUP', minProfit: 0, itemCount: 0 };
  return { status: minProfit < profitThreshold ? 'LOSS' : 'OK', minProfit, itemCount };
};
