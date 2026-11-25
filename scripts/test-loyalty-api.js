/**
 * Live HTTP API Verification Script for MeatCity Loyalty System
 * Runs against live local server: http://localhost:3000
 */

const assert = require('assert');

async function testApi() {
  console.log('====================================================');
  console.log('🌐 Testing MeatCity Loyalty APIs on http://localhost:3000');
  console.log('====================================================\n');

  // Test 1: POST /api/loyalty/estimate for Subtotal ₹500 (B2C)
  console.log('1. Testing /api/loyalty/estimate: Subtotal ₹500 (B2C)...');
  const res1 = await fetch('http://localhost:3000/api/loyalty/estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subtotal: 500, userRole: 'b2c', couponApplied: false })
  });
  const data1 = await res1.json();
  console.log('   Response:', JSON.stringify(data1));
  assert(data1.success, 'API should return success: true');
  assert.strictEqual(data1.isEnabled, true, 'Loyalty should be enabled for B2C');
  assert.strictEqual(data1.estimatedPointsEarned, 10, '₹500 spend should earn 10 points (2 pts/₹100)');
  assert.strictEqual(data1.pointRupeeValue, 1.0, 'Point rupee value should be ₹1.0');
  console.log('   ✅ Subtotal ₹500 API Test Passed (10 pts earned).\n');

  // Test 2: POST /api/loyalty/estimate for Subtotal ₹800 (B2C)
  console.log('2. Testing /api/loyalty/estimate: Subtotal ₹800 (B2C)...');
  const res2 = await fetch('http://localhost:3000/api/loyalty/estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subtotal: 800, userRole: 'b2c', couponApplied: false })
  });
  const data2 = await res2.json();
  console.log('   Response:', JSON.stringify(data2));
  assert.strictEqual(data2.estimatedPointsEarned, 16, '₹800 spend should earn 16 points (2 pts/₹100)');
  console.log('   ✅ Subtotal ₹800 API Test Passed (16 pts earned).\n');

  // Test 3: B2B Ineligibility Test
  console.log('3. Testing /api/loyalty/estimate: B2B Role Exclusion...');
  const resB2B = await fetch('http://localhost:3000/api/loyalty/estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subtotal: 15000, userRole: 'b2b', couponApplied: false })
  });
  const dataB2B = await resB2B.json();
  console.log('   Response:', JSON.stringify(dataB2B));
  assert.strictEqual(dataB2B.isEnabled, false, 'Loyalty should be disabled for B2B');
  assert.strictEqual(dataB2B.estimatedPointsEarned, 0, 'B2B orders earn 0 points');
  assert.strictEqual(dataB2B.maxPointsRedeemable, 0, 'B2B orders cannot redeem retail points');
  console.log('   ✅ B2B Exclusion Test Passed.\n');

  // Test 4: Coupon Stacking Protection Test
  console.log('4. Testing /api/loyalty/estimate: Coupon Stacking Protection...');
  const resStack = await fetch('http://localhost:3000/api/loyalty/estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subtotal: 800, userRole: 'b2c', couponApplied: true })
  });
  const dataStack = await resStack.json();
  console.log('   Response:', JSON.stringify(dataStack));
  assert.strictEqual(dataStack.maxPointsRedeemable, 0, 'No points redeemable when coupon is applied');
  assert.strictEqual(dataStack.isStackingBlocked, true, 'Stacking should be flagged as blocked');
  console.log('   ✅ Coupon Stacking Protection Test Passed.\n');

  console.log('====================================================');
  console.log('🎉 ALL LIVE API TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

testApi().catch(err => {
  console.error('API Test Failed:', err);
  process.exit(1);
});
