import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export type PricingMode = 'multiplier' | 'fixed_addition' | 'multiplier_fixed_addition' | 'manual';
export type RoundingMethod = 'exact' | 'nearest_1' | 'nearest_5' | 'nearest_10' | 'ceil_5' | 'ceil_10';

export interface B2BPaperRate {
  id: string;
  rate_type: string;
  current_rate: number;
  previous_rate: number | null;
  effective_date: string;
  published_at: string;
  published_by: string;
  status: 'published' | 'draft';
  created_at?: string;
  updated_at?: string;
}

export interface B2BPricingRule {
  id: string;
  product_id: string;
  product_name: string;
  pricing_mode: PricingMode;
  paper_rate_source: string;
  multiplier: number;
  fixed_addition: number;
  manual_price: number | null;
  rounding_method: RoundingMethod;
  min_selling_price: number | null;
  is_dynamic_enabled: boolean;
  is_confirmed_by_owner: boolean;
  manual_override_price: number | null;
  manual_override_reason: string | null;
  manual_override_expires_at: string | null;
  manual_override_enabled: boolean;
  updated_at?: string;
  updated_by?: string;
}

export interface B2BRateHistoryEntry {
  id: string;
  paper_rate: number;
  previous_paper_rate: number | null;
  effective_date: string;
  published_at: string;
  published_by: string;
  products_updated_count: number;
  snapshot: Array<{
    product_id: string;
    product_name: string;
    old_price: number;
    new_price: number;
    multiplier: number;
    pricing_mode: PricingMode;
    override_active: boolean;
  }>;
  restored_from_id?: string | null;
  created_at: string;
}

export interface ProductPricePreview {
  productId: string;
  productName: string;
  category: string;
  imageUrl?: string;
  unit: string;
  pricingMode: PricingMode;
  multiplier: number;
  fixedAddition: number;
  roundingMethod: RoundingMethod;
  currentB2BPrice: number;
  calculatedNewPrice: number;
  difference: number;
  percentChange: number;
  isDynamicEnabled: boolean;
  isConfirmedByOwner: boolean;
  isOverrideActive: boolean;
  overridePrice?: number | null;
  overrideReason?: string | null;
}

// 10 Standard Target Chicken Products from Owner Configuration
export const TARGET_CHICKEN_PRODUCTS = [
  { name: 'Chicken Curry Cut', defaultMultiplier: 1.60, isConfirmed: true },
  { name: 'Breast Boneless', defaultMultiplier: 2.30, isConfirmed: true },
  { name: 'Leg Boneless', defaultMultiplier: 2.10, isConfirmed: false },
  { name: 'Chicken Biryani Cut', defaultMultiplier: 1.70, isConfirmed: false },
  { name: 'Chicken Drumsticks', defaultMultiplier: 1.80, isConfirmed: false },
  { name: 'Chicken Lollipop', defaultMultiplier: 2.00, isConfirmed: false },
  { name: 'Chicken Strips', defaultMultiplier: 2.40, isConfirmed: false },
  { name: 'Chicken Cubes', defaultMultiplier: 2.40, isConfirmed: false },
  { name: 'Chicken Wings', defaultMultiplier: 1.50, isConfirmed: false },
  { name: 'Chicken Keema', defaultMultiplier: 2.30, isConfirmed: false },
];

/**
 * Service role client for privileged B2B pricing database operations
 */
