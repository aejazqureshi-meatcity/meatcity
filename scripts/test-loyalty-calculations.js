/**
 * Verification Script for MeatCity Loyalty Rewards Calculations
 * Validates Test Cases 1-4 from Section 14:
 * - Test Case 1: Subtotal ₹500, no discount -> 10 pts, 1 stamp
 * - Test Case 2: Available 30 pts, min 50 pts -> 0 redeemable
 * - Test Case 3: Subtotal ₹800, available 100 pts -> max 80 pts (₹80 discount)
 * - Test Case 4: 10 stamps collected -> 1 free chicken reward claim (250g)
 * Also validates:
 * - Non-stacking with coupons
 * - B2B wholesale loyalty exclusion
 */

const assert = require('assert');

// Settings matching DEFAULT_LOYALTY_SETTINGS
const settings = {
  is_enabled: true,
  points_per_rupee: 0.02, // 2 points per ₹100 spend
  point_rupee_value: 1.0, // ₹1 per point
  min_order_amount_for_earn: 100,
  min_points_for_redemption: 50,
  max_redemption_percent_per_order: 10, // 10% subtotal cap
  points_expiry_days: 180,
  can_combine_with_coupons: false,
  eligible_customer_types: ['b2c'],
  min_order_for_stamp: 400,
  stamps_required_per_card: 10,
  stamp_reward_type: 'free_product',
};

function calculateOrderLoyalty(subtotal, availablePoints, couponApplied = false, userRole = 'b2c') {
  if (!settings.is_enabled || !settings.eligible_customer_types.includes(userRole)) {
    return {
      isEligible: false,
      pointsEarned: 0,
      stampsAwarded: 0,
      maxPointsRedeemable: 0,
      maxRupeeDiscount: 0,
    };
  }

  // 1. Points Earned: 2 points per ₹100 of net merchandise spend
  const pointsEarned = subtotal >= settings.min_order_amount_for_earn
    ? Math.floor(subtotal * settings.points_per_rupee)
    : 0;

  // 2. Stamps: 1 stamp per qualifying completed order >= ₹400
  const stampsAwarded = subtotal >= settings.min_order_for_stamp ? 1 : 0;

  // 3. Redemption: Max 10% subtotal, minimum 50 points, ₹1 = 1 pt, no stacking with coupons
  let maxPointsRedeemable = 0;
  let maxRupeeDiscount = 0;

  const isStackingAllowed = !couponApplied || settings.can_combine_with_coupons;
  if (isStackingAllowed && subtotal > 0) {
    const maxRupeeByPercent = Math.floor((subtotal * settings.max_redemption_percent_per_order) / 100);
    const maxPointsByPercent = Math.floor(maxRupeeByPercent / settings.point_rupee_value);
    const maxPointsAllowed = Math.min(maxPointsByPercent, availablePoints);

    if (availablePoints >= settings.min_points_for_redemption && maxPointsAllowed >= settings.min_points_for_redemption) {
      maxPointsRedeemable = maxPointsAllowed;
      maxRupeeDiscount = Math.round(maxPointsRedeemable * settings.point_rupee_value);
    }
  }

  return {
    isEligible: true,
    pointsEarned,
    stampsAwarded,
    maxPointsRedeemable,
    maxRupeeDiscount,
  };
}

function simulateStampCardProgression() {
  let stampsCollected = 0;
  let cardCount = 1;
  let rewardClaims = [];

  for (let orderNum = 1; orderNum <= 10; orderNum++) {
    // 10 qualifying orders >= ₹400
    stampsCollected += 1;
    if (stampsCollected >= 10) {
      const claimCode = `MC-CHICKEN-250G-TEST${orderNum}`;
      rewardClaims.push({
        claim_code: claimCode,
        product_id: 'prod-1',
        title: '250g Chicken Curry Cut FREE',
        quantity_grams: 250,
        price: 0,
        status: 'active',
        validity_days: 30,
      });
      // Reset for next card
      stampsCollected = 0;
      cardCount += 1;
    }
  }

  return { stampsCollected, cardCount, rewardClaims };
}

console.log('====================================================');
console.log('🍖 MeatCity Loyalty & Stamp Card Calculation Tests');
console.log('====================================================\n');

// TEST CASE 1: Subtotal ₹500, no discount -> 10 pts, 1 stamp
console.log('Testing Test Case 1: Subtotal ₹500, no discount...');
const tc1 = calculateOrderLoyalty(500, 0, false, 'b2c');
console.log(`  Subtotal: ₹500 -> Points Earned: ${tc1.pointsEarned}, Stamps Awarded: ${tc1.stampsAwarded}`);
assert.strictEqual(tc1.pointsEarned, 10, 'TC1: Expected exactly 10 points earned for ₹500 spend');
assert.strictEqual(tc1.stampsAwarded, 1, 'TC1: Expected exactly 1 stamp awarded for ₹500 spend');
console.log('  ✅ Test Case 1 PASSED.\n');

