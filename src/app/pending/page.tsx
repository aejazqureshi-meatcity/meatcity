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
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 py-10 bg-background text-text-primary font-primary">
      <div className="w-16 h-16 mb-4 flex items-center justify-center">
        <img
          src="/images/brand/meatcity-icon.png"
          alt="MeatCity Icon"
          className="w-full h-full object-contain dark:hidden"
        />
        <img
          src="/images/brand/meatcity-icon-dark.png"
          alt="MeatCity Icon"
          className="w-full h-full object-contain hidden dark:block"
        />
      </div>
      <div className="text-4xl mb-3 animate-pulse select-none">⏳</div>
      <h2 className="text-primary text-xl font-black tracking-tight mb-2">
        {isApproved ? 'Application Approved!' : 'Application Under Review'}
      </h2>
      <p className="text-text-secondary text-xs leading-relaxed max-w-[280px] mb-8">
        {isApproved 
          ? 'Your B2B retail partner account has been approved! Redirecting you to the catalog...' 
          : 'Your B2B wholesale partner registration has been received and is currently waiting for admin review. Our onboarding desk will verify your details shortly.'}
      </p>
      
      {!isApproved && (
        <Link 
          href="/" 
          className="w-full max-w-[220px] py-3.5 bg-primary hover:bg-[#B80000] text-white font-black text-xs uppercase tracking-wider rounded-[14px] shadow-lg shadow-primary/20 transition-transform active:scale-[0.98] text-center"
        >
          Back to Store
        </Link>
      )}
    </div>
  );
}
