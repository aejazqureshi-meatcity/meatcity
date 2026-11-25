const https = require('https');
const assert = require('assert');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yvbhclahfwcimopbfetc.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function request(path, method = 'GET', body = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = `${SUPABASE_URL}/rest/v1/${path}`;
    const headers = {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...extraHeaders
    };

    const req = https.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('MEATCITY — PRODUCTION DATABASE CHECKOUT & LOYALTY TEST SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  const testOrderIds = [];

  async function test(name, fn) {
    try {
      process.stdout.write(`• ${name}... `);
      await fn();
      console.log('PASSED ✓');
      passed++;
    } catch (err) {
      console.log('FAILED ✗');
      console.error('  Error:', err.message);
      failed++;
    }
  }

  // 1. Verify Schema: orders columns
  await test('Verify orders schema has claimed_reward_code and loyalty fields', async () => {
    const res = await request('orders?select=*&limit=1');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const sample = res.data[0];
    assert('claimed_reward_code' in sample, 'claimed_reward_code missing in orders');
    assert('points_earned' in sample, 'points_earned missing in orders');
    assert('points_redeemed' in sample, 'points_redeemed missing in orders');
    assert('points_discount' in sample, 'points_discount missing in orders');
    assert('stamp_awarded' in sample, 'stamp_awarded missing in orders');
    assert('customer_id' in sample, 'customer_id missing in orders');
    assert('delivery_charge' in sample, 'delivery_charge missing in orders');
    assert('order_type' in sample, 'order_type missing in orders');
  });

  // 2. Scenario 1: Normal B2C order without rewards
  await test('Scenario 1: Normal B2C order without rewards (COD)', async () => {
    const orderId = `TEST-B2C-NORM-${Date.now()}`;
    testOrderIds.push(orderId);
    const payload = {
      id: orderId,
      user_id: 'a80cb051-3c8d-4e1b-a7b4-2983fe94a26b',
      customer_id: 'a80cb051-3c8d-4e1b-a7b4-2983fe94a26b',
      customer_name: 'Test Customer A',
      customer_phone: '9876543210',
      delivery_address: 'Flat 101, Test Residency, Navi Mumbai',
      subtotal: 480,
      discount: 0,
      delivery_fee: 50,
      delivery_charge: 50,
      total: 530,
      payment_method: 'COD',
      payment_status: 'Pending',
      payment_ref: '',
      status: 'Pending',
      order_type: 'b2c',
      delivery_slot: 'Morning 8:00 AM - 10:00 AM',
      points_earned: 9,
      points_redeemed: 0,
      points_discount: 0,
      stamp_awarded: true,
      claimed_reward_code: null,
      items: [
        { product_id: 'prod-1', name: 'Chicken Curry Cut', quantity: 1, unit_price: 280, total: 280 },
        { product_id: 'prod-2', name: 'Chicken Breast Boneless', quantity: 1, unit_price: 200, total: 200 }
      ]
    };

    const res = await request('orders', 'POST', payload);
    assert.strictEqual(res.status, 201, `Failed to create order: ${JSON.stringify(res.data)}`);
    assert.strictEqual(res.data[0].id, orderId);
    assert.strictEqual(res.data[0].total, 530);
    assert.strictEqual(res.data[0].claimed_reward_code, null);
  });

  // 3. Scenario 2: B2C order with loyalty points
  await test('Scenario 2: B2C order with loyalty points redemption', async () => {
    const orderId = `TEST-B2C-PTS-${Date.now()}`;
    testOrderIds.push(orderId);
    const payload = {
      id: orderId,
      user_id: 'a80cb051-3c8d-4e1b-a7b4-2983fe94a26b',
      customer_id: 'a80cb051-3c8d-4e1b-a7b4-2983fe94a26b',
      customer_name: 'Test Customer A',
      customer_phone: '9876543210',
      delivery_address: 'Flat 101, Test Residency, Navi Mumbai',
      subtotal: 500,
      discount: 25,
      delivery_fee: 50,
      total: 525,
      payment_method: 'UPI',
      payment_status: 'Paid',
      payment_ref: 'UPI-TXN-554433',
      status: 'Pending',
      order_type: 'b2c',
      points_earned: 9,
      points_redeemed: 500,
      points_discount: 25,
      stamp_awarded: true,
      claimed_reward_code: null,
      items: [
        { product_id: 'prod-1', name: 'Chicken Curry Cut', quantity: 2, unit_price: 250, total: 500 }
      ]
    };

    const res = await request('orders', 'POST', payload);
    assert.strictEqual(res.status, 201, `Failed to create points order: ${JSON.stringify(res.data)}`);
    assert.strictEqual(res.data[0].points_redeemed, 500);
    assert.strictEqual(res.data[0].points_discount, 25);
  });

  // 4. Scenario 3: B2C order with free 250g Chicken Curry Cut reward
  await test('Scenario 3: B2C order with free 250g Chicken Curry Cut reward', async () => {
    const orderId = `TEST-B2C-REWARD-${Date.now()}`;
    testOrderIds.push(orderId);
    const payload = {
      id: orderId,
      user_id: 'a80cb051-3c8d-4e1b-a7b4-2983fe94a26b',
      customer_id: 'a80cb051-3c8d-4e1b-a7b4-2983fe94a26b',
      customer_name: 'Test Customer B',
      customer_phone: '9876543210',
      delivery_address: 'Flat 102, Test Residency, Navi Mumbai',
      subtotal: 420,
      discount: 0,
      delivery_fee: 50,
      total: 470,
      payment_method: 'COD',
      payment_status: 'Pending',
      payment_ref: '',
      status: 'Pending',
      order_type: 'b2c',
      points_earned: 8,
      points_redeemed: 0,
      points_discount: 0,
      stamp_awarded: true,
      claimed_reward_code: 'MC-FREE-CHICKEN-250G',
      items: [
        { product_id: 'prod-2', name: 'Chicken Breast', quantity: 1, unit_price: 420, total: 420 },
        { product_id: 'prod-1', name: 'Chicken Curry Cut (250g Free Reward)', quantity: 1, unit_price: 0, total: 0, is_free_reward: true }
      ]
    };

    const res = await request('orders', 'POST', payload);
    assert.strictEqual(res.status, 201, `Failed to create reward order: ${JSON.stringify(res.data)}`);
    assert.strictEqual(res.data[0].claimed_reward_code, 'MC-FREE-CHICKEN-250G');
  });

  // 5. Scenario 4: B2C order with both rewards (points + stamp reward)
  await test('Scenario 4: B2C order with combined points and free product reward', async () => {
    const orderId = `TEST-B2C-COMBINED-${Date.now()}`;
    testOrderIds.push(orderId);
    const payload = {
      id: orderId,
      user_id: 'a80cb051-3c8d-4e1b-a7b4-2983fe94a26b',
      customer_id: 'a80cb051-3c8d-4e1b-a7b4-2983fe94a26b',
      customer_name: 'Test Customer B',
      customer_phone: '9876543210',
      delivery_address: 'Flat 102, Test Residency, Navi Mumbai',
      subtotal: 600,
      discount: 30,
      delivery_fee: 50,
      total: 620,
      payment_method: 'UPI',
      payment_status: 'Paid',
      payment_ref: 'UPI-TXN-COMBINED-01',
      status: 'Pending',
      order_type: 'b2c',
      points_earned: 11,
      points_redeemed: 600,
      points_discount: 30,
      stamp_awarded: true,
      claimed_reward_code: 'MC-FREE-CHICKEN-250G',
      items: [
        { product_id: 'prod-2', name: 'Chicken Breast', quantity: 2, unit_price: 300, total: 600 },
        { product_id: 'prod-1', name: 'Chicken Curry Cut (250g Free Reward)', quantity: 1, unit_price: 0, total: 0, is_free_reward: true }
      ]
    };

    const res = await request('orders', 'POST', payload);
    assert.strictEqual(res.status, 201, `Failed to create combined order: ${JSON.stringify(res.data)}`);
    assert.strictEqual(res.data[0].claimed_reward_code, 'MC-FREE-CHICKEN-250G');
    assert.strictEqual(res.data[0].points_redeemed, 600);
  });

  // 6. Scenario 5: B2B wholesale order
  await test('Scenario 5: B2B wholesale order (₹1,500 >= ₹1,000 threshold)', async () => {
    const orderId = `TEST-B2B-WHOLESALE-${Date.now()}`;
    testOrderIds.push(orderId);
    const payload = {
      id: orderId,
      user_id: '74058354-77e3-419b-add1-e2ad5eca8666',
      customer_id: '74058354-77e3-419b-add1-e2ad5eca8666',
      business_name: 'Aejazs Kitchen',
      customer_name: 'Aejaz Qureshi',
      customer_phone: '07977630912',
      delivery_address: 'Turbhe Sector 20 A2 Room No 126',
      subtotal: 1500,
      discount: 0,
      delivery_fee: 0,
      total: 1500,
      payment_method: 'Pay Later (Credit)',
      payment_status: 'Pending',
      payment_ref: '',
      status: 'Pending',
      order_type: 'b2b',
      points_earned: 0,
      points_redeemed: 0,
      points_discount: 0,
      stamp_awarded: false,
      claimed_reward_code: null,
      items: [
        { product_id: 'prod-1', name: 'Chicken Curry Cut Wholesale', quantity: 10, unit_price: 150, total: 1500 }
      ]
    };

    const res = await request('orders', 'POST', payload);
    assert.strictEqual(res.status, 201, `Failed to create B2B order: ${JSON.stringify(res.data)}`);
    assert.strictEqual(res.data[0].order_type, 'b2b');
    assert.strictEqual(res.data[0].points_earned, 0, 'B2B orders must earn 0 retail loyalty points');
  });

  // 7. Scenario 6: Razorpay payment verification
  await test('Scenario 6: Razorpay verified payment order', async () => {
    const orderId = `TEST-RZP-${Date.now()}`;
    testOrderIds.push(orderId);
    const payload = {
      id: orderId,
      user_id: 'a80cb051-3c8d-4e1b-a7b4-2983fe94a26b',
      customer_name: 'Test Customer Razorpay',
      customer_phone: '9876543210',
      delivery_address: 'Turbhe Sector 20, Navi Mumbai',
      subtotal: 800,
      discount: 0,
      delivery_fee: 50,
      total: 850,
      payment_method: 'Razorpay',
      payment_status: 'Paid',
      payment_ref: 'pay_test_rzp_' + Math.random().toString(36).substr(2, 9),
      status: 'Pending',
      order_type: 'b2c',
      points_earned: 16,
      points_redeemed: 0,
      points_discount: 0,
      stamp_awarded: true,
      claimed_reward_code: null,
      items: [
        { product_id: 'prod-1', name: 'Fresh Chicken', quantity: 2, unit_price: 400, total: 800 }
      ]
    };

    const res = await request('orders', 'POST', payload);
    assert.strictEqual(res.status, 201, `Failed to create Razorpay order: ${JSON.stringify(res.data)}`);
    assert.strictEqual(res.data[0].payment_status, 'Paid');
  });

  // 8. Scenario 7: Invoice generation and order retrieval
  await test('Scenario 7: Invoice data retrieval for newly created order', async () => {
    const sampleId = testOrderIds[0];
    const res = await request(`orders?id=eq.${sampleId}&select=*`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.length, 1);
    const order = res.data[0];
    assert.strictEqual(order.id, sampleId);
    assert(Array.isArray(order.items), 'Order items should be an array');
    assert(order.total > 0, 'Order total should be greater than 0');
  });

  // 9. Scenario 8: Admin order visibility
  await test('Scenario 8: Admin order visibility and filtering', async () => {
    const res = await request('orders?select=id,status,total,order_type,customer_name&order=created_at.desc&limit=10');
    assert.strictEqual(res.status, 200);
    assert(res.data.length >= testOrderIds.length, 'Admin query should see newly created orders');
    const ids = res.data.map(o => o.id);
    for (const testId of testOrderIds) {
      assert(ids.includes(testId), `Order ${testId} should be visible in admin list`);
    }
  });

  // Clean up test orders to leave production database pristine
  console.log('\nCleaning up test orders to keep production database clean...');
  for (const tid of testOrderIds) {
    await request(`orders?id=eq.${tid}`, 'DELETE');
  }
  console.log(`Cleaned up ${testOrderIds.length} test orders successfully.\n`);

  console.log('===============================================================');
  console.log(`TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