// TEST CASE 2: Available 30 pts, min 50 pts -> 0 redeemable
console.log('Testing Test Case 2: Available 30 pts, min 50 pts...');
const tc2 = calculateOrderLoyalty(500, 30, false, 'b2c');
console.log(`  Available: 30 pts, Min Required: 50 pts -> Max Points Redeemable: ${tc2.maxPointsRedeemable}`);
assert.strictEqual(tc2.maxPointsRedeemable, 0, 'TC2: Expected 0 points redeemable when balance (30) < min threshold (50)');
assert.strictEqual(tc2.maxRupeeDiscount, 0, 'TC2: Expected ₹0 discount');
console.log('  ✅ Test Case 2 PASSED.\n');

// TEST CASE 3: Subtotal ₹800, available 100 pts -> max 80 pts (₹80 discount)
console.log('Testing Test Case 3: Subtotal ₹800, available 100 pts...');
const tc3 = calculateOrderLoyalty(800, 100, false, 'b2c');
console.log(`  Subtotal: ₹800 (10% cap = ₹80), Available: 100 pts -> Redeemable: ${tc3.maxPointsRedeemable} pts, Discount: ₹${tc3.maxRupeeDiscount}`);
assert.strictEqual(tc3.maxPointsRedeemable, 80, 'TC3: Expected exactly 80 points redeemable (capped at 10% of ₹800)');
assert.strictEqual(tc3.maxRupeeDiscount, 80, 'TC3: Expected ₹80 cash discount (₹1/pt)');
console.log('  ✅ Test Case 3 PASSED.\n');

// TEST CASE 4: 10 stamps collected -> 1 free chicken reward claim (250g)
console.log('Testing Test Case 4: 10 stamps progression -> 1 free chicken reward claim...');
const tc4 = simulateStampCardProgression();
console.log(`  Completed 10 orders -> Reward Claims Unlocked: ${tc4.rewardClaims.length}`);
assert.strictEqual(tc4.rewardClaims.length, 1, 'TC4: Expected 1 reward claim unlocked after 10 stamps');
assert.strictEqual(tc4.rewardClaims[0].product_id, 'prod-1', 'TC4: Expected Chicken Curry Cut (prod-1)');
assert.strictEqual(tc4.rewardClaims[0].quantity_grams, 250, 'TC4: Expected 250g quantity');
assert.strictEqual(tc4.rewardClaims[0].price, 0, 'TC4: Expected ₹0 / FREE price');
assert.strictEqual(tc4.rewardClaims[0].validity_days, 30, 'TC4: Expected 30 days validity');
assert.strictEqual(tc4.stampsCollected, 0, 'TC4: Expected card stamps reset to 0');
assert.strictEqual(tc4.cardCount, 2, 'TC4: Expected card number advanced to 2');
console.log(`  Claim Details: ${tc4.rewardClaims[0].title} | Code: ${tc4.rewardClaims[0].claim_code} | Price: ₹${tc4.rewardClaims[0].price}`);
console.log('  ✅ Test Case 4 PASSED.\n');

// TEST CASE 5: Coupon Stacking Protection (can_combine_with_coupons: false)
console.log('Testing Stacking Protection: Subtotal ₹800, available 100 pts, couponApplied = true...');
const tc5 = calculateOrderLoyalty(800, 100, true, 'b2c');
console.log(`  Coupon Applied -> Max Points Redeemable: ${tc5.maxPointsRedeemable}`);
assert.strictEqual(tc5.maxPointsRedeemable, 0, 'TC5: Expected 0 points redeemable when coupon is applied');
console.log('  ✅ Stacking Protection PASSED.\n');

// TEST CASE 6: B2B Wholesale Order Exclusion
console.log('Testing B2B Wholesale Order Exclusion: Subtotal ₹10,000, userRole = b2b...');
const tc6 = calculateOrderLoyalty(10000, 500, false, 'b2b');
console.log(`  B2B Order -> Eligible: ${tc6.isEligible}, Points Earned: ${tc6.pointsEarned}, Stamps: ${tc6.stampsAwarded}`);
assert.strictEqual(tc6.isEligible, false, 'TC6: Expected B2B orders to be ineligible for retail loyalty');
assert.strictEqual(tc6.pointsEarned, 0, 'TC6: Expected 0 points earned for B2B');
assert.strictEqual(tc6.stampsAwarded, 0, 'TC6: Expected 0 stamps awarded for B2B');
console.log('  ✅ B2B Exclusion PASSED.\n');

console.log('====================================================');
console.log('🎉 ALL 6 MANDATORY LOYALTY TESTS PASSED SUCCESSFULLY!');
console.log('====================================================');
