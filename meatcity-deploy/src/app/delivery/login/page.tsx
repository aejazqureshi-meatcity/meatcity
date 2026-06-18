"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function DeliveryLogin() {
  const [identifier, setIdentifier] = useState(''); // Email or Mobile number
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log(`[AUTH LOG] Delivery login submit: ${identifier}`);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      const role = data.user?.user_metadata?.user_type || data.user?.user_metadata?.role;
      
      if (role !== 'delivery_partner') {
        setError('Access denied. Only Delivery Partners can access this section.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      router.push('/delivery');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ maxWidth: '420px', margin: '4rem auto', padding: '2rem' }}>
      <div className="auth-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🛵</div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-black)' }}>Delivery Portal</h2>
        <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>Login to view your delivery queue</p>
      </div>

      <form onSubmit={handleLogin}>
        {error && (
          <div style={{ color: 'var(--color-red)', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>
            {error}
          </div>
        )}
        
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>Email or Mobile Number</label>
          <input 
            type="text" 
            className="form-input" 
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            placeholder="e.g. 9876543210 or name@meatcity.com"
            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}
          />
        </div>

        <div className="form-group" style={{ marginBottom: '1.75rem' }}>
          <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>Password</label>
          <input 
            type="password" 
            className="form-input" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}
          />
        </div>

        <button 
          type="submit" 
          className="fixed-checkout-btn" 
          disabled={loading}
          style={{ position: 'static', width: '100%', display: 'block', padding: '0.85rem', fontSize: '1rem', fontWeight: 700 }}
        >
          {loading ? 'Logging in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
