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

async function resetMultipliers() {
  const updates = [
    { id: 'rule-chicken-curry-cut-skinless', product_id: 'chicken-curry-cut-skinless', product_name: 'Chicken Curry Cut – Skinless', multiplier: 1.60, is_confirmed_by_owner: true, updated_at: new Date().toISOString() },
    { id: 'rule-chicken-breast-boneless', product_id: 'chicken-breast-boneless', product_name: 'Chicken Breast Boneless', multiplier: 2.30, is_confirmed_by_owner: true, updated_at: new Date().toISOString() }
  ];
  const { data, error } = await supabase.from('b2b_product_pricing_rules').upsert(updates, { onConflict: 'product_id' });
  if (error) console.error('Reset error:', error);
  else console.log('✓ Successfully confirmed standard owner multipliers: Curry Cut (1.60x) and Breast Boneless (2.30x)');
}

resetMultipliers();