export function getServiceClient() {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (useMock) {
    const { MockSupabaseClient } = require('../supabase-mock');
    return new MockSupabaseClient() as any;
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (serviceRoleKey && supabaseUrl) {
    return createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return createServerSupabase();
}

/**
 * Apply rounding method to calculated raw price
 */
export function applyRounding(rawPrice: number, method: RoundingMethod): number {
  if (isNaN(rawPrice) || rawPrice <= 0) return 0;

  switch (method) {
    case 'nearest_1':
      return Math.round(rawPrice);
    case 'nearest_5':
      return Math.round(rawPrice / 5) * 5;
    case 'nearest_10':
      return Math.round(rawPrice / 10) * 10;
    case 'ceil_5':
      return Math.ceil(rawPrice / 5) * 5;
    case 'ceil_10':
      return Math.ceil(rawPrice / 10) * 10;
    case 'exact':
    default:
      return Math.round(rawPrice * 100) / 100;
  }
}

/**
 * Calculate final selling price for a single product pricing rule given a paper rate
 */
export function calculateSellingPrice(paperRate: number, rule: B2BPricingRule): number {
  // 1. Check for active manual override
  if (rule.manual_override_enabled && typeof rule.manual_override_price === 'number' && rule.manual_override_price > 0) {
    if (rule.manual_override_expires_at) {
      const expiresAt = new Date(rule.manual_override_expires_at).getTime();
      if (!isNaN(expiresAt) && expiresAt > Date.now()) {
        return rule.manual_override_price;
      }
    } else {
      return rule.manual_override_price;
    }
  }

  // 2. If dynamic pricing is disabled for this product, use manual price
  if (!rule.is_dynamic_enabled) {
    return rule.manual_price || 0;
  }

  // 3. Calculate price based on selected pricing mode
  let rawPrice = 0;
  const multiplier = Number(rule.multiplier) || 1.0;
  const fixedAddition = Number(rule.fixed_addition) || 0;

  switch (rule.pricing_mode) {
    case 'multiplier':
      rawPrice = paperRate * multiplier;
      break;
    case 'fixed_addition':
      rawPrice = paperRate + fixedAddition;
      break;
    case 'multiplier_fixed_addition':
      rawPrice = (paperRate * multiplier) + fixedAddition;
      break;
    case 'manual':
      rawPrice = Number(rule.manual_price) || 0;
      break;
    default:
      rawPrice = paperRate * multiplier;
  }

  // 4. Apply minimum selling price if configured
  if (rule.min_selling_price && rawPrice < rule.min_selling_price) {
    rawPrice = rule.min_selling_price;
  }

  // 5. Apply rounding
  return applyRounding(rawPrice, rule.rounding_method || 'nearest_1');
}

/**
 * Fetch current published chicken paper rate
 */
export async function getCurrentPaperRate(): Promise<B2BPaperRate> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('b2b_paper_rates')
    .select('*')
    .eq('rate_type', 'chicken')
    .order('published_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return {
      id: 'default-rate',
      rate_type: 'chicken',
      current_rate: 140,
      previous_rate: 135,
      effective_date: new Date().toISOString().split('T')[0],
      published_at: new Date().toISOString(),
      published_by: 'Super Admin',
      status: 'published',
    };
  }

  return data[0] as B2BPaperRate;
}

/**
 * Fetch all pricing rules joined with current product data
 */
export async function getPricingRulesWithProducts(): Promise<{
  rules: B2BPricingRule[];
  products: any[];
  currentRate: B2BPaperRate;
  unmatchedTargets: typeof TARGET_CHICKEN_PRODUCTS;
}> {
  const supabase = getServiceClient();

  // 1. Fetch current paper rate
  const currentRate = await getCurrentPaperRate();

  // 2. Fetch all products
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('name');

  const allProducts = products || [];

  // 3. Fetch all pricing rules
  const { data: rulesData } = await supabase
    .from('b2b_product_pricing_rules')
    .select('*');

  let rules: B2BPricingRule[] = rulesData || [];

  // 4. Determine unmatched chicken target products
  const unmatchedTargets = TARGET_CHICKEN_PRODUCTS.filter((target) => {
    return !allProducts.some((p: any) => p.name.toLowerCase().includes(target.name.toLowerCase()));
  });

  return {
    rules,
    products: allProducts,
    currentRate,
    unmatchedTargets,
  };
}

/**
 * Generate preview of new prices given a new paper rate and optional rule overrides
 */
export async function generatePricePreview(
  newPaperRate: number,
  customRules?: Partial<B2BPricingRule>[]
): Promise<ProductPricePreview[]> {
  const { rules, products } = await getPricingRulesWithProducts();

  const previews: ProductPricePreview[] = [];

  for (const rule of rules) {
    const product = products.find((p) => p.id === rule.product_id);
    if (!product) continue;

    // Apply any custom modifications passed in for preview
    const effectiveRule: B2BPricingRule = {
      ...rule,
      ...(customRules?.find((cr) => cr.product_id === rule.product_id) || {}),
    };

    const currentB2BPrice = Number(product.price_b2b) || 0;
    const calculatedNewPrice = calculateSellingPrice(newPaperRate, effectiveRule);
    const difference = calculatedNewPrice - currentB2BPrice;
    const percentChange = currentB2BPrice > 0 
      ? Math.round(((calculatedNewPrice - currentB2BPrice) / currentB2BPrice) * 1000) / 10 
      : 0;

    previews.push({
      productId: product.id,
      productName: product.name,
      category: product.category,
      imageUrl: product.image_url,
      unit: product.unit || 'kg',
      pricingMode: effectiveRule.pricing_mode,
      multiplier: effectiveRule.multiplier,
      fixedAddition: effectiveRule.fixed_addition,
      roundingMethod: effectiveRule.rounding_method,
      currentB2BPrice,
      calculatedNewPrice,
      difference,
      percentChange,
      isDynamicEnabled: effectiveRule.is_dynamic_enabled,
      isConfirmedByOwner: effectiveRule.is_confirmed_by_owner,
      isOverrideActive: effectiveRule.manual_override_enabled && Boolean(effectiveRule.manual_override_price),
      overridePrice: effectiveRule.manual_override_price,
      overrideReason: effectiveRule.manual_override_reason,
    });
  }

  return previews;
}

