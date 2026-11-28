import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'mock_db.json');

// Helper to read DB
export function readDb() {
  try {
    const defaultDb = { 
      users: [], 
      products: [], 
      orders: [], 
      categories: [], 
      coupons: [
        { code: 'WELCOME20', discount_percent: 20, flat_discount: 0, min_order_amount: 0, expiry_date: '2026-12-31', usage_limit: 1000, is_active: true },
        { code: 'EID25', discount_percent: 25, flat_discount: 0, min_order_amount: 500, expiry_date: '2026-12-31', usage_limit: 1000, is_active: true },
        { code: 'B2B10', discount_percent: 10, flat_discount: 0, min_order_amount: 1000, expiry_date: '2026-12-31', usage_limit: 1000, is_active: true }
      ], 
      wishlists: [], 
      addresses: [], 
      serviceable_pincodes: [
        { pincode: '400705', delivery_charge: 50 },
        { pincode: '400703', delivery_charge: 50 },
        { pincode: '400701', delivery_charge: 60 },
        { pincode: '400706', delivery_charge: 50 },
        { pincode: '400709', delivery_charge: 70 }
      ], 
      reviews: [
        { id: 'rev-1', customer_name: 'Aejaz Qureshi', rating: 5, comment: 'Fresh meat and fast delivery.', status: 'approved', created_at: new Date().toISOString() },
        { id: 'rev-2', customer_name: 'Altaf Shaikh', rating: 5, comment: 'Best wholesale rates in Navi Mumbai.', status: 'approved', created_at: new Date().toISOString() }
      ],
      admin_settings: [
        { key: 'whatsapp_notifications_enabled', value: 'true' },
        { key: 'admin_whatsapp_number', value: '917977630912' },
        { key: 'is_open', value: 'true' },
        { key: 'delivery_fee', value: '50' },
        { key: 'free_delivery_above', value: '999' },
        { key: 'minimum_b2c_order', value: '200' },
        { key: 'minimum_b2b_order', value: '1000' }
      ],
      sales_leads: [],
      sales_messages: [],
      sales_quotations: [],
      sales_follow_ups: [],
      sales_settings: [
        { key: 'business_name', value: 'MeatCity' },
        { key: 'business_hub', value: 'Shop No.2, Sector 20, Turbhe, Navi Mumbai - 400705' },
        { key: 'official_whatsapp', value: '917977630912' },
        { key: 'min_b2b_order_kg', value: '10' },
        { key: 'wholesale_payment_terms', value: 'Cash on Delivery / UPI / 7-Day Verified Credit' },
        { key: 'preferred_tone', value: 'respectful_roman_hinglish' },
        { key: 'delivery_slots', value: 'Morning 6:00 AM - 8:00 AM, Evening 4:00 PM - 6:00 PM' }
      ],
      loyalty_settings: [
        {
          id: 1,
          is_enabled: true,
          points_per_rupee: 0.02,
          point_rupee_value: 1.0,
          min_order_amount_for_earn: 100,
          min_points_for_redemption: 50,
          max_redemption_percent_per_order: 10,
          max_points_redemption_per_order: 1000,
          points_expiry_days: 180,
          can_combine_with_coupons: false,
          discounted_products_earn_points: true,
          eligible_customer_types: ['b2c'],
          stamp_card_enabled: true,
          stamps_required_per_card: 10,
          min_order_for_stamp: 400,
          stamp_reward_type: 'free_product',
          stamp_reward_value: 0,
          max_stamps_per_day: 1,
          referral_enabled: false,
          referrer_reward_points: 0,
          referee_reward_discount: 0,
          min_order_for_referral: 0,
          birthday_reward_enabled: false,
          birthday_reward_points: 0
        }
      ],
      loyalty_tiers: [
        { id: 'silver', name: 'Silver Member', min_spend: 0, min_orders: 0, points_multiplier: 1.0, badge_color: '#C0C0C0', icon: '🥈', priority_order: 1 },
        { id: 'gold', name: 'Gold Member', min_spend: 2500, min_orders: 5, points_multiplier: 1.0, badge_color: '#D4AF37', icon: '🥇', priority_order: 2 },
        { id: 'platinum', name: 'Platinum VIP', min_spend: 7500, min_orders: 15, points_multiplier: 1.0, badge_color: '#E5E4E2', icon: '💎', priority_order: 3 }
      ],
      loyalty_accounts: [],
      loyalty_points_ledger: [],
      loyalty_points_reservations: [],
      loyalty_stamp_cards: [],
      loyalty_rewards: [
        {
          id: 'rwd-free-chicken-250g',
          title: '250g Chicken Curry Cut FREE',
          description: '10 stamps reward entitlement — 250g fresh Chicken Curry Cut free with qualifying order.',
          reward_type: 'free_product',
          reward_value: 0,
          points_cost: 0,
          min_order_amount: 400,
          is_active: true
        }
      ],
      loyalty_reward_claims: [],
      loyalty_referrals: [],
      loyalty_audit_logs: [],
      b2b_paper_rates: [
        {
          id: 'rate-chicken-current',
          rate_type: 'chicken',
          current_rate: 140,
          previous_rate: 135,
          effective_date: new Date().toISOString().split('T')[0],
          published_at: new Date().toISOString(),
          published_by: 'Aejaz Qureshi (Super Admin)',
          status: 'published',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      b2b_product_pricing_rules: [
        {
          id: 'rule-prod-1',
          product_id: 'prod-1',
          product_name: 'Chicken Curry Cut',
          pricing_mode: 'multiplier',
          paper_rate_source: 'chicken',
          multiplier: 1.60,
          fixed_addition: 0,
          manual_price: 220,
          rounding_method: 'nearest_1',
          min_selling_price: null,
          is_dynamic_enabled: true,
          is_confirmed_by_owner: true,
          manual_override_price: null,
          manual_override_reason: null,
          manual_override_expires_at: null,
          manual_override_enabled: false,
          updated_at: new Date().toISOString(),
          updated_by: 'Super Admin'
        },
        {
          id: 'rule-prod-2',
          product_id: 'prod-2',
          product_name: 'Chicken Breast Boneless',
          pricing_mode: 'multiplier',
          paper_rate_source: 'chicken',
          multiplier: 2.30,
          fixed_addition: 0,
          manual_price: 280,
          rounding_method: 'nearest_1',
          min_selling_price: null,
          is_dynamic_enabled: true,
          is_confirmed_by_owner: true,
          manual_override_price: null,
          manual_override_reason: null,
          manual_override_expires_at: null,
          manual_override_enabled: false,
          updated_at: new Date().toISOString(),
          updated_by: 'Super Admin'
        }
      ],
      b2b_rate_history: [
        {
          id: 'hist-init-001',
          paper_rate: 140,
          previous_paper_rate: 135,
          effective_date: new Date().toISOString().split('T')[0],
          published_at: new Date().toISOString(),
          published_by: 'Aejaz Qureshi (Super Admin)',
          products_updated_count: 2,
          snapshot: [
            {
              product_id: 'prod-1',
              product_name: 'Chicken Curry Cut',
              old_price: 220,
              new_price: 224,
              multiplier: 1.60,
              pricing_mode: 'multiplier',
              override_active: false
            },
            {
              product_id: 'prod-2',
              product_name: 'Chicken Breast Boneless',
              old_price: 280,
              new_price: 322,
              multiplier: 2.30,
              pricing_mode: 'multiplier',
              override_active: false
            }
          ],
          restored_from_id: null,
          created_at: new Date().toISOString()
        }
      ],
      b2b_pricing_audit_logs: [
        {
          id: 'audit-init-001',
          action: 'publish_daily_rates',
          details: {
            paper_rate: 140,
            previous_rate: 135,
            products_updated: 2,
            effective_date: new Date().toISOString().split('T')[0]
          },
          admin_id: 'admin-uuid-001',
          created_at: new Date().toISOString()
        }
      ]
    };

    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify(defaultDb, null, 2), 'utf8');
      return defaultDb;
    }

    const data = fs.readFileSync(dbPath, 'utf8');
    const parsed = JSON.parse(data);
    let changed = false;

    if (!parsed.users) { parsed.users = []; changed = true; }
    if (!parsed.products) { parsed.products = []; changed = true; }
    if (!parsed.orders) { parsed.orders = []; changed = true; }
    if (!parsed.categories) { parsed.categories = []; changed = true; }
    if (!parsed.coupons) { parsed.coupons = defaultDb.coupons; changed = true; }
    if (!parsed.wishlists) { parsed.wishlists = []; changed = true; }
    if (!parsed.addresses) { parsed.addresses = []; changed = true; }
    if (!parsed.serviceable_pincodes) { parsed.serviceable_pincodes = defaultDb.serviceable_pincodes; changed = true; }
    if (!parsed.reviews) { parsed.reviews = defaultDb.reviews; changed = true; }
    if (!parsed.admin_settings) { parsed.admin_settings = defaultDb.admin_settings; changed = true; }
    if (!parsed.sales_leads) { parsed.sales_leads = defaultDb.sales_leads; changed = true; }
    if (!parsed.sales_messages) { parsed.sales_messages = []; changed = true; }
    if (!parsed.sales_quotations) { parsed.sales_quotations = []; changed = true; }
    if (!parsed.sales_follow_ups) { parsed.sales_follow_ups = defaultDb.sales_follow_ups; changed = true; }
    if (!parsed.sales_settings) { parsed.sales_settings = defaultDb.sales_settings; changed = true; }
    if (!parsed.loyalty_settings || parsed.loyalty_settings.length === 0) { parsed.loyalty_settings = defaultDb.loyalty_settings; changed = true; }
    if (!parsed.loyalty_tiers || parsed.loyalty_tiers.length === 0) { parsed.loyalty_tiers = defaultDb.loyalty_tiers; changed = true; }
    if (!parsed.loyalty_accounts) { parsed.loyalty_accounts = []; changed = true; }
    if (!parsed.loyalty_points_ledger) { parsed.loyalty_points_ledger = []; changed = true; }
    if (!parsed.loyalty_points_reservations) { parsed.loyalty_points_reservations = []; changed = true; }
    if (!parsed.loyalty_stamp_cards) { parsed.loyalty_stamp_cards = []; changed = true; }
    if (!parsed.loyalty_rewards) { parsed.loyalty_rewards = defaultDb.loyalty_rewards; changed = true; }
    if (!parsed.loyalty_reward_claims) { parsed.loyalty_reward_claims = []; changed = true; }
    if (!parsed.loyalty_referrals) { parsed.loyalty_referrals = []; changed = true; }
    if (!parsed.loyalty_audit_logs) { parsed.loyalty_audit_logs = []; changed = true; }
    if (!parsed.b2b_paper_rates) { parsed.b2b_paper_rates = defaultDb.b2b_paper_rates; changed = true; }
    if (!parsed.b2b_product_pricing_rules) { parsed.b2b_product_pricing_rules = defaultDb.b2b_product_pricing_rules; changed = true; }
    if (!parsed.b2b_rate_history) { parsed.b2b_rate_history = defaultDb.b2b_rate_history; changed = true; }
    if (!parsed.b2b_pricing_audit_logs) { parsed.b2b_pricing_audit_logs = defaultDb.b2b_pricing_audit_logs; changed = true; }

    if (changed) {
      fs.writeFileSync(dbPath, JSON.stringify(parsed, null, 2), 'utf8');
    }
    return parsed;
  } catch (error) {
    console.error('Failed to read mock db:', error);
    return { users: [], products: [], orders: [], categories: [], coupons: [], wishlists: [], addresses: [], serviceable_pincodes: [], reviews: [], admin_settings: [] };
  }
}

