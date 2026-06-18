"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function PendingApproval() {
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let active = true;

    async function checkStatus() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (active) setLoading(false);
          return;
        }

        const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
        if (profile) {
          if (profile.status === 'active') {
            if (active) {
              setIsApproved(true);
              
              // Refresh mock session cookie if in mock DB mode
              const authenticatedUser = {
                ...profile,
                user_metadata: {
                  user_type: profile.user_type,
                  status: profile.status,
                  full_name: profile.full_name,
                  phone: profile.phone,
                  business_name: profile.business_name
                }
              };
              
              await fetch('/api/mock/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'login', user: authenticatedUser })
              });

              // Also update local storage session if any
              localStorage.setItem('meatcity_user_status', profile.status);

              // Redirect to homepage
              router.push('/');
            }
            return;
          }
        }
      } catch (err) {
        console.error('Error checking B2B status:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    checkStatus();

    // Set up a polling interval to auto-redirect if approved in admin panel
    const interval = setInterval(checkStatus, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [supabase, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 py-10 bg-black text-white font-primary">
      <div className="text-6xl mb-6 animate-pulse select-none">⏳</div>
      <h2 className="text-gold text-xl font-black tracking-tight mb-3">
        {isApproved ? 'Application Approved!' : 'Application Under Review'}
      </h2>
      <p className="text-text-secondary text-xs leading-relaxed max-w-[280px] mb-8">
        {isApproved 
          ? 'Your B2B retail partner account has been approved! Redirecting you to the catalog...' 
          : 'Your B2B account registration has been received and is currently waiting for admin approval. We will contact you shortly once our Turbhe office processes your credentials.'}
      </p>
      
      {!isApproved && (
        <Link 
          href="/" 
          className="w-full max-w-[200px] py-3.5 bg-primary hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-[12px] shadow-lg transition-transform active:scale-[0.98] text-center"
        >
          Check Status / Home
        </Link>
      )}
    </div>
  );
}
