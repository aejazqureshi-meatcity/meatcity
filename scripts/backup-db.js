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
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Supabase URL or Service Key missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function backup() {
  const tables = [
    'products', 'orders', 'order_items', 'categories', 'users', 'delivery_partners',
    'loyalty_accounts', 'loyalty_stamp_cards', 'loyalty_rewards', 'loyalty_settings', 'loyalty_points_ledger',
    'reviews', 'b2b_paper_rates', 'b2b_product_pricing_rules', 'b2b_rate_history',
    'sales_leads', 'sales_messages', 'sales_quotations', 'sales_follow_ups', 'sales_settings'
  ];

  const backupData = { timestamp: new Date().toISOString(), tables: {} };
  
  if (!fs.existsSync('backups')) fs.mkdirSync('backups');
  const filename = 'backups/db-backup-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';

  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('*');
      if (error) {
        backupData.tables[t] = { status: 'error', error: error.message };
      } else {
        backupData.tables[t] = { status: 'ok', count: data.length, rows: data };
      }
    } catch (e) {
      backupData.tables[t] = { status: 'exception', error: e.message };
    }
  }

  fs.writeFileSync(filename, JSON.stringify(backupData, null, 2));
  console.log('Backup saved successfully to ' + filename);
  Object.keys(backupData.tables).forEach(t => {
    const res = backupData.tables[t];
    console.log('  ' + t + ': ' + (res.status === 'ok' ? res.count + ' rows' : 'skipped (' + res.error + ')'));
  });
}

backup();
