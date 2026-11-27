const http = require('http');

async function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    req.end();
  });
}

async function runAudit() {
  console.log('====================================================');
  console.log('       MEATCITY COMPREHENSIVE SYSTEM AUDIT          ');
  console.log('====================================================\n');

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

  const adminHeaders = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer mock-admin'
  };

  // 1. Audit Admin Authentication / Login
  console.log('--- 1. Admin Authentication Audit ---');
  const loginRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/mock/auth',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { action: 'login', user: { id: 'admin-1', email: 'admin@meatcity.com', user_type: 'admin' } });

  assert(loginRes.status === 200, 'Admin login succeeded with 200');

  // 2. Audit Customer Loyalty Calculation Formula
  console.log('\n--- 2. Customer Loyalty Points Calculation Audit ---');
  // Formula: pointsEarned = Math.floor((spend / 100) * points_per_hundred)
  // At 2 pts per ₹100: ₹320 spend must earn exactly 6 points
  const testSubtotal = 320;
  const pointsPerHundred = 2;
  const expectedPoints = Math.floor((testSubtotal / 100) * pointsPerHundred);
  assert(expectedPoints === 6, `₹320 spend at 2 pts/₹100 equals exactly 6 points (Calculated: ${expectedPoints})`);

  // Verify Estimate API
  const estimateRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/loyalty/estimate',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { subtotal: 320, role: 'b2c' });

  assert(estimateRes.status === 200, 'Loyalty estimate API returned 200 OK');
  assert(estimateRes.body.estimatedPointsEarned === 6, `Loyalty estimate API returned 6 points for ₹320 (Actual: ${estimateRes.body.estimatedPointsEarned})`);

  // 3. Audit B2B Pricing Separation & Dynamic Rate Engine
  console.log('\n--- 3. B2B Daily Paper Rate & B2C Isolation Audit ---');
  const preview140 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/b2b-rates/preview',
    method: 'POST',
    headers: adminHeaders,
  }, { paperRate: 140 });

  assert(preview140.status === 200, 'Preview at ₹140 returned 200 OK');
  const curryCut140 = preview140.body.previews?.find((p) => p.productId === 'prod-1');
  const breastBoneless140 = preview140.body.previews?.find((p) => p.productId === 'prod-2');

  assert(curryCut140?.calculatedNewPrice === 224, `Curry Cut at ₹140 x 1.60 = ₹224 (Actual: ${curryCut140?.calculatedNewPrice})`);
  assert(breastBoneless140?.calculatedNewPrice === 322, `Breast Boneless at ₹140 x 2.30 = ₹322 (Actual: ${breastBoneless140?.calculatedNewPrice})`);

  const preview150 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/b2b-rates/preview',
    method: 'POST',
    headers: adminHeaders,
  }, { paperRate: 150 });

  assert(preview150.status === 200, 'Preview at ₹150 returned 200 OK');
  const curryCut150 = preview150.body.previews?.find((p) => p.productId === 'prod-1');
  const breastBoneless150 = preview150.body.previews?.find((p) => p.productId === 'prod-2');

  assert(curryCut150?.calculatedNewPrice === 240, `Curry Cut at ₹150 x 1.60 = ₹240 (Actual: ${curryCut150?.calculatedNewPrice})`);
  assert(breastBoneless150?.calculatedNewPrice === 345, `Breast Boneless at ₹150 x 2.30 = ₹345 (Actual: ${breastBoneless150?.calculatedNewPrice})`);

  // 4. Audit Customer Rate List (WhatsApp text secrecy)
  console.log('\n--- 4. Customer Privacy & WhatsApp Rate List Audit ---');
  const rateListRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/b2b/rate-list',
    method: 'GET',
  });

  assert(rateListRes.status === 200, 'Customer Rate List endpoint returned 200');
  const plainText = rateListRes.body.plainText || '';
  assert(!plainText.toLowerCase().includes('multiplier'), 'Rate list strictly excludes multiplier formula');
  assert(!plainText.toLowerCase().includes('paper rate'), 'Rate list strictly excludes internal paper rate');
  assert(plainText.includes('MEATCITY'), 'Rate list includes MeatCity branding');
  assert(plainText.includes('Turbhe Hub'), 'Rate list references Turbhe Hub location');

  // 5. Audit Delivery Partner Creation API
  console.log('\n--- 5. Delivery Partner Management Audit ---');
  const partnerRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/create-partner',
    method: 'POST',
    headers: adminHeaders,
  }, {
    name: 'Audit Test Rider',
    email: 'test-rider-audit@meatcity.com',
    mobile: '9876543210',
    password: 'RiderPassword123!',
    status: 'active',
  });

  assert(partnerRes.status === 200 || partnerRes.status === 409, `Delivery partner create/check returned status ${partnerRes.status}`);

  // 6. Audit Reviews API
  console.log('\n--- 6. Reviews Moderation Audit ---');
  const reviewsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/reviews?status=approved',
    method: 'GET',
  });
  assert(reviewsRes.status === 200, 'Reviews API returned 200 OK');
  assert(Array.isArray(reviewsRes.body?.reviews), 'Reviews list returned as array');

  // 7. Summary
  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passed} | TOTAL FAILED: ${failed}`);
  console.log('====================================================');
  if (failed > 0) process.exit(1);
}

runAudit().catch((err) => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
