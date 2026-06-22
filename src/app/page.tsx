"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProductCard from '../components/ProductCard';
import SplashScreens from '../components/SplashScreens';

// New Mobile-First UI imports
import LocationBar from '../components/LocationBar';
import { SearchBar } from '../components/ui/SearchBar';
import HeroCarousel from '../components/HeroCarousel';
import CouponCard from '../components/CouponCard';
import CategoryCard from '../components/CategoryCard';
import TrustCard from '../components/TrustCard';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price_b2c: number;
  price_b2b: number;
  unit: string;
  image_url: string;
  stock: number;
  variants?: any;
  stock_status?: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  user_type: 'admin' | 'b2c' | 'b2b' | 'delivery_partner';
  status: 'pending' | 'approved' | 'rejected' | 'suspended' | 'active' | 'inactive';
  name?: string;
  mobile?: string;
  role?: string;
  password?: string;
  business_name?: string;
  gst_number?: string;
  fssai_license?: string;
  shop_address?: string;
  referral_code?: string;
  credit_limit?: number;
  credit_used?: number;
  credit_available?: number;
  outstanding_balance?: number;
  payment_due_date?: string;
  ledger?: any[];
}

export default function Home() {
  const [showSplash, setShowSplash] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(['Chicken', 'Mutton', 'Seafood', 'Eggs', 'Ready To Cook']);
  const [activeTab, setActiveTab] = useState<string>('Chicken');
  const [searchQuery, setSearchQuery] = useState('');
  const [userRole, setUserRole] = useState<'guest' | 'b2c' | 'b2b'>('guest');
  const [userName, setUserName] = useState<string>('');
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);

  // B2B Specific States
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [b2bActiveView, setB2bActiveView] = useState<'catalog' | 'portal'>('catalog');
  const [orders, setOrders] = useState<any[]>([]);

  // B2B Portal credit actions states
  const [showPayOutstandingModal, setShowPayOutstandingModal] = useState(false);
  const [showRequestCollectionModal, setShowRequestCollectionModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'UPI' | 'Razorpay' | 'Card'>('UPI');
  const [collectionAmount, setCollectionAmount] = useState<number>(0);
  const [collectionDate, setCollectionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [collectionRemarks, setCollectionRemarks] = useState<string>('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string>('');

  // B2B Portal dynamic UPI states
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiTxRef, setUpiTxRef] = useState('');
  const [upiUtrInput, setUpiUtrInput] = useState('');
  const [upiScreenshot, setUpiScreenshot] = useState<string | null>(null);
  const [upiVerificationSuccess, setUpiVerificationSuccess] = useState(false);
  const [isSubmittingUpi, setIsSubmittingUpi] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  const verifyRepaymentRecord = async (
    paymentId: string, 
    orderId: string, 
    signature: string, 
    amount: number
  ) => {
    if (!userProfile) return;
    try {
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentType: 'repayment',
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          razorpay_signature: signature,
          payload: { userId: userProfile.id, amount }
        })
      });

      const verifyData = await verifyRes.json();
      if (verifyRes.ok && verifyData.success) {
        alert('Online repayment of ₹' + amount + ' processed and verified successfully!');
        loadInitialData();
      } else {
        alert('Payment verification failed: ' + (verifyData.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Network error verifying payment: ' + err.message);
    }
  };

  const submitRepaymentRecord = async (amount: number, paymentRef: string) => {
    if (!userProfile) return;

    const { error: paymentError } = await supabase.from('payments').insert({
      user_id: userProfile.id,
      amount: amount,
      status: 'pending',
      payment_method: 'Online (Razorpay)',
      payment_ref: paymentRef
    });

    if (paymentError) {
      alert('Failed to submit payment: ' + paymentError.message);
      return;
    }

    try {
      await supabase.from('notifications').insert({
        user_id: userProfile.id,
        title: 'Payment Submitted (Pending) ⏳',
        message: `Your online repayment of ₹${amount} is pending admin approval.`,
        type: 'payment_repayment'
      });

      await supabase.from('notifications').insert({
        user_id: 'd7b7b123-1234-5678-abcd-123456789abc',
        title: 'New Payment Pending Approval 💰',
        message: `A B2B customer (${userProfile.business_name || userProfile.full_name}) has submitted a payment of ₹${amount} for approval.`,
        type: 'payment_approval'
      });
    } catch (nErr) {
      console.error('Failed to trigger database notifications:', nErr);
    }

    setPayAmount(0);
    setShowPayOutstandingModal(false);
    setActionSuccessMessage('⏳ Repayment submitted successfully! Pending administrator approval.');
    setTimeout(() => setActionSuccessMessage(''), 5000);
  };

  const submitPortalUpiPayment = async (amount: number) => {
    if (!userProfile || !upiUtrInput) {
      alert('Please enter your UTR reference number.');
      return;
    }
    setIsSubmittingUpi(true);

    const { error: paymentError } = await supabase.from('payments').insert({
      user_id: userProfile.id,
      amount: amount,
      status: 'Pending Verification',
      payment_method: 'Online (UPI)',
      payment_ref: upiUtrInput,
      screenshot_url: upiScreenshot || null
    });

    if (paymentError) {
      alert('Failed to submit UPI payment: ' + paymentError.message);
      setIsSubmittingUpi(false);
      return;
    }

    try {
      await supabase.from('notifications').insert({
        user_id: userProfile.id,
        title: 'Payment Submitted (Pending) ⏳',
        message: `Your online UPI repayment of ₹${amount} is pending admin approval.`,
        type: 'payment_repayment'
      });

      await supabase.from('notifications').insert({
        user_id: 'd7b7b125-1234-5678-abcd-123456789abc',
        title: 'New Payment Pending Approval 💰',
        message: `A B2B customer (${userProfile.business_name || userProfile.full_name}) has submitted a UPI payment of ₹${amount} for approval.`,
        type: 'payment_approval'
      });
    } catch (nErr) {
      console.error('Failed to trigger database notifications:', nErr);
    }

    setIsSubmittingUpi(false);
    setUpiVerificationSuccess(true);
  };

  // Advanced B2B Portal credit actions handlers
  const handlePortalOnlinePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || payAmount <= 0) return;

    if (payMethod === 'UPI') {
      const txRef = 'UPI-TX-' + Date.now();
      setUpiTxRef(txRef);
      setUpiUtrInput('');
      setUpiScreenshot(null);
      setUpiVerificationSuccess(false);
      setIsSubmittingUpi(false);
      setShowPayOutstandingModal(false);
      setShowUpiModal(true);
      return;
    }

    try {
      // Create Razorpay order (or mock)
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: payAmount, receipt: 'repay_' + userProfile.id })
      });

      const orderData = await res.json();
      if (!res.ok || !orderData.success) {
        alert('Payment initialization failed: ' + (orderData.error || 'Unknown error'));
        return;
      }

      setShowPayOutstandingModal(false);

      if (orderData.isMock) {
        // Mock payment instantly
        const mockPaymentId = 'pay_mock_' + Math.random().toString(36).substr(2, 9);
        await verifyRepaymentRecord(mockPaymentId, orderData.id, 'mock_sig', payAmount);
        return;
      }

      if (typeof window === 'undefined' || !(window as any).Razorpay) {
        alert('Razorpay SDK failed to load. Please check your internet connection.');
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_MeatCityKey123',
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Meat City B2B Repayment',
        description: 'B2B Credit Outstanding Repayment',
        image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=50&auto=format&fit=crop',
        order_id: orderData.id,
        handler: function (response: any) {
          verifyRepaymentRecord(
            response.razorpay_payment_id,
            response.razorpay_order_id,
            response.razorpay_signature,
            payAmount
          );
        },
        prefill: {
          name: userProfile.full_name || '',
          email: userProfile.email || '',
          contact: userProfile.phone || ''
        },
        theme: {
          color: '#d60000'
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert('Error initiating repayment: ' + err.message);
    }
  };


  const handlePortalCollectionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || collectionAmount <= 0) return;

    const newRequest = {
      id: 'req-' + Math.floor(100000 + Math.random() * 900000),
      user_id: userProfile.id,
      business_name: userProfile.business_name || 'N/A',
      customer_name: userProfile.full_name || 'N/A',
      customer_phone: userProfile.phone || 'N/A',
      amount: Number(collectionAmount),
      preferred_date: collectionDate,
      remarks: collectionRemarks,
      status: 'Pending',
      created_at: new Date().toISOString()
    };

    // Insert into mock DB
    await supabase.from('cash_collection_requests').insert(newRequest);

    setCollectionAmount(0);
    setCollectionRemarks('');
    setShowRequestCollectionModal(false);
    setActionSuccessMessage('✅ Cash collection request submitted. Admin will process it.');
    setTimeout(() => setActionSuccessMessage(''), 5000);
  };

  // Load user session, products, wishlist, and cart
  const loadInitialData = async () => {
    // 1. Check if splash onboarding is needed
    const splashSeen = localStorage.getItem('meatcity_splash_seen');
    
    // 2. Get User Role & Profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      if (user.user_metadata?.user_type === 'admin') {
        router.push('/admin');
        return;
      }
      
      const { data: dbProfile, error: profileError } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (profileError) {
        console.warn('[DB LOG] Error fetching user profile from public.users:', profileError.message);
      }
      if (dbProfile) {
        setUserProfile(dbProfile);
        if (dbProfile.user_type === 'b2b') {
          if (dbProfile.status === 'pending') {
            router.push('/pending');
            return;
          }
          setUserRole('b2b');
        } else {
          setUserRole('b2c');
        }
        setUserName(dbProfile.full_name || 'Customer');
      } else {
        console.log('[DB LOG] No public.users profile found. Falling back to auth metadata.');
        setUserRole(user.user_metadata?.user_type || 'b2c');
        setUserName(user.user_metadata?.full_name || 'Customer');
      }
    } else {
      setUserRole('guest');
      if (!splashSeen) {
        setShowSplash(true);
      }
    }

    // 3. Fetch products from database
    console.log('[DB LOG] Fetching products from database...');
    const { data: prodData, error: prodError } = await supabase.from('products').select('*');
    if (prodError) {
      console.error('[DB LOG] Error fetching products:', prodError.message, prodError.details);
    }
    if (prodData) {
      console.log('[DB LOG] Products fetched successfully. Count:', prodData.length);
      setProducts(prodData);
    }

    // Fetch categories dynamically
    const { data: catData } = await supabase.from('categories').select('*');
    if (catData && catData.length > 0) {
      setCategories(catData.map((c: any) => c.name || c.id));
    }

    // 4. Fetch orders for B2B Dashboard
    const { data: ordersData, error: ordersError } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (ordersError) {
      console.warn('[DB LOG] Error fetching orders:', ordersError.message);
    }
    if (ordersData) {
      setOrders(ordersData);
    }

    // 5. Load Cart from localStorage
    const savedCart = localStorage.getItem('meatcity_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart');
      }
    }

    // 6. Load Wishlist from localStorage
    const savedWishlist = localStorage.getItem('meatcity_wishlist');
    if (savedWishlist) {
      try {
        setWishlist(JSON.parse(savedWishlist));
      } catch (e) {
        console.error('Failed to parse wishlist');
      }
    }

    // Fetch approved customer reviews
    try {
      const { data: revData } = await supabase.from('reviews').select('*').eq('status', 'approved').order('created_at', { ascending: false });
      if (revData) {
        setReviews(revData);
      }
    } catch (e) {
      console.warn('Failed to load reviews:', e);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadInitialData();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      if (view === 'portal') {
        setB2bActiveView('portal');
      } else if (view === 'catalog') {
        setB2bActiveView('catalog');
      }
    }
  }, [router]);

  // Load Razorpay Checkout script dynamically for B2B repayments
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  const saveCartToStorage = (updatedCart: { [key: string]: number }) => {
    setCart(updatedCart);
    localStorage.setItem('meatcity_cart', JSON.stringify(updatedCart));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cart-updated'));
    }
  };

  const handleIncrement = (productId: string, variantWeight?: string) => {
    const key = variantWeight ? `${productId}_${variantWeight}` : productId;
    const updated = { ...cart, [key]: (cart[key] || 0) + 1 };
    saveCartToStorage(updated);
  };

  const handleDecrement = (productId: string, variantWeight?: string) => {
    const key = variantWeight ? `${productId}_${variantWeight}` : productId;
    const updated = { ...cart };
    if (updated[key] > 1) {
      updated[key]--;
    } else {
      delete updated[key];
    }
    saveCartToStorage(updated);
  };

  const handleAddToCart = (productId: string, variantWeight?: string) => {
    handleIncrement(productId, variantWeight);
  };

  const handleToggleWishlist = (productId: string) => {
    let updated = [...wishlist];
    if (updated.includes(productId)) {
      updated = updated.filter(id => id !== productId);
    } else {
      updated.push(productId);
    }
    setWishlist(updated);
    localStorage.setItem('meatcity_wishlist', JSON.stringify(updated));
  };

  // Filter products by activeTab and search query
  const filteredProducts = products.filter(p => {
    const matchesCategory = p.category.toLowerCase() === activeTab.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Best sellers
  const bestSellers = products.filter(p => 
    p.id === 'prod-3' || p.id === 'prod-4' || p.id === 'prod-5'
  );

  // Cart stats
  const cartItemCount = Object.values(cart).reduce((sum, q) => sum + q, 0);
  const cartTotal = Object.entries(cart).reduce((sum, [key, qty]) => {
    const parts = key.split('_');
    const id = parts[0];
    const weight = parts[1];
    const prod = products.find(p => p.id === id);
    if (!prod) return sum;

    let price = userRole === 'b2b' ? prod.price_b2b : prod.price_b2c;
    if (weight && prod.variants) {
      const variantsList = typeof prod.variants === 'string' ? JSON.parse(prod.variants) : prod.variants;
      const variant = variantsList?.find((v: any) => v.weight === weight);
      if (variant) {
        price = userRole === 'b2b' ? Number(variant.price_b2b) : Number(variant.price_b2c);
      }
    }
    return sum + (price * qty);
  }, 0);

  // Render B2B Partner Portal view redesigned for mobile-first
  const renderB2BPortal = () => {
    if (!userProfile) return null;

    const myOrders = orders.filter(o => o.user_id === userProfile.id);
    const myPayments = userProfile.ledger?.filter((entry: any) => entry.credit > 0) || [];

    return (
      <div className="flex flex-col gap-5 px-1 py-2">
        {/* Credit Summary Card */}
        <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-[#1e1414] border border-gold/20 p-5 rounded-[16px] shadow-xl">
          <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-4">
            <h3 className="text-gold text-sm font-black tracking-tight uppercase">💼 Credit Status</h3>
            <span className="text-[9px] bg-gold/15 text-gold font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Wholesale
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Credit Limit</span>
              <div className="text-gold text-xl font-extrabold mt-0.5">₹{userProfile.credit_limit || 0}</div>
            </div>
            <div>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Outstanding</span>
              <div className="text-primary text-xl font-extrabold mt-0.5">₹{userProfile.outstanding_balance || 0}</div>
            </div>
            <div className="col-span-2 pt-3 border-t border-white/5 flex justify-between items-center text-xs font-bold">
              <span>Available Credit: <strong className="text-emerald-400">₹{userProfile.credit_available || 0}</strong></span>
              {userProfile.payment_due_date && <span>Due: <strong className="text-gold">{userProfile.payment_due_date}</strong></span>}
            </div>
          </div>
        </div>

        {/* Success Alert Banner */}
        {actionSuccessMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/25 p-4 rounded-[12px] text-emerald-400 text-xs font-bold leading-normal">
            {actionSuccessMessage}
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-neutral-900 border border-white/5 p-4 rounded-[16px] flex flex-col gap-3">
          <h4 className="text-white text-xs font-extrabold uppercase tracking-wide">⚡ Quick Payments</h4>
          <div className="grid grid-cols-2 gap-3">
            <button 
              type="button"
              onClick={() => {
                setPayAmount(userProfile.outstanding_balance || 0);
                setShowPayOutstandingModal(true);
              }}
              disabled={(userProfile.outstanding_balance || 0) <= 0}
              className="py-2.5 bg-gold hover:bg-yellow-600 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-black text-xs font-extrabold rounded-[12px] transition-all flex items-center justify-center gap-1.5"
            >
              💳 Pay Online
            </button>
            <button 
              type="button"
              onClick={() => {
                setCollectionAmount(userProfile.outstanding_balance || 0);
                setShowRequestCollectionModal(true);
              }}
              disabled={(userProfile.outstanding_balance || 0) <= 0}
              className="py-2.5 bg-primary hover:bg-red-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-extrabold rounded-[12px] transition-all flex items-center justify-center gap-1.5"
            >
              🛵 Request Cash
            </button>
          </div>
        </div>

        {/* Modal: Pay Outstanding Online */}
        {showPayOutstandingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#111111] border border-white/10 p-5 rounded-[16px] w-full max-w-[380px] flex flex-col gap-4">
              <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
                <span className="font-extrabold text-white text-sm">Make Online Payment</span>
                <button 
                  type="button" 
                  onClick={() => setShowPayOutstandingModal(false)}
                  className="text-text-secondary hover:text-white font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handlePortalOnlinePayment} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Payment Method</label>
                  <select 
                    value={payMethod} 
                    onChange={e => setPayMethod(e.target.value as any)}
                    className="bg-neutral-800 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none"
                  >
                    <option value="UPI">UPI App Pay</option>
                    <option value="Razorpay">Razorpay Secure</option>
                    <option value="Card">Debit / Credit Card</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Amount to Pay (₹)</label>
                  <input 
                    type="number" 
                    required 
                    min={1} 
                    max={userProfile.outstanding_balance} 
                    value={payAmount || ''} 
                    onChange={e => setPayAmount(Math.min(userProfile.outstanding_balance || 0, Math.max(0, Number(e.target.value))))} 
                    placeholder="Enter amount"
                    className="bg-neutral-800 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none"
                  />
                  <div className="flex flex-wrap gap-2 mt-1">
                    <button 
                      type="button" 
                      onClick={() => setPayAmount(Math.min(userProfile.outstanding_balance || 0, 5000))} 
                      className="px-2.5 py-1.5 bg-neutral-800 text-[10px] font-bold rounded-[8px] text-white border border-white/5"
                    >
                      ₹5K
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setPayAmount(Math.min(userProfile.outstanding_balance || 0, 10000))} 
                      className="px-2.5 py-1.5 bg-neutral-800 text-[10px] font-bold rounded-[8px] text-white border border-white/5"
                    >
                      ₹10K
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setPayAmount(userProfile.outstanding_balance || 0)} 
                      className="px-2.5 py-1.5 bg-gold/15 text-gold border border-gold/30 text-[10px] font-bold rounded-[8px]"
                    >
                      Full Outstanding (₹{userProfile.outstanding_balance})
                    </button>
                  </div>
                </div>

                <button type="submit" className="w-full py-3 bg-primary text-white text-xs font-black uppercase rounded-[12px] transition-all duration-200 mt-2 active:scale-95 shadow-lg">
                  Confirm Payment
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Dynamic UPI Payment */}
        {showUpiModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#111111] border border-white/10 p-5 rounded-[16px] w-full max-w-[380px] flex flex-col gap-4 text-center">
              <div className="flex justify-between items-center pb-2 border-b border-white/5 text-left">
                <span className="font-extrabold text-white text-sm">📱 UPI Dynamic Pay</span>
                {!isSubmittingUpi && (
                  <button 
                    type="button" 
                    onClick={() => setShowUpiModal(false)}
                    className="text-text-secondary hover:text-white font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {upiVerificationSuccess ? (
                <div className="flex flex-col items-center gap-4 py-4 animate-in fade-in duration-300">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-3xl animate-bounce">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-white text-base font-extrabold">Repayment Submitted!</h4>
                    <p className="text-text-secondary text-[11px] mt-1 max-w-[240px] mx-auto leading-relaxed">
                      Your repayment of <strong>₹{payAmount}</strong> has been submitted successfully and is pending administrator approval.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUpiModal(false);
                      setUpiVerificationSuccess(false);
                    }}
                    className="w-full mt-2 py-3 bg-emerald-500 text-white font-extrabold text-xs uppercase rounded-[12px] active:scale-95 transition-all shadow-md"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-text-secondary text-[11px] leading-relaxed text-left">
                    Scan the dynamic QR code or open UPI apps to complete payment, then enter the 12-digit UTR reference ID below.
                  </p>

                  {/* QR Code Container */}
                  <div className="flex flex-col items-center gap-2.5 p-3.5 bg-white/5 border border-white/5 rounded-[12px]">
                    <div className="w-[160px] h-[160px] border border-white/10 rounded-[8px] p-2 bg-white flex justify-center items-center relative">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`upi://pay?pa=meatcity@ybl&pn=Meat%20City&am=${payAmount}&cu=INR&tn=B2B%20Payment&tr=${upiTxRef}`)}`} 
                        alt="Dynamic UPI QR" 
                        className="w-full h-full object-contain" 
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-text-secondary uppercase font-bold block">UPI ID (Store Handle)</span>
                      <strong className="text-white text-xs font-extrabold">meatcity@ybl</strong>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="grid grid-cols-2 gap-3 bg-white/5 border border-white/5 p-3 rounded-[12px] text-left text-xs">
                    <div>
                      <span className="text-[9px] text-text-secondary uppercase font-bold block">Amount Owed</span>
                      <strong className="text-gold font-extrabold">₹{payAmount}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-text-secondary uppercase font-bold block">Transaction Ref</span>
                      <strong className="text-white font-extrabold text-[10px] truncate block max-w-[120px]">{upiTxRef}</strong>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('meatcity@ybl');
                        alert('UPI ID copied to clipboard!');
                      }}
                      className="py-2.5 bg-neutral-800 border border-white/5 hover:border-white/10 text-white font-bold text-xs rounded-[12px] active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      📋 Copy ID
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const upiUrl = `upi://pay?pa=meatcity@ybl&pn=Meat%20City&am=${payAmount}&cu=INR&tn=B2B%20Payment&tr=${upiTxRef}`;
                        window.location.href = upiUrl;
                      }}
                      className="py-2.5 bg-gold hover:bg-yellow-600 text-black font-extrabold text-xs rounded-[12px] active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      🚀 Open Apps
                    </button>
                  </div>

                  {/* UTR reference ID / Transaction reference input */}
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Transaction Reference ID / UTR</label>
                    <input 
                      type="text" 
                      required
                      value={upiUtrInput}
                      onChange={e => setUpiUtrInput(e.target.value)}
                      placeholder="12-digit reference number"
                      className="bg-neutral-800 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none"
                    />
                  </div>

                  {/* Payment Screenshot (Optional) */}
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Payment Screenshot (Optional)</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setUpiScreenshot(e.target.files[0].name);
                        }
                      }}
                      className="bg-neutral-800 border border-white/5 text-white rounded-[12px] p-2 text-xs outline-none"
                    />
                    {upiScreenshot && <span className="text-[10px] text-emerald-400 font-bold block mt-1">✓ {upiScreenshot} selected</span>}
                  </div>

                  {/* Submission and Cancel Buttons */}
                  <div className="grid grid-cols-2 gap-3 mt-1.5">
                    <button 
                      type="button"
                      onClick={() => setShowUpiModal(false)}
                      disabled={isSubmittingUpi}
                      className="py-2.5 bg-[#1E2020] text-white font-bold text-xs rounded-[12px] border border-white/5 active:scale-95"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button"
                      onClick={() => submitPortalUpiPayment(payAmount)}
                      disabled={isSubmittingUpi || !upiUtrInput}
                      className="py-2.5 bg-primary hover:bg-red-700 disabled:opacity-40 disabled:pointer-events-none text-white font-black text-xs rounded-[12px] active:scale-95 shadow-md"
                    >
                      {isSubmittingUpi ? 'Submitting...' : 'I Have Paid'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Request Cash Collection */}
        {showRequestCollectionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#111111] border border-white/10 p-5 rounded-[16px] w-full max-w-[380px] flex flex-col gap-4">
              <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
                <span className="font-extrabold text-white text-sm">Request Cash Pickup</span>
                <button 
                  type="button" 
                  onClick={() => setShowRequestCollectionModal(false)}
                  className="text-text-secondary hover:text-white font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handlePortalCollectionRequest} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Amount to Collect (₹)</label>
                  <input 
                    type="number" 
                    required 
                    min={1} 
                    max={userProfile.outstanding_balance} 
                    value={collectionAmount || ''} 
                    onChange={e => setCollectionAmount(Math.min(userProfile.outstanding_balance || 0, Math.max(0, Number(e.target.value))))} 
                    placeholder="Pickup amount"
                    className="bg-neutral-800 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Preferred Date</label>
                  <input 
                    type="date" 
                    required 
                    value={collectionDate} 
                    min={new Date().toISOString().split('T')[0]} 
                    onChange={e => setCollectionDate(e.target.value)} 
                    className="bg-neutral-800 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Remarks / Instructions</label>
                  <textarea 
                    value={collectionRemarks} 
                    onChange={e => setCollectionRemarks(e.target.value)} 
                    placeholder="e.g. Please collect from counter after 5 PM." 
                    className="bg-neutral-800 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none min-h-[60px]"
                  />
                </div>

                <button type="submit" className="w-full py-3 bg-primary text-white text-xs font-black uppercase rounded-[12px] transition-all duration-200 mt-2 active:scale-95 shadow-lg">
                  Submit Pickup Request
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Ledger Account Statement Card List */}
        <div className="bg-neutral-900 border border-white/5 rounded-[16px] p-4 flex flex-col gap-3.5">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <h3 className="text-white text-xs font-extrabold uppercase tracking-wide">📊 Account Ledger</h3>
            <button 
              onClick={() => {
                alert('Generating PDF Statement... Print dialog will open.');
                window.print();
              }} 
              className="text-[10px] text-gold font-extrabold uppercase hover:underline"
            >
              📥 Download PDF
            </button>
          </div>

          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
            {userProfile.ledger && userProfile.ledger.map((entry: any, idx: number) => (
              <div key={idx} className="bg-white/5 border border-white/5 p-3 rounded-[12px] flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] text-text-secondary font-bold">{new Date(entry.date).toLocaleDateString()}</span>
                  <span className="text-white font-extrabold text-xs">Bal: ₹{entry.balance}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-white font-bold text-xs">{entry.description}</span>
                  {entry.debit > 0 ? (
                    <span className="text-primary font-black text-xs">Dr: +₹{entry.debit}</span>
                  ) : entry.credit > 0 ? (
                    <span className="text-emerald-400 font-black text-xs">Cr: -₹{entry.credit}</span>
                  ) : (
                    <span className="text-text-secondary text-xs">—</span>
                  )}
                </div>
              </div>
            ))}
            {(!userProfile.ledger || userProfile.ledger.length === 0) && (
              <div className="text-center py-6 text-xs text-text-secondary font-bold">No ledger transactions logged.</div>
            )}
          </div>
        </div>

        {/* Recent Wholesale Orders */}
        <div className="bg-neutral-900 border border-white/5 rounded-[16px] p-4 flex flex-col gap-3.5">
          <h3 className="text-white text-xs font-extrabold uppercase tracking-wide pb-2 border-b border-white/5">
            📦 Recent Wholesale Orders
          </h3>
          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto">
            {myOrders.slice(0, 5).map(o => (
              <div key={o.id} className="bg-white/5 border border-white/5 p-3 rounded-[12px] flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-white text-xs font-extrabold">Order #{o.id}</h5>
                    {o.delivery_otp && o.status !== 'Delivered' && o.status !== 'Cancelled' && (
                      <span className="text-[9px] text-gold font-extrabold block mt-0.5">OTP: {o.delivery_otp}</span>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                    o.status === 'Delivered' 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : o.status === 'Cancelled' 
                      ? 'bg-primary/10 text-primary' 
                      : 'bg-gold/10 text-gold'
                  }`}>
                    {o.status}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-1">
                  <span className="text-[10px] text-text-secondary font-bold">Total Amount</span>
                  <span className="text-white text-xs font-black">₹{o.total}</span>
                </div>
              </div>
            ))}
            {myOrders.length === 0 && (
              <div className="text-center py-6 text-xs text-text-secondary font-bold">No wholesale orders placed.</div>
            )}
          </div>
        </div>

        {/* Recent Payments Received */}
        <div className="bg-neutral-900 border border-white/5 rounded-[16px] p-4 flex flex-col gap-3.5">
          <h3 className="text-white text-xs font-extrabold uppercase tracking-wide pb-2 border-b border-white/5">
            💵 Recent Payments Received
          </h3>
          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto">
            {myPayments.slice(0, 5).map((pay: any, idx: number) => (
              <div key={idx} className="bg-white/5 border border-white/5 p-3 rounded-[12px] flex justify-between items-center">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-text-secondary font-bold">{new Date(pay.date).toLocaleDateString()}</span>
                  <span className="text-white font-bold text-xs">{pay.description}</span>
                </div>
                <span className="text-emerald-400 font-black text-xs">+₹{pay.credit}</span>
              </div>
            ))}
            {myPayments.length === 0 && (
              <div className="text-center py-6 text-xs text-text-secondary font-bold">No payment receipts logged.</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (showSplash) {
    return (
      <SplashScreens
        onComplete={() => {
          localStorage.setItem('meatcity_splash_seen', 'true');
          setShowSplash(false);
          router.push('/login');
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-3">
        <div className="relative w-16 h-16 animate-bounce">
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" stroke="#D4AF37" strokeWidth="3" fill="#111" />
            <path d="M30 65V35L50 50L70 35V65" stroke="#D60000" strokeWidth="6" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-gold text-xs font-extrabold uppercase tracking-wider animate-pulse">Loading fresh cuts...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-5 w-full">
      {/* Search & Location Bar */}
      <div className="flex flex-col gap-3">
        <LocationBar />
        <SearchBar 
          value={searchQuery} 
          onChange={setSearchQuery} 
          placeholder="Search Chicken, Mutton, Fish, Eggs..."
        />
      </div>

      {/* B2B Dashboard switcher tabs */}
      {userRole === 'b2b' && (
        <div className="flex gap-2">
          <button 
            onClick={() => setB2bActiveView('catalog')}
            className={`flex-1 py-3 px-4 rounded-[12px] text-xs font-extrabold transition-all border ${
              b2bActiveView === 'catalog' 
                ? 'bg-gold/10 text-gold border-gold shadow-lg shadow-gold/5' 
                : 'bg-neutral-900 text-text-secondary border-white/5'
            }`}
          >
            🛒 Wholesale Catalog
          </button>
          <button 
            onClick={() => setB2bActiveView('portal')}
            className={`flex-1 py-3 px-4 rounded-[12px] text-xs font-extrabold transition-all border ${
              b2bActiveView === 'portal' 
                ? 'bg-gold/10 text-gold border-gold shadow-lg shadow-gold/5' 
                : 'bg-neutral-900 text-text-secondary border-white/5'
            }`}
          >
            💼 Business Credit
          </button>
        </div>
      )}

      {/* Render selected view */}
      {userRole === 'b2b' && b2bActiveView === 'portal' ? (
        renderB2BPortal()
      ) : (
        <>
          {/* Hero Promo Banners */}
          {!searchQuery && <HeroCarousel />}

          {/* Offers Banner / Coupon */}
          {!searchQuery && (
            <CouponCard 
              code="WELCOME20"
              discount="20%"
              description="Get 20% discount on orders above ₹1000!"
            />
          )}

          {/* Best Sellers Section */}
          {bestSellers.length > 0 && !searchQuery && (
            <section className="flex flex-col gap-3">
              <h3 className="text-white text-sm font-extrabold uppercase tracking-wide">⭐ Best Sellers</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
                {bestSellers.map(product => (
                  <div key={product.id} className="min-w-[150px] max-w-[150px] snap-start bg-[#111111] border border-white/5 p-3 rounded-[16px] flex flex-col gap-2.5 justify-between">
                    <div className="relative aspect-square rounded-[12px] bg-neutral-950 overflow-hidden flex items-center justify-center">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">🥩</span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-white text-xs font-extrabold tracking-tight truncate leading-tight">{product.name}</h4>
                      <div className="flex justify-between items-center mt-2.5 pt-1.5 border-t border-white/5">
                        <span className="text-white font-extrabold text-xs">₹{userRole === 'b2b' ? product.price_b2b : product.price_b2c}</span>
                        <button 
                          onClick={() => handleAddToCart(product.id)}
                          className="px-2.5 py-1 bg-primary text-white text-[10px] font-black rounded-[8px] active:scale-95 transition-all"
                        >
                          {cart[product.id] ? `${cart[product.id]} Added` : '+ Add'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Category Selection Tabs */}
          <div className="flex flex-col gap-3">
            <h3 className="text-white text-sm font-extrabold uppercase tracking-wide">Browse Categories</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {categories.map((cat) => (
                <CategoryCard
                  key={cat}
                  name={cat}
                  isActive={activeTab === cat}
                  onClick={() => setActiveTab(cat)}
                />
              ))}
            </div>
          </div>

          {/* Products grid */}
          <div className="flex flex-col gap-3.5">
            <div className="flex justify-between items-center">
              <h3 className="text-white text-sm font-extrabold uppercase tracking-wide">
                {activeTab} Selection
              </h3>
              <span className="text-[10px] text-text-secondary font-bold">
                {filteredProducts.length} items
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                   <ProductCard
                    key={product.id}
                    product={product}
                    userRole={userRole}
                    cart={cart}
                    onIncrement={handleIncrement}
                    onDecrement={handleDecrement}
                    onAddToCart={handleAddToCart}
                    isWishlisted={wishlist.includes(product.id)}
                    onToggleWishlist={() => handleToggleWishlist(product.id)}
                  />
                ))
              ) : (
                <div className="col-span-2 py-12 flex flex-col items-center gap-2 text-center">
                  <span className="text-3xl">🥩</span>
                  <p className="text-text-secondary text-xs font-bold mt-1">No fresh cuts found in this category.</p>
                </div>
              )}
            </div>
          </div>

          {/* Trust points card */}
          {!searchQuery && <TrustCard />}

          {/* Customer Reviews Section */}
          {!searchQuery && reviews.length > 0 && (
            <section className="flex flex-col gap-3 mt-4">
              <h3 className="text-white text-sm font-extrabold uppercase tracking-wide">⭐ Customer Reviews</h3>
              <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none snap-x snap-mandatory">
                {reviews.map((rev) => (
                  <div 
                    key={rev.id} 
                    className="min-w-[280px] max-w-[280px] snap-start bg-[#111111] border border-white/5 p-4 rounded-[16px] flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-center">
                      <strong className="text-white text-xs font-black truncate max-w-[160px]">{rev.customer_name}</strong>
                      <span className="text-gold text-xs font-bold">
                        {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                      </span>
                    </div>
                    <p className="text-text-secondary text-[11px] leading-relaxed italic">
                      “{rev.comment}”
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Floating Bottom Cart Bar */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-[74px] left-4 right-4 z-40 bg-emerald-500 border border-emerald-400 p-4 rounded-[16px] shadow-2xl flex items-center justify-between max-w-[448px] mx-auto animate-in slide-in-from-bottom-8 duration-300">
          <div className="flex flex-col">
            <span className="text-white text-[10px] font-black uppercase tracking-wider leading-none">
              {cartItemCount} Item{cartItemCount > 1 ? 's' : ''} added
            </span>
            <span className="text-white text-sm font-black tracking-tight mt-0.5">₹{cartTotal}</span>
          </div>
          <Link href="/cart" className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-xs font-black uppercase rounded-[12px] shadow-md transition-all active:scale-95 select-none">
            View Cart 🛒
          </Link>
        </div>
      )}
    </div>
  );
}
