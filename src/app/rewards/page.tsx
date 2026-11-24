"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import RewardsDashboard from '@/components/rewards/RewardsDashboard';

export default function RewardsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?redirect=rewards');
        return;
      }
      setUser(user);
      setLoading(false);
    };
    checkAuth();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-xs text-text-secondary font-bold uppercase tracking-wider animate-pulse">
          Loading MeatCity Club...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-24 px-4 py-4 gap-4 animate-in fade-in duration-200 max-w-[480px] mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-surface border border-border text-base text-text-primary active:scale-95 transition-all shadow-xs"
            aria-label="Back to store"
          >
            ←
          </Link>
          <div className="flex flex-col">
            <h1 className="text-base font-black text-text-primary tracking-tight leading-none">
              MeatCity Rewards
            </h1>
            <span className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider mt-0.5">
              Meat that matters
            </span>
          </div>
        </div>

        <Link
          href="/profile"
          className="text-xs font-bold text-primary hover:underline"
        >
          My Profile
        </Link>
      </div>

      {/* Rewards Dashboard Component */}
      <RewardsDashboard user={user} />
    </div>
  );
}
