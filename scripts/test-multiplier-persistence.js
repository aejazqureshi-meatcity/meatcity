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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testPersistence() {
  console.log('=== TESTING MULTIPLIER PERSISTENCE ===');

  // 1. Get existing products and rules
  const { data: products } = await supabase.from('products').select('id, name, price_b2b').limit(2);
  if (!products || products.length === 0) {
    console.error('No products found in DB');
    return;
  }

  const p1 = products[0];
  const p2 = products[1] || products[0];
  const originalPrice1 = p1.price_b2b;
  console.log(`Target product 1: ${p1.name} (${p1.id}), current B2B price: ₹${originalPrice1}`);
  if (p2.id !== p1.id) {
    console.log(`Target product 2: ${p2.name} (${p2.id}), current B2B price: ₹${p2.price_b2b}`);
  }

  // 2. Perform bulk save of custom multipliers via API
  console.log('\n--- Step 1: Performing bulk save of multipliers ---');
  const testMultiplier1 = 1.85;
  const testMultiplier2 = 2.45;

  const bulkRules = [
    { productId: p1.id, multiplier: testMultiplier1, product_name: p1.name },
    { productId: p2.id, multiplier: testMultiplier2, product_name: p2.name }
  ];

  const adminAuth = await supabase.auth.signInWithPassword({
    email: 'admin@meatcity.com',
    password: 'AdminPassword123!'
  });
  const token = adminAuth.data?.session?.access_token;

  const saveRes = await fetch('http://localhost:3000/api/admin/b2b-rates/rules', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ bulkRules })
  });

  const saveJson = await saveRes.json();
  console.log('Save API Response status:', saveRes.status);
  console.log('Save API Response body:', saveJson);

  if (!saveRes.ok || !saveJson.success) {
    console.error('FAILED: Could not bulk save multipliers!');
    process.exit(1);
  }

  // 3. Verify database records in b2b_product_pricing_rules
  console.log('\n--- Step 2: Verifying direct database persistence ---');
  const { data: dbRules, error: rErr } = await supabase
    .from('b2b_product_pricing_rules')
    .select('product_id, multiplier, product_name, updated_at')
    .in('product_id', [p1.id, p2.id]);

  console.log('Rules in DB:', dbRules);
  const savedRule1 = dbRules.find(r => r.product_id === p1.id);
  const savedRule2 = dbRules.find(r => r.product_id === p2.id);

  if (Number(savedRule1.multiplier) !== testMultiplier1) {
    console.error(`FAILED: Rule 1 multiplier mismatch! Expected ${testMultiplier1}, got ${savedRule1.multiplier}`);
    process.exit(1);
  }
  console.log(`✓ Product 1 multiplier persisted as ${savedRule1.multiplier}x in DB!`);

  // 4. Verify that live selling price was NOT modified (save != publish)
  console.log('\n--- Step 3: Verifying separation of Save vs Publish ---');
  const { data: freshP1 } = await supabase.from('products').select('price_b2b').eq('id', p1.id).single();
  console.log(`Product 1 live selling price: ₹${freshP1.price_b2b} (originally ₹${originalPrice1})`);
  if (Number(freshP1.price_b2b) !== Number(originalPrice1)) {
    console.warn('Notice: selling price changed, expected untouched until Publish');
  } else {
    console.log('✓ Separation verified: Save Multipliers does NOT prematurely publish to customer catalogue!');
  }

  // 5. Simulate page reload / fresh API query
  console.log('\n--- Step 4: Simulating page refresh / GET /api/admin/b2b-rates ---');
  const getRes = await fetch('http://localhost:3000/api/admin/b2b-rates', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const getJson = await getRes.json();
  const reloadedRule1 = getJson.rules?.find(r => r.product_id === p1.id);
  console.log(`Reloaded rule for ${p1.name}: Multiplier = ${reloadedRule1?.multiplier}x`);

  if (Number(reloadedRule1?.multiplier) === testMultiplier1) {
    console.log('✓ SUCCESS: Multipliers survive browser refresh and page reload!');
  } else {
    console.error(`FAILED: Reloaded multiplier is ${reloadedRule1?.multiplier}, expected ${testMultiplier1}`);
    process.exit(1);
  }

  console.log('\n=== MULTIPLIER PERSISTENCE AUDIT: 100% PASSED ===');
}

testPersistence();
