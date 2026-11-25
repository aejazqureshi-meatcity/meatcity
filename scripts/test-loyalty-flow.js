/**
 * Live User Balance & Stamp Reward Claim Test
 */
const fs = require('fs');
const assert = require('assert');

async function testUserLoyaltyFlow() {
  console.log('Testing User Balance, 10% Redemption Cap, and Stamp Reward Unlocking...');

  const db = JSON.parse(fs.readFileSync('mock_db.json', 'utf8'));
  const testUserId = 'test-flow-user-456';
  
  // Add test user to db.users if not present
  if (!db.users.some(u => u.id === testUserId)) {
    db.users.push({
      id: testUserId,
      email: 'testloyalty@meatcity.in',
      full_name: 'Loyalty Tester',
      phone: '9876543210',
      user_type: 'b2c'
    });
  }

  // Set loyalty account with 100 points
  let account = db.loyalty_accounts.find(a => a.user_id === testUserId);
  if (!account) {
    account = {
      id: 'acc-' + testUserId,
      user_id: testUserId,
      tier_id: 'silver',
      points_balance: 100,
      lifetime_points_earned: 100,
      lifetime_spend: 5000,
      total_orders_completed: 5,
      referral_code: 'TEST100',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.loyalty_accounts.push(account);
  } else {
    account.points_balance = 100;
  }

  // Set active stamp card with 10 completed stamps and an unlocked reward claim
  let stampCard = db.loyalty_stamp_cards.find(c => c.user_id === testUserId);
  if (!stampCard) {
    stampCard = {
      id: 'sc-' + testUserId,
      user_id: testUserId,
      card_number: 1,
      stamps_collected: 10,
      stamps_required: 10,
      status: 'completed',
      reward_code: 'MC-FREE-CHICKEN-250G',
      created_at: new Date().toISOString()
    };
    db.loyalty_stamp_cards.push(stampCard);
  }

  // Add reward claim for 250g Chicken Curry Cut
  let claim = db.loyalty_reward_claims.find(c => c.user_id === testUserId);
  if (!claim) {
    claim = {
      id: 'claim-' + testUserId,
      reward_id: 'rwd-free-chicken-250g',
      user_id: testUserId,
      claim_code: 'MC-FREE-CHICKEN-250G',
      points_spent: 0,
      title: '250g Chicken Curry Cut FREE',
      product_id: 'prod-1',
      quantity_grams: 250,
      status: 'active',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString()
    };
    db.loyalty_reward_claims.push(claim);
  }

  fs.writeFileSync('mock_db.json', JSON.stringify(db, null, 2), 'utf8');

  // Test 1: Estimate for ₹800 order with 100 available points (B2C)
  console.log('1. Fetching estimate for user with 100 available points on ₹800 order...');
  const res1 = await fetch('http://localhost:3000/api/loyalty/estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subtotal: 800, userRole: 'b2c', userId: testUserId })
  });
  const data1 = await res1.json();
  console.log('   Estimate response:', JSON.stringify(data1));
  assert.strictEqual(data1.availablePoints, 100, 'Available points should be 100');
  assert.strictEqual(data1.maxPointsRedeemable, 80, 'Max points redeemable should be 80 (10% of ₹800 subtotal)');
  assert.strictEqual(data1.maxRupeeDiscount, 80, 'Max rupee discount should be ₹80 (at ₹1/point)');
  assert(data1.activeRewards && data1.activeRewards.length > 0, 'Active rewards should contain unlocked claim');
  assert.strictEqual(data1.activeRewards[0].claim_code, 'MC-FREE-CHICKEN-250G', 'Claim code should match');
  console.log('   ✅ Test Passed: 80 points (₹80 discount) redeemable on ₹800 order, Free Chicken reward unlocked!');

  // Test 2: When order subtotal is ₹400 and available points is 30
  account.points_balance = 30;
  fs.writeFileSync('mock_db.json', JSON.stringify(db, null, 2), 'utf8');

  console.log('2. Fetching estimate when balance is 30 points (below min 50 pts threshold)...');
  const res2 = await fetch('http://localhost:3000/api/loyalty/estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subtotal: 800, userRole: 'b2c', userId: testUserId })
  });
  const data2 = await res2.json();
  console.log('   Estimate response with 30 pts balance:', JSON.stringify(data2));
  assert.strictEqual(data2.availablePoints, 30, 'Available points should be 30');
  assert.strictEqual(data2.maxPointsRedeemable, 0, 'Max points redeemable should be 0 because 30 < 50 min threshold');
  console.log('   ✅ Test Passed: 0 points redeemable when balance < 50 points threshold!');

  // Clean up
  const cleanDb = JSON.parse(fs.readFileSync('mock_db.json', 'utf8'));
  cleanDb.users = cleanDb.users.filter(u => u.id !== testUserId);
  cleanDb.loyalty_accounts = cleanDb.loyalty_accounts.filter(a => a.user_id !== testUserId);
  cleanDb.loyalty_stamp_cards = cleanDb.loyalty_stamp_cards.filter(c => c.user_id !== testUserId);
  cleanDb.loyalty_reward_claims = cleanDb.loyalty_reward_claims.filter(c => c.user_id !== testUserId);
  fs.writeFileSync('mock_db.json', JSON.stringify(cleanDb, null, 2), 'utf8');

  console.log('\n🎉 ALL USER LOYALTY FLOW TESTS PASSED!');
}

testUserLoyaltyFlow().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