/**
 * Publish all B2B rates atomically across database
 */
export async function publishB2BRates(params: {
  newPaperRate: number;
  effectiveDate?: string;
  adminName: string;
  adminId: string;
  customMultipliers?: Record<string, number>;
}): Promise<{
  success: boolean;
  publishedRate: number;
  previousRate: number;
  effectiveDate: string;
  publishedAt: string;
  updatedProductsCount: number;
  snapshot: any[];
}> {
  const { newPaperRate, adminName, adminId, customMultipliers = {} } = params;

  if (typeof newPaperRate !== 'number' || isNaN(newPaperRate) || newPaperRate <= 0) {
    throw new Error('Invalid paper rate. Please enter a positive numerical rate per kg.');
  }

  const supabase = getServiceClient();
  const currentRateObj = await getCurrentPaperRate();
  const previousRate = currentRateObj.current_rate;
  const effectiveDate = params.effectiveDate || new Date().toISOString().split('T')[0];
  const publishedAt = new Date().toISOString();

  // 1. Fetch rules and products
  const { rules, products } = await getPricingRulesWithProducts();

  const snapshot: any[] = [];
  const productUpdates: Array<{ id: string; price_b2b: number; name: string }> = [];

  // 2. Calculate new prices for all linked products
  for (const rule of rules) {
    const product = products.find((p) => p.id === rule.product_id);
    if (!product) continue;

    // Apply multiplier override if admin edited directly in preview
    if (customMultipliers[rule.product_id] !== undefined) {
      rule.multiplier = Number(customMultipliers[rule.product_id]);
      // Update rule in database
      await supabase
        .from('b2b_product_pricing_rules')
        .update({ multiplier: rule.multiplier, updated_at: publishedAt, updated_by: adminName })
        .eq('product_id', rule.product_id);
    }

    const oldPrice = Number(product.price_b2b) || 0;
    const newPrice = calculateSellingPrice(newPaperRate, rule);

    snapshot.push({
      product_id: product.id,
      product_name: product.name,
      old_price: oldPrice,
      new_price: newPrice,
      multiplier: rule.multiplier,
      pricing_mode: rule.pricing_mode,
      override_active: rule.manual_override_enabled && Boolean(rule.manual_override_price),
    });

    productUpdates.push({
      id: product.id,
      price_b2b: newPrice,
      name: product.name,
    });
  }

  // 3. Atomically update all products
  for (const update of productUpdates) {
    const { error: prodErr } = await supabase
      .from('products')
      .update({ price_b2b: update.price_b2b })
      .eq('id', update.id);

    if (prodErr) {
      console.error(`Failed to update price_b2b for product ${update.id}:`, prodErr);
      throw new Error(`Failed to update price for ${update.name}: ${prodErr.message}`);
    }
  }

  // 4. Save to rate history
  const historyEntry: B2BRateHistoryEntry = {
    id: 'hist-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5),
    paper_rate: newPaperRate,
    previous_paper_rate: previousRate,
    effective_date: effectiveDate,
    published_at: publishedAt,
    published_by: adminName,
    products_updated_count: productUpdates.length,
    snapshot,
    created_at: publishedAt,
  };

  const { error: histErr } = await supabase
    .from('b2b_rate_history')
    .insert([historyEntry]);

  if (histErr) {
    console.error('Failed to write b2b_rate_history:', histErr);
  }

  // 5. Update b2b_paper_rates
  const rateRecord: B2BPaperRate = {
    id: 'rate-chicken-current',
    rate_type: 'chicken',
    current_rate: newPaperRate,
    previous_rate: previousRate,
    effective_date: effectiveDate,
    published_at: publishedAt,
    published_by: adminName,
    status: 'published',
    updated_at: publishedAt,
  };

  const { error: rateErr } = await supabase
    .from('b2b_paper_rates')
    .upsert([rateRecord]);

  if (rateErr) {
    console.error('Failed to upsert b2b_paper_rates:', rateErr);
  }

  // 6. Record in audit log
  await supabase.from('b2b_pricing_audit_logs').insert([
    {
      id: 'audit-' + Date.now().toString(36),
      action: 'publish_daily_rates',
      details: {
        newPaperRate,
        previousRate,
        effectiveDate,
        productsUpdated: productUpdates.length,
        adminName,
      },
      admin_id: adminId,
      created_at: publishedAt,
    },
  ]);

  return {
    success: true,
    publishedRate: newPaperRate,
    previousRate,
    effectiveDate,
    publishedAt,
    updatedProductsCount: productUpdates.length,
    snapshot,
  };
}

