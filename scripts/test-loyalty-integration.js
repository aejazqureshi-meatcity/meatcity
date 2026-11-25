/**
 * End-to-End Integration Test for MeatCity Loyalty Service & Mock DB
 */
require('dotenv').config({ path: '.env.local' });
process.env.NEXT_PUBLIC_USE_MOCK_DB = 'true';

const { estimateOrderPoints, DEFAULT_LOYALTY_SETTINGS } = require('../src/lib/loyalty/loyalty-service');
const { executeServerRpc } = require('../src/lib/supabase-mock-server');
const assert = require('assert');

async function runIntegrationTests() {
  console.log('Testing estimateOrderPoints with DEFAULT_LOYALTY_SETTINGS...');

  // TC1: Subtotal ₹500
  const est1 = await estimateOrderPoints(500, undefined, 'b2c', false);
  assert.strictEqual(est1.estimatedPointsEarned, 10, 'Expected 10 pts for ₹500 spend');
  console.log('  ✅ estimateOrderPoints TC1 passed (10 pts for ₹500)');

  // TC2 & TC3: Test with mock RPC
  const testUserId = 'test-user-' + Date.now();
  
  // 1. Get or create account
  const accRes = executeServerRpc('get_or_create_loyalty_account', { p_user_id: testUserId });
  assert(accRes.data, 'Failed to create loyalty account');
  console.log('  ✅ get_or_create_loyalty_account RPC passed');

  // 2. Award order loyalty for an order of ₹800
  const fs = require('fs');
  const db = JSON.parse(fs.readFileSync('mock_db.json', 'utf8'));
  const testOrderId = 'ORD-TEST-' + Date.now();
  db.orders.push({
    id: testOrderId,
    user_id: testUserId,
    subtotal: 5000,
    total: 5000,
    status: 'Delivered',
    created_at: new Date().toISOString()
  });
  fs.writeFileSync('mock_db.json', JSON.stringify(db, null, 2), 'utf8');

  const awardRes = executeServerRpc('award_order_loyalty', { p_order_id: testOrderId });
  assert(awardRes.data.success, 'Failed to award loyalty points');
  // ₹5000 * 0.02 = 100 points
  assert.strictEqual(awardRes.data.pointsAwarded, 100, 'Expected 100 points awarded for ₹5000 order');
  assert.strictEqual(awardRes.data.stampsAwarded, 1, 'Expected 1 stamp awarded');
  console.log('  ✅ award_order_loyalty RPC passed (awarded 100 pts, 1 stamp)');

  // 3. Estimate for next order of ₹800 with 100 points available
  const est3 = await estimateOrderPoints(800, testUserId, 'b2c', false);
  assert.strictEqual(est3.availablePoints, 100, 'Expected 100 available points in account');
  assert.strictEqual(est3.maxPointsRedeemable, 80, 'Expected 80 points redeemable (10% of ₹800)');
  assert.strictEqual(est3.maxRupeeDiscount, 80, 'Expected ₹80 discount');
  console.log('  ✅ estimateOrderPoints TC3 passed (80 pts / ₹80 discount on ₹800 order)');

  // 4. Stacking check
  const estStack = await estimateOrderPoints(800, testUserId, 'b2c', true);
  assert.strictEqual(estStack.maxPointsRedeemable, 0, 'Expected 0 redeemable points when couponApplied is true');
  console.log('  ✅ estimateOrderPoints non-stacking passed');

  // Clean up test order from mock_db
  const cleanDb = JSON.parse(fs.readFileSync('mock_db.json', 'utf8'));
  cleanDb.orders = cleanDb.orders.filter(o => o.id !== testOrderId);
  cleanDb.loyalty_accounts = cleanDb.loyalty_accounts.filter(a => a.user_id !== testUserId);
  cleanDb.loyalty_stamp_cards = cleanDb.loyalty_stamp_cards.filter(c => c.user_id !== testUserId);
  cleanDb.loyalty_points_ledger = cleanDb.loyalty_points_ledger.filter(l => l.user_id !== testUserId);
  fs.writeFileSync('mock_db.json', JSON.stringify(cleanDb, null, 2), 'utf8');

  console.log('\n🎉 ALL INTEGRATION TESTS PASSED!');
}

runIntegrationTests().catch(err => {
  console.error('Integration test failed:', err);
  process.exit(1);
});
