const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split(/\r?\n/);
const parsed = {};
for (const line of lines) {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    parsed[k] = v;
  }
}
const { createClient } = require('@supabase/supabase-js');
const url = parsed.NEXT_PUBLIC_SUPABASE_URL;
const key = parsed.SUPABASE_SERVICE_ROLE_KEY || parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (url && key) {
  const supabase = createClient(url, key);
  supabase.from('products').select('id, name, category, price_b2c, price_b2b, unit').then(({ data, error }) => {
    if (error) console.log('Error:', error.message);
    else {
      console.log('Total live products:', data.length);
      data.forEach(p => console.log('Live Prod:', p.id, '|', p.name, '|', p.category, '| b2c:', p.price_b2c, '| b2b:', p.price_b2b));
    }
  });
}