/**
 * Restore price list from a historical publication snapshot
 */
export async function restoreHistoryRates(
  historyId: string,
  adminName: string,
  adminId: string
): Promise<{ success: boolean; restoredRate: number; restoredProductsCount: number }> {
  const supabase = getServiceClient();

  const { data: histData, error: histErr } = await supabase
    .from('b2b_rate_history')
    .select('*')
    .eq('id', historyId)
    .single();

  if (histErr || !histData) {
    throw new Error('Historical rate snapshot not found.');
  }

  const snapshot = histData.snapshot || [];
  let updatedCount = 0;

  for (const item of snapshot) {
    const { error: updErr } = await supabase
      .from('products')
      .update({ price_b2b: item.new_price })
      .eq('id', item.product_id);

    if (!updErr) updatedCount++;
  }

  const now = new Date().toISOString();

  // Update current paper rate record
  await supabase.from('b2b_paper_rates').upsert([
    {
      id: 'rate-chicken-current',
      rate_type: 'chicken',
      current_rate: histData.paper_rate,
      previous_rate: histData.previous_paper_rate,
      effective_date: histData.effective_date,
      published_at: now,
      published_by: `${adminName} (Restored)`,
      status: 'published',
      updated_at: now,
    },
  ]);

  // Audit log
  await supabase.from('b2b_pricing_audit_logs').insert([
    {
      id: 'audit-' + Date.now().toString(36),
      action: 'restore_previous_rates',
      details: {
        restoredFromHistoryId: historyId,
        paperRate: histData.paper_rate,
        productsRestored: updatedCount,
        adminName,
      },
      admin_id: adminId,
      created_at: now,
    },
  ]);

  return {
    success: true,
    restoredRate: histData.paper_rate,
    restoredProductsCount: updatedCount,
  };
}

/**
 * Format WhatsApp-ready Daily B2B Rate List for customers
 * Excludes internal paper rates, multipliers, or cost formulas.
 */
export async function generateWhatsAppRateList(dateStr?: string): Promise<{
  plainText: string;
  effectiveDate: string;
  items: Array<{ name: string; price: number; unit: string }>;
}> {
  const supabase = getServiceClient();
  const currentRateObj = await getCurrentPaperRate();
  const effectiveDate = dateStr || currentRateObj.effective_date;

  const { data: products } = await supabase
    .from('products')
    .select('name, price_b2b, unit, category, is_available')
    .order('name');

  const b2bItems = (products || [])
    .filter((p: any) => typeof p.price_b2b === 'number' && p.price_b2b > 0 && p.is_available !== false)
    .map((p: any) => ({
      name: p.name,
      price: p.price_b2b,
      unit: p.unit || 'kg',
    }));

  const formattedDate = new Date(effectiveDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const lines = [
    `*🍗 MEATCITY — DAILY WHOLESALE RATE LIST*`,
    `*Turbhe Hub, Navi Mumbai*`,
    `📅 *Effective Date:* ${formattedDate}`,
    `----------------------------------------`,
    ...b2bItems.map((item: any) => `• *${item.name}:* ₹${item.price}/${item.unit}`),
    `----------------------------------------`,
    `*Wholesale Terms:*`,
    `✓ 100% Halal Certified & Fresh Morning Cuts`,
    `✓ Minimum wholesale order: 10kg`,
    `✓ Dispatch Slots: 6:00 AM – 8:00 AM | 4:00 PM – 6:00 PM`,
    `✓ Order on website: https://www.meatcity.in`,
    `✓ WhatsApp enquiries: +91 79776 30912`,
    `----------------------------------------`,
    `_Rates subject to daily wholesale paper fluctuations._`,
  ];

  return {
    plainText: lines.join('\n'),
    effectiveDate,
    items: b2bItems,
  };
}