// Helper to write DB
export function writeDb(data: any) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Failed to write mock db:', error);
    return false;
  }
}

// Helper to generate UUID
function generateUUID() {
  return 'uuid-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
}

// Core server-side query executor
export function executeServerQuery(query: any) {
  const db = readDb();
  const table = query.table;
  let data = db[table] || [];

  try {
    // 1. Handle INSERT
    if (query.isInsert) {
      const payloads = Array.isArray(query.payload) ? query.payload : [query.payload];
      const insertedRows = payloads.map((row: any) => {
        const newRow = { 
          id: row.id || generateUUID(), 
          created_at: new Date().toISOString(),
          ...row 
        };
        data.push(newRow);
        return newRow;
      });

      db[table] = data;
      writeDb(db);

      return { data: Array.isArray(query.payload) ? insertedRows : insertedRows[0], error: null };
    }

    // 1b. Handle UPSERT
    if (query.isUpsert) {
      const payloads = Array.isArray(query.payload) ? query.payload : [query.payload];
      const conflictKey = query.options?.onConflict || 'id';
      const resultRows: any[] = [];

      for (const item of payloads) {
        const existingIdx = data.findIndex((row: any) => 
          (item[conflictKey] && row[conflictKey] === item[conflictKey]) || 
          (item.id && row.id === item.id) || 
          (item.product_id && row.product_id === item.product_id)
        );
        if (existingIdx >= 0) {
          data[existingIdx] = { ...data[existingIdx], ...item, updated_at: new Date().toISOString() };
          resultRows.push(data[existingIdx]);
        } else {
          const newRow = { id: item.id || generateUUID(), created_at: new Date().toISOString(), ...item };
          data.push(newRow);
          resultRows.push(newRow);
        }
      }

      db[table] = data;
      writeDb(db);
      return { data: Array.isArray(query.payload) ? resultRows : resultRows[0], error: null };
    }

    // 2. Handle UPDATE
    if (query.isUpdate) {
      let updatedCount = 0;
      const updatedRows: any[] = [];
      data = data.map((row: any) => {
        // Apply filters
        let matches = true;
        for (const filter of query.filters || []) {
          if (filter.type === 'eq' && row[filter.column] !== filter.value) {
            matches = false;
            break;
          }
        }

        if (matches) {
          const updatedRow = { ...row, ...query.payload };
          updatedCount++;
          updatedRows.push(updatedRow);
          return updatedRow;
        }
        return row;
      });

      db[table] = data;
      writeDb(db);

      return { data: query.isSingle ? updatedRows[0] : updatedRows, error: null };
    }

    // 3. Handle DELETE
    if (query.isDelete) {
      const deletedRows: any[] = [];
      const remainingRows = data.filter((row: any) => {
        let matches = true;
        for (const filter of query.filters || []) {
          if (filter.type === 'eq' && row[filter.column] !== filter.value) {
            matches = false;
            break;
          }
        }
        if (matches) {
          deletedRows.push(row);
        }
        return !matches;
      });

      db[table] = remainingRows;
      writeDb(db);

      return { data: deletedRows, error: null };
    }

    // 4. Handle SELECT (Filter operations)
    let filteredData = [...data];

    // Apply filters
    for (const filter of query.filters || []) {
      if (filter.type === 'eq') {
        filteredData = filteredData.filter((row: any) => row[filter.column] === filter.value);
      } else if (filter.type === 'in' && Array.isArray(filter.value)) {
        filteredData = filteredData.filter((row: any) => filter.value.includes(row[filter.column]));
      }
    }

    // Apply sorting
    if (query.orderByColumn) {
      const col = query.orderByColumn;
      const asc = query.orderByAsc;
      filteredData.sort((a: any, b: any) => {
        let valA = a[col];
        let valB = b[col];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        
        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
        return 0;
      });
    }

    // Apply limit
    if (query.limitCount !== null && query.limitCount !== undefined) {
      filteredData = filteredData.slice(0, query.limitCount);
    }

    // Apply single
    if (query.isSingle) {
      return { data: filteredData[0] || null, count: filteredData.length ? 1 : 0, error: filteredData[0] ? null : { message: 'Row not found' } };
    }

    return { data: filteredData, count: filteredData.length, error: null };
  } catch (err: any) {
    console.error('Error executing mock query:', err);
    return { data: null, error: { message: err.message || 'Database error' } };
  }
}


