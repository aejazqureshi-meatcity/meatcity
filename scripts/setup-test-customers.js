/**
 * Setup Isolated Local Test Customers A, B, C, D in mock_db.json
 * Strictly local - does not touch production.
 */
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve('mock_db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Ensure collections exist
if (!db.users) db.users = [];
if (!db.loyalty_accounts) db.loyalty_accounts = [];
if (!db.loyalty_stamp_cards) db.loyalty_stamp_cards = [];
if (!db.loyalty_reward_claims) db.loyalty_reward_claims = [];
if (!db.loyalty_points_ledger) db.loyalty_points_ledger = [];

const testUsers = [
  {
    id: 'usr-customer-a',
    email: 'customera@meatcity.in',
    mobile: '9876543211',
    phone: '9876543211',
    password: 'MeatCity@123',
    full_name: 'Customer A (9 Stamps)',
    user_type: 'b2c',
    status: 'active',
    shop_address: 'Turbhe Sector 20, Navi Mumbai - 400705'
  },
  {
    id: 'usr-customer-b',
    email: 'customerb@meatcity.in',
    mobile: '9876543212',
    phone: '9876543212',
    password: 'MeatCity@123',
    full_name: 'Customer B (10 Stamps & Free Chicken)',
    user_type: 'b2c',
    status: 'active',
    shop_address: 'Turbhe Sector 20, Navi Mumbai - 400705'
  },
  {
    id: 'usr-customer-c',
    email: 'customerc@meatcity.in',
    mobile: '9876543213',
    phone: '9876543213',
    password: 'MeatCity@123',
    full_name: 'Customer C (B2B Approved Wholesale)',
    business_name: 'City Foods Wholesale',
    gst_number: '27AAAAA0000A1Z5',
    fssai_license: '21525016001365',
    user_type: 'b2b',
    status: 'approved',
    credit_limit: 50000,
    credit_available: 50000,
    credit_used: 0,
    outstanding_balance: 0,
    shop_address: 'Turbhe Wholesale Market, Shop 12, Navi Mumbai'
  },
  {
    id: 'usr-customer-d',
    email: 'customerd@meatcity.in',
    mobile: '9876543214',
    phone: '9876543214',
    password: 'MeatCity@123',
    full_name: 'Customer D (Expired Rewards)',
    user_type: 'b2c',
    status: 'active',
    shop_address: 'Turbhe Sector 20, Navi Mumbai - 400705'
  }
];

// 1. Upsert users
testUsers.forEach(tu => {
  const idx = db.users.findIndex(u => u.id === tu.id);
  if (idx >= 0) {
    db.users[idx] = { ...db.users[idx], ...tu };
  } else {
    db.users.push(tu);
  }
});

// 2. Loyalty Accounts
const loyaltyAccounts = [
  {
    id: 'acc-customer-a',
    user_id: 'usr-customer-a',
    tier_id: 'silver',
    points_balance: 100,
    lifetime_points_earned: 100,
    lifetime_points_redeemed: 0,
    lifetime_spend: 4500,
    total_orders_completed: 9,
    referral_code: 'MC-CUST-A',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'acc-customer-b',
    user_id: 'usr-customer-b',
    tier_id: 'silver',
    points_balance: 100,
    lifetime_points_earned: 100,
    lifetime_points_redeemed: 0,
    lifetime_spend: 5000,
    total_orders_completed: 10,
    referral_code: 'MC-CUST-B',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'acc-customer-c',
    user_id: 'usr-customer-c',
    tier_id: 'silver',
    points_balance: 0,
    lifetime_points_earned: 0,
    lifetime_points_redeemed: 0,
    lifetime_spend: 0,
    total_orders_completed: 0,
    referral_code: 'MC-CUST-C',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'acc-customer-d',
    user_id: 'usr-customer-d',
    tier_id: 'silver',
    points_balance: 0,
    lifetime_points_earned: 100,
    lifetime_points_redeemed: 0,
    lifetime_spend: 5000,
    total_orders_completed: 10,
    referral_code: 'MC-CUST-D',
    created_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

loyaltyAccounts.forEach(la => {
  const idx = db.loyalty_accounts.findIndex(a => a.user_id === la.user_id);
  if (idx >= 0) {
    db.loyalty_accounts[idx] = { ...db.loyalty_accounts[idx], ...la };
  } else {
    db.loyalty_accounts.push(la);
  }
});

// 3. Stamp Cards
db.loyalty_stamp_cards = (db.loyalty_stamp_cards || []).filter(c => !['usr-customer-a', 'usr-customer-b', 'usr-customer-c', 'usr-customer-d'].includes(c.user_id));
const stampCards = [
  {
    id: 'sc-customer-a',
    user_id: 'usr-customer-a',
    card_number: 1,
    stamps_collected: 9,
    stamps_required: 10,
    status: 'active',
    created_at: new Date().toISOString()
  },
  {
    id: 'sc-customer-b',
    user_id: 'usr-customer-b',
    card_number: 1,
    stamps_collected: 10,
    stamps_required: 10,
    status: 'completed',
    reward_code: 'MC-FREE-CHICKEN-250G',
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  },
  {
    id: 'sc-customer-d',
    user_id: 'usr-customer-d',
    card_number: 1,
    stamps_collected: 10,
    stamps_required: 10,
    status: 'expired',
    reward_code: 'MC-EXPIRED-CHICKEN',
    completed_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString()
  }
];

stampCards.forEach(sc => {
  const idx = db.loyalty_stamp_cards.findIndex(c => c.user_id === sc.user_id && c.card_number === sc.card_number);
  if (idx >= 0) {
    db.loyalty_stamp_cards[idx] = { ...db.loyalty_stamp_cards[idx], ...sc };
  } else {
    db.loyalty_stamp_cards.push(sc);
  }
});

// 4. Reward Claims
const rewardClaims = [
  {
    id: 'claim-customer-b-chicken',
    reward_id: 'rwd-free-chicken-250g',
    user_id: 'usr-customer-b',
    claim_code: 'MC-FREE-CHICKEN-250G',
    points_spent: 0,
    title: '250g Chicken Curry Cut FREE',
    product_id: 'prod-1',
    quantity_grams: 250,
    status: 'active',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString()
  },
  {
    id: 'claim-customer-d-expired',
    reward_id: 'rwd-free-chicken-250g',
    user_id: 'usr-customer-d',
    claim_code: 'MC-EXPIRED-CHICKEN',
    points_spent: 0,
    title: '250g Chicken Curry Cut FREE',
    product_id: 'prod-1',
    quantity_grams: 250,
    status: 'expired',
    expires_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
  }
];

rewardClaims.forEach(rc => {
  const idx = db.loyalty_reward_claims.findIndex(c => c.claim_code === rc.claim_code);
  if (idx >= 0) {
    db.loyalty_reward_claims[idx] = { ...db.loyalty_reward_claims[idx], ...rc };
  } else {
    db.loyalty_reward_claims.push(rc);
  }
});

// 5. Clean up reservations and orders for test users
db.loyalty_points_reservations = (db.loyalty_points_reservations || []).filter(r => !['usr-customer-a', 'usr-customer-b', 'usr-customer-c', 'usr-customer-d'].includes(r.user_id));
db.orders = (db.orders || []).filter(o => !['usr-customer-a', 'usr-customer-b', 'usr-customer-c', 'usr-customer-d'].includes(o.user_id) && !String(o.id).startsWith('ORD-TEST-') && !String(o.id).startsWith('ORD-STAMP-TEST-'));

// 6. Points Ledger for D (Expired points) and B (Earned points)
db.loyalty_points_ledger = db.loyalty_points_ledger.filter(l => !['usr-customer-a', 'usr-customer-b', 'usr-customer-d'].includes(l.user_id));

db.loyalty_points_ledger.push(
  {
    id: 'ledg-cust-a-1',
    user_id: 'usr-customer-a',
    transaction_type: 'earned',
    points: 100,
    balance_after: 100,
    rupee_equivalent: 100,
    description: 'Earned 100 points on qualifying orders',
    created_at: new Date().toISOString()
  },
  {
    id: 'ledg-cust-b-1',
    user_id: 'usr-customer-b',
    transaction_type: 'earned',
    points: 100,
    balance_after: 100,
    rupee_equivalent: 100,
    description: 'Earned 100 points on qualifying orders',
    created_at: new Date().toISOString()
  },
  {
    id: 'ledg-cust-d-1',
    user_id: 'usr-customer-d',
    transaction_type: 'expired',
    points: -100,
    balance_after: 0,
    rupee_equivalent: 0,
    description: 'Points expired past 180 days validity window',
    is_expired: true,
    expires_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString()
  }
);

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');

console.log('✅ Isolated local test customers A, B, C, D configured successfully in mock_db.json:');
console.log(' - Customer A (B2C, 100 pts, 9 stamps): customera@meatcity.in / MeatCity@123');
console.log(' - Customer B (B2C, 100 pts, 10 stamps, Free Chicken): customerb@meatcity.in / MeatCity@123');
console.log(' - Customer C (B2B, Approved Wholesale, No B2C rewards): customerc@meatcity.in / MeatCity@123');
console.log(' - Customer D (B2C, Expired Points & Reward): customerd@meatcity.in / MeatCity@123');
