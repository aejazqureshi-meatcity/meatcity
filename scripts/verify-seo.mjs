import fs from 'fs';

console.log("=========================================");
console.log("   MEATCITY TECHNICAL SEO VERIFICATION   ");
console.log("=========================================");

function verifyPage(name, path, isNoindex = false) {
  console.log(`\nChecking [${name}] (${path}):`);
  if (!fs.existsSync(path)) {
    console.error(`  ERROR: File ${path} does not exist!`);
    return;
  }
  const html = fs.readFileSync(path, 'utf8');
  
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  console.log(`  Title: ${titleMatch ? titleMatch[1] : 'MISSING'}`);

  const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
  console.log(`  Description: ${descMatch ? descMatch[1].substring(0, 70) + '...' : 'MISSING'}`);

  const canonicalMatch = html.match(/<link rel="canonical" href="([^"]+)"/);
  console.log(`  Canonical: ${canonicalMatch ? canonicalMatch[1] : 'MISSING'}`);

  const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
  console.log(`  OG Title: ${ogTitleMatch ? ogTitleMatch[1] : 'MISSING'}`);

  const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
  console.log(`  OG Image: ${ogImageMatch ? ogImageMatch[1] : 'MISSING'}`);

  const robotsMatch = html.match(/<meta name="robots" content="([^"]+)"/);
  console.log(`  Robots: ${robotsMatch ? robotsMatch[1] : 'None (Indexable default)'}`);

  const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  console.log(`  JSON-LD schemas count: ${jsonLdMatches.length}`);
  jsonLdMatches.forEach((m, idx) => {
    try {
      const parsed = JSON.parse(m[1]);
      const types = Array.isArray(parsed['@graph']) 
        ? parsed['@graph'].map(item => item['@type']).join(', ')
        : (parsed['@type'] || 'Object');
      console.log(`    Schema ${idx + 1}: Valid JSON (${types})`);
    } catch (e) {
      console.error(`    Schema ${idx + 1}: INVALID JSON! ${e.message}`);
    }
  });

  if (isNoindex) {
    if (robotsMatch && robotsMatch[1].includes('noindex')) {
      console.log(`  ✓ NOINDEX confirmed for private route`);
    } else {
      console.warn(`  ⚠ WARNING: Expected noindex on ${name}`);
    }
  }
}

verifyPage('Home Page', '.next/server/app/index.html');
verifyPage('About Page', '.next/server/app/about.html');
verifyPage('Cart Page', '.next/server/app/cart.html', true);
verifyPage('Login Page', '.next/server/app/login.html', true);
verifyPage('Profile Page', '.next/server/app/profile.html', true);
verifyPage('Admin Page', '.next/server/app/admin.html', true);
