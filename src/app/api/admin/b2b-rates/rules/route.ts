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
    const { productId, rule } = body;

    if (!productId || !rule) {
      return NextResponse.json({ error: 'Missing productId or rule payload.' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const adminName = auth.user?.full_name || auth.user?.email || 'Super Admin';
    const now = new Date().toISOString();

    const ruleRecord: B2BPricingRule = {
      id: rule.id || `rule-${productId}`,
      product_id: productId,
      product_name: rule.product_name || 'Product',
      pricing_mode: rule.pricing_mode || 'multiplier',
      paper_rate_source: rule.paper_rate_source || 'chicken',
      multiplier: Number(rule.multiplier) || 1.0,
      fixed_addition: Number(rule.fixed_addition) || 0,
      manual_price: rule.manual_price !== undefined ? Number(rule.manual_price) : null,
      rounding_method: rule.rounding_method || 'nearest_1',
      min_selling_price: rule.min_selling_price !== undefined ? Number(rule.min_selling_price) : null,
      is_dynamic_enabled: rule.is_dynamic_enabled !== false,
      is_confirmed_by_owner: rule.is_confirmed_by_owner === true,
      manual_override_price: rule.manual_override_price !== undefined && rule.manual_override_price !== null ? Number(rule.manual_override_price) : null,
      manual_override_reason: rule.manual_override_reason || null,
      manual_override_expires_at: rule.manual_override_expires_at || null,
      manual_override_enabled: Boolean(rule.manual_override_enabled),
      updated_at: now,
      updated_by: adminName,
    };

    const { data, error } = await supabase
      .from('b2b_product_pricing_rules')
      .upsert([ruleRecord])
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