// Core server-side RPC executor for loyalty and atomic transactions
export function executeServerRpc(functionName: string, params: any = {}) {
  const db = readDb();

  try {
    if (functionName === 'get_or_create_loyalty_account') {
      const userId = params.p_user_id || params.userId;
      if (!userId) return { data: null, error: { message: 'User ID is required' } };

      let account = (db.loyalty_accounts || []).find((a: any) => a.user_id === userId);
      if (!account) {
        account = {
          id: generateUUID(),
          user_id: userId,
          tier_id: 'silver',
          points_balance: 0,
          lifetime_points_earned: 0,
          lifetime_points_redeemed: 0,
          lifetime_spend: 0,
          total_orders_completed: 0,
          referral_code: 'MC' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          is_suspended: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        db.loyalty_accounts.push(account);

        // Create initial active stamp card
        db.loyalty_stamp_cards.push({
          id: generateUUID(),
          user_id: userId,
          card_number: 1,
          stamps_collected: 0,
          stamps_required: 10,
          status: 'active',
          created_at: new Date().toISOString(),
        });
        writeDb(db);
      }
      return { data: account, error: null };
    }

    if (functionName === 'reserve_loyalty_points') {
      const userId = params.p_user_id || params.userId;
      const points = Number(params.p_points || params.points || 0);
      const cartSessionId = String(params.p_cart_session_id || params.cartSessionId || 'default');

      if (!userId || points <= 0) {
        return { data: null, error: { message: 'Invalid user or points' } };
      }

      let account = (db.loyalty_accounts || []).find((a: any) => a.user_id === userId);
      const user = (db.users || []).find((u: any) => u.id === userId);
      if (user && user.user_type === 'b2b') {
        return { data: null, error: { message: 'B2B accounts are not eligible for retail loyalty points.' } };
      }

      // Check active unexpired reservations to prevent concurrent double-spending
      const activeHeldPoints = (db.loyalty_points_reservations || [])
        .filter((r: any) => r.user_id === userId && r.status === 'reserved' && new Date(r.expires_at) > new Date())
        .reduce((sum: number, r: any) => sum + (r.points || 0), 0);

      const availableBalance = (account?.points_balance || 0) - activeHeldPoints;
      if (!account || availableBalance < points) {
        return { data: null, error: { message: `Insufficient unreserved points. Available: ${Math.max(0, availableBalance)} pts.` } };
      }

      const resId = 'res-' + generateUUID();
      const reservation = {
        id: resId,
        user_id: userId,
        points: points,
        rupee_value: points * 1.0,
        cart_session_id: cartSessionId,
        status: 'reserved',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      };

      db.loyalty_points_reservations.push(reservation);
      writeDb(db);
      return { data: { reservation_id: resId, status: 'reserved' }, error: null };
    }

    if (functionName === 'release_loyalty_points_reservation') {
      const resId = params.p_reservation_id || params.reservationId;
      const reservation = (db.loyalty_points_reservations || []).find((r: any) => r.id === resId);
      if (reservation && reservation.status === 'reserved') {
        reservation.status = 'released';
        reservation.released_at = new Date().toISOString();
        writeDb(db);
      }
      return { data: { success: true }, error: null };
    }

    if (functionName === 'commit_loyalty_redemption') {
      const resId = params.p_reservation_id || params.reservationId;
      const orderId = params.p_order_id || params.orderId;

      const reservation = (db.loyalty_points_reservations || []).find((r: any) => r.id === resId);
      if (!reservation) {
        return { data: null, error: { message: 'Reservation not found' } };
      }

      if (reservation.status === 'committed') {
        return { data: { success: true, message: 'Already committed' }, error: null };
      }

      reservation.status = 'committed';
      reservation.order_id = orderId;

      const account = (db.loyalty_accounts || []).find((a: any) => a.user_id === reservation.user_id);
      if (account) {
        account.points_balance = Math.max(0, (account.points_balance || 0) - reservation.points);
        account.lifetime_points_redeemed = (account.lifetime_points_redeemed || 0) + reservation.points;
        account.updated_at = new Date().toISOString();

        db.loyalty_points_ledger.push({
          id: generateUUID(),
          user_id: reservation.user_id,
          order_id: orderId,
          transaction_type: 'redeemed',
          points: -reservation.points,
          balance_after: account.points_balance,
          rupee_equivalent: reservation.points * 1.0,
          description: `Redeemed ${reservation.points} points on Order #${orderId}`,
          created_at: new Date().toISOString()
        });
      }

      writeDb(db);
      return { data: { success: true }, error: null };
    }

    if (functionName === 'redeem_free_stamp_reward') {
      const claimCode = params.claim_code || params.p_claim_code;
      const orderId = params.order_id || params.p_order_id;
      const claim = (db.loyalty_reward_claims || []).find((c: any) => c.claim_code === claimCode);
      if (!claim) {
        return { data: null, error: { message: 'Reward claim not found' } };
      }
      if (claim.status !== 'active') {
        return { data: null, error: { message: `Reward claim is already ${claim.status}` } };
      }
      if (claim.expires_at && new Date(claim.expires_at) < new Date()) {
        claim.status = 'expired';
        writeDb(db);
        return { data: null, error: { message: 'Reward claim has expired' } };
      }
      claim.status = 'redeemed';
      claim.redeemed_order_id = orderId;
      claim.redeemed_at = new Date().toISOString();
      writeDb(db);
      return { data: { success: true, claim }, error: null };
    }

    if (functionName === 'process_order_refund') {
      const orderId = params.p_order_id || params.orderId;
      const refundAmount = Number(params.p_refund_amount || params.refundAmount || 0);
      const isFullRefund = Boolean(params.p_is_full || params.isFullRefund || false);

      const order = (db.orders || []).find((o: any) => String(o.id) === String(orderId));
      if (!order) return { data: null, error: { message: 'Order not found' } };

      const originalTotal = Number(order.subtotal || order.total || 0);
      if (isFullRefund || refundAmount >= originalTotal) {
        // Delegate to full reversal
        return executeServerRpc('reverse_order_loyalty', { p_order_id: orderId });
      }

      // Partial refund: recalculate earned points on remaining spend
      const remainingSpend = Math.max(0, originalTotal - refundAmount);
      const newPointsEarned = Math.floor(remainingSpend * 0.02);

      const earnedEntry = (db.loyalty_points_ledger || []).find(
        (l: any) => l.order_id === orderId && l.transaction_type === 'earned'
      );

      if (earnedEntry) {
        const pointsToDeduct = Math.max(0, earnedEntry.points - newPointsEarned);
        if (pointsToDeduct > 0) {
          const account = (db.loyalty_accounts || []).find((a: any) => a.user_id === earnedEntry.user_id);
          if (account) {
            account.points_balance = Math.max(0, (account.points_balance || 0) - pointsToDeduct);
            account.lifetime_points_earned = Math.max(0, (account.lifetime_points_earned || 0) - pointsToDeduct);
            account.updated_at = new Date().toISOString();

            db.loyalty_points_ledger.push({
              id: generateUUID(),
              user_id: earnedEntry.user_id,
              order_id: orderId,
              transaction_type: 'reversed',
              points: -pointsToDeduct,
              balance_after: account.points_balance,
              rupee_equivalent: pointsToDeduct * 1.0,
              description: `Partial refund adjustment (-₹${refundAmount}) for Order #${orderId}`,
              created_at: new Date().toISOString()
            });
          }
        }
      }

      writeDb(db);
      return { data: { success: true, remainingSpend, newPointsEarned }, error: null };
    }

    if (functionName === 'award_order_loyalty') {
      const orderId = params.p_order_id || params.orderId;
      if (!orderId) return { data: null, error: { message: 'Order ID is required' } };

      // Check if already awarded (idempotency)
      const alreadyAwarded = (db.loyalty_points_ledger || []).some(
        (l: any) => l.order_id === orderId && l.transaction_type === 'earned'
      );
      if (alreadyAwarded) {
        return { data: { success: true, message: 'Points already awarded for this order' }, error: null };
      }

      const order = (db.orders || []).find((o: any) => String(o.id) === String(orderId));
      if (!order) return { data: null, error: { message: 'Order not found' } };

      const user = (db.users || []).find((u: any) => u.id === order.user_id);
      if (user && user.user_type === 'b2b') {
        return { data: { success: true, message: 'B2B orders are not eligible for retail loyalty' }, error: null };
      }

      // Net merchandise spend = subtotal minus discounts, excluding delivery and free rewards
      const subtotal = Number(order.subtotal || order.total || 0);
      const discount = Number(order.coupon_discount || order.discount_amount || order.discount || 0);
      const loyaltyDiscount = Number(order.points_discount || order.loyalty_discount || 0);
      const netMerchandiseSpend = Math.max(0, subtotal - discount - loyaltyDiscount);

      // Points: 2 points per ₹100 spend -> 0.02
      let pointsToAward = 0;
      if (netMerchandiseSpend >= 100) {
        pointsToAward = Math.floor(netMerchandiseSpend * 0.02);
      }

      let account = (db.loyalty_accounts || []).find((a: any) => a.user_id === order.user_id);
      if (!account) {
        account = {
          id: generateUUID(),
          user_id: order.user_id,
          tier_id: 'silver',
          points_balance: 0,
          lifetime_points_earned: 0,
          lifetime_points_redeemed: 0,
          lifetime_spend: 0,
          total_orders_completed: 0,
          referral_code: 'MC' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        db.loyalty_accounts.push(account);
      }

      if (pointsToAward > 0) {
        account.points_balance = (account.points_balance || 0) + pointsToAward;
        account.lifetime_points_earned = (account.lifetime_points_earned || 0) + pointsToAward;
        account.lifetime_spend = (account.lifetime_spend || 0) + netMerchandiseSpend;
        account.total_orders_completed = (account.total_orders_completed || 0) + 1;
        account.updated_at = new Date().toISOString();

        db.loyalty_points_ledger.push({
          id: generateUUID(),
          user_id: order.user_id,
          order_id: orderId,
          transaction_type: 'earned',
          points: pointsToAward,
          balance_after: account.points_balance,
          rupee_equivalent: pointsToAward * 1.0,
          description: `Earned ${pointsToAward} points on completed Order #${orderId}`,
          created_at: new Date().toISOString()
        });
      }

      // Digital Stamp Card Award (1 stamp per qualifying completed order >= ₹400)
      let stampsAwarded = 0;
      if (netMerchandiseSpend >= 400 && !order.is_free_reward_only) {
        let activeCard = (db.loyalty_stamp_cards || []).find(
          (c: any) => c.user_id === order.user_id && c.status === 'active'
        );

        if (!activeCard) {
          activeCard = {
            id: generateUUID(),
            user_id: order.user_id,
            card_number: 1,
            stamps_collected: 0,
            stamps_required: 10,
            status: 'active',
            created_at: new Date().toISOString()
          };
          db.loyalty_stamp_cards.push(activeCard);
        }

        activeCard.stamps_collected = (activeCard.stamps_collected || 0) + 1;
        stampsAwarded = 1;

        // If completed 10 stamps -> unlock free Chicken Curry Cut (250g) reward
        if (activeCard.stamps_collected >= 10) {
          activeCard.status = 'completed';
          activeCard.completed_at = new Date().toISOString();
          const rewardCode = 'MC-CHICKEN-250G-' + Math.random().toString(36).substring(2, 8).toUpperCase();
          activeCard.reward_code = rewardCode;

          db.loyalty_reward_claims.push({
            id: generateUUID(),
            reward_id: 'rwd-free-chicken-250g',
            user_id: order.user_id,
            claim_code: rewardCode,
            points_spent: 0,
            title: '250g Chicken Curry Cut FREE',
            product_id: 'prod-1',
            quantity_grams: 250,
            status: 'active',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString()
          });

          // Start next cycle
          db.loyalty_stamp_cards.push({
            id: generateUUID(),
            user_id: order.user_id,
            card_number: (activeCard.card_number || 1) + 1,
            stamps_collected: 0,
            stamps_required: 10,
            status: 'active',
            created_at: new Date().toISOString()
          });
        }
      }

      writeDb(db);
      return { data: { success: true, pointsAwarded: pointsToAward, stampsAwarded }, error: null };
    }

    if (functionName === 'reverse_order_loyalty') {
      const orderId = params.p_order_id || params.orderId;
      // Find earned entry and reverse it
      const earnedEntry = (db.loyalty_points_ledger || []).find(
        (l: any) => l.order_id === orderId && l.transaction_type === 'earned'
      );

      if (earnedEntry) {
        const account = (db.loyalty_accounts || []).find((a: any) => a.user_id === earnedEntry.user_id);
        if (account) {
          account.points_balance = Math.max(0, (account.points_balance || 0) - earnedEntry.points);
          account.lifetime_points_earned = Math.max(0, (account.lifetime_points_earned || 0) - earnedEntry.points);
          account.updated_at = new Date().toISOString();

          db.loyalty_points_ledger.push({
            id: generateUUID(),
            user_id: earnedEntry.user_id,
            order_id: orderId,
            transaction_type: 'reversed',
            points: -earnedEntry.points,
            balance_after: account.points_balance,
            rupee_equivalent: earnedEntry.points * 1.0,
            description: `Reversed points for cancelled Order #${orderId}`,
            created_at: new Date().toISOString()
          });
        }
      }

      // If points were redeemed on this order, refund them!
      const redeemedEntry = (db.loyalty_points_ledger || []).find(
        (l: any) => l.order_id === orderId && l.transaction_type === 'redeemed'
      );

      if (redeemedEntry) {
        const pointsToRefund = Math.abs(redeemedEntry.points);
        const account = (db.loyalty_accounts || []).find((a: any) => a.user_id === redeemedEntry.user_id);
        if (account) {
          account.points_balance = (account.points_balance || 0) + pointsToRefund;
          account.lifetime_points_redeemed = Math.max(0, (account.lifetime_points_redeemed || 0) - pointsToRefund);
          account.updated_at = new Date().toISOString();

          db.loyalty_points_ledger.push({
            id: generateUUID(),
            user_id: redeemedEntry.user_id,
            order_id: orderId,
            transaction_type: 'bonus',
            points: pointsToRefund,
            balance_after: account.points_balance,
            rupee_equivalent: pointsToRefund * 1.0,
            description: `Refunded ${pointsToRefund} points from cancelled Order #${orderId}`,
            created_at: new Date().toISOString()
          });
        }
      }

      // If a stamp was awarded, decrement it
      const order = (db.orders || []).find((o: any) => String(o.id) === String(orderId));
      if (order) {
        const activeCard = (db.loyalty_stamp_cards || []).find(
          (c: any) => c.user_id === order.user_id && c.status === 'active'
        );
        if (activeCard && activeCard.stamps_collected > 0) {
          activeCard.stamps_collected -= 1;
        }
      }

      writeDb(db);
      return { data: { success: true }, error: null };
    }

    return { data: null, error: { message: `Unknown RPC function: ${functionName}` } };
  } catch (err: any) {
    return { data: null, error: { message: err.message } };
  }
}
