"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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

interface Address {
  id: string;
  name: string;
  addressLine: string;
  phone: string;
  roomNumber?: string;
  sectorArea?: string;
  pincode?: string;
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

export default function CartPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<'guest' | 'b2c' | 'b2b'>('guest');
  const [loading, setLoading] = useState(true);

  // Address State
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ name: '', roomNumber: '', sectorArea: '', pincode: '', phone: '' });
  const [serviceablePincodes, setServiceablePincodes] = useState<string[]>([]);
  const [pincodeCharges, setPincodeCharges] = useState<Record<string, number>>({});
  const [freeDeliveryAbove, setFreeDeliveryAbove] = useState<number>(999);
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState<number>(50);
  const [deliverySlot, setDeliverySlot] = useState<string>('ASAP');
  const [adminWhatsapp, setAdminWhatsapp] = useState<string>('917977630912');
  const [whatsappEnabled, setWhatsappEnabled] = useState<boolean>(true);
  const [minB2BOrder, setMinB2BOrder] = useState<number>(1000);
  const [minB2COrder, setMinB2COrder] = useState<number>(200);

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');

  // Loyalty Rewards State
  const [loyaltyEstimate, setLoyaltyEstimate] = useState<any>(null);
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState<number>(0);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [cartSessionId, setCartSessionId] = useState<string>('');
  const [claimedFreeRewardCode, setClaimedFreeRewardCode] = useState<string | null>(null);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'UPI' | 'Razorpay' | 'Credit' | 'BankTransfer'>('COD');
  const [upiId, setUpiId] = useState('');
  const [upiError, setUpiError] = useState('');
  const [bankUtr, setBankUtr] = useState('');
  const [bankError, setBankError] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [upiScreenshot, setUpiScreenshot] = useState<string | null>(null);

  // Checkout Status
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState('');
  const [placedOrder, setPlacedOrder] = useState<any>(null);

  // B2B Credit Outstanding Pay & Cash Collection request states
  const [showOnlinePaymentModal, setShowOnlinePaymentModal] = useState(false);
  const [showCashCollectionModal, setShowCashCollectionModal] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [onlinePayAmount, setOnlinePayAmount] = useState<number>(0);
  const [onlinePaymentMethod, setOnlinePaymentMethod] = useState<'UPI' | 'Razorpay' | 'NetBanking' | 'Card'>('UPI');
  const [cashRequestAmount, setCashRequestAmount] = useState<number>(0);
  const [cashRequestDate, setCashRequestDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [cashRequestRemarks, setCashRequestRemarks] = useState<string>('');
  const [cashRequestSuccess, setCashRequestSuccess] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);

  // B2B credit outstanding dynamic UPI states
  const [showUpiRepayModal, setShowUpiRepayModal] = useState(false);
  const [repayUpiTxRef, setRepayUpiTxRef] = useState('');
  const [repayUpiUtrInput, setRepayUpiUtrInput] = useState('');
  const [repayUpiScreenshot, setRepayUpiScreenshot] = useState<string | null>(null);
  const [repayUpiSuccess, setRepayUpiSuccess] = useState(false);
  const [isSubmittingRepayUpi, setIsSubmittingRepayUpi] = useState(false);

  // Checkout Payment Verification States
  const [showUpiPaymentModal, setShowUpiPaymentModal] = useState(false);
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [upiTxRef, setUpiTxRef] = useState('');
  const [razorpayCard, setRazorpayCard] = useState({ number: '', expiry: '', cvv: '' });
  const [razorpayOrderId, setRazorpayOrderId] = useState('');
  const [pendingOrderPayload, setPendingOrderPayload] = useState<any>(null);

  const supabase = createClient();
  const router = useRouter();

  // Load Razorpay Checkout script dynamically
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



  // Load Data
  useEffect(() => {
    const init = async () => {
      // 1. Get User Profile from auth
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      
      let finalRole: 'guest' | 'b2c' | 'b2b' = 'guest';
      let profile: UserProfile | null = null;

      if (currentUser) {
        const { data: dbProfile } = await supabase.from('users').select('*').eq('id', currentUser.id).single();
        if (dbProfile) {
          profile = dbProfile;
          setUserProfile(dbProfile);
          finalRole = dbProfile.user_type;
          setUserRole(dbProfile.user_type);
        } else {
          finalRole = (currentUser.user_metadata?.user_type as any) || 'b2c';
          setUserRole(finalRole);
        }
      } else {
        setUserRole('guest');
      }

      // 2. Fetch products to get pricing
      const { data: prodData } = await supabase.from('products').select('*');
      if (prodData) {
        setProducts(prodData);
      }

      // 3. Load Cart
      const savedCart = localStorage.getItem('meatcity_cart');
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch (e) {
          console.error(e);
        }
      }
      const savedFreeReward = localStorage.getItem('meatcity_claimed_free_reward');
      if (savedFreeReward) {
        setClaimedFreeRewardCode(savedFreeReward);
      }

      // 4. Load Serviceable Pincodes
      try {
        const { data: pinData } = await supabase.from('serviceable_pincodes').select('*');
        if (pinData) {
          setServiceablePincodes(pinData.map((p: any) => p.pincode));
          const charges: Record<string, number> = {};
          pinData.forEach((p: any) => {
            charges[p.pincode] = Number(p.delivery_charge ?? 50);
          });
          setPincodeCharges(charges);
        } else {
          setServiceablePincodes(['400705', '400703', '400701', '400706', '400709']);
          setPincodeCharges({
            '400705': 50,
            '400703': 50,
            '400701': 60,
            '400706': 50,
            '400709': 70
          });
        }
      } catch (pinErr) {
        console.warn('Failed to load serviceable pincodes:', pinErr);
        setServiceablePincodes(['400705', '400703', '400701', '400706', '400709']);
        setPincodeCharges({
          '400705': 50,
          '400703': 50,
          '400701': 60,
          '400706': 50,
          '400709': 70
        });
      }

      // Load Admin Settings
      try {
        const { data: settingsData } = await supabase.from('admin_settings').select('*');
        if (settingsData && settingsData.length > 0) {
          const settingsObj: any = {};
          settingsData.forEach((s: any) => {
            settingsObj[s.key] = s.value;
          });
          setAdminWhatsapp(settingsObj.admin_whatsapp_number || '917977630912');
          setWhatsappEnabled(settingsObj.whatsapp_notifications_enabled === 'true');
          if (settingsObj.free_delivery_above !== undefined) {
            setFreeDeliveryAbove(Number(settingsObj.free_delivery_above));
          }
          if (settingsObj.delivery_fee !== undefined) {
            setDefaultDeliveryFee(Number(settingsObj.delivery_fee));
          }
          if (settingsObj.minimum_b2b_order !== undefined) {
            setMinB2BOrder(Number(settingsObj.minimum_b2b_order));
          }
          if (settingsObj.minimum_b2c_order !== undefined) {
            setMinB2COrder(Number(settingsObj.minimum_b2c_order));
          }
        }
      } catch (settingsErr) {
        console.warn('Failed to load admin settings, using fail-safe business defaults:', settingsErr);
        setMinB2BOrder(1000);
        setMinB2COrder(200);
        setFreeDeliveryAbove(999);
        setDefaultDeliveryFee(50);
      }

      // 5. Load Addresses
      const addrKey = currentUser ? `meatcity_addresses_${currentUser.id}` : 'meatcity_addresses_guest';
      const activeIdKey = currentUser ? `meatcity_active_address_id_${currentUser.id}` : 'meatcity_active_address_id_guest';
      const savedAddresses = localStorage.getItem(addrKey);
      if (savedAddresses) {
        try {
          const parsed = JSON.parse(savedAddresses);
          setAddresses(parsed);
          if (parsed.length > 0) {
            const storedActiveId = localStorage.getItem(activeIdKey);
            const exists = parsed.some((a: any) => a.id === storedActiveId);
            if (exists && storedActiveId) {
              setSelectedAddressId(storedActiveId);
            } else {
              setSelectedAddressId(parsed[0].id);
              localStorage.setItem(activeIdKey, parsed[0].id);
            }
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        if (currentUser) {
          const defaultAddress = {
            id: 'addr-default',
            name: profile?.full_name || currentUser.user_metadata?.full_name || 'My Home',
            addressLine: profile?.shop_address || currentUser.user_metadata?.shop_address || currentUser.user_metadata?.address || 'Turbhe, Sector 20, Navi Mumbai',
            phone: profile?.phone || currentUser.user_metadata?.phone || currentUser.phone || ''
          };
          setAddresses([defaultAddress]);
          setSelectedAddressId(defaultAddress.id);
          localStorage.setItem(addrKey, JSON.stringify([defaultAddress]));
          localStorage.setItem(activeIdKey, defaultAddress.id);
        }
      }

      // Default payment method setup
      if (finalRole === 'b2b') {
        setPaymentMethod('Credit');
      } else {
        setPaymentMethod('COD');
      }

      setLoading(false);
    };

    init();
  }, []);

  useEffect(() => {
    if (user && selectedAddressId) {
      localStorage.setItem(`meatcity_active_address_id_${user.id}`, selectedAddressId);
      window.dispatchEvent(new Event('address-changed'));
    }
  }, [selectedAddressId, user]);

  const saveCartToStorage = (updatedCart: { [key: string]: number }) => {
    setCart(updatedCart);
    localStorage.setItem('meatcity_cart', JSON.stringify(updatedCart));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cart-updated'));
    }
  };

  const handleIncrement = (key: string) => {
    const updated = { ...cart, [key]: (cart[key] || 0) + 1 };
    saveCartToStorage(updated);
  };

  const handleDecrement = (key: string) => {
    const updated = { ...cart };
    if (updated[key] > 1) {
      updated[key]--;
    } else {
      delete updated[key];
    }
    saveCartToStorage(updated);
  };

  const handleRemoveItem = (key: string) => {
    if (key === 'prod-1_250g' && claimedFreeRewardCode) {
      setClaimedFreeRewardCode(null);
      localStorage.removeItem('meatcity_claimed_free_reward');
    }
    const updated = { ...cart };
    delete updated[key];
    saveCartToStorage(updated);
  };

  const handleClaimFreeReward = (claimCode: string) => {
    setClaimedFreeRewardCode(claimCode);
    localStorage.setItem('meatcity_claimed_free_reward', claimCode);
    const updated = { ...cart, 'prod-1_250g': 1 };
    saveCartToStorage(updated);
  };

  const handleRemoveFreeReward = () => {
    setClaimedFreeRewardCode(null);
    localStorage.removeItem('meatcity_claimed_free_reward');
    const updated = { ...cart };
    delete updated['prod-1_250g'];
    saveCartToStorage(updated);
  };

  // Cart calculations (declared before hooks/effects that depend on subtotal & total)
  const cartItems = Object.entries(cart).map(([cartKey, qty]) => {
    const parts = cartKey.split('_');
    const id = parts[0];
    const variantWeight = parts[1];

    const prod = products.find(p => p.id === id);
    let price = 0;
    let displayName = prod?.name || '';
    const isFreeStampReward = userRole !== 'b2b' && cartKey === 'prod-1_250g' && !!claimedFreeRewardCode;

    if (prod) {
      if (isFreeStampReward) {
        price = 0;
        displayName = `${prod.name} (250g) — 🎁 FREE Reward`;
      } else {
        price = userRole === 'b2b' ? prod.price_b2b : prod.price_b2c;
        if (variantWeight) {
          let variantFound = false;
          if (prod.variants) {
            const variantsList = typeof prod.variants === 'string' ? JSON.parse(prod.variants) : prod.variants;
            const variant = variantsList?.find((v: any) => v.weight === variantWeight);
            if (variant) {
              price = userRole === 'b2b' ? Number(variant.price_b2b) : Number(variant.price_c2b || variant.price_b2c);
              displayName = `${prod.name} (${variantWeight})`;
              variantFound = true;
            }
          }
          if (!variantFound) {
            if (variantWeight === '250g') price = Math.round(price * 0.28);
            else if (variantWeight === '500g') price = Math.round(price * 0.52);
            else if (variantWeight === '1kg') price = price;
            else if (variantWeight === '2kg') price = Math.round(price * 1.95);
            displayName = `${prod.name} (${variantWeight})`;
          }
        }
      }
    }

    return {
      cartKey,
      productId: id,
      variantWeight,
      product: prod ? { ...prod, name: displayName } : undefined,
      quantity: isFreeStampReward ? 1 : qty,
      price,
      isFreeStampReward
    };
  }).filter(item => item.product !== undefined);

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const discountAmount = appliedCoupon 
    ? (appliedCoupon.discountPercent > 0 
        ? Math.round((subtotal * appliedCoupon.discountPercent) / 100) 
        : appliedCoupon.flatDiscount) 
    : 0;

  const getDynamicDeliveryFee = () => {
    if (userRole === 'b2b') {
      return 0; // Free commercial delivery for B2B wholesale
    }
    const activeAddress = addresses.find(a => a.id === selectedAddressId);
    if (activeAddress && activeAddress.addressLine === 'Store Pickup') {
      return 0;
    }
    if (subtotal >= freeDeliveryAbove) {
      return 0;
    }
    const activePincode = activeAddress?.pincode || (activeAddress?.addressLine?.match(/\b\d{6}\b/)?.[0]) || '';
    if (activePincode && pincodeCharges[activePincode] !== undefined) {
      return pincodeCharges[activePincode];
    }
    return defaultDeliveryFee;
  };

  const deliveryFee = getDynamicDeliveryFee();
  const activeLoyaltyDiscount = useLoyaltyPoints ? loyaltyDiscount : 0;
  const total = Math.max(0, subtotal - discountAmount - activeLoyaltyDiscount + deliveryFee);

  // Credit limits checks - only active when userProfile is loaded & has positive dues
  const isCreditLimitExceeded = userRole === 'b2b' && !!userProfile && 
    (userProfile.outstanding_balance || 0) > 0 && 
    (userProfile.outstanding_balance || 0) >= (userProfile.credit_limit || 50000);

  const isCreditInsufficient = userRole === 'b2b' && !isCreditLimitExceeded && paymentMethod === 'Credit' && 
    !!userProfile && (userProfile.credit_available !== undefined && userProfile.credit_available < total);

  const isCreditBlocked = userRole === 'b2b' && paymentMethod === 'Credit' && 
    (isCreditLimitExceeded || (userProfile?.credit_available !== undefined && userProfile.credit_available < total));

  const hasCreditDues = userRole === 'b2b' && !!userProfile && (userProfile.outstanding_balance || 0) > 0;

  // Address Management
  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.name || !newAddress.roomNumber || !newAddress.sectorArea || !newAddress.pincode || !newAddress.phone) {
      alert('Please fill in all address fields.');
      return;
    }

    const added: Address = {
      id: 'addr-' + Math.random().toString(36).substr(2, 9),
      name: newAddress.name,
      roomNumber: newAddress.roomNumber,
      sectorArea: newAddress.sectorArea,
      pincode: newAddress.pincode,
      addressLine: `${newAddress.roomNumber}, ${newAddress.sectorArea}, Pincode: ${newAddress.pincode}`,
      phone: newAddress.phone
    };

    const updated = [...addresses, added];
    setAddresses(updated);
    setSelectedAddressId(added.id);
    const addrKey = user ? `meatcity_addresses_${user.id}` : 'meatcity_addresses_guest';
    localStorage.setItem(addrKey, JSON.stringify(updated));
    setNewAddress({ name: '', roomNumber: '', sectorArea: '', pincode: '', phone: '' });
    setShowAddAddress(false);
  };

  // Coupon management
  const handleApplyCoupon = async () => {
    setCouponError('');
    if (!couponCode) return;

    if (useLoyaltyPoints) {
      setCouponError('Loyalty points cannot be combined with coupon discounts. Please remove loyalty points first.');
      return;
    }

    const code = couponCode.toUpperCase().trim();
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setCouponError('Invalid or inactive coupon code.');
        return;
      }

      if (subtotal < data.min_order_amount) {
        setCouponError(`Minimum order of ₹${data.min_order_amount} required for coupon ${code}.`);
        return;
      }

      if (data.expiry_date) {
        const todayStr = new Date().toISOString().split('T')[0];
        if (todayStr > data.expiry_date) {
          setCouponError('This coupon code has expired.');
          return;
        }
      }

      setAppliedCoupon({
        code: data.code,
        discountPercent: Number(data.discount_percent || 0),
        flatDiscount: Number(data.flat_discount || 0)
      });
    } catch (err) {
      setCouponError('Failed to validate coupon.');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  // Loyalty Points estimate & management
  useEffect(() => {
    if (!cartSessionId) {
      setCartSessionId('cs_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));
    }
  }, [cartSessionId]);

  useEffect(() => {
    if (subtotal > 0) {
      fetch('/api/loyalty/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtotal, userRole, couponApplied: !!appliedCoupon, userId: user?.id })
      })
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setLoyaltyEstimate(data);
            if (useLoyaltyPoints) {
              const maxPts = data.maxPointsRedeemable || 0;
              const nextPts = Math.min(pointsToRedeem || maxPts, maxPts);
              setPointsToRedeem(nextPts);
              setLoyaltyDiscount(Math.round(nextPts * (data.pointRupeeValue || 1.0)));
            }
          }
        })
        .catch(err => console.warn('Failed to estimate loyalty points:', err));
    }
  }, [user, userRole, subtotal, appliedCoupon]);

  const handleToggleLoyaltyPoints = async (apply: boolean) => {
    if (!apply) {
      if (reservationId) {
        fetch('/api/loyalty/release', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservationId })
        }).catch(err => console.warn('Failed to release reservation:', err));
        setReservationId(null);
      }
      setUseLoyaltyPoints(false);
      setPointsToRedeem(0);
      setLoyaltyDiscount(0);
      return;
    }

    if (appliedCoupon) {
      alert('Loyalty points cannot be combined with coupon codes. Please remove applied coupon first.');
      return;
    }

    if (!loyaltyEstimate || loyaltyEstimate.maxPointsRedeemable <= 0) {
      alert('No redeemable loyalty points available for this order.');
      return;
    }

    const pts = loyaltyEstimate.maxPointsRedeemable;
    const discount = Math.round(pts * (loyaltyEstimate.pointRupeeValue || 1.0));
    setPointsToRedeem(pts);
    setLoyaltyDiscount(discount);
    setUseLoyaltyPoints(true);
  };

  // Advanced B2B Credit payment handlers
  const verifyRepaymentRecord = async (
    paymentId: string, 
    orderId: string, 
    signature: string, 
    amount: number
  ) => {
    if (!user || !userProfile) return;
    setIsProcessingPayment(true);
    try {
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentType: 'repayment',
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          razorpay_signature: signature,
          payload: { userId: user.id, amount }
        })
      });

      const verifyData = await verifyRes.json();
      if (verifyRes.ok && verifyData.success) {
        alert('Online repayment of ₹' + amount + ' processed and verified successfully!');
        const { data: dbProfile } = await supabase.from('users').select('*').eq('id', user.id).single();
        if (dbProfile) {
          setUserProfile(dbProfile);
        }
        setPaymentSuccess(true);
      } else {
        alert('Payment verification failed: ' + (verifyData.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Network error verifying payment: ' + err.message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const submitRepaymentRecord = async (amount: number, paymentRef: string) => {
    if (!user || !userProfile) return;
    setIsProcessingPayment(true);

    const { error: paymentError } = await supabase.from('payments').insert({
      user_id: user.id,
      amount: amount,
      status: 'pending',
      payment_method: 'Online (Razorpay)',
      payment_ref: paymentRef
    });

    if (paymentError) {
      alert('Failed to submit payment: ' + paymentError.message);
      setIsProcessingPayment(false);
      return;
    }

    try {
      await supabase.from('notifications').insert({
        user_id: user.id,
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

    setIsProcessingPayment(false);
    setPaymentSuccess(true);
  };

  const submitCartUpiRepayment = async (amount: number) => {
    if (!user || !userProfile || !repayUpiUtrInput) return;
    setIsSubmittingRepayUpi(true);

    const { error: paymentError } = await supabase.from('payments').insert({
      user_id: user.id,
      amount: amount,
      status: 'Pending Verification',
      payment_method: 'Online (UPI)',
      payment_ref: repayUpiUtrInput,
      screenshot_url: repayUpiScreenshot || null
    });

    if (paymentError) {
      alert('Failed to submit UPI payment: ' + paymentError.message);
      setIsSubmittingRepayUpi(false);
      return;
    }

    try {
      await supabase.from('notifications').insert({
        user_id: user.id,
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

    setIsSubmittingRepayUpi(false);
    setRepayUpiSuccess(true);
  };

  const handleOnlineCreditPayment = async (amount: number) => {
    if (!user || !userProfile || amount <= 0) return;

    if (onlinePaymentMethod === 'UPI') {
      const txRef = 'UPI-TX-' + Date.now();
      setRepayUpiTxRef(txRef);
      setRepayUpiUtrInput('');
      setRepayUpiScreenshot(null);
      setRepayUpiSuccess(false);
      setIsSubmittingRepayUpi(false);
      setShowOnlinePaymentModal(false);
      setShowUpiRepayModal(true);
      return;
    }

    if (typeof window === 'undefined' || !(window as any).Razorpay) {
      alert('Razorpay SDK failed to load. Please check your internet connection.');
      return;
    }

    try {
      setIsProcessingPayment(true);
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amount, receipt: 'repay_' + userProfile.id })
      });

      const orderData = await res.json();
      if (!res.ok || !orderData.success) {
        alert('Payment initialization failed: ' + (orderData.error || 'Unknown error'));
        setIsProcessingPayment(false);
        return;
      }

      setShowOnlinePaymentModal(false);

      if (orderData.isMock) {
        const mockPaymentId = 'pay_mock_' + Math.random().toString(36).substr(2, 9);
        await verifyRepaymentRecord(mockPaymentId, orderData.id, 'mock_sig', amount);
        setIsProcessingPayment(false);
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
            amount
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
      setIsProcessingPayment(false);
    } catch (err: any) {
      alert('Payment initialization error: ' + err.message);
      setIsProcessingPayment(false);
    }
  };

  const handleRequestCashCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile || cashRequestAmount <= 0) return;
    setIsProcessingPayment(true);

    const newRequest = {
      id: 'req-' + Math.floor(100000 + Math.random() * 900000),
      user_id: user.id,
      business_name: userProfile.business_name || 'N/A',
      customer_name: userProfile.full_name || 'N/A',
      customer_phone: userProfile.phone || 'N/A',
      amount: Number(cashRequestAmount),
      preferred_date: cashRequestDate,
      remarks: cashRequestRemarks,
      status: 'Pending',
      created_at: new Date().toISOString()
    };

    await supabase.from('cash_collection_requests').insert(newRequest);
    setIsProcessingPayment(false);
    setCashRequestSuccess(true);
  };

  const completeOrderWithPayment = async (payStatus: string, upiRef: string = '') => {
    setIsProcessingPayment(true);
    const hasInvalidQuantities = cartItems.some(item => item.quantity <= 0);
    if (cartItems.length === 0 || subtotal <= 0 || hasInvalidQuantities) {
      alert("Cart data missing. Please refresh and try again.");
      setIsProcessingPayment(false);
      return;
    }

    const { data: { user: freshUser } } = await supabase.auth.getUser();
    if (!freshUser) {
      alert("Session expired. Please log in again.");
      router.push('/login');
      setIsProcessingPayment(false);
      return;
    }

    // Reserve loyalty points atomically if applied
    let currentReservationId = reservationId;
    if (useLoyaltyPoints && pointsToRedeem > 0) {
      if (!currentReservationId) {
        try {
          const resRes = await fetch('/api/loyalty/reserve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              points: pointsToRedeem,
              cartSessionId: cartSessionId || 'cs_' + Date.now()
            })
          });
          const resData = await resRes.json();
          if (!resRes.ok || resData.error || !resData.success) {
            alert('Could not reserve loyalty points: ' + (resData.error || 'Insufficient points'));
            setIsProcessingPayment(false);
            return;
          }
          currentReservationId = resData.reservation_id;
          setReservationId(currentReservationId);
        } catch (rErr: any) {
          alert('Error reserving points: ' + rErr.message);
          setIsProcessingPayment(false);
          return;
        }
      }
    }

    const { data: freshProfile } = await supabase.from('users').select('*').eq('id', freshUser.id).single();
    const activeAddress = addresses.find(a => a.id === selectedAddressId);
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const activeRole = freshProfile?.user_type || freshUser.user_metadata?.user_type || userRole;

    const orderPayload = {
      id: orderId,
      order_id: orderId,
      user_id: freshUser.id,
      customer_id: freshUser.id,
      created_by: freshUser.id,
      customer_name: freshProfile?.full_name || freshUser.user_metadata?.full_name || activeAddress?.name || 'N/A',
      business_name: freshProfile?.business_name || freshUser.user_metadata?.business_name || '',
      customer_phone: freshProfile?.phone || freshUser.user_metadata?.phone || freshUser.phone || activeAddress?.phone || '',
      role: activeRole,
      user_role: activeRole,
      delivery_address: activeAddress?.addressLine || 'Store Pickup',
      subtotal,
      discount: discountAmount,
      delivery_fee: deliveryFee,
      total,
      grand_total: total,
      payment_method: paymentMethod === 'Credit' ? 'Pay Later (Credit)' : paymentMethod,
      payment_status: payStatus,
      payment_ref: upiRef,
      status: 'Pending',
      delivery_slot: deliverySlot,
      coupon_code: appliedCoupon ? appliedCoupon.code : null,
      coupon_discount: discountAmount,
      points_earned: 0,
      points_redeemed: useLoyaltyPoints ? pointsToRedeem : 0,
      points_discount: activeLoyaltyDiscount,
      stamp_awarded: false,
      claimed_reward_code: claimedFreeRewardCode || null,
      items: cartItems.map(item => ({
        product_id: item.productId,
        name: item.product?.name,
        product_name: item.product?.name || '',
        quantity: item.quantity,
        qty: item.quantity,
        price: item.price,
        unit_price: item.price,
        total: item.price * item.quantity,
        is_free_reward: item.isFreeStampReward || false
      }))
    };

    // Filter database payload to avoid PostgREST column schema mismatch errors
    const dbOrderPayload = {
      id: orderPayload.id,
      user_id: orderPayload.user_id,
      customer_id: orderPayload.customer_id,
      customer_name: orderPayload.customer_name,
      business_name: orderPayload.business_name,
      customer_phone: orderPayload.customer_phone,
      delivery_address: orderPayload.delivery_address,
      subtotal: orderPayload.subtotal,
      discount: orderPayload.discount,
      delivery_fee: orderPayload.delivery_fee,
      total: orderPayload.total,
      payment_method: orderPayload.payment_method,
      payment_status: orderPayload.payment_status,
      payment_ref: orderPayload.payment_ref,
      status: orderPayload.status,
      items: orderPayload.items,
      delivery_slot: orderPayload.delivery_slot,
      coupon_code: orderPayload.coupon_code,
      coupon_discount: orderPayload.coupon_discount,
      points_earned: orderPayload.points_earned,
      points_redeemed: orderPayload.points_redeemed,
      points_discount: orderPayload.points_discount,
      stamp_awarded: orderPayload.stamp_awarded,
      claimed_reward_code: orderPayload.claimed_reward_code
    };

    let { error } = await supabase.from('orders').insert(dbOrderPayload);

    // Fail-safe schema cache fallback: if any optional/loyalty column triggers a PostgREST schema cache error,
    // retry with core verified orders schema so the customer checkout is never blocked
    if (error && (
      error.message?.includes('schema cache') ||
      error.message?.includes('Could not find') ||
      error.code === 'PGRST204'
    )) {
      console.warn('[SCHEMA CACHE FALLBACK] Retrying order insert with core fields due to:', error.message);
      const corePayload = {
        id: dbOrderPayload.id,
        user_id: dbOrderPayload.user_id,
        customer_name: dbOrderPayload.customer_name,
        business_name: dbOrderPayload.business_name,
        customer_phone: dbOrderPayload.customer_phone,
        delivery_address: dbOrderPayload.delivery_address,
        subtotal: dbOrderPayload.subtotal,
        discount: dbOrderPayload.discount,
        delivery_fee: dbOrderPayload.delivery_fee,
        total: dbOrderPayload.total,
        payment_method: dbOrderPayload.payment_method,
        payment_status: dbOrderPayload.payment_status,
        payment_ref: dbOrderPayload.payment_ref,
        status: dbOrderPayload.status,
        items: dbOrderPayload.items,
        delivery_slot: dbOrderPayload.delivery_slot
      };
      const retryResult = await supabase.from('orders').insert(corePayload);
      error = retryResult.error;
    }

    setIsProcessingPayment(false);

    if (error) {
      // Securely log technical error on server/console
      console.error('[CRITICAL] Order placement database failure:', {
        orderId,
        userId: freshUser.id,
        errorMessage: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });

      // Release loyalty points reservation so points are not deducted
      if (currentReservationId) {
        fetch('/api/loyalty/release', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservationId: currentReservationId })
        }).catch(console.warn);
        setReservationId(null);
      }

      // Customer-friendly message (replacing raw database errors)
      alert('We were unable to complete your order due to a temporary service issue. Please try again. Your cart items and loyalty rewards are safe.');
      return;
    }

    // Update B2B credit ledger only AFTER order is successfully confirmed in database
    if (activeRole === 'b2b' && paymentMethod === 'Credit') {
      try {
        const outstandingBalance = (freshProfile?.outstanding_balance || 0) + total;
        const creditUsed = (freshProfile?.credit_used || 0) + total;
        const creditAvailable = (freshProfile?.credit_available || 0) - total;
        
        const ledgerEntry = {
          date: new Date().toISOString(),
          description: `Order #${orderId} (Credit)`,
          debit: total,
          credit: 0,
          balance: outstandingBalance
        };

        const updatedLedger = [...(freshProfile?.ledger || []), ledgerEntry];

        await supabase.from('users').update({
          outstanding_balance: outstandingBalance,
          credit_used: creditUsed,
          credit_available: creditAvailable,
          ledger: updatedLedger
        }).eq('id', freshUser.id);
      } catch (ledgerErr) {
        console.error('Failed to update B2B ledger after order:', ledgerErr);
      }
    }

    // Mark reward claim as redeemed if free reward was claimed
    if (claimedFreeRewardCode) {
      try {
        await supabase
          .from('loyalty_reward_claims')
          .update({
            status: 'redeemed',
            redeemed_order_id: orderId,
            redeemed_at: new Date().toISOString()
          })
          .eq('claim_code', claimedFreeRewardCode);
      } catch (cErr) {
        console.warn('Failed to update reward claim status:', cErr);
      }
      localStorage.removeItem('meatcity_claimed_free_reward');
      setClaimedFreeRewardCode(null);
    }

    // Commit loyalty reservation if points were used
    if (currentReservationId) {
      try {
        await fetch('/api/loyalty/commit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservationId: currentReservationId, orderId })
        });
      } catch (commitErr) {
        console.warn('Failed to commit loyalty points redemption:', commitErr);
      }
      setReservationId(null);
    }

    try {
      await supabase.from('notifications').insert({
        user_id: freshUser.id,
        title: 'Order Placed successfully 🎉',
        message: `Your order ${orderId} for ₹${total} has been placed. Payment method: ${paymentMethod === 'Credit' ? 'Pay Later (Credit)' : paymentMethod}.`,
        type: 'new_order'
      });

      await supabase.from('notifications').insert({
        user_id: 'd7b7b123-1234-5678-abcd-123456789abc',
        title: 'New Order Received 📦',
        message: `Order ${orderId} placed by ${freshProfile?.full_name || freshUser.user_metadata?.full_name || 'Customer'} for ₹${total}.`,
        type: 'new_order'
      });
    } catch (nErr) {
      console.error('Failed to trigger database notifications:', nErr);
    }

    // Trigger Resend email notification via our server-side API endpoint (non-blocking)
    try {
      fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ order: dbOrderPayload })
      }).catch(err => console.error('Fetch post error on send-email:', err));
    } catch (eErr) {
      console.error('Failed to dispatch order email trigger:', eErr);
    }

    // Trigger Telegram order notification via server-side API endpoint (non-blocking)
    try {
      fetch('/api/notifications/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ order: dbOrderPayload })
      }).catch(err => console.error('Fetch post error on telegram alert:', err));
    } catch (tErr) {
      console.error('Failed to dispatch telegram notification trigger:', tErr);
    }

    localStorage.removeItem('meatcity_cart');
    setCart({});
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cart-updated'));
    }
    setPlacedOrderId(orderId);
    setPlacedOrder(orderPayload);
    setOrderSuccess(true);
    setShowUpiPaymentModal(false);
    setShowRazorpayModal(false);
  };

  const completeRazorpayVerification = async (
    paymentId: string, 
    orderId: string, 
    signature: string, 
    orderPayload: any
  ) => {
    setIsProcessingPayment(true);
    try {
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentType: 'order',
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          razorpay_signature: signature,
          payload: { orderPayload }
        })
      });

      const verifyData = await verifyRes.json();
      if (verifyRes.ok && verifyData.success) {
        if (orderPayload?.reservation_id) {
          fetch('/api/loyalty/commit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reservationId: orderPayload.reservation_id, orderId: orderPayload.id })
          }).catch(console.warn);
          setReservationId(null);
        }
        localStorage.removeItem('meatcity_cart');
        setCart({});
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('cart-updated'));
        }
        setPlacedOrderId(orderPayload.id);
        setPlacedOrder(orderPayload);
        setOrderSuccess(true);
        setShowRazorpayModal(false);
      } else {
        alert('Payment verification failed: ' + (verifyData.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Network error verifying payment: ' + err.message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleRazorpayPayment = async () => {
    const hasInvalidQuantities = cartItems.some(item => item.quantity <= 0);
    if (cartItems.length === 0 || subtotal <= 0 || hasInvalidQuantities) {
      alert("Cart data missing. Please refresh and try again.");
      return;
    }

    setIsProcessingPayment(true);

    try {
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      if (!freshUser) {
        alert("Session expired. Please log in again.");
        router.push('/login');
        setIsProcessingPayment(false);
        return;
      }

      const { data: freshProfile } = await supabase.from('users').select('*').eq('id', freshUser.id).single();
      const activeAddress = addresses.find(a => a.id === selectedAddressId);
      const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
      const activeRole = freshProfile?.user_type || freshUser.user_metadata?.user_type || userRole;

      // Reserve points atomically if applied
      let currentReservationId = reservationId;
      if (useLoyaltyPoints && pointsToRedeem > 0) {
        if (!currentReservationId) {
          try {
            const resRes = await fetch('/api/loyalty/reserve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                points: pointsToRedeem,
                cartSessionId: cartSessionId || 'cs_' + Date.now()
              })
            });
            const resData = await resRes.json();
            if (!resRes.ok || resData.error || !resData.success) {
              alert('Could not reserve loyalty points: ' + (resData.error || 'Insufficient points'));
              setIsProcessingPayment(false);
              return;
            }
            currentReservationId = resData.reservation_id;
            setReservationId(currentReservationId);
          } catch (rErr: any) {
            alert('Error reserving points: ' + rErr.message);
            setIsProcessingPayment(false);
            return;
          }
        }
      }

      const orderPayload = {
        id: orderId,
        order_id: orderId,
        user_id: freshUser.id,
        customer_id: freshUser.id,
        customer_name: freshProfile?.full_name || freshUser.user_metadata?.full_name || activeAddress?.name || 'N/A',
        business_name: freshProfile?.business_name || freshUser.user_metadata?.business_name || '',
        customer_phone: freshProfile?.phone || freshUser.user_metadata?.phone || freshUser.phone || activeAddress?.phone || '',
        role: activeRole,
        user_role: activeRole,
        delivery_address: activeAddress?.addressLine || 'Store Pickup',
        subtotal,
        discount: discountAmount,
        delivery_fee: deliveryFee,
        total,
        grand_total: total,
        payment_method: 'Online (Razorpay)',
        payment_status: 'Pending Verification',
        status: 'New',
        points_earned: 0,
        points_redeemed: useLoyaltyPoints ? pointsToRedeem : 0,
        points_discount: activeLoyaltyDiscount,
        stamp_awarded: false,
        reservation_id: currentReservationId,
        items: cartItems.map(item => ({
          product_id: item.product?.id,
          name: item.product?.name,
          product_name: item.product?.name || '',
          quantity: item.quantity,
          qty: item.quantity,
          price: item.price,
          unit_price: item.price,
          total: item.price * item.quantity
        }))
      };

      setPendingOrderPayload(orderPayload);

      // Create order in Razorpay (or mock)
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: total, receipt: orderId })
      });

      const orderData = await res.json();
      if (!res.ok || !orderData.success) {
        alert('Payment initialization failed: ' + (orderData.error || 'Unknown error'));
        setIsProcessingPayment(false);
        return;
      }

      setRazorpayOrderId(orderData.id);

      if (orderData.isMock) {
        // Show simulated modal
        setShowRazorpayModal(true);
        setIsProcessingPayment(false);
        return;
      }

      if (typeof window === 'undefined' || !(window as any).Razorpay) {
        alert('Razorpay SDK failed to load. Please check your internet connection.');
        setIsProcessingPayment(false);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_MeatCityKey123',
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Meat City',
        description: 'Order Checkout Payment',
        image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=50&auto=format&fit=crop',
        order_id: orderData.id,
        handler: function (response: any) {
          completeRazorpayVerification(
            response.razorpay_payment_id,
            response.razorpay_order_id,
            response.razorpay_signature,
            orderPayload
          );
        },
        prefill: {
          name: userProfile?.full_name || user?.user_metadata?.full_name || '',
          email: user?.email || '',
          contact: userProfile?.phone || user?.user_metadata?.phone || ''
        },
        theme: {
          color: '#d60000'
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      setIsProcessingPayment(false);
    } catch (err: any) {
      alert('Checkout error: ' + err.message);
      setIsProcessingPayment(false);
    }
  };

  const handleCheckout = async () => {
    if (userRole === 'guest') {
      router.push('/login?redirect=cart');
      return;
    }

    if (addresses.length === 0) {
      alert('Please add a delivery address first.');
      return;
    }

    // Validate minimum order threshold
    const requiredMinOrder = userRole === 'b2b' ? minB2BOrder : minB2COrder;
    if (requiredMinOrder > 0 && subtotal < requiredMinOrder) {
      alert(`Minimum order amount for ${userRole === 'b2b' ? 'wholesale B2B' : 'retail'} is ₹${requiredMinOrder.toLocaleString('en-IN')}. Please add more items to your cart.`);
      return;
    }

    // Validate serviceable pincode
    const activeAddress = addresses.find(a => a.id === selectedAddressId);
    if (activeAddress && activeAddress.addressLine !== 'Store Pickup') {
      const activePincode = activeAddress.pincode || (activeAddress.addressLine.match(/\b\d{6}\b/)?.[0]) || '';
      if (!serviceablePincodes.includes(activePincode)) {
        alert('Sorry! Delivery is currently unavailable in your area. We are expanding soon and will serve your location shortly.');
        return;
      }
    }

    if (userRole === 'b2b' && paymentMethod === 'Credit') {
      if (isCreditLimitExceeded) {
        alert('Credit limit reached. Please clear your outstanding balance or choose another payment method (UPI / Bank Transfer / COD).');
        return;
      }

      const availableCredit = userProfile?.credit_available || 0;
      if (total > availableCredit) {
        alert(`Your available credit is ₹${availableCredit.toLocaleString('en-IN')}. Please clear dues or choose another payment method (UPI / Bank Transfer / COD).`);
        return;
      }
    }

    if (paymentMethod === 'UPI') {
      setShowUpiPaymentModal(true);
      return;
    }

    if (paymentMethod === 'Razorpay') {
      handleRazorpayPayment();
      return;
    }

    const defaultPayStatus = (paymentMethod === 'COD' || paymentMethod === 'Credit') ? 'Pending' : 'Paid';
    await completeOrderWithPayment(defaultPayStatus);
  };

  const handleWhatsAppRedirect = () => {
    const order = placedOrder;
    if (!order) return;

    const capitalizeWords = (str: string) => {
      if (!str) return '';
      return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    };

    let message = `NEW ORDER FROM MEAT CITY\n\n`;
    message += `Order ID: ${order.order_id || order.id}\n\n`;
    message += `Customer: ${capitalizeWords(order.customer_name)}\n\n`;
    message += `Phone: ${order.customer_phone}\n\n`;
    message += `Address: ${capitalizeWords(order.delivery_address)}\n\n`;
    message += `Items Ordered:\n\n`;
    
    order.items.forEach((item: any) => {
      const pName = capitalizeWords(item.product_name || item.name);
      const qty = item.qty || item.quantity;
      const rate = item.unit_price || item.price;
      const itemTotal = item.total || (qty * rate);
      message += `• ${pName}\nQty: ${qty}\nRate: ₹${rate}\nTotal: ₹${itemTotal}\n\n`;
    });

    message += `Subtotal: ₹${order.subtotal}\n\n`;
    message += `Delivery Fee: ₹${order.delivery_fee}\n\n`;
    message += `Grand Total: ₹${order.total || order.grand_total}\n\n`;
    message += `Payment Method: ${order.payment_method}\n\n`;
    message += `Thank you for ordering with Meat City.`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${adminWhatsapp}?text=${encoded}`, '_blank');
  };

  const renderB2BCreditBanner = () => {
    if (userRole !== 'b2b' || !userProfile) return null;

    const outstanding = userProfile.outstanding_balance || 0;
    const limit = userProfile.credit_limit || 50000;
    const available = userProfile.credit_available || 0;

    if (outstanding <= 0 && !isCreditLimitExceeded) {
      return (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-500/20 rounded-[14px] p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">✅</span>
            <div>
              <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 block">Credit Account in Good Standing</span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                Available Credit: ₹{available.toLocaleString('en-IN')} of ₹{limit.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowLedgerModal(true)}
            className="text-[10px] text-emerald-800 dark:text-emerald-300 font-extrabold uppercase hover:underline"
          >
            Statement →
          </button>
        </div>
      );
    }

    return (
      <div className={`rounded-[14px] p-4 flex flex-col gap-3 border ${
        isCreditLimitExceeded 
          ? 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-500/30' 
          : 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/30'
      }`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{isCreditLimitExceeded ? '⛔' : '⚠️'}</span>
            <div>
              <h4 className={`text-xs font-black uppercase tracking-wide ${
                isCreditLimitExceeded ? 'text-red-800 dark:text-red-400' : 'text-amber-800 dark:text-amber-400'
              }`}>
                {isCreditLimitExceeded ? 'Credit Limit Reached' : 'Outstanding Balance Notice'}
              </h4>
              <p className="text-[11px] text-gray-700 dark:text-gray-300 font-bold mt-0.5 leading-tight">
                {isCreditLimitExceeded 
                  ? 'Pay Later (Credit) is temporarily locked. Clear balance to unlock or pay this order via UPI / Bank Transfer / COD.'
                  : `You have an outstanding balance of ₹${outstanding.toLocaleString('en-IN')}.`
                }
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setShowLedgerModal(true)}
            className="text-[10px] font-black uppercase text-gold hover:underline whitespace-nowrap"
          >
            Ledger →
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-white/80 dark:bg-black/30 p-2.5 rounded-[10px] border border-gray-200/50 dark:border-white/5 text-xs">
          <div>
            <span className="text-[9px] uppercase font-bold text-gray-500 dark:text-gray-400 block">Outstanding</span>
            <strong className="text-primary font-black text-sm">₹{outstanding.toLocaleString('en-IN')}</strong>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-gray-500 dark:text-gray-400 block">Available Credit</span>
            <strong className="text-gray-900 dark:text-white font-black text-sm">₹{available.toLocaleString('en-IN')}</strong>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setOnlinePayAmount(outstanding);
              setShowOnlinePaymentModal(true);
            }}
            className="flex-1 min-w-[120px] py-2 bg-gold hover:bg-[#c5a028] text-black font-black text-[11px] rounded-[10px] active:scale-95 transition-all text-center shadow-xs"
          >
            💳 Pay Online (₹{outstanding.toLocaleString('en-IN')})
          </button>
          <button
            type="button"
            onClick={() => {
              setRepayUpiTxRef('MC_REPAY_' + Date.now().toString().slice(-6));
              setOnlinePayAmount(outstanding);
              setShowUpiRepayModal(true);
            }}
            className="flex-1 min-w-[100px] py-2 bg-gray-900 dark:bg-white/10 text-white font-black text-[11px] rounded-[10px] active:scale-95 transition-all border border-gray-700 dark:border-white/10"
          >
            📱 UPI Pay
          </button>
          <button
            type="button"
            onClick={() => {
              setCashRequestAmount(outstanding);
              setShowCashCollectionModal(true);
            }}
            className="flex-1 min-w-[120px] py-2 bg-gray-200 dark:bg-white/5 text-gray-800 dark:text-gray-200 font-bold text-[11px] rounded-[10px] active:scale-95 transition-all border border-gray-300 dark:border-white/10"
          >
            🛵 Request Cash Pickup
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-3 bg-background text-text-primary">
        <div className="relative w-16 h-16 animate-bounce">
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" stroke="#D4AF37" strokeWidth="3" fill="#111" />
            <path d="M30 65V35L50 50L70 35V65" stroke="#D60000" strokeWidth="6" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-gold text-xs font-extrabold uppercase tracking-wider animate-pulse">Loading Cart...</p>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 py-8 bg-background text-text-primary font-primary">
        <div className="text-6xl mb-6 animate-pulse">🎉</div>
        <h2 className="text-primary text-2xl font-black tracking-tight mb-2">Order Confirmed!</h2>
        <p className="text-gray-900 dark:text-white font-extrabold text-sm tracking-wide bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 px-4 py-2 rounded-full mb-4 shadow-xs">
          Order ID: {placedOrderId}
        </p>
        <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed max-w-[320px] mb-8">
          Your order has been recorded in our branch database. For rapid dispatch and delivery notifications, click below to confirm details with our Turbhe branch manager on WhatsApp.
        </p>

        {whatsappEnabled ? (
          <button 
            onClick={handleWhatsAppRedirect} 
            className="w-full max-w-[360px] py-4 bg-[#25D366] text-white font-black text-sm uppercase tracking-wider rounded-[14px] shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98] mb-6"
          >
            <span>💬</span> Confirm on WhatsApp
          </button>
        ) : (
          <Link 
            href="/profile?tab=orders" 
            className="w-full max-w-[360px] py-4 bg-primary text-white font-black text-sm uppercase rounded-[14px] shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98] mb-6 text-center"
          >
            📦 View Order History
          </Link>
        )}

        <Link 
          href="/" 
          className="text-gray-600 dark:text-gray-400 hover:text-primary text-xs font-bold tracking-wide uppercase hover:underline"
        >
          ← Back to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-background min-h-screen text-text-primary font-primary pb-[100px]">
      {/* Top Sticky Header */}
      <div className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link 
            href="/" 
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center bg-surface border border-border text-lg text-text-primary active:scale-95 transition-all shadow-xs"
            aria-label="Back to home"
          >
            ←
          </Link>
          <div className="flex flex-col">
            <span className="text-text-primary text-sm font-black tracking-tight leading-none uppercase">
              {userRole === 'b2b' ? 'B2B Wholesale Cart' : 'Shopping Cart'}
            </span>
            <span className="text-[10px] text-text-secondary uppercase font-bold tracking-widest mt-1">
              Meat City Turbhe
            </span>
          </div>
        </div>

        {userRole === 'b2b' ? (
          <span className="text-[10px] bg-gold/15 text-gold border border-gold/30 font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
            <span>🏢</span> Wholesale
          </span>
        ) : (
          <span className="text-[10px] bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
            🍗 Retail
          </span>
        )}
      </div>

      {cartItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
          <span className="text-6xl mb-2">🛒</span>
          <h3 className="mt-4 text-gray-900 dark:text-white text-lg font-black tracking-tight">Your Basket is Empty</h3>
          <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed max-w-[260px] mt-2">
            {userRole === 'b2b'
              ? 'Add fresh wholesale cuts to meet minimum commercial order requirement.'
              : "Looks like you haven't added any fresh halal cuts to your basket yet."}
          </p>
          <Link 
            href="/" 
            className="mt-6 px-6 py-3.5 bg-primary hover:bg-[#B80000] text-white font-extrabold text-xs uppercase tracking-wider rounded-[12px] shadow-lg active:scale-95 transition-all text-center"
          >
            Browse Fresh Meat
          </Link>
        </div>
      ) : (
        <div className="px-4 py-4 flex flex-col gap-5 max-w-[480px] mx-auto w-full">
          {/* Minimum Order & Wholesale Status Card */}
          {userRole === 'b2b' ? (
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-gold/40 rounded-[16px] p-4 flex flex-col gap-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏢</span>
                  <div>
                    <h2 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                      MeatCity B2B Wholesale
                    </h2>
                    <span className="text-[10px] text-gray-600 dark:text-gray-400 font-bold block">
                      Direct Wholesale Pricing Applied • Free Commercial Delivery
                    </span>
                  </div>
                </div>
                {minB2BOrder > 0 && (
                  <span className="text-[10px] bg-gold/20 text-gold-dark dark:text-gold border border-gold/40 px-2 py-0.5 rounded-full font-black">
                    Min ₹{minB2BOrder.toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              {/* Progress bar (only if configured) */}
              {minB2BOrder > 0 && (
                <div className="flex flex-col gap-1 pt-1">
                  <div className="flex justify-between items-center text-[10px] font-black">
                    <span className={subtotal >= minB2BOrder ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'}>
                      {subtotal >= minB2BOrder 
                        ? `✓ Minimum wholesale order threshold met (₹${subtotal.toLocaleString('en-IN')})` 
                        : `Add ₹${(minB2BOrder - subtotal).toLocaleString('en-IN')} more to reach wholesale min order`
                      }
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      ₹{subtotal.toLocaleString('en-IN')} / ₹{minB2BOrder.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 rounded-full ${
                        subtotal >= minB2BOrder ? 'bg-emerald-500' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(100, (subtotal / minB2BOrder) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-[16px] p-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🛵</span>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-gray-900 dark:text-white">
                    {deliveryFee === 0 ? 'FREE Standard Delivery Applied!' : 'Fast Delivery to your Doorstep'}
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">
                    {deliveryFee === 0 
                      ? 'Orders above ₹' + freeDeliveryAbove + ' get free shipping' 
                      : `Add ₹${Math.max(0, freeDeliveryAbove - subtotal)} more for free delivery`
                    }
                  </span>
                </div>
              </div>
              {deliveryFee === 0 && (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded-full font-black uppercase">
                  FREE
                </span>
              )}
            </div>
          )}

          {/* 1. Basket items list (Order Summary) */}
          <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-[16px] p-4 flex flex-col gap-3.5 shadow-xs">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-white/10">
              <h3 className="text-gray-900 dark:text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <span>🛒</span>
                <span>{userRole === 'b2b' ? 'Wholesale Basket' : 'Order Items'}</span>
                <span className="text-gray-500 dark:text-gray-400 font-bold">({cartItems.length})</span>
              </h3>
              <span className="text-[10px] text-gold font-extrabold uppercase">
                {userRole === 'b2b' ? 'B2B Wholesale Rates' : 'Retail Price'}
              </span>
            </div>

            <div className="flex flex-col divide-y divide-gray-100 dark:divide-white/5 max-h-[360px] overflow-y-auto pr-1">
              {cartItems.map(({ cartKey, product, quantity, price, isFreeStampReward }) => (
                <div key={cartKey} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <img 
                      src={product?.image_url || 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=100&auto=format&fit=crop'} 
                      alt={product?.name} 
                      className="w-14 h-14 object-cover rounded-[10px] bg-gray-100 dark:bg-neutral-900 border border-gray-200 dark:border-white/10 shrink-0" 
                    />
                    <div className="flex-1 flex flex-col min-w-0">
                      <span className="font-extrabold text-xs text-gray-900 dark:text-white tracking-tight truncate">
                        {product?.name}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isFreeStampReward ? (
                          <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-black">
                            🎁 FREE Stamp Reward (250g)
                          </span>
                        ) : userRole === 'b2b' ? (
                          <span className="text-[10px] bg-gold/15 text-gold-dark dark:text-gold border border-gold/30 px-1.5 py-0.5 rounded font-black">
                            Wholesale: ₹{price}/{product?.unit || 'kg'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">
                            ₹{price} / {product?.unit || 'unit'}
                          </span>
                        )}
                      </div>
                      <span className="text-gray-900 dark:text-white font-black text-xs mt-1">
                        {isFreeStampReward ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-black">FREE (₹0)</span>
                        ) : (
                          `₹${(price * quantity).toLocaleString('en-IN')}`
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Quantity Selector */}
                    {isFreeStampReward ? (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10 border border-emerald-500/20 px-2 py-1.5 rounded-[8px]">
                        Qty: 1 (Free)
                      </span>
                    ) : (
                      <div className="flex items-center bg-gray-100 dark:bg-white/10 rounded-[10px] border border-gray-200 dark:border-white/10 p-0.5">
                        <button
                          type="button"
                          onClick={() => handleDecrement(cartKey)}
                          aria-label="Decrease quantity"
                          className="w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center font-black text-gray-800 dark:text-white text-sm active:scale-75 transition-transform hover:bg-gray-200 dark:hover:bg-white/20 rounded"
                        >
                          -
                        </button>
                        <span className="px-2 text-gray-900 dark:text-white font-black text-xs min-w-[22px] text-center">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleIncrement(cartKey)}
                          aria-label="Increase quantity"
                          className="w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center font-black text-gray-800 dark:text-white text-sm active:scale-75 transition-transform hover:bg-gray-200 dark:hover:bg-white/20 rounded"
                        >
                          +
                        </button>
                      </div>
                    )}

                    {/* Remove Item Button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(cartKey)}
                      aria-label="Remove item from cart"
                      title="Remove item"
                      className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-[8px] flex items-center justify-center text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 active:scale-75 transition-transform border border-red-200 dark:border-red-500/20 text-xs"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Address Section */}
          <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-[16px] p-4 flex flex-col gap-3.5 shadow-xs">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-white/10">
              <h3 className="text-gray-900 dark:text-white text-xs font-black uppercase tracking-wider">
                📍 Delivery Address
              </h3>
              <button 
                onClick={() => setShowAddAddress(!showAddAddress)} 
                className="text-primary text-xs font-bold uppercase hover:underline"
              >
                {showAddAddress ? 'Close Panel' : '+ Add Address'}
              </button>
            </div>

            {showAddAddress && (
              <form onSubmit={handleAddAddress} className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-[12px] flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-extrabold">Label</label>
                    <input 
                      type="text" 
                      required 
                      value={newAddress.name} 
                      onChange={e => setNewAddress({...newAddress, name: e.target.value})} 
                      placeholder="Home / Shop"
                      className="bg-white dark:bg-[#1E2020] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-[12px] p-2.5 text-xs outline-none focus:border-gold"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-extrabold">Recipient Mobile</label>
                    <input 
                      type="tel" 
                      required 
                      value={newAddress.phone} 
                      onChange={e => setNewAddress({...newAddress, phone: e.target.value})} 
                      placeholder="10-digit number"
                      className="bg-white dark:bg-[#1E2020] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-[12px] p-2.5 text-xs outline-none focus:border-gold"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-extrabold">Room / Shop / Flat Number *</label>
                  <input 
                    type="text" 
                    required 
                    value={newAddress.roomNumber} 
                    onChange={e => setNewAddress({...newAddress, roomNumber: e.target.value})} 
                    placeholder="e.g. Shop No. 2, Room No. 126"
                    className="bg-white dark:bg-[#1E2020] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-[12px] p-2.5 text-xs outline-none focus:border-gold"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-extrabold">Sector / Area *</label>
                  <input 
                    type="text" 
                    required 
                    value={newAddress.sectorArea} 
                    onChange={e => setNewAddress({...newAddress, sectorArea: e.target.value})} 
                    placeholder="e.g. Sector 20, Turbhe"
                    className="bg-white dark:bg-[#1E2020] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-[12px] p-2.5 text-xs outline-none focus:border-gold"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-extrabold">Pincode *</label>
                  <input 
                    type="text" 
                    required 
                    value={newAddress.pincode} 
                    onChange={e => setNewAddress({...newAddress, pincode: e.target.value})} 
                    placeholder="e.g. 400705"
                    className="bg-white dark:bg-[#1E2020] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-[12px] p-2.5 text-xs outline-none focus:border-gold"
                  />
                </div>
                
                <button type="submit" className="w-full mt-1.5 py-2.5 bg-primary text-white text-xs font-extrabold uppercase rounded-[10px] active:scale-95 transition-all">
                  Save Delivery Address
                </button>
              </form>
            )}

            {addresses.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-xs font-bold text-center py-4">No address added. Add one to proceed.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {addresses.map(addr => (
                  <div 
                    key={addr.id} 
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`p-3.5 rounded-[12px] flex gap-3 items-start cursor-pointer transition-all border ${
                      selectedAddressId === addr.id 
                        ? 'border-gold bg-gold/5 dark:bg-gold/10 ring-1 ring-gold/40 shadow-xs' 
                        : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-gray-50/50 dark:bg-white/5'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="checkoutAddress" 
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className="accent-primary mt-1"
                    />
                    <div className="flex-1 flex flex-col gap-0.5">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-xs text-gray-900 dark:text-white">{addr.name}</span>
                        {selectedAddressId === addr.id && (
                          <span className="text-[9px] text-gold-dark dark:text-gold font-extrabold uppercase bg-gold/15 px-2 py-0.5 rounded-full border border-gold/30">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed mt-0.5">{addr.addressLine}</p>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-1">📞 {addr.phone}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Delivery Time Slot Section */}
          <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-[16px] p-4 flex flex-col gap-3.5 shadow-xs">
            <h3 className="text-gray-900 dark:text-white text-xs font-black uppercase tracking-wider">
              📅 Schedule Delivery
            </h3>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-extrabold">
                Select Delivery Time Slot
              </label>
              <select
                value={deliverySlot}
                onChange={e => setDeliverySlot(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#1E2020] border border-gray-200 dark:border-white/10 rounded-[12px] px-3.5 py-3 text-gray-900 dark:text-white text-xs outline-none focus:border-gold"
              >
                <option value="ASAP">ASAP (Within 60 Minutes)</option>
                <option value="10 AM – 12 PM">10 AM – 12 PM</option>
                <option value="12 PM – 2 PM">12 PM – 2 PM</option>
                <option value="2 PM – 4 PM">2 PM – 4 PM</option>
                <option value="4 PM – 6 PM">4 PM – 6 PM</option>
              </select>
            </div>
          </div>

          {/* 4. Payment Section */}
          <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-[16px] p-4 flex flex-col gap-3.5 shadow-xs">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-white/10">
              <h3 className="text-gray-900 dark:text-white text-xs font-black uppercase tracking-wider">
                💳 Payment Method
              </h3>
              <span className="text-[9px] bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {userRole === 'b2b' ? 'Wholesale Terms' : 'Retail'}
              </span>
            </div>

            {/* B2B Credit Notice / Repayment Banner */}
            {renderB2BCreditBanner()}

            <div className="flex flex-col gap-2.5">
              {userRole === 'b2b' ? (
                <>
                  {/* Credit (Pay Later) */}
                  <div 
                    onClick={() => !isCreditLimitExceeded && setPaymentMethod('Credit')}
                    className={`p-3.5 rounded-[12px] flex gap-3 items-start cursor-pointer transition-all border ${
                      paymentMethod === 'Credit' 
                        ? 'border-gold bg-gold/5 dark:bg-gold/10 ring-1 ring-gold/40' 
                        : isCreditLimitExceeded 
                          ? 'border-gray-200 dark:border-white/10 opacity-40 cursor-not-allowed bg-gray-50/50 dark:bg-white/5'
                          : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-gray-50/50 dark:bg-white/5'
                    }`}
                  >
                    <input 
                      type="radio" 
                      checked={paymentMethod === 'Credit'} 
                      disabled={isCreditLimitExceeded}
                      onChange={() => setPaymentMethod('Credit')} 
                      className="accent-primary mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-xs text-gray-900 dark:text-white">Credit Account (Pay Later)</span>
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          Commercial Ledger
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed mt-1">
                        {isCreditLimitExceeded 
                          ? 'Credit limit reached. Please clear dues or choose UPI / Bank Transfer / COD.' 
                          : 'Order charged to your business ledger account. Clear on weekly billing cycle.'}
                      </p>
                    </div>
                  </div>

                  {/* UPI */}
                  <div 
                    onClick={() => setPaymentMethod('UPI')}
                    className={`p-3.5 rounded-[12px] flex gap-3 items-start cursor-pointer transition-all border ${
                      paymentMethod === 'UPI' 
                        ? 'border-gold bg-gold/5 dark:bg-gold/10 ring-1 ring-gold/40' 
                        : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-gray-50/50 dark:bg-white/5'
                    }`}
                  >
                    <input 
                      type="radio" 
                      checked={paymentMethod === 'UPI'} 
                      onChange={() => setPaymentMethod('UPI')} 
                      className="accent-primary mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-xs text-gray-900 dark:text-white">UPI (Instant Transfer)</span>
                        <span className="text-[9px] text-gold font-extrabold uppercase bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed mt-1">
                        Scan store QR code or enter transaction UTR reference. Fast verification.
                      </p>
                    </div>
                  </div>

                  {/* Bank Transfer */}
                  <div 
                    onClick={() => setPaymentMethod('BankTransfer')}
                    className={`p-3.5 rounded-[12px] flex gap-3 items-start cursor-pointer transition-all border ${
                      paymentMethod === 'BankTransfer' 
                        ? 'border-gold bg-gold/5 dark:bg-gold/10 ring-1 ring-gold/40' 
                        : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-gray-50/50 dark:bg-white/5'
                    }`}
                  >
                    <input 
                      type="radio" 
                      checked={paymentMethod === 'BankTransfer'} 
                      onChange={() => setPaymentMethod('BankTransfer')} 
                      className="accent-primary mt-1"
                    />
                    <div className="flex-1">
                      <span className="font-extrabold text-xs text-gray-900 dark:text-white">RTGS / NEFT / IMPS Bank Transfer</span>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed mt-1">Direct bank-to-bank transfer for bulk wholesale volume orders.</p>
                    </div>
                  </div>

                  {/* COD */}
                  <div 
                    onClick={() => setPaymentMethod('COD')}
                    className={`p-3.5 rounded-[12px] flex gap-3 items-start cursor-pointer transition-all border ${
                      paymentMethod === 'COD' 
                        ? 'border-gold bg-gold/5 dark:bg-gold/10 ring-1 ring-gold/40' 
                        : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-gray-50/50 dark:bg-white/5'
                    }`}
                  >
                    <input 
                      type="radio" 
                      checked={paymentMethod === 'COD'} 
                      onChange={() => setPaymentMethod('COD')} 
                      className="accent-primary mt-1"
                    />
                    <div className="flex-1">
                      <span className="font-extrabold text-xs text-gray-900 dark:text-white">Cash on Delivery</span>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed mt-1">Pay physical cash to our Turbhe dispatch driver upon receipt.</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Retail COD */}
                  <div 
                    onClick={() => setPaymentMethod('COD')}
                    className={`p-3.5 rounded-[12px] flex gap-3 items-start cursor-pointer transition-all border ${
                      paymentMethod === 'COD' 
                        ? 'border-gold bg-gold/5 dark:bg-gold/10 ring-1 ring-gold/40' 
                        : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-gray-50/50 dark:bg-white/5'
                    }`}
                  >
                    <input 
                      type="radio" 
                      checked={paymentMethod === 'COD'} 
                      onChange={() => setPaymentMethod('COD')} 
                      className="accent-primary mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-xs text-gray-900 dark:text-white">Cash on Delivery</span>
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          Pay at Door
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed mt-1">Pay cash or UPI upon delivery.</p>
                    </div>
                  </div>

                  {/* Retail UPI */}
                  <div 
                    onClick={() => setPaymentMethod('UPI')}
                    className={`p-3.5 rounded-[12px] flex gap-3 items-start cursor-pointer transition-all border ${
                      paymentMethod === 'UPI' 
                        ? 'border-gold bg-gold/5 dark:bg-gold/10 ring-1 ring-gold/40' 
                        : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-gray-50/50 dark:bg-white/5'
                    }`}
                  >
                    <input 
                      type="radio" 
                      checked={paymentMethod === 'UPI'} 
                      onChange={() => setPaymentMethod('UPI')} 
                      className="accent-primary mt-1"
                    />
                    <div className="flex-1">
                      <span className="font-extrabold text-xs text-gray-900 dark:text-white">UPI (GPay / PhonePe / Paytm / QR)</span>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed mt-1">Instant payment verification via UPI QR code or handle.</p>
                    </div>
                  </div>

                  {/* Retail Razorpay */}
                  <div 
                    onClick={() => setPaymentMethod('Razorpay')}
                    className={`p-3.5 rounded-[12px] flex gap-3 items-start cursor-pointer transition-all border ${
                      paymentMethod === 'Razorpay' 
                        ? 'border-gold bg-gold/5 dark:bg-gold/10 ring-1 ring-gold/40' 
                        : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-gray-50/50 dark:bg-white/5'
                    }`}
                  >
                    <input 
                      type="radio" 
                      checked={paymentMethod === 'Razorpay'} 
                      onChange={() => setPaymentMethod('Razorpay')} 
                      className="accent-primary mt-1"
                    />
                    <div className="flex-1">
                      <span className="font-extrabold text-xs text-gray-900 dark:text-white">Credit / Debit Card / NetBanking</span>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed mt-1">Secure payment overlay with cards and online banking.</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Sub Forms based on selection */}
            {paymentMethod === 'BankTransfer' && (
              <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-[12px] flex flex-col gap-3">
                <div className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed bg-white dark:bg-black/40 p-3 rounded-[8px] border border-gray-200 dark:border-white/10">
                  Please transfer <strong className="text-gray-900 dark:text-white">₹{total.toLocaleString('en-IN')}</strong> to:<br/>
                  <strong>Bank:</strong> HDFC Bank Ltd<br/>
                  <strong>A/c Name:</strong> Meat City Turbhe Branch<br/>
                  <strong>A/c No:</strong> 50200087612344<br/>
                  <strong>IFSC:</strong> HDFC0000421
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-extrabold">Transaction UTR Number</label>
                  <input 
                    type="text" 
                    placeholder="12-digit UTR reference" 
                    value={bankUtr} 
                    onChange={e => setBankUtr(e.target.value)} 
                    className="bg-white dark:bg-[#1E2020] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-[12px] p-2.5 text-xs outline-none focus:border-gold"
                  />
                  {bankError && <p className="text-primary text-[10px] font-bold mt-0.5">{bankError}</p>}
                </div>
              </div>
            )}
          </div>

          {/* 5. Coupons application (B2C Only) */}
          {userRole !== 'b2b' && (
            <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-[16px] p-4 flex flex-col gap-3.5 shadow-xs">
              <h3 className="text-gray-900 dark:text-white text-xs font-black uppercase tracking-wider">
                🏷️ Coupon Code
              </h3>
              {appliedCoupon ? (
                <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/25 p-3 rounded-[12px]">
                  <div className="flex flex-col">
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">✓ Coupon {appliedCoupon.code}</span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-500 font-bold">You saved ₹{discountAmount}!</span>
                  </div>
                  <button 
                    onClick={handleRemoveCoupon} 
                    className="text-primary text-xs font-black uppercase hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={couponCode} 
                      onChange={e => setCouponCode(e.target.value)} 
                      placeholder="WELCOME20 or MEAT10" 
                      className="flex-1 bg-gray-50 dark:bg-[#1E2020] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-[12px] px-3.5 py-3 text-xs outline-none focus:border-gold uppercase"
                    />
                    <button 
                      onClick={handleApplyCoupon} 
                      className="px-5 py-3 bg-gold text-black text-xs font-black uppercase rounded-[12px] active:scale-95 transition-all shadow-xs"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && <p className="text-primary text-[10px] font-bold mt-0.5">{couponError}</p>}
                </div>
              )}
            </div>
          )}

          {/* 6. MeatCity Loyalty Points & Stamp Card (B2C Only) */}
          {userRole !== 'b2b' && loyaltyEstimate && loyaltyEstimate.isEnabled && (
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-400/30 rounded-[16px] p-4 flex flex-col gap-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">👑</span>
                  <h3 className="text-gray-900 dark:text-white text-xs font-extrabold uppercase tracking-wide">
                    MeatCity Rewards
                  </h3>
                </div>
                <span className="text-[10px] bg-gold/15 text-gold-dark dark:text-gold px-2.5 py-0.5 rounded-full font-black border border-gold/30">
                  {user 
                    ? `Balance: ${loyaltyEstimate.availablePoints} pts (₹${Math.round(loyaltyEstimate.availablePoints * (loyaltyEstimate.pointRupeeValue || 1.0))})` 
                    : 'Guest Balance: 0 pts'}
                </span>
              </div>

              {!user && (
                <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-[10px] flex items-center justify-between">
                  <span>💡 Sign in to redeem existing points & save your stamps!</span>
                  <Link href="/login?redirect=cart" className="text-primary font-black uppercase text-[10px] hover:underline ml-2">
                    Login →
                  </Link>
                </div>
              )}

              {/* Stacking warning */}
              {appliedCoupon && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-[12px] p-2.5 text-[10px] text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>Coupon & Loyalty Points cannot be stacked together. Remove coupon to redeem points.</span>
                </div>
              )}

              {/* Points Redemption */}
              {!appliedCoupon && loyaltyEstimate.maxPointsRedeemable > 0 ? (
                <div className="flex items-center justify-between bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-[12px] p-3">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-900 dark:text-white font-bold">
                      Redeem {loyaltyEstimate.maxPointsRedeemable} points
                    </span>
                    <span className="text-[10px] text-gold font-bold">
                      Get flat ₹{loyaltyEstimate.maxRupeeDiscount} off this order (Max 10% subtotal)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleLoyaltyPoints(!useLoyaltyPoints)}
                    className={`px-3.5 py-1.5 rounded-[10px] text-xs font-black uppercase transition-all ${
                      useLoyaltyPoints
                        ? 'bg-red-600/20 text-red-500 border border-red-500/30'
                        : 'bg-gold text-black shadow-md shadow-gold/20 active:scale-95'
                    }`}
                  >
                    {useLoyaltyPoints ? 'Remove' : 'Apply'}
                  </button>
                </div>
              ) : !appliedCoupon ? (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  {loyaltyEstimate.availablePoints < (loyaltyEstimate.minPointsForRedemption || 50)
                    ? `Minimum ${loyaltyEstimate.minPointsForRedemption || 50} points required to redeem (Current: ${loyaltyEstimate.availablePoints} pts).`
                    : `No points eligible for redemption on this order.`}
                </p>
              ) : null}

              {/* Earn Points Notice */}
              {loyaltyEstimate.estimatedPointsEarned > 0 && (
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-bold pt-1 border-t border-gray-200 dark:border-white/10">
                  <span>✨</span>
                  <span>You'll earn +{loyaltyEstimate.estimatedPointsEarned} points upon successful delivery! (2 pts per ₹100 spend)</span>
                </div>
              )}

              {/* Digital Stamp Card Section */}
              <div className="bg-white/60 dark:bg-black/40 border border-amber-400/20 rounded-[14px] p-3 flex flex-col gap-2.5 mt-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">🍗</span>
                    <span className="text-xs font-black text-gray-900 dark:text-white">MeatCity Stamp Card</span>
                  </div>
                  <span className="text-[9px] font-black uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-400/30">
                    {loyaltyEstimate.stampsCollected || 0} / {loyaltyEstimate.stampsRequired || 10} Stamps
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                  Collect 10 stamps (orders ≥ ₹{loyaltyEstimate.minOrderForStamp || 400}) to unlock 1 Free 250g Chicken Curry Cut!
                </p>

                {/* Stamp visual icons */}
                <div className="grid grid-cols-10 gap-1 pt-1">
                  {Array.from({ length: loyaltyEstimate.stampsRequired || 10 }).map((_, sIdx) => {
                    const isStamped = sIdx < (loyaltyEstimate.stampsCollected || 0);
                    return (
                      <div
                        key={sIdx}
                        className={`aspect-square rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                          isStamped
                            ? 'bg-primary text-white shadow-xs'
                            : 'bg-gray-100 dark:bg-white/10 text-gray-400 border border-dashed border-gray-300 dark:border-white/20'
                        }`}
                        title={`Stamp #${sIdx + 1}`}
                      >
                        {isStamped ? '🍗' : sIdx + 1}
                      </div>
                    );
                  })}
                </div>

                {/* Unlocked Free Chicken Reward Claim */}
                {loyaltyEstimate.activeRewards && loyaltyEstimate.activeRewards.length > 0 && (
                  <div className="mt-2 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 border border-emerald-500/30 rounded-[12px] p-2.5 flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <span>🎉</span> Free 250g Chicken Curry Cut Unlocked!
                      </span>
                      <span className="text-[9px] text-gray-600 dark:text-gray-400 truncate">
                        Voucher: {loyaltyEstimate.activeRewards[0].claim_code}
                      </span>
                    </div>
                    {claimedFreeRewardCode ? (
                      <button
                        type="button"
                        onClick={handleRemoveFreeReward}
                        className="px-2.5 py-1.5 bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 rounded-[8px] text-[10px] font-black uppercase whitespace-nowrap active:scale-95"
                      >
                        ✓ Claimed (Remove)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleClaimFreeReward(loyaltyEstimate.activeRewards[0].claim_code)}
                        className="px-3 py-1.5 bg-gold text-black rounded-[8px] text-[10px] font-black uppercase whitespace-nowrap shadow-sm shadow-gold/20 active:scale-95"
                      >
                        Claim Free Chicken 🎁
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. Bill Details */}
          <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-[16px] p-4 flex flex-col gap-3.5 shadow-xs">
            <h3 className="text-gray-900 dark:text-white text-xs font-black uppercase tracking-wider pb-1 border-b border-gray-100 dark:border-white/10">
              🧾 Bill Breakdown
            </h3>
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>{userRole === 'b2b' ? 'Wholesale Items Total' : 'Items Total'}</span>
                <span className="text-gray-900 dark:text-white font-extrabold">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>Discount ({appliedCoupon?.code})</span>
                  <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              {activeLoyaltyDiscount > 0 && (
                <div className="flex justify-between text-gold font-bold">
                  <span>Loyalty Points ({pointsToRedeem} pts)</span>
                  <span>-₹{activeLoyaltyDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}
              {claimedFreeRewardCode && userRole !== 'b2b' && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>🎁 Free Stamp Reward (250g Chicken)</span>
                  <span className="font-black uppercase">FREE (₹0)</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>{userRole === 'b2b' ? 'Commercial Delivery' : 'Standard Delivery'}</span>
                <span>
                  {deliveryFee === 0 
                    ? <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">FREE</strong> 
                    : `₹${deliveryFee}`
                  }
                </span>
              </div>
              <div className="border-t border-gray-200 dark:border-white/10 border-dashed pt-3 mt-1 flex justify-between items-center">
                <span className="text-gray-900 dark:text-white font-black text-sm uppercase tracking-tight">Payable Grand Total</span>
                <span className="text-gold font-black text-lg">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* FSSAI Certified Trust Badge */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[16px] p-3.5 flex gap-3.5 items-center">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-lg shrink-0">
              🛡️
            </div>
            <div className="flex flex-col text-left text-xs">
              <span className="text-emerald-700 dark:text-emerald-400 font-extrabold text-[9px] uppercase tracking-wide">FSSAI Certified Safety</span>
              <span className="text-gray-900 dark:text-white font-black mt-0.5">Registration: 21525016001365</span>
              <span className="text-[9px] text-gray-500 dark:text-gray-400 font-bold mt-0.5">Quality Assured • Hygienic • Fresh Daily • Safe Pack</span>
            </div>
          </div>
        </div>
      )}

      {/* FIXED BOTTOM CHECKOUT ACTION BAR */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#141414]/95 backdrop-blur-md border-t border-gray-200 dark:border-white/10 py-3.5 px-4 shadow-2xl">
          <div className="max-w-[480px] mx-auto flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-gray-900 dark:text-white text-base font-black">₹{total.toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold mt-0.5 truncate max-w-[160px]">
                {cartItems.reduce((acc, i) => acc + i.quantity, 0)} Items • {userRole === 'b2b' ? 'Wholesale' : 'Retail'}
              </span>
            </div>

            <button 
              onClick={handleCheckout} 
              disabled={
                isProcessingPayment || 
                (userRole === 'b2b' && minB2BOrder > 0 && subtotal < minB2BOrder) || 
                (userRole === 'b2c' && minB2COrder > 0 && subtotal < minB2COrder) ||
                (userRole === 'b2b' && paymentMethod === 'Credit' && isCreditBlocked)
              }
              className="flex-1 max-w-[260px] py-3.5 bg-primary hover:bg-[#B80000] active:scale-[0.98] disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-[14px] shadow-lg shadow-primary/20 transition-all text-center"
            >
              {isProcessingPayment 
                ? 'Processing Securely...' 
                : userRole === 'guest' 
                  ? 'Login to Checkout' 
                  : userRole === 'b2b' && minB2BOrder > 0 && subtotal < minB2BOrder
                    ? `Min Wholesale Order ₹${minB2BOrder.toLocaleString('en-IN')}`
                    : userRole === 'b2c' && minB2COrder > 0 && subtotal < minB2COrder
                      ? `Min Order ₹${minB2COrder.toLocaleString('en-IN')}`
                      : userRole === 'b2b' && paymentMethod === 'Credit' && isCreditBlocked
                        ? 'Credit Clearance Required'
                        : `Proceed to Pay • ₹${total.toLocaleString('en-IN')}`
              }
            </button>
          </div>
        </div>
      )}

      {/* REPAYMENT PAYMENT SUCCESS MODAL */}
      {paymentSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-[16px] p-6 text-center flex flex-col items-center justify-center gap-4 max-w-[380px] w-full shadow-2xl">
            <div className="text-5xl animate-bounce">⏳</div>
            <h3 className="text-gold text-lg font-black tracking-tight">Payment Submitted</h3>
            <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed">
              Your repayment of <strong>₹{onlinePayAmount.toLocaleString('en-IN')}</strong> has been registered and is pending administrator review. Available credit will update once approved.
            </p>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-[12px] w-full text-left">
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-extrabold block">Outstanding</span>
                <strong className="text-gray-900 dark:text-white text-base font-extrabold">₹{(userProfile?.outstanding_balance || 0).toLocaleString('en-IN')}</strong>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-extrabold block">Available Credit</span>
                <strong className="text-emerald-500 text-base font-extrabold">₹{(userProfile?.credit_available || 0).toLocaleString('en-IN')}</strong>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => {
                setPaymentSuccess(false);
                setShowOnlinePaymentModal(false);
              }} 
              className="w-full mt-2 py-3 bg-primary text-white font-extrabold text-xs uppercase rounded-[12px] shadow-lg transition-transform active:scale-[0.98]"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* B2B ONLINE CREDIT REPAYMENT MODAL */}
      {showOnlinePaymentModal && userProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-[16px] p-5 flex flex-col gap-4 max-w-[400px] w-full shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-white/10">
              <span className="font-extrabold text-gray-900 dark:text-white text-sm">💳 Pay Outstanding Online</span>
              <button 
                type="button"
                onClick={() => setShowOnlinePaymentModal(false)}
                className="text-gold text-xs font-bold uppercase hover:underline"
              >
                ✕ Close
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-extrabold">Select Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['UPI', 'Razorpay', 'NetBanking', 'Card'] as const).map(method => (
                    <button 
                      key={method}
                      type="button"
                      onClick={() => setOnlinePaymentMethod(method)}
                      className={`p-3 rounded-[12px] text-xs font-extrabold text-center border transition-all ${
                        onlinePaymentMethod === method 
                          ? 'bg-gold/15 border-gold text-gold ring-1 ring-gold/30' 
                          : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-800 dark:text-white'
                      }`}
                    >
                      {method === 'UPI' && '📱 UPI'}
                      {method === 'Razorpay' && '💳 Razorpay'}
                      {method === 'NetBanking' && '🏦 Net Banking'}
                      {method === 'Card' && '🎴 Card'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-extrabold">Payment Amount (₹)</label>
                <div className="flex flex-wrap gap-2 mb-1">
                  {[5000, 10000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setOnlinePayAmount(amt)}
                      className="px-2.5 py-1.5 bg-gray-100 dark:bg-neutral-800 text-[10px] font-bold rounded-[8px] text-gray-800 dark:text-white border border-gray-200 dark:border-white/10"
                      disabled={amt > (userProfile.outstanding_balance || 0)}
                    >
                      ₹{amt.toLocaleString('en-IN')}
                    </button>
                  ))}
                  <button
                    key="full"
                    type="button"
                    onClick={() => setOnlinePayAmount(userProfile.outstanding_balance || 0)}
                    className="px-2.5 py-1.5 bg-primary/10 text-primary border border-primary/30 text-[10px] font-bold rounded-[8px]"
                  >
                    Pay Full (₹{(userProfile.outstanding_balance || 0).toLocaleString('en-IN')})
                  </button>
                </div>

                <input 
                  type="number" 
                  placeholder="Enter custom amount"
                  value={onlinePayAmount || ''}
                  onChange={e => setOnlinePayAmount(Math.min(userProfile.outstanding_balance || 0, Math.max(0, Number(e.target.value))))}
                  className="w-full bg-gray-50 dark:bg-[#1E2020] border border-gray-200 dark:border-white/10 rounded-[12px] px-4 py-3 text-gray-900 dark:text-white text-xs outline-none focus:border-gold"
                />
              </div>

              <button
                type="button"
                onClick={() => handleOnlineCreditPayment(onlinePayAmount)}
                disabled={isProcessingPayment || onlinePayAmount <= 0}
                className="w-full py-3.5 bg-primary hover:bg-[#B80000] text-white font-extrabold text-xs uppercase rounded-[12px] shadow-lg disabled:opacity-50 transition-all active:scale-[0.98] mt-1"
              >
                {isProcessingPayment ? 'Processing Online Payment...' : `Confirm & Pay ₹${onlinePayAmount.toLocaleString('en-IN')}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B2B UPI REPAYMENT MODAL */}
      {showUpiRepayModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-[16px] p-5 flex flex-col gap-4 max-w-[380px] w-full text-center shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-white/10 text-left">
              <span className="font-extrabold text-gray-900 dark:text-white text-sm">📱 UPI Dynamic Pay</span>
              {!isSubmittingRepayUpi && (
                <button 
                  type="button"
                  onClick={() => setShowUpiRepayModal(false)}
                  className="text-gray-500 hover:text-gray-900 dark:hover:text-white font-bold text-xs"
                >
                  ✕ Close
                </button>
              )}
            </div>

            {repayUpiSuccess ? (
              <div className="flex flex-col items-center gap-4 py-4 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 text-3xl animate-bounce">
                  ✓
                </div>
                <div>
                  <h4 className="text-gray-900 dark:text-white text-base font-extrabold">Repayment Submitted!</h4>
                  <p className="text-gray-500 dark:text-gray-400 text-[11px] mt-1 max-w-[240px] mx-auto leading-relaxed">
                    Your repayment of <strong>₹{onlinePayAmount.toLocaleString('en-IN')}</strong> has been submitted successfully and is pending administrator approval.
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setShowUpiRepayModal(false);
                    setRepayUpiSuccess(false);
                  }} 
                  className="w-full mt-2 py-3 bg-emerald-600 text-white font-bold text-xs uppercase rounded-[12px] active:scale-95 transition-all shadow-md"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-gray-600 dark:text-gray-300 text-[11px] leading-relaxed text-left">
                  Scan the dynamic QR code below using any UPI app (GPay, PhonePe, Paytm, BHIM) to clear ₹{onlinePayAmount.toLocaleString('en-IN')} of your outstanding dues:
                </p>

                <div className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[12px] flex flex-col items-center gap-2">
                  <div className="w-[140px] h-[140px] border border-gray-200 dark:border-white/10 rounded-[8px] p-2 bg-white flex justify-center items-center shadow-xs">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`upi://pay?pa=meatcity@ybl&pn=Meat%20City&am=${onlinePayAmount}&cu=INR&tn=B2B%20Payment&tr=${repayUpiTxRef}`)}`} 
                      alt="Meat City Dynamic Repayment QR" 
                      className="w-full h-full object-contain" 
                    />
                  </div>
                  <div className="text-center">
                    <span className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold block">UPI ID (Meat City Store)</span>
                    <strong className="text-gray-900 dark:text-white text-xs font-black">meatcity@ybl</strong>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-extrabold">Transaction Reference ID / UTR</label>
                  <input 
                    type="text" 
                    required
                    value={repayUpiUtrInput}
                    onChange={e => setRepayUpiUtrInput(e.target.value)}
                    placeholder="12-digit reference number"
                    className="bg-gray-50 dark:bg-[#1E2020] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-[12px] p-3 text-xs outline-none focus:border-gold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button 
                    type="button"
                    onClick={() => setShowUpiRepayModal(false)}
                    disabled={isSubmittingRepayUpi}
                    className="py-2.5 bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white font-bold text-xs rounded-[10px] border border-gray-200 dark:border-white/10 active:scale-95"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={() => submitCartUpiRepayment(onlinePayAmount)}
                    disabled={isSubmittingRepayUpi || !repayUpiUtrInput}
                    className="py-2.5 bg-primary hover:bg-[#B80000] disabled:opacity-40 text-white font-black text-xs rounded-[10px] active:scale-95 shadow-md"
                  >
                    {isSubmittingRepayUpi ? 'Submitting...' : 'I Have Paid'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* B2B CASH COLLECTION REQUEST MODAL */}
      {showCashCollectionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-[16px] p-5 flex flex-col gap-4 max-w-[400px] w-full shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-white/10">
              <span className="font-extrabold text-gray-900 dark:text-white text-sm">🛵 Request Cash Collection</span>
              <button 
                type="button"
                onClick={() => {
                  setShowCashCollectionModal(false);
                  setCashRequestSuccess(false);
                }}
                className="text-gold text-xs font-bold uppercase hover:underline"
              >
                ✕ Close
              </button>
            </div>

            {cashRequestSuccess ? (
              <div className="text-center py-4 flex flex-col items-center gap-3">
                <div className="text-5xl">📥</div>
                <h4 className="font-black text-gold text-sm uppercase tracking-wide">Request Submitted</h4>
                <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed max-w-[280px]">
                  Your cash collection request of <strong>₹{cashRequestAmount.toLocaleString('en-IN')}</strong> has been registered. The Turbhe branch manager will dispatch an agent.
                </p>
                <button 
                  type="button"
                  onClick={() => {
                    setShowCashCollectionModal(false);
                    setCashRequestSuccess(false);
                  }} 
                  className="w-full mt-2 py-3 bg-gray-900 dark:bg-white/10 text-white font-bold text-xs rounded-[12px] border border-gray-700 dark:border-white/10 active:scale-95"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleRequestCashCollection} className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-extrabold">Preferred Date</label>
                    <input 
                      type="date" 
                      required
                      value={cashRequestDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setCashRequestDate(e.target.value)}
                      className="bg-gray-50 dark:bg-[#1E2020] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-[12px] p-2.5 text-xs outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-extrabold">Amount (₹)</label>
                    <input 
                      type="number" 
                      required
                      value={cashRequestAmount || ''}
                      min={1}
                      max={userProfile?.outstanding_balance || 50000}
                      onChange={e => setCashRequestAmount(Math.min(userProfile?.outstanding_balance || 50000, Math.max(0, Number(e.target.value))))}
                      placeholder="Amount to collect"
                      className="bg-gray-50 dark:bg-[#1E2020] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-[12px] p-2.5 text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-extrabold">Instructions for Agent</label>
                  <textarea 
                    required
                    value={cashRequestRemarks}
                    onChange={e => setCashRequestRemarks(e.target.value)}
                    placeholder="e.g. Please collect cash after 3 PM. Call before arriving."
                    className="bg-gray-50 dark:bg-[#1E2020] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-[12px] p-2.5 text-xs outline-none min-h-[60px]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isProcessingPayment || cashRequestAmount <= 0}
                  className="w-full py-3 bg-primary text-white font-extrabold text-xs uppercase rounded-[12px] shadow-lg disabled:opacity-50 transition-all active:scale-[0.98] mt-1"
                >
                  {isProcessingPayment ? 'Submitting Request...' : `Submit Collection Request (₹${cashRequestAmount.toLocaleString('en-IN')})`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* B2B STATEMENT / LEDGER MODAL */}
      {showLedgerModal && userProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-[16px] p-5 flex flex-col gap-4 max-w-[420px] w-full shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-white/10">
              <span className="font-extrabold text-gray-900 dark:text-white text-sm">📋 B2B Account Statement</span>
              <button 
                type="button"
                onClick={() => setShowLedgerModal(false)}
                className="text-gold text-xs font-bold uppercase hover:underline"
              >
                ✕ Close
              </button>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto flex flex-col gap-2.5 pr-1">
              {userProfile.ledger && userProfile.ledger.map((entry: any, idx: number) => (
                <div key={idx} className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 rounded-[12px] flex flex-col gap-1.5">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">{new Date(entry.date).toLocaleDateString()}</span>
                    <span className="text-gray-900 dark:text-white font-extrabold text-xs">Bal: ₹{entry.balance}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-gray-800 dark:text-white font-bold text-xs">{entry.description}</span>
                    {entry.debit > 0 ? (
                      <span className="text-primary font-black text-xs">Dr: +₹{entry.debit}</span>
                    ) : entry.credit > 0 ? (
                      <span className="text-emerald-500 font-black text-xs">Cr: -₹{entry.credit}</span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </div>
                </div>
              ))}
              {(!userProfile.ledger || userProfile.ledger.length === 0) && (
                <div className="text-center py-6 text-xs text-gray-500 font-bold">No statement records yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT UPI PAYMENT MODAL */}
      {showUpiPaymentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 p-5 rounded-[16px] w-full max-w-[380px] flex flex-col gap-4 shadow-2xl">
            <h3 className="text-gold text-sm font-black uppercase tracking-wide flex items-center gap-1.5">
              <span>📱</span> UPI Verification
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-[11px] leading-relaxed">
              Please scan the QR code below or transfer <strong>₹{total.toLocaleString('en-IN')}</strong> directly to our store UPI handle. Enter the transaction Reference/UTR number after payment.
            </p>
            
            <div className="flex flex-col items-center gap-2.5 p-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-[12px]">
              <div className="w-[140px] h-[140px] border border-gray-200 dark:border-white/10 rounded-[8px] p-2 bg-white flex justify-center items-center shadow-xs">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`upi://pay?pa=meatcity@ybl&pn=Meat%20City&am=${total}&cu=INR`)}`} 
                  alt="Meat City Dynamic UPI QR" 
                  className="w-full h-full object-contain" 
                />
              </div>
              <div className="text-center">
                <span className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold block">UPI ID (Store Handle)</span>
                <strong className="text-gray-900 dark:text-white text-xs font-black">meatcity@ybl</strong>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-extrabold">Transaction Reference ID / UTR</label>
              <input 
                type="text" 
                required
                value={upiTxRef}
                onChange={e => setUpiTxRef(e.target.value)}
                placeholder="12-digit reference number"
                className="bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-white/5 text-gray-900 dark:text-white rounded-[12px] p-3 text-xs outline-none focus:border-gold"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-extrabold">Payment Screenshot (Optional)</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    setUpiScreenshot(e.target.files[0].name);
                  }
                }}
                className="bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-white/5 text-gray-900 dark:text-white rounded-[12px] p-2 text-xs outline-none"
              />
              {upiScreenshot && <span className="text-[10px] text-emerald-500 font-bold">✓ {upiScreenshot} selected</span>}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <button 
                type="button"
                onClick={() => setShowUpiPaymentModal(false)}
                className="py-2.5 bg-gray-100 dark:bg-[#1E2020] text-gray-800 dark:text-white font-bold text-xs rounded-[10px] border border-gray-200 dark:border-white/5 active:scale-95"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={() => {
                  if (!upiTxRef) {
                    alert('Please enter your transaction reference ID.');
                    return;
                  }
                  completeOrderWithPayment('Pending Verification', upiTxRef);
                }}
                disabled={!upiTxRef}
                className="py-2.5 bg-primary hover:bg-[#B80000] disabled:opacity-40 disabled:pointer-events-none text-white font-black text-xs rounded-[10px] active:scale-95 shadow-md"
              >
                I Have Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT RAZORPAY TEST MODE MODAL */}
      {showRazorpayModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-[16px] w-full max-w-[380px] overflow-hidden flex flex-col shadow-2xl">
            <div className="bg-gray-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-white/5 px-4 py-3 flex justify-between items-center">
              <span className="font-extrabold text-gray-900 dark:text-white text-xs">Razorpay Secure Checkout</span>
              <span className="text-[8px] bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                Test Mode
              </span>
            </div>
            
            <div className="p-4 flex flex-col gap-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 dark:text-gray-400">Merchant</span>
                <strong className="text-gray-900 dark:text-white">Meat City Navi Mumbai</strong>
              </div>
              <div className="flex justify-between items-center text-xs pb-3 border-b border-gray-200 dark:border-white/5">
                <span className="text-gray-500 dark:text-gray-400 font-bold">Amount Due</span>
                <strong className="text-gold text-base">₹{total.toLocaleString('en-IN')}</strong>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-extrabold">Dummy Card Number</label>
                <input 
                  type="text" 
                  maxLength={16}
                  value={razorpayCard.number}
                  onChange={e => setRazorpayCard({...razorpayCard, number: e.target.value})}
                  placeholder="4111 1111 1111 1111" 
                  className="bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-white/5 text-gray-900 dark:text-white rounded-[12px] p-3 text-xs outline-none focus:border-gold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-extrabold">Expiry Date</label>
                  <input 
                    type="text" 
                    maxLength={5}
                    value={razorpayCard.expiry}
                    onChange={e => setRazorpayCard({...razorpayCard, expiry: e.target.value})}
                    placeholder="MM/YY" 
                    className="bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-white/5 text-gray-900 dark:text-white rounded-[12px] p-3 text-xs outline-none focus:border-gold"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-extrabold">CVV</label>
                  <input 
                    type="password" 
                    maxLength={3}
                    value={razorpayCard.cvv}
                    onChange={e => setRazorpayCard({...razorpayCard, cvv: e.target.value})}
                    placeholder="123" 
                    className="bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-white/5 text-gray-900 dark:text-white rounded-[12px] p-3 text-xs outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <button 
                  type="button"
                  onClick={() => {
                    if (reservationId) {
                      fetch('/api/loyalty/release', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reservationId })
                      }).catch(console.warn);
                      setReservationId(null);
                    }
                    setShowRazorpayModal(false);
                  }}
                  disabled={isProcessingPayment}
                  className="py-2.5 bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-white font-bold text-xs rounded-[10px] border border-gray-200 dark:border-white/5 active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={async () => {
                    setIsProcessingPayment(true);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const mockPaymentId = 'pay_mock_' + Math.random().toString(36).substr(2, 9);
                    await completeRazorpayVerification(
                      mockPaymentId,
                      razorpayOrderId,
                      'mock_signature_val',
                      pendingOrderPayload
                    );
                  }}
                  disabled={isProcessingPayment}
                  className="py-2.5 bg-[#16a34a] hover:bg-green-700 text-white font-black text-xs rounded-[10px] active:scale-95 shadow-md"
                >
                  {isProcessingPayment ? 'Authorizing...' : `Pay ₹${total.toLocaleString('en-IN')}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
