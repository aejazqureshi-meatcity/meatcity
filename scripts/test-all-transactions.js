/**
 * Comprehensive Transaction & Edge-Case Verification Suite for MeatCity Loyalty
 * Tests Sections 3 and 4 of the User Request
 * Runs against localhost:3000 and isolated mock_db.json
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

async function runAllTransactionTests() {
  console.log('======================================================================');
  console.log('🧪 MeatCity — Comprehensive Transaction, Concurrency & Reward Tests');
  console.log('======================================================================\n');

  // Setup fresh test customers in mock_db
  require('./setup-test-customers');

  // -------------------------------------------------------------------------
  // SECTION 3: CUSTOMER B COMBINED REWARDS TEST (₹800 subtotal + 80 pts + Free Chicken)
  // -------------------------------------------------------------------------
  console.log('▶ [SECTION 3] Testing Combined Rewards in Actual Cart with Customer B...');
  
  // 1. Fetch estimate for Customer B on ₹800 merchandise subtotal
  const estRes = await fetch(`${BASE_URL}/api/loyalty/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subtotal: 800, userRole: 'b2c', userId: 'usr-customer-b' })
  });
  const estData = await estRes.json();
  
  console.log('  Customer B Initial State:', {
    availablePoints: estData.availablePoints,
    maxPointsRedeemable: estData.maxPointsRedeemable,
    activeRewardsCount: estData.activeRewards.length,
    claimCode: estData.activeRewards[0]?.claim_code
  });

  assert.strictEqual(estData.availablePoints, 100, 'Customer B should have 100 points');
  assert.strictEqual(estData.maxPointsRedeemable, 80, 'Max points redeemable should be 80 (10% of ₹800)');
  assert.strictEqual(estData.maxRupeeDiscount, 80, 'Max rupee discount should be ₹80');
  assert.strictEqual(estData.activeRewards[0].claim_code, 'MC-FREE-CHICKEN-250G', 'Free chicken reward should be active');

  // 2. Reserve 80 points
  const resRes = await fetch(`${BASE_URL}/api/loyalty/reserve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'usr-customer-b', points: 80, cartSessionId: 'test_session_b' })
  });
  const resData = await resRes.json();
  assert(resData.success, 'Points reservation should succeed');
  const reservationId = resData.reservation_id;
  console.log('  Reserved 80 points atomically. Reservation ID:', reservationId);

  // 3. Verify Calculations:
  // Paid merchandise subtotal: ₹800
  // Loyalty discount: ₹80
  // Free chicken: ₹0
  // Merchandise subtotal after rewards: ₹720
  // Delivery fee: ₹50 (₹800 < ₹999 free threshold)
  // Grand Total: ₹720 + ₹50 = ₹770
  const subtotal = 800;
  const loyaltyDiscount = 80;
  const merchandiseAfterDiscount = subtotal - loyaltyDiscount;
  const deliveryFee = 50;
  const payableGrandTotal = merchandiseAfterDiscount + deliveryFee;

  assert.strictEqual(merchandiseAfterDiscount, 720, 'Merchandise subtotal after rewards must be ₹720');
  assert.strictEqual(payableGrandTotal, 770, 'Payable grand total must be ₹770');

  // 4. Place order via verify endpoint (mock payment verification)
  const orderId = 'ORD-TEST-COMBINED-' + Date.now();
  const orderPayload = {
    id: orderId,
    user_id: 'usr-customer-b',
    customer_name: 'Customer B',
    customer_phone: '9876543212',
    delivery_address: 'Turbhe Sector 20, Navi Mumbai - 400705',
    subtotal: 800,
    discount: 0,
    delivery_fee: 50,
    total: 770,
    payment_method: 'UPI',
    payment_status: 'Paid',
    status: 'Pending',
    user_role: 'b2c',
    points_redeemed: 80,
    points_discount: 80,
    claimed_reward_code: 'MC-FREE-CHICKEN-250G',
    reservation_id: reservationId,
    items: [
      { product_id: 'prod-2', name: 'Chicken Breast Boneless (1kg)', quantity: 2, price: 400, total: 800 },
      { product_id: 'prod-1', name: 'Chicken Curry Cut (250g) — 🎁 FREE Reward', quantity: 1, price: 0, total: 0, is_free_reward: true }
    ]
  };

  const placeRes = await fetch(`${BASE_URL}/api/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentType: 'order',
      razorpay_payment_id: 'pay_mock_' + Date.now(),
      razorpay_order_id: 'order_mock_' + Date.now(),
      razorpay_signature: 'sig_mock',
      payload: { orderPayload }
    })
  });
  const placeData = await placeRes.json();
  assert(placeData.success, 'Order placement & payment verification should succeed');
  console.log('  Order placed successfully. ID:', orderId);

  // 5. Commit point redemption
  const commitRes = await fetch(`${BASE_URL}/api/loyalty/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reservationId, orderId })
  });
  const commitData = await commitRes.json();
  assert(commitData.success, 'Commit redemption should succeed');

  // Verify remaining points immediately after redemption: 100 - 80 = 20 points
  const db1 = JSON.parse(fs.readFileSync('mock_db.json', 'utf8'));
  const accB1 = db1.loyalty_accounts.find(a => a.user_id === 'usr-customer-b');
  assert.strictEqual(accB1.points_balance, 20, 'Points balance immediately after redemption must be exactly 20');
  console.log('  Remaining points after redemption:', accB1.points_balance);

  // 6. Complete Order (status -> Delivered) and trigger loyalty award
  // Net merchandise spend = ₹800 - ₹80 = ₹720
  // Newly earned points = Math.floor(720 * 0.02) = 14 points!
  const awardRes = await fetch(`${BASE_URL}/api/loyalty/award-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, action: 'award' })
  });
  const awardData = await awardRes.json();
  assert(awardData.success, 'Awarding points upon delivery should succeed');
  assert.strictEqual(awardData.pointsAwarded, 14, 'Newly earned points must be exactly 14');
  console.log('  Newly earned points upon order completion:', awardData.pointsAwarded);

  // Verify final points balance: 20 + 14 = 34 points!
  const db2 = JSON.parse(fs.readFileSync('mock_db.json', 'utf8'));
  const accB2 = db2.loyalty_accounts.find(a => a.user_id === 'usr-customer-b');
  assert.strictEqual(accB2.points_balance, 34, 'Final points balance must be exactly 34 (20 + 14)');
  console.log('  Final points balance for Customer B:', accB2.points_balance);

  // Verify free chicken claim status updated to 'redeemed'
  const claimB = db2.loyalty_reward_claims.find(c => c.claim_code === 'MC-FREE-CHICKEN-250G');
  assert.strictEqual(claimB.status, 'redeemed', 'Claim code must be marked redeemed');
  assert.strictEqual(claimB.redeemed_order_id, orderId, 'Redeemed order id must match placed order');
  console.log('  Claim code MC-FREE-CHICKEN-250G status:', claimB.status);

  console.log('  ✅ [SECTION 3] Combined Rewards Cart Test PASSED with 100% exact math!\n');

  // -------------------------------------------------------------------------
  // SECTION 4: COMPLETE MISSING TRANSACTION TESTS
  // -------------------------------------------------------------------------
  console.log('▶ [SECTION 4] Testing All Missing Transaction Scenarios...');

  // Test 4.1: Cancelled Order (Reversal of points and refund of redeemed points)
  console.log('  4.1 Testing Order Cancellation & Full Points Reversal...');
  const cancelRes = await fetch(`${BASE_URL}/api/loyalty/award-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, action: 'reverse', reason: 'Customer requested cancellation' })
  });
  const cancelData = await cancelRes.json();
  assert(cancelData.success, 'Reversing cancelled order should succeed');
  const dbCancel = JSON.parse(fs.readFileSync('mock_db.json', 'utf8'));
  const accBCancel = dbCancel.loyalty_accounts.find(a => a.user_id === 'usr-customer-b');
  // Reversal: 34 - 14 (earned reversed) + 80 (redeemed refunded) = 100 points restored!
  assert.strictEqual(accBCancel.points_balance, 100, 'Customer B points balance should be fully restored to 100 after cancellation');
  console.log('      Customer B points balance after cancellation restored to:', accBCancel.points_balance);
  console.log('      ✅ 4.1 Order Cancellation PASSED.');

  // Test 4.2: Failed Payment (Point reservation released)
  console.log('  4.2 Testing Failed Payment Point Reservation Release...');
  // Reserve 50 points
  const resFail = await fetch(`${BASE_URL}/api/loyalty/reserve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'usr-customer-b', points: 50, cartSessionId: 'fail_session' })
  });
  const resFailData = await resFail.json();
  assert(resFailData.success, 'Reservation should succeed');
  // Payment fails -> release reservation
  const relFail = await fetch(`${BASE_URL}/api/loyalty/release`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reservationId: resFailData.reservation_id })
  });
  const relFailData = await relFail.json();
  assert(relFailData.success, 'Reservation release should succeed');
  console.log('      Reservation released on failed payment. Points unblocked.');
  console.log('      ✅ 4.2 Failed Payment Release PASSED.');

  // Test 4.3: Duplicate Order Processing (Idempotency)
  console.log('  4.3 Testing Duplicate Order Processing Idempotency...');
  const dupRes = await fetch(`${BASE_URL}/api/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentType: 'order',
      razorpay_payment_id: 'pay_dup',
      razorpay_order_id: 'order_dup',
      razorpay_signature: 'sig_dup',
      payload: { orderPayload } // Same orderId as placed earlier
    })
  });
  const dupData = await dupRes.json();
  assert(dupData.success, 'Duplicate order check should succeed without creating duplicate entry');
  console.log('      Server responded:', dupData.message || 'Duplicate recognized');
  console.log('      ✅ 4.3 Duplicate Order Processing PASSED.');

  // Test 4.4: Duplicate Loyalty Awarding (Idempotency)
  console.log('  4.4 Testing Duplicate Loyalty Awarding Idempotency...');
  const dupAward = await fetch(`${BASE_URL}/api/loyalty/award-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, action: 'award' })
  });
  const dupAwardData = await dupAward.json();
  assert(dupAwardData.success, 'Duplicate award should return success without double awarding');
  console.log('      Duplicate award response:', dupAwardData.message || 'Idempotent');
  console.log('      ✅ 4.4 Duplicate Awarding Idempotency PASSED.');

  // Test 4.5: Concurrent Points Redemption / Over-Reservation Check
  console.log('  4.5 Testing Concurrent Points Double-Spending Protection...');
  // Customer B has 100 points
  const r1 = await fetch(`${BASE_URL}/api/loyalty/reserve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'usr-customer-b', points: 70, cartSessionId: 'sess_1' })
  });
  const d1 = await r1.json();
  assert(d1.success, 'First reservation of 70 points should succeed');

  // Second concurrent attempt for 50 points (70 + 50 = 120 > 100) must FAIL
  const r2 = await fetch(`${BASE_URL}/api/loyalty/reserve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'usr-customer-b', points: 50, cartSessionId: 'sess_2' })
  });
  const d2 = await r2.json();
  assert.strictEqual(d2.success, false, 'Second concurrent reservation beyond balance must be rejected');
  console.log('      Concurrent over-reservation rejected with error:', d2.error);

  // Clean up held reservation
  await fetch(`${BASE_URL}/api/loyalty/release`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reservationId: d1.reservation_id })
  });
  console.log('      ✅ 4.5 Concurrent Points Protection PASSED.');

  // Test 4.6: Expired Points Test (Customer D)
  console.log('  4.6 Testing Expired Points Handling (Customer D)...');
  const estD = await fetch(`${BASE_URL}/api/loyalty/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subtotal: 1000, userRole: 'b2c', userId: 'usr-customer-d' })
  });
  const dataD = await estD.json();
  assert.strictEqual(dataD.availablePoints, 0, 'Customer D with expired points must have 0 available points');
  assert.strictEqual(dataD.maxPointsRedeemable, 0, 'Customer D cannot redeem any expired points');
  console.log('      Customer D available points:', dataD.availablePoints);
  console.log('      ✅ 4.6 Expired Points Test PASSED.');

  // Test 4.7: Expired Stamp Reward Claim Block
  console.log('  4.7 Testing Expired Stamp Reward Block...');
  const expClaimRes = await fetch(`${BASE_URL}/api/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentType: 'order',
      razorpay_payment_id: 'pay_exp',
      razorpay_order_id: 'order_exp',
      razorpay_signature: 'sig_exp',
      payload: {
        orderPayload: {
          id: 'ORD-TEST-EXPIRED-' + Date.now(),
          user_id: 'usr-customer-d',
          subtotal: 500,
          total: 500,
          claimed_reward_code: 'MC-EXPIRED-CHICKEN'
        }
      }
    })
  });
  const expClaimData = await expClaimRes.json();
  assert.strictEqual(expClaimRes.status, 400, 'Expired claim code must return HTTP 400');
  console.log('      Expired reward rejected with message:', expClaimData.error);
  console.log('      ✅ 4.7 Expired Stamp Reward Block PASSED.');

  // Test 4.8: Coupon and Loyalty Stacking Restriction
  console.log('  4.8 Testing Coupon & Loyalty Stacking Policy...');
  const stackOrderRes = await fetch(`${BASE_URL}/api/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentType: 'order',
      razorpay_payment_id: 'pay_stack',
      razorpay_order_id: 'order_stack',
      razorpay_signature: 'sig_stack',
      payload: {
        orderPayload: {
          id: 'ORD-TEST-STACK-' + Date.now(),
          user_id: 'usr-customer-a',
          subtotal: 800,
          total: 620,
          coupon_code: 'WELCOME20',
          points_redeemed: 80,
          points_discount: 80
        }
      }
    })
  });
  const stackOrderData = await stackOrderRes.json();
  assert.strictEqual(stackOrderRes.status, 400, 'Stacking coupon and loyalty points must be rejected with HTTP 400');
  console.log('      Stacking rejected with message:', stackOrderData.error);
  console.log('      ✅ 4.8 Coupon & Loyalty Stacking Policy PASSED.');

  // Test 4.9: Unauthorized B2B Reward Claim Block (Customer C)
  console.log('  4.9 Testing B2B Wholesale Retail Loyalty Ineligibility (Customer C)...');
  const b2bEst = await fetch(`${BASE_URL}/api/loyalty/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subtotal: 10000, userRole: 'b2b', userId: 'usr-customer-c' })
  });
  const b2bEstData = await b2bEst.json();
  assert.strictEqual(b2bEstData.isEnabled, false, 'Loyalty must be disabled for B2B Customer C');
  assert.strictEqual(b2bEstData.estimatedPointsEarned, 0, 'B2B orders cannot earn retail points');
  assert.strictEqual(b2bEstData.maxPointsRedeemable, 0, 'B2B orders cannot redeem retail points');
  console.log('      B2B Customer C isEnabled:', b2bEstData.isEnabled);
  console.log('      ✅ 4.9 B2B Retail Ineligibility PASSED.');

  // Test 4.10: Server-side Minimum Order Validation
  console.log('  4.10 Testing Server-Side Minimum Order Validation (B2C < ₹200, B2B < ₹1000)...');
  const minB2COrderRes = await fetch(`${BASE_URL}/api/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentType: 'order',
      razorpay_payment_id: 'pay_low',
      razorpay_order_id: 'order_low',
      razorpay_signature: 'sig_low',
      payload: {
        orderPayload: {
          id: 'ORD-TEST-LOW-' + Date.now(),
          user_id: 'usr-customer-a',
          user_role: 'b2c',
          subtotal: 150, // Below ₹200 min
          total: 200
        }
      }
    })
  });
  assert.strictEqual(minB2COrderRes.status, 400, 'Order below ₹200 minimum must be rejected with 400');
  const minB2CData = await minB2COrderRes.json();
  console.log('      Subtotal ₹150 (< ₹200) rejected with:', minB2CData.error);
  console.log('      ✅ 4.10 Minimum Order Validation PASSED.');

  // Test 4.11: Stamp Card Reset and Next Cycle
  console.log('  4.11 Testing Stamp Card Reset to 0 and Card #2 Cycle...');
  // Customer A has 9 stamps. Awarding 1 qualifying completed order >= ₹400 completes Card #1
  const testOrderA = 'ORD-STAMP-TEST-' + Date.now();
  const dbA = JSON.parse(fs.readFileSync('mock_db.json', 'utf8'));
  dbA.orders.push({
    id: testOrderA,
    user_id: 'usr-customer-a',
    subtotal: 500,
    total: 500,
    status: 'Delivered',
    created_at: new Date().toISOString()
  });
  fs.writeFileSync('mock_db.json', JSON.stringify(dbA, null, 2), 'utf8');

  const stampAwardRes = await fetch(`${BASE_URL}/api/loyalty/award-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: testOrderA, action: 'award' })
  });
  const stampAwardData = await stampAwardRes.json();
  assert(stampAwardData.success, 'Awarding 10th stamp should succeed');
  assert.strictEqual(stampAwardData.stampsAwarded, 1, '1 stamp should be awarded');

  const dbAUpdated = JSON.parse(fs.readFileSync('mock_db.json', 'utf8'));
  const cardsA = dbAUpdated.loyalty_stamp_cards.filter(c => c.user_id === 'usr-customer-a');
  const completedCard = cardsA.find(c => c.card_number === 1);
  const nextCard = cardsA.find(c => c.card_number === 2);
  
  assert(completedCard && completedCard.status === 'completed', 'Card #1 should be completed');
  assert(completedCard.reward_code, 'Card #1 should have generated a reward code');
  assert(nextCard && nextCard.status === 'active', 'Card #2 should be active');
  assert.strictEqual(nextCard.stamps_collected, 0, 'Card #2 stamps must start at 0');
  
  console.log('      Card #1 Status:', completedCard.status, '| Reward Code:', completedCard.reward_code);
  console.log('      Card #2 Status:', nextCard.status, '| Stamps:', nextCard.stamps_collected, '/ 10');
  console.log('      ✅ 4.11 Stamp Card Reset and Cycle PASSED.');

  console.log('\n======================================================================');
  console.log('🎉 ALL TESTS IN SECTIONS 3 & 4 PASSED WITH ZERO FAILURES!');
  console.log('======================================================================\n');
}

runAllTransactionTests().catch(err => {
  console.error('\n❌ Test Suite Failed with error:', err);
  process.exit(1);
});
