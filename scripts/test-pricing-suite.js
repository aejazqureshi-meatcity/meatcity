const http = require('http');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function parseEnv(path) {
  const env = {};
  if (!fs.existsSync(path)) return env;
  const lines = fs.readFileSync(path, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const env = parseEnv('.env.local');

function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(b) });
        } catch {
          resolve({ status: res.statusCode, body: b });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'GET',
      headers
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(b) });
        } catch {
          resolve({ status: res.statusCode, body: b });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('   MEATCITY B2B DAILY PAPER RATE PRICING TEST SUITE  ');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // Authenticate as Admin
  let authHeader = { 'Authorization': 'Bearer mock-admin' };
  if (env.NEXT_PUBLIC_USE_MOCK_DB !== 'true' && env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: 'admin@meatcity.com',
      password: 'AdminPassword123!'
    });
    if (authData?.session?.access_token) {
      authHeader = { 'Authorization': `Bearer ${authData.session.access_token}` };
      console.log('✓ Successfully authenticated real admin JWT token.');
    }
  }

  // Discover real product IDs
  const initialRates = await get('/api/admin/b2b-rates', authHeader);
  const products = initialRates.body.products || [];
  const prod1 = products.find(p => p.name?.toLowerCase().includes('curry cut') || p.id === 'prod-1') || products[0];
  const prod2 = products.find(p => p.name?.toLowerCase().includes('breast') || p.id === 'prod-2') || products[1];

  const p1Id = prod1?.id || 'prod-1';
  const p2Id = prod2?.id || 'prod-2';
  console.log(`Resolved Product 1: ${prod1?.name} (${p1Id})`);
  console.log(`Resolved Product 2: ${prod2?.name} (${p2Id})`);

  // Ensure standard multipliers exist in DB before assertions
  await post('/api/admin/b2b-rates/rules', {
    bulkRules: [
      { productId: p1Id, multiplier: 1.60, product_name: prod1?.name },
      { productId: p2Id, multiplier: 2.30, product_name: prod2?.name }
    ]
  }, authHeader);

  // 1. Paper rate 140 with 1.60 and 2.30
  console.log('\n--- Scenario 1 & 2: Paper Rate 140 ---');
  const prev140 = await post('/api/admin/b2b-rates/preview', { paperRate: 140 }, authHeader);
  const p1_140 = prev140.body.previews?.find(p => p.productId === p1Id);
  const p2_140 = prev140.body.previews?.find(p => p.productId === p2Id);
  assert(p1_140?.calculatedNewPrice === 224, `Paper rate 140 x 1.60 = 224 (Actual: ${p1_140?.calculatedNewPrice})`);
  assert(p2_140?.calculatedNewPrice === 322, `Paper rate 140 x 2.30 = 322 (Actual: ${p2_140?.calculatedNewPrice})`);

  // 2. Paper rate 150 with 1.60 and 2.30
  console.log('\n--- Scenario 3 & 4: Paper Rate 150 ---');
  const prev150 = await post('/api/admin/b2b-rates/preview', { paperRate: 150 }, authHeader);
  const p1_150 = prev150.body.previews?.find(p => p.productId === p1Id);
  const p2_150 = prev150.body.previews?.find(p => p.productId === p2Id);
  assert(p1_150?.calculatedNewPrice === 240, `Paper rate 150 x 1.60 = 240 (Actual: ${p1_150?.calculatedNewPrice})`);
  assert(p2_150?.calculatedNewPrice === 345, `Paper rate 150 x 2.30 = 345 (Actual: ${p2_150?.calculatedNewPrice})`);

  // 3. Edit individual multipliers
  console.log('\n--- Scenario 6: Custom Multiplier Override in Preview ---');
  const prevCustom = await post('/api/admin/b2b-rates/preview', {
    paperRate: 140,
    customRules: [{ product_id: p1Id, multiplier: 1.75 }]
  }, authHeader);
  const p1_custom = prevCustom.body.previews?.find(p => p.productId === p1Id);
  assert(p1_custom?.calculatedNewPrice === 245, `Custom multiplier 1.75: 140 x 1.75 = 245 (Actual: ${p1_custom?.calculatedNewPrice})`);

  // 4. Invalid and zero paper rates rejected
  console.log('\n--- Scenario 9: Validation of Invalid Rates ---');
  const zeroRate = await post('/api/admin/b2b-rates/preview', { paperRate: 0 }, authHeader);
  assert(zeroRate.status === 400, `Zero rate rejected with 400 (Status: ${zeroRate.status})`);
  const negRate = await post('/api/admin/b2b-rates/publish', { paperRate: -50 }, authHeader);
  assert(negRate.status === 400, `Negative rate rejected with 400 (Status: ${negRate.status})`);

  // 5. Unauthorized access rejected
  console.log('\n--- Scenario 15: Security & Fail-Closed Access ---');
  const unauthGet = await get('/api/admin/b2b-rates');
  assert(unauthGet.status === 401, `Unauthorized access blocked with 401 (Status: ${unauthGet.status})`);
  const unauthPub = await post('/api/admin/b2b-rates/publish', { paperRate: 140 });
  assert(unauthPub.status === 401, `Unauthorized publish blocked with 401 (Status: ${unauthPub.status})`);

  // 6. Multipliers not exposed to customers in WhatsApp Rate List
  console.log('\n--- Scenario 16: Customer Privacy (No Multipliers Exposed) ---');
  const rateListRes = await get('/api/b2b/rate-list');
  assert(rateListRes.status === 200, `Rate list endpoint returned 200`);
  assert(!rateListRes.body.plainText.includes('multiplier'), `Rate list does not contain internal word 'multiplier'`);
  assert(!rateListRes.body.plainText.includes('paper rate'), `Rate list does not contain internal word 'paper rate'`);
  assert(rateListRes.body.items?.length > 0, `Rate list contains ${rateListRes.body.items?.length} items`);

  // 7. Atomic Publication
  console.log('\n--- Scenario 8: Atomic Price Publication ---');
  const pubRes = await post('/api/admin/b2b-rates/publish', { paperRate: 140 }, authHeader);
  assert(pubRes.status === 200, `Published rate 140 successfully`);
  assert(pubRes.body.publishedRate === 140, `Published rate confirmed: 140`);

  // 8. B2C Prices Untouched
  console.log('\n--- Scenario 10: B2C Retail Prices Remain Untouched ---');
  const checkB2C = await get('/api/admin/b2b-rates', authHeader);
  const p1 = checkB2C.body.products?.find(p => p.id === p1Id);
  const p2 = checkB2C.body.products?.find(p => p.id === p2Id);
  assert(p1 && typeof p1.price_b2c === 'number', `prod-1 B2C price preserved (${p1?.price_b2c})`);
  assert(p2 && typeof p2.price_b2c === 'number', `prod-2 B2C price preserved (${p2?.price_b2c})`);
  assert(p1?.price_b2b === 224, `prod-1 B2B price updated to 224 (Actual: ${p1?.price_b2b})`);
  assert(p2?.price_b2b === 322, `prod-2 B2B price updated to 322 (Actual: ${p2?.price_b2b})`);

  // 9. Manual Price Override Test
  console.log('\n--- Scenario 7 & 8: Manual Price Override ---');
  const overrideRes = await post('/api/admin/b2b-rates/rules', {
    productId: p1Id,
    rule: {
      product_name: prod1?.name,
      pricing_mode: 'multiplier',
      multiplier: 1.60,
      rounding_method: 'nearest_1',
      is_dynamic_enabled: true,
      manual_override_enabled: true,
      manual_override_price: 215,
      manual_override_reason: 'Hotels promo discount'
    }
  }, authHeader);
  assert(overrideRes.status === 200, `Manual override saved`);
  const prevWithOverride = await post('/api/admin/b2b-rates/preview', { paperRate: 150 }, authHeader);
  const p1_overridden = prevWithOverride.body.previews?.find(p => p.productId === p1Id);
  assert(p1_overridden?.calculatedNewPrice === 215, `Override price 215 takes precedence over calculated 240 (Actual: ${p1_overridden?.calculatedNewPrice})`);

  // Restore dynamic rule
  await post('/api/admin/b2b-rates/rules', {
    productId: p1Id,
    rule: {
      product_name: prod1?.name,
      pricing_mode: 'multiplier',
      multiplier: 1.60,
      rounding_method: 'nearest_1',
      is_dynamic_enabled: true,
      manual_override_enabled: false,
      manual_override_price: null
    }
  }, authHeader);
  console.log('✓ Restored dynamic multiplier rule.');

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runTestSuite().catch(err => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
