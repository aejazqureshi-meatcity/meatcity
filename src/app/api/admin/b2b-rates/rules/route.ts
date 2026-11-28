import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth-server';
import { getServiceClient, B2BPricingRule } from '@/lib/pricing/b2b-pricing-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await verifyAdminSession(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Admin authorization required' }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const supabase = getServiceClient();
    const adminName = auth.user?.full_name || auth.user?.email || 'Super Admin';
    const now = new Date().toISOString();

    // 1. Bulk Upsert Support
    if (body.bulkRules && Array.isArray(body.bulkRules) && body.bulkRules.length > 0) {
      // Fetch existing rules to preserve unedited metadata
      const productIds = body.bulkRules.map((b: any) => b.productId || b.product_id).filter(Boolean);
      const { data: allRules } = await supabase
        .from('b2b_product_pricing_rules')
        .select('*');
      const existingList = (allRules || []).filter((r: any) => productIds.includes(r.product_id));
      const existingMap = new Map((existingList || []).map((r: any) => [r.product_id, r]));

      const ruleRecords: B2BPricingRule[] = body.bulkRules.map((item: any) => {
        const pId = item.productId || item.product_id;
        const r = item.rule || item;
        const prev = existingMap.get(pId) || {};

        return {
          id: prev.id || r.id || `rule-${pId}`,
          product_id: pId,
          product_name: r.product_name || prev.product_name || 'Product',
          pricing_mode: r.pricing_mode || prev.pricing_mode || 'multiplier',
          paper_rate_source: r.paper_rate_source || prev.paper_rate_source || 'chicken',
          multiplier: Number(r.multiplier ?? prev.multiplier ?? 1.0),
          fixed_addition: Number(r.fixed_addition ?? prev.fixed_addition ?? 0),
          manual_price: r.manual_price !== undefined ? (r.manual_price !== null ? Number(r.manual_price) : null) : (prev.manual_price ?? null),
          rounding_method: r.rounding_method || prev.rounding_method || 'nearest_1',
          min_selling_price: r.min_selling_price !== undefined ? (r.min_selling_price !== null ? Number(r.min_selling_price) : null) : (prev.min_selling_price ?? null),
          is_dynamic_enabled: r.is_dynamic_enabled !== undefined ? Boolean(r.is_dynamic_enabled) : (prev.is_dynamic_enabled !== false),
          is_confirmed_by_owner: r.is_confirmed_by_owner !== undefined ? Boolean(r.is_confirmed_by_owner) : (prev.is_confirmed_by_owner === true),
          manual_override_price: r.manual_override_price !== undefined ? (r.manual_override_price !== null ? Number(r.manual_override_price) : null) : (prev.manual_override_price ?? null),
          manual_override_reason: r.manual_override_reason || prev.manual_override_reason || null,
          manual_override_expires_at: r.manual_override_expires_at || prev.manual_override_expires_at || null,
          manual_override_enabled: r.manual_override_enabled !== undefined ? Boolean(r.manual_override_enabled) : Boolean(prev.manual_override_enabled),
          updated_at: now,
          updated_by: adminName,
        };
      });

      const { data, error } = await supabase
        .from('b2b_product_pricing_rules')
        .upsert(ruleRecords, { onConflict: 'product_id' })
        .select();

      if (error) {
        throw new Error(error.message);
      }

      // Audit log
      await supabase.from('b2b_pricing_audit_logs').insert([
        {
          id: 'audit-' + Date.now().toString(36),
          action: 'bulk_update_rules',
          details: { count: ruleRecords.length, updatedProductIds: productIds, adminName },
          admin_id: auth.user?.id || 'admin',
          created_at: now,
        },
      ]);

      return NextResponse.json({
        success: true,
        count: ruleRecords.length,
        rules: data || ruleRecords,
      });
    }

    // 2. Single Rule Upsert
    const { productId, rule } = body;

    if (!productId || !rule) {
      return NextResponse.json({ error: 'Missing productId or rule payload.' }, { status: 400 });
    }

    // Check for existing rule to preserve attributes if partial update
    const { data: prevRule } = await supabase
      .from('b2b_product_pricing_rules')
      .select('*')
      .eq('product_id', productId)
      .maybeSingle();

    const ruleRecord: B2BPricingRule = {
      id: prevRule?.id || rule.id || `rule-${productId}`,
      product_id: productId,
      product_name: rule.product_name || prevRule?.product_name || 'Product',
      pricing_mode: rule.pricing_mode || prevRule?.pricing_mode || 'multiplier',
      paper_rate_source: rule.paper_rate_source || prevRule?.paper_rate_source || 'chicken',
      multiplier: Number(rule.multiplier ?? prevRule?.multiplier ?? 1.0),
      fixed_addition: Number(rule.fixed_addition ?? prevRule?.fixed_addition ?? 0),
      manual_price: rule.manual_price !== undefined ? (rule.manual_price !== null ? Number(rule.manual_price) : null) : (prevRule?.manual_price ?? null),
      rounding_method: rule.rounding_method || prevRule?.rounding_method || 'nearest_1',
      min_selling_price: rule.min_selling_price !== undefined ? (rule.min_selling_price !== null ? Number(rule.min_selling_price) : null) : (prevRule?.min_selling_price ?? null),
      is_dynamic_enabled: rule.is_dynamic_enabled !== undefined ? Boolean(rule.is_dynamic_enabled) : (prevRule?.is_dynamic_enabled !== false),
      is_confirmed_by_owner: rule.is_confirmed_by_owner !== undefined ? Boolean(rule.is_confirmed_by_owner) : (prevRule?.is_confirmed_by_owner === true),
      manual_override_price: rule.manual_override_price !== undefined ? (rule.manual_override_price !== null ? Number(rule.manual_override_price) : null) : (prevRule?.manual_override_price ?? null),
      manual_override_reason: rule.manual_override_reason || prevRule?.manual_override_reason || null,
      manual_override_expires_at: rule.manual_override_expires_at || prevRule?.manual_override_expires_at || null,
      manual_override_enabled: rule.manual_override_enabled !== undefined ? Boolean(rule.manual_override_enabled) : Boolean(prevRule?.manual_override_enabled),
      updated_at: now,
      updated_by: adminName,
    };

    const { data, error } = await supabase
      .from('b2b_product_pricing_rules')
      .upsert([ruleRecord], { onConflict: 'product_id' })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Audit log
    await supabase.from('b2b_pricing_audit_logs').insert([
      {
        id: 'audit-' + Date.now().toString(36),
        action: 'update_rule',
        details: { productId, ruleRecord, adminName },
        admin_id: auth.user?.id || 'admin',
        created_at: now,
      },
    ]);

    return NextResponse.json({
      success: true,
      rule: data || ruleRecord,
    });
  } catch (err: any) {
    console.error('[API Admin B2B Rates Rules] POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update pricing rule' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await verifyAdminSession(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Admin authorization required' }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'productId query parameter required.' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { error } = await supabase
      .from('b2b_product_pricing_rules')
      .delete()
      .eq('product_id', productId);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, message: 'Pricing rule unlinked successfully.' });
  } catch (err: any) {
    console.error('[API Admin B2B Rates Rules] DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete pricing rule' }, { status: 500 });
  }
}
