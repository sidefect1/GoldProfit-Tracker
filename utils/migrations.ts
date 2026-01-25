
import { ProjectSettings, ProfitConfig } from '../types';
import { DEFAULT_PROJECT, KARATS, DEFAULT_PROFIT_CONFIG } from '../constants';

export const CURRENT_SCHEMA_VERSION = 6; // Incremented schema version for Store support

export const migrateProject = (project: any): ProjectSettings => {
    // Clone to avoid mutation
    const p = { ...project };

    // 1. Ensure basic fields
    if (!p.id) p.id = crypto.randomUUID();
    if (!p.name) p.name = "Untitled Project";
    if (!p.productType) p.productType = 'RING';
    
    // storeId is handled by the App importer if missing, 
    // but we ensure the field exists in the type.
    if (p.storeId === undefined) {
        // Will be assigned by App logic if importing legacy data
        // For now leave undefined or check upstream
    }

    // Backfill marketplace if missing
    if (!p.marketplace) {
        if (p.marketplaceFeePercentage !== undefined && p.marketplaceFeePercentage <= 6) {
            p.marketplace = 'shopify';
        } else {
            p.marketplace = 'etsy'; // Default
        }
    }

    if (!p.createdAt) p.createdAt = Date.now();
    if (!p.lastModified) p.lastModified = Date.now();
    
    // 2. Ensure Arrays & Objects
    if (!Array.isArray(p.activeKarats)) p.activeKarats = ['10K', '14K', '18K', '22K'];
    if (!Array.isArray(p.widths)) p.widths = [2,3,4,5,6,7,8];
    if (!Array.isArray(p.priceBooks)) p.priceBooks = [];
    if (!p.purities) p.purities = DEFAULT_PROJECT.purities;
    if (!p.anchors) p.anchors = DEFAULT_PROJECT.anchors;

    // 2.1 Backfill "sizes" if missing
    if (!Array.isArray(p.sizes)) {
        if (p.productType === 'EARRING') {
            p.sizes = [1];
        } else {
            p.sizes = []; 
        }
    }

    // 3. LABOR MIGRATION (Legacy -> Milyem)
    if (!p.laborModel) {
        const goldPrice = p.goldPricePerGram || 80;
        
        if (p.laborCostType === 'per_gram' && p.laborCostPerGram > 0) {
            p.laborModel = 'MILYEM_PER_GRAM';
            p.laborMilyem = Math.round((p.laborCostPerGram / goldPrice) * 1000);
        } else if (p.laborCostType === 'fixed' && p.laborCostFixed > 0) {
            p.laborModel = 'MILYEM_PER_ITEM';
            p.laborMilyem = Math.round((p.laborCostFixed / goldPrice) * 1000);
        } else if (p.laborCostType === 'gold_percent' || p.laborCostType === 'fixed_gold_percent') {
            p.laborModel = p.laborCostType === 'gold_percent' ? 'MILYEM_PER_GRAM' : 'MILYEM_PER_ITEM';
            p.laborMilyem = (p.laborCostGoldPercent || 0) * 10;
        } else {
            p.laborModel = 'MILYEM_PER_ITEM';
            p.laborMilyem = 0;
        }
    }

    delete p.laborCostType;
    delete p.laborCostFixed;
    delete p.laborCostPerGram;
    delete p.laborCostGoldPercent;

    if (p.isArchived === undefined) p.isArchived = false;
    
    // Backfill Simulation Settings
    if (p.marketplaceDiscount === undefined) p.marketplaceDiscount = 25;
    if (p.couponDiscountPercent === undefined) p.couponDiscountPercent = 30;
    if (p.offsiteAdsPercent === undefined) p.offsiteAdsPercent = 15;

    // 4. Weight Source Tracking Initialization
    if (!p.referenceExactWeightSources) {
        p.referenceExactWeightSources = {};
        if (p.referenceExactWeights) {
            Object.keys(p.referenceExactWeights).forEach(key => {
                if (p.referenceExactWeights[key] > 0) {
                    p.referenceExactWeightSources[key] = 'manual';
                }
            });
        }
    }
    
    if (!p.referenceExactWeightMethods) {
        p.referenceExactWeightMethods = {};
    }

    // 5. Ensure Reference Anchors (24K Master)
    if (!p.referenceAnchors) {
        if (p.anchors && p.anchors['14K']) {
             p.referenceAnchors = {};
             const ratio = 1 / (p.purities['14K'] || 0.585);
             Object.keys(p.anchors['14K']).forEach(w => {
                 const a = p.anchors['14K'][w];
                 p.referenceAnchors[w] = {
                     p1: parseFloat((a.p1 * ratio).toFixed(2)),
                     p2: parseFloat((a.p2 * ratio).toFixed(2)),
                     p3: parseFloat((a.p3 * ratio).toFixed(2))
                 };
             });
        } else {
            p.referenceAnchors = DEFAULT_PROJECT.referenceAnchors;
        }
    }

    // 6. PROFIT STRATEGY MIGRATION (Global -> Scoped)
    if (!p.profitStrategyByKarat) {
        p.profitStrategyByKarat = {};
        const legacyStrategy: ProfitConfig = {
            profitTargetMode: p.profitTargetMode || DEFAULT_PROFIT_CONFIG.profitTargetMode,
            profitTargetValue: p.profitTargetValue || DEFAULT_PROFIT_CONFIG.profitTargetValue,
            variableProfit: p.variableProfit || DEFAULT_PROFIT_CONFIG.variableProfit,
            psychologicalRounding: p.psychologicalRounding !== undefined ? p.psychologicalRounding : DEFAULT_PROFIT_CONFIG.psychologicalRounding
        };

        KARATS.forEach(k => {
            p.profitStrategyByKarat[k] = { ...legacyStrategy };
        });
    }

    delete p.profitTargetMode;
    delete p.profitTargetValue;
    delete p.variableProfit;
    delete p.psychologicalRounding;

    // 7. Thresholds
    if (!p.colorThresholds) {
        p.colorThresholds = DEFAULT_PROJECT.colorThresholds;
    }

    // 8. Setup Complete Flag
    if (p.isSetupComplete === undefined) {
        if (p.activeKarats.length > 0 && p.widths.length > 0) {
            p.isSetupComplete = true;
        } else {
            p.isSetupComplete = false;
        }
    }

    return p as ProjectSettings;
};
