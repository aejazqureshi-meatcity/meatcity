async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/mock/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'users', filters: [] })
    });
    const json = await res.json();
    const users = json.data || [];
    console.log(`Available users: ${users.length}`);

    // Try authenticating
    const authRes = await fetch('http://localhost:3000/api/mock/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        user: users.find(u => u.email === 'kadir@gmail.com')
      })
    });
    console.log('Auth status:', authRes.status);
    console.log('Set-Cookie headers:', authRes.headers.get('set-cookie'));
  } catch (err) {
    console.error('Test failed:', err);
  }
}

test();
