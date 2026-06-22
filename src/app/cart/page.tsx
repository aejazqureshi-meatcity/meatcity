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

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'UPI' | 'Razorpay' | 'Credit' | 'BankTransfer' | 'CashCollection'>('COD');
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
          finalRole = currentUser.user_metadata?.user_type || 'b2c';
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
        }
      } catch (settingsErr) {
        console.warn('Failed to load admin settings:', settingsErr);
      }

      // 5. Load Addresses
      const addrKey = currentUser ? `meatcity_addresses_${currentUser.id}` : 'meatcity_addresses_guest';
      const savedAddresses = localStorage.getItem(addrKey);
      if (savedAddresses) {
        try {
          const parsed = JSON.parse(savedAddresses);
          setAddresses(parsed);
          if (parsed.length > 0) {
            setSelectedAddressId(parsed[0].id);
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

    const code = couponCode.toUpperCase();
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

  // Cart calculations
  const cartItems = Object.entries(cart).map(([cartKey, qty]) => {
    const parts = cartKey.split('_');
    const id = parts[0];
    const variantWeight = parts[1];

    const prod = products.find(p => p.id === id);
    let price = 0;
    let displayName = prod?.name || '';

    if (prod) {
      price = userRole === 'b2b' ? prod.price_b2b : prod.price_b2c;
      if (variantWeight && prod.variants) {
        const variantsList = typeof prod.variants === 'string' ? JSON.parse(prod.variants) : prod.variants;
        const variant = variantsList?.find((v: any) => v.weight === variantWeight);
        if (variant) {
          price = userRole === 'b2b' ? Number(variant.price_b2b) : Number(variant.price_b2c);
          displayName = `${prod.name} (${variantWeight})`;
        }
      }
    }

    return {
      cartKey,
      productId: id,
      variantWeight,
      product: prod ? { ...prod, name: displayName } : undefined,
      quantity: qty,
      price
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
      return 0;
    }
    const activeAddress = addresses.find(a => a.id === selectedAddressId);
    if (!activeAddress || activeAddress.addressLine === 'Store Pickup') {
      return 0;
    }
    if (subtotal >= freeDeliveryAbove) {
      return 0;
    }
    const activePincode = activeAddress.pincode || (activeAddress.addressLine.match(/\b\d{6}\b/)?.[0]) || '';
    if (activePincode && pincodeCharges[activePincode] !== undefined) {
      return pincodeCharges[activePincode];
    }
    return defaultDeliveryFee;
  };

  const deliveryFee = getDynamicDeliveryFee();
  const total = Math.max(0, subtotal - discountAmount + deliveryFee);

  // Credit limits checks
  const isCreditLimitExceeded = userRole === 'b2b' && 
    ((userProfile?.outstanding_balance || 0) >= (userProfile?.credit_limit || 50000) || (userProfile?.credit_available || 0) <= 0);

  const isCreditInsufficient = userRole === 'b2b' && !isCreditLimitExceeded && (userProfile?.credit_available || 0) < total;
  const showCreditDuesScreen = userRole === 'b2b' && (isCreditLimitExceeded || isCreditInsufficient);
  const isCreditBlocked = userRole === 'b2b' && (isCreditLimitExceeded || (userProfile?.credit_available || 0) < total);

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

    const { data: freshProfile } = await supabase.from('users').select('*').eq('id', freshUser.id).single();
    const activeAddress = addresses.find(a => a.id === selectedAddressId);
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const activeRole = freshProfile?.user_type || freshUser.user_metadata?.user_type || userRole;

    if (activeRole === 'b2b' && paymentMethod === 'Credit') {
      const outstandingBalance = (freshProfile?.outstanding_balance || 0) + total;
      const creditUsed = (freshProfile?.credit_used || 0) + total;
      const creditAvailable = (freshProfile?.credit_available || 0) - total;
      
      const ledgerEntry = {
        date: new Date().toISOString(),
        description: `Order #${orderId}`,
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
    }

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
      items: cartItems.map(item => ({
        product_id: item.productId,
        name: item.product?.name,
        product_name: item.product?.name || '',
        quantity: item.quantity,
        qty: item.quantity,
        price: item.price,
        unit_price: item.price,
        total: item.price * item.quantity
      }))
    };

    // Filter database payload to avoid PostgREST column schema mismatch errors
    const dbOrderPayload = {
      id: orderPayload.id,
      user_id: orderPayload.user_id,
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
      coupon_discount: orderPayload.coupon_discount
    };

    const { error } = await supabase.from('orders').insert(dbOrderPayload);
    setIsProcessingPayment(false);

    if (error) {
      alert('Failed to place order: ' + error.message);
      return;
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

    // Validate serviceable pincode
    const activeAddress = addresses.find(a => a.id === selectedAddressId);
    if (activeAddress && activeAddress.addressLine !== 'Store Pickup') {
      const activePincode = activeAddress.pincode || (activeAddress.addressLine.match(/\b\d{6}\b/)?.[0]) || '';
      if (!serviceablePincodes.includes(activePincode)) {
        alert('Sorry! Delivery is currently unavailable in your area. We are expanding soon and will serve your location shortly.');
        return;
      }
    }

    if (userRole === 'b2b') {
      if (isCreditLimitExceeded) {
        alert('Credit limit exceeded. Please clear outstanding balance before placing a new order.');
        return;
      }

      if (paymentMethod === 'Credit') {
        const availableCredit = userProfile?.credit_available || 0;
        if (total > availableCredit) {
          alert(`Your available credit is ₹${availableCredit}. Please clear pending balance or contact admin.`);
          return;
        }
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

    const defaultPayStatus = (paymentMethod === 'COD' || paymentMethod === 'Credit' || paymentMethod === 'CashCollection') ? 'Pending' : 'Paid';
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

  const renderCreditDuesScreen = () => {
    if (!userProfile) return null;

    const outstanding = userProfile.outstanding_balance || 0;
    const limit = userProfile.credit_limit || 50000;
    const available = userProfile.credit_available || 0;
    const minPaymentNeeded = Math.max(0, total - available);

    if (paymentSuccess) {
      return (
        <div className="bg-[#111111] border border-white/5 rounded-[16px] p-6 text-center flex flex-col items-center justify-center gap-4">
          <div className="text-5xl animate-bounce">⏳</div>
          <h3 className="text-gold text-lg font-black tracking-tight">Payment Submitted</h3>
          <p className="text-text-secondary text-xs leading-relaxed max-w-[280px]">
            Your repayment of <strong>₹{onlinePayAmount}</strong> has been registered and is pending administrator review. Available credit will update once approved.
          </p>
          <div className="grid grid-cols-2 gap-4 bg-white/5 border border-white/5 p-4 rounded-[12px] w-full text-left mt-2">
            <div>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold block">Outstanding</span>
              <strong className="text-white text-base font-extrabold">₹{outstanding}</strong>
            </div>
            <div>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold block">Available Credit</span>
              <strong className="text-emerald-400 text-base font-extrabold">₹{available}</strong>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => {
              setPaymentSuccess(false);
              setShowOnlinePaymentModal(false);
            }} 
            className="w-full mt-4 py-3.5 bg-primary text-white font-extrabold text-sm uppercase rounded-[12px] shadow-lg transition-transform active:scale-[0.98]"
          >
            Got It
          </button>
        </div>
      );
    }

    if (showOnlinePaymentModal) {
      return (
        <div className="bg-[#111111] border border-white/5 rounded-[16px] p-5 flex flex-col gap-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <span className="font-extrabold text-white text-sm">💳 Pay Outstanding Online</span>
            <button 
              type="button"
              onClick={() => setShowOnlinePaymentModal(false)}
              className="text-gold text-xs font-bold uppercase hover:underline"
            >
              ← Back
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Select Method</label>
              <div className="grid grid-cols-2 gap-2">
                {(['UPI', 'Razorpay', 'NetBanking', 'Card'] as const).map(method => (
                  <button 
                    key={method}
                    type="button"
                    onClick={() => setOnlinePaymentMethod(method)}
                    className={`p-3 rounded-[12px] text-xs font-extrabold text-center border transition-all ${
                      onlinePaymentMethod === method 
                        ? 'bg-gold/15 border-gold text-gold' 
                        : 'bg-white/5 border-white/5 text-white'
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
              <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Payment Amount (₹)</label>
              <div className="flex flex-wrap gap-2 mb-1">
                {[5000, 10000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setOnlinePayAmount(amt)}
                    className="px-2.5 py-1.5 bg-neutral-800 text-[10px] font-bold rounded-[8px] text-white border border-white/5"
                    disabled={amt > outstanding}
                  >
                    ₹{amt.toLocaleString()}
                  </button>
                ))}
                {minPaymentNeeded > 0 && minPaymentNeeded !== outstanding && (
                  <button
                    key="needed"
                    type="button"
                    onClick={() => setOnlinePayAmount(minPaymentNeeded)}
                    className="px-2.5 py-1.5 bg-gold/15 text-gold border border-gold/30 text-[10px] font-bold rounded-[8px]"
                  >
                    Pay Needed (₹{minPaymentNeeded})
                  </button>
                )}
                <button
                  key="full"
                  type="button"
                  onClick={() => setOnlinePayAmount(outstanding)}
                  className="px-2.5 py-1.5 bg-primary/15 text-primary border border-primary/30 text-[10px] font-bold rounded-[8px]"
                >
                  Pay Full (₹{outstanding})
                </button>
              </div>

              <input 
                type="number" 
                placeholder="Enter custom amount"
                value={onlinePayAmount || ''}
                onChange={e => setOnlinePayAmount(Math.min(outstanding, Math.max(0, Number(e.target.value))))}
                className="w-full bg-[#1E2020] border border-white/5 rounded-[12px] px-4 py-3 text-white text-xs outline-none focus:border-gold/50"
              />
            </div>

            <button
              type="button"
              onClick={() => handleOnlineCreditPayment(onlinePayAmount)}
              disabled={isProcessingPayment || onlinePayAmount <= 0}
              className="w-full py-3.5 bg-primary text-white font-extrabold text-sm uppercase rounded-[12px] shadow-lg disabled:opacity-50 transition-all active:scale-[0.98] mt-2"
            >
              {isProcessingPayment ? 'Processing Online Payment...' : `Confirm & Pay ₹${onlinePayAmount}`}
            </button>
          </div>
        </div>
      );
    }

    if (showUpiRepayModal) {
      const upiUrl = `upi://pay?pa=meatcity@ybl&pn=Meat%20City&am=${onlinePayAmount}&cu=INR&tn=B2B%20Payment&tr=${repayUpiTxRef}`;
      return (
        <div className="bg-[#111111] border border-white/5 rounded-[16px] p-5 flex flex-col gap-4 text-center">
          <div className="flex justify-between items-center pb-2 border-b border-white/5 text-left">
            <span className="font-extrabold text-white text-sm">📱 UPI Dynamic Pay</span>
            {!isSubmittingRepayUpi && (
              <button 
                type="button"
                onClick={() => setShowUpiRepayModal(false)}
                className="text-text-secondary hover:text-white font-bold text-xs"
              >
                ✕ Close
              </button>
            )}
          </div>

          {repayUpiSuccess ? (
            <div className="flex flex-col items-center gap-4 py-4 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-3xl animate-bounce">
                ✓
              </div>
              <div>
                <h4 className="text-white text-base font-extrabold">Repayment Submitted!</h4>
                <p className="text-text-secondary text-[11px] mt-1 max-w-[240px] mx-auto leading-relaxed">
                  Your repayment of <strong>₹{onlinePayAmount}</strong> has been submitted successfully and is pending administrator approval.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowUpiRepayModal(false);
                  setRepayUpiSuccess(false);
                }} 
                className="w-full mt-2 py-3 bg-emerald-500 text-white font-bold text-xs uppercase rounded-[12px] active:scale-95 transition-all shadow-md"
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
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiUrl)}`} 
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
                  <strong className="text-gold font-extrabold">₹{onlinePayAmount}</strong>
                </div>
                <div>
                  <span className="text-[9px] text-text-secondary uppercase font-bold block">Transaction Ref</span>
                  <strong className="text-white font-extrabold text-[10px] truncate block max-w-[120px]">{repayUpiTxRef}</strong>
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
                  value={repayUpiUtrInput}
                  onChange={e => setRepayUpiUtrInput(e.target.value)}
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
                      setRepayUpiScreenshot(e.target.files[0].name);
                    }
                  }}
                  className="bg-neutral-800 border border-white/5 text-white rounded-[12px] p-2 text-xs outline-none"
                />
                {repayUpiScreenshot && <span className="text-[10px] text-emerald-400 font-bold block mt-1">✓ {repayUpiScreenshot} selected</span>}
              </div>

              {/* Submission and Cancel Buttons */}
              <div className="grid grid-cols-2 gap-3 mt-1.5">
                <button 
                  type="button"
                  onClick={() => setShowUpiRepayModal(false)}
                  disabled={isSubmittingRepayUpi}
                  className="py-2.5 bg-neutral-850 text-white font-bold text-xs rounded-[12px] border border-white/5 active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={() => submitCartUpiRepayment(onlinePayAmount)}
                  disabled={isSubmittingRepayUpi || !repayUpiUtrInput}
                  className="py-2.5 bg-primary hover:bg-red-700 disabled:opacity-40 disabled:pointer-events-none text-white font-black text-xs rounded-[12px] active:scale-95 shadow-md"
                >
                  {isSubmittingRepayUpi ? 'Submitting...' : 'I Have Paid'}
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (showCashCollectionModal) {
      return (
        <div className="bg-[#111111] border border-white/5 rounded-[16px] p-5 flex flex-col gap-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <span className="font-extrabold text-white text-sm">🛵 Request Cash Collection</span>
            <button 
              type="button"
              onClick={() => {
                setShowCashCollectionModal(false);
                setCashRequestSuccess(false);
              }}
              className="text-gold text-xs font-bold uppercase hover:underline"
            >
              ← Back
            </button>
          </div>

          {cashRequestSuccess ? (
            <div className="text-center py-4 flex flex-col items-center gap-3">
              <div className="text-5xl">📥</div>
              <h4 className="font-black text-gold text-sm uppercase tracking-wide">Request Submitted</h4>
              <p className="text-text-secondary text-[11px] leading-relaxed max-w-[280px]">
                Your cash collection request of <strong>₹{cashRequestAmount}</strong> has been registered. The Turbhe branch admin has been notified. Your order remains blocked until this payment is approved.
              </p>
              <button 
                type="button"
                onClick={() => {
                  setShowCashCollectionModal(false);
                  setCashRequestSuccess(false);
                }} 
                className="w-full mt-2 py-3 bg-neutral-800 text-white font-bold text-xs rounded-[12px] border border-white/5 active:scale-95"
              >
                Return to Credit Screen
              </button>
            </div>
          ) : (
            <form onSubmit={handleRequestCashCollection} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Preferred Date</label>
                  <input 
                    type="date" 
                    required
                    value={cashRequestDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setCashRequestDate(e.target.value)}
                    className="bg-neutral-800 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Request Amount</label>
                  <input 
                    type="number" 
                    required
                    value={cashRequestAmount || ''}
                    min={1}
                    max={outstanding}
                    onChange={e => setCashRequestAmount(Math.min(outstanding, Math.max(0, Number(e.target.value))))}
                    placeholder="Amount to collect"
                    className="bg-neutral-800 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                {minPaymentNeeded > 0 && (
                  <button
                    type="button"
                    onClick={() => setCashRequestAmount(minPaymentNeeded)}
                    className="px-2.5 py-1.5 bg-gold/15 text-gold border border-gold/30 text-[10px] font-bold rounded-[8px]"
                  >
                    Pay Needed (₹{minPaymentNeeded})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCashRequestAmount(outstanding)}
                  className="px-2.5 py-1.5 bg-neutral-800 text-[10px] font-bold rounded-[8px] text-white border border-white/5"
                >
                  Pay Full (₹{outstanding})
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Instructions for Agent</label>
                <textarea 
                  required
                  value={cashRequestRemarks}
                  onChange={e => setCashRequestRemarks(e.target.value)}
                  placeholder="e.g. Please collect cash after 3 PM. Call before arriving."
                  className="bg-neutral-800 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none min-h-[70px]"
                />
              </div>

              <button
                type="submit"
                disabled={isProcessingPayment || cashRequestAmount <= 0}
                className="w-full py-3.5 bg-primary text-white font-extrabold text-sm uppercase rounded-[12px] shadow-lg disabled:opacity-50 transition-all active:scale-[0.98] mt-2"
              >
                {isProcessingPayment ? 'Submitting Request...' : `Submit Collection Request`}
              </button>
            </form>
          )}
        </div>
      );
    }

    if (showLedgerModal) {
      return (
        <div className="bg-[#111111] border border-white/5 rounded-[16px] p-5 flex flex-col gap-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <span className="font-extrabold text-white text-sm">📋 Account Statement</span>
            <button 
              type="button"
              onClick={() => setShowLedgerModal(false)}
              className="text-gold text-xs font-bold uppercase hover:underline"
            >
              ← Back
            </button>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto flex flex-col gap-3 pr-1">
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
              <div className="text-center py-6 text-xs text-text-secondary font-bold">No statement records yet.</div>
            )}
          </div>
        </div>
      );
    }

    if (isCreditLimitExceeded) {
      return (
        <div className="bg-[#111111] border-l-4 border-primary border border-white/5 rounded-[16px] p-5 flex flex-col gap-4">
          <div className="flex gap-3 items-center">
            <span className="text-3xl">⚠️</span>
            <div>
              <h3 className="text-white text-base font-extrabold tracking-tight">Credit Limit Reached</h3>
              <p className="text-text-secondary text-[11px] leading-relaxed mt-0.5">
                Please clear outstanding balance before placing a new order.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-white/5 border border-white/5 p-4 rounded-[12px] mt-1">
            <div>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold block">Outstanding</span>
              <strong className="text-primary text-base font-extrabold">₹{outstanding}</strong>
            </div>
            <div>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold block">Available Credit</span>
              <strong className="text-text-secondary text-base font-extrabold">₹{available}</strong>
            </div>
            <div className="col-span-2 pt-2 border-t border-white/5 text-[10px] font-bold text-text-secondary">
              Total Credit Limit: <strong className="text-white">₹{limit}</strong>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 mt-2">
            <button 
              type="button"
              onClick={() => {
                setOnlinePayAmount(outstanding);
                setShowOnlinePaymentModal(true);
              }} 
              className="w-full py-3 bg-gold hover:bg-yellow-600 text-black text-xs font-extrabold rounded-[12px] transition-all duration-200 active:scale-95 shadow-md"
            >
              💳 Pay Outstanding Online
            </button>
            <button 
              type="button"
              onClick={() => {
                setCashRequestAmount(outstanding);
                setShowCashCollectionModal(true);
              }} 
              className="w-full py-3 bg-primary hover:bg-red-700 text-white text-xs font-extrabold rounded-[12px] transition-all duration-200 active:scale-95 shadow-md"
            >
              🛵 Request Cash Collection
            </button>
            <button 
              type="button"
              onClick={() => setShowLedgerModal(true)} 
              className="w-full py-3 bg-neutral-800 text-white text-xs font-extrabold rounded-[12px] border border-white/5 transition-all duration-200 active:scale-95"
            >
              📄 View Account Statement
            </button>
          </div>
        </div>
      );
    }

    if (isCreditInsufficient) {
      return (
        <div className="bg-[#111111] border-l-4 border-gold border border-white/5 rounded-[16px] p-5 flex flex-col gap-4">
          <div className="flex gap-3 items-center">
            <span className="text-3xl">⚠️</span>
            <div>
              <h3 className="text-white text-base font-extrabold tracking-tight">Insufficient Available Credit</h3>
              <p className="text-text-secondary text-[11px] leading-relaxed mt-0.5">
                You need at least <strong>₹{total.toLocaleString()}</strong> credit to place this order.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-white/5 border border-white/5 p-4 rounded-[12px] mt-1">
            <div>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold block">Available Credit</span>
              <strong className="text-emerald-400 text-base font-extrabold">₹{available}</strong>
            </div>
            <div>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold block">Required Order</span>
              <strong className="text-primary text-base font-extrabold">₹{total}</strong>
            </div>
            <div className="col-span-2 pt-2 border-t border-white/5 flex justify-between text-[10px] font-bold text-text-secondary">
              <span>Suggested Payment: <strong className="text-white">₹{minPaymentNeeded}</strong></span>
              <span>Outstanding Owed: <strong className="text-white">₹{outstanding}</strong></span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 mt-2">
            <button 
              type="button"
              onClick={() => {
                setOnlinePayAmount(minPaymentNeeded);
                setShowOnlinePaymentModal(true);
              }} 
              className="w-full py-3 bg-gold hover:bg-yellow-600 text-black text-xs font-extrabold rounded-[12px] transition-all duration-200 active:scale-95 shadow-md"
            >
              💳 Pay ₹{minPaymentNeeded.toLocaleString()} Online Now
            </button>
            <button 
              type="button"
              onClick={() => {
                setOnlinePayAmount(outstanding);
                setShowOnlinePaymentModal(true);
              }} 
              className="w-full py-3 bg-neutral-800 text-white text-xs font-extrabold rounded-[12px] border border-white/5 transition-all duration-200 active:scale-95"
            >
              💳 Pay Full Outstanding (₹{outstanding.toLocaleString()})
            </button>
            <button 
              type="button"
              onClick={() => {
                setCashRequestAmount(minPaymentNeeded);
                setShowCashCollectionModal(true);
              }} 
              className="w-full py-3 bg-primary hover:bg-red-700 text-white text-xs font-extrabold rounded-[12px] transition-all duration-200 active:scale-95 shadow-md"
            >
              🛵 Request Cash Collection (₹{minPaymentNeeded.toLocaleString()})
            </button>
            <button 
              type="button"
              onClick={() => setShowLedgerModal(true)} 
              className="w-full py-3 bg-neutral-800 text-white text-xs font-extrabold rounded-[12px] border border-white/5 transition-all duration-200 active:scale-95"
            >
              📄 View Account Statement
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-3">
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
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 py-8 bg-black text-white font-primary">
        <div className="text-6xl mb-6 animate-pulse">🎉</div>
        <h2 className="text-gold text-2xl font-black tracking-tight mb-2">Order Confirmed!</h2>
        <p className="text-white font-extrabold text-sm tracking-wide bg-white/5 border border-white/5 px-4 py-2 rounded-full mb-4">
          Order ID: {placedOrderId}
        </p>
        <p className="text-text-secondary text-xs leading-relaxed max-w-[320px] mb-8">
          Your order has been recorded in our branch database. For rapid dispatch and delivery notifications, click below to confirm details with our Turbhe branch manager on WhatsApp.
        </p>

        {whatsappEnabled ? (
          <button 
            onClick={handleWhatsAppRedirect} 
            className="w-full py-4 bg-[#25D366] text-white font-extrabold text-sm uppercase tracking-wider rounded-[12px] shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98] mb-6"
          >
            <span>💬</span> Confirm on WhatsApp
          </button>
        ) : (
          <Link 
            href="/profile?tab=orders" 
            className="w-full py-4 bg-primary text-white font-extrabold text-sm uppercase rounded-[12px] shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98] mb-6 text-center"
          >
            📦 View Order History
          </Link>
        )}

        <Link 
          href="/" 
          className="text-text-secondary hover:text-white text-xs font-bold tracking-wide uppercase hover:underline"
        >
          ← Back to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-black min-h-screen text-white font-primary pb-[100px]">
      {/* Top Sticky Header */}
      <div className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-md border-b border-white/5 px-4 py-3.5 flex items-center gap-3">
        <Link 
          href="/" 
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/5 text-lg text-white active:scale-95 transition-all"
        >
          ←
        </Link>
        <div className="flex flex-col">
          <span className="text-white text-sm font-extrabold tracking-tight leading-none uppercase">Secure Checkout</span>
          <span className="text-[9px] text-text-secondary uppercase font-bold tracking-widest mt-1">
            Meat City Turbhe
          </span>
        </div>
      </div>

      {cartItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
          <span className="text-6xl">🛒</span>
          <h3 className="mt-6 text-white text-lg font-black tracking-tight">Your Cart is Empty</h3>
          <p className="text-text-secondary text-xs leading-relaxed max-w-[240px] mt-2">
            Looks like you haven't added any fresh halal cuts to your basket yet.
          </p>
          <Link 
            href="/" 
            className="mt-6 px-6 py-3.5 bg-primary hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-[12px] shadow-lg active:scale-95 transition-all text-center"
          >
            Browse Fresh Meat
          </Link>
        </div>
      ) : (
        <div className="px-4 py-4 flex flex-col gap-5">
          {showCreditDuesScreen ? (
            renderCreditDuesScreen()
          ) : (
            <>
              {/* 1. Address Section */}
              <div className="bg-neutral-900 border border-white/5 rounded-[16px] p-4 flex flex-col gap-3.5">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <h3 className="text-white text-xs font-extrabold uppercase tracking-wide">📍 Delivery Address</h3>
                  <button 
                    onClick={() => setShowAddAddress(!showAddAddress)} 
                    className="text-primary text-xs font-bold uppercase hover:underline"
                  >
                    {showAddAddress ? 'Close Panel' : '+ Add Address'}
                  </button>
                </div>

                {showAddAddress && (
                  <form onSubmit={handleAddAddress} className="bg-white/5 border border-white/5 p-4 rounded-[12px] flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Label</label>
                        <input 
                          type="text" 
                          required 
                          value={newAddress.name} 
                          onChange={e => setNewAddress({...newAddress, name: e.target.value})} 
                          placeholder="Home / Shop"
                          className="bg-neutral-850 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Recipient Mobile</label>
                        <input 
                          type="tel" 
                          required 
                          value={newAddress.phone} 
                          onChange={e => setNewAddress({...newAddress, phone: e.target.value})} 
                          placeholder="10-digit number"
                          className="bg-neutral-850 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none"
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Room / Shop / Flat Number *</label>
                      <input 
                        type="text" 
                        required 
                        value={newAddress.roomNumber} 
                        onChange={e => setNewAddress({...newAddress, roomNumber: e.target.value})} 
                        placeholder="e.g. Shop No. 2, Room No. 126"
                        className="bg-neutral-850 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Sector / Area *</label>
                      <input 
                        type="text" 
                        required 
                        value={newAddress.sectorArea} 
                        onChange={e => setNewAddress({...newAddress, sectorArea: e.target.value})} 
                        placeholder="e.g. Sector 20, Turbhe"
                        className="bg-neutral-850 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Pincode *</label>
                      <input 
                        type="text" 
                        required 
                        value={newAddress.pincode} 
                        onChange={e => setNewAddress({...newAddress, pincode: e.target.value})} 
                        placeholder="e.g. 400705"
                        className="bg-neutral-850 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none"
                      />
                    </div>
                    
                    <button type="submit" className="w-full mt-1.5 py-2.5 bg-primary text-white text-xs font-extrabold uppercase rounded-[10px] active:scale-95 transition-all">
                      Save Delivery Address
                    </button>
                  </form>
                )}

                {addresses.length === 0 ? (
                  <p className="text-text-secondary text-xs font-bold text-center py-4">No address added. Add one to proceed.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {addresses.map(addr => (
                      <div 
                        key={addr.id} 
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`p-3.5 bg-white/5 border rounded-[12px] flex gap-3 items-start cursor-pointer transition-all ${
                          selectedAddressId === addr.id 
                            ? 'border-gold bg-gold/5 shadow-md shadow-gold/5' 
                            : 'border-white/5 hover:border-white/10'
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
                            <span className="font-extrabold text-xs text-white">{addr.name}</span>
                            {selectedAddressId === addr.id && (
                              <span className="text-[9px] text-gold font-extrabold uppercase bg-gold/10 px-2 py-0.5 rounded-full">
                                Selected
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-text-secondary leading-relaxed mt-0.5">{addr.addressLine}</p>
                          <span className="text-[10px] text-text-secondary font-bold mt-1">📞 {addr.phone}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Delivery Time Slot Section */}
              <div className="bg-neutral-900 border border-white/5 rounded-[16px] p-4 flex flex-col gap-3.5">
                <h3 className="text-white text-xs font-extrabold uppercase tracking-wide">📅 Schedule Delivery</h3>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Select Delivery Time Slot</label>
                  <select
                    value={deliverySlot}
                    onChange={e => setDeliverySlot(e.target.value)}
                    className="w-full bg-[#1E2020] border border-white/5 rounded-[12px] px-4 py-3.5 text-white text-sm outline-none focus:border-gold/50"
                  >
                    <option value="ASAP">ASAP (Within 60 Minutes)</option>
                    <option value="10 AM – 12 PM">10 AM – 12 PM</option>
                    <option value="12 PM – 2 PM">12 PM – 2 PM</option>
                    <option value="2 PM – 4 PM">2 PM – 4 PM</option>
                    <option value="4 PM – 6 PM">4 PM – 6 PM</option>
                  </select>
                </div>
              </div>

              {/* 2. Payment Section */}
              <div className="bg-neutral-900 border border-white/5 rounded-[16px] p-4 flex flex-col gap-3.5">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <h3 className="text-white text-xs font-extrabold uppercase tracking-wide">💳 Select Payment</h3>
                  <span className="text-[9px] bg-white/10 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {userRole === 'b2b' ? 'Wholesale' : 'Retail'}
                  </span>
                </div>

                {/* B2B Status Overview */}
                {userRole === 'b2b' && (
                  <div className="bg-white/5 border border-white/5 p-3 rounded-[12px] grid grid-cols-2 gap-2 text-xs">
                    <div>Outstanding: <strong className="text-primary font-black">₹{userProfile?.outstanding_balance || 0}</strong></div>
                    <div>Credit Limit: <strong className="text-white font-black">₹{userProfile?.credit_limit || 0}</strong></div>
                    <div className="col-span-2 pt-2 mt-1 border-t border-white/5 flex justify-between text-[10px] text-text-secondary font-bold">
                      <span>Available Credit: <strong className="text-emerald-400">₹{userProfile?.credit_available || 0}</strong></span>
                      {userProfile?.payment_due_date && <span>Due Date: <strong>{userProfile.payment_due_date}</strong></span>}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  {userRole === 'b2b' ? (
                    // B2B Wholesale payments
                    <>
                      <div 
                        onClick={() => !isCreditLimitExceeded && setPaymentMethod('Credit')}
                        className={`p-3.5 bg-white/5 border rounded-[12px] flex gap-3 items-start cursor-pointer transition-all ${
                          paymentMethod === 'Credit' 
                            ? 'border-gold bg-gold/5' 
                            : 'border-white/5 opacity-55'
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
                            <span className="font-extrabold text-xs text-white">Credit Account (Pay Later)</span>
                            <span className="text-[9px] text-emerald-400 font-extrabold uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              Pay Later
                            </span>
                          </div>
                          <p className="text-[10px] text-text-secondary leading-relaxed mt-1">Order instantly. Owed amount is recorded to your ledger.</p>
                        </div>
                      </div>

                      <div 
                        onClick={() => setPaymentMethod('UPI')}
                        className={`p-3.5 bg-white/5 border rounded-[12px] flex gap-3 items-start cursor-pointer transition-all ${
                          paymentMethod === 'UPI' ? 'border-gold bg-gold/5' : 'border-white/5 opacity-55'
                        }`}
                      >
                        <input 
                          type="radio" 
                          checked={paymentMethod === 'UPI'} 
                          onChange={() => setPaymentMethod('UPI')} 
                          className="accent-primary mt-1"
                        />
                        <div className="flex-1">
                          <span className="font-extrabold text-xs text-white">Direct UPI</span>
                          <p className="text-[10px] text-text-secondary leading-relaxed mt-1">Pay instantly using any UPI app (GPay, PhonePe, Paytm).</p>
                        </div>
                      </div>

                      <div 
                        onClick={() => setPaymentMethod('BankTransfer')}
                        className={`p-3.5 bg-white/5 border rounded-[12px] flex gap-3 items-start cursor-pointer transition-all ${
                          paymentMethod === 'BankTransfer' ? 'border-gold bg-gold/5' : 'border-white/5 opacity-55'
                        }`}
                      >
                        <input 
                          type="radio" 
                          checked={paymentMethod === 'BankTransfer'} 
                          onChange={() => setPaymentMethod('BankTransfer')} 
                          className="accent-primary mt-1"
                        />
                        <div className="flex-1">
                          <span className="font-extrabold text-xs text-white">IMPS / NEFT Bank Transfer</span>
                          <p className="text-[10px] text-text-secondary leading-relaxed mt-1">Transfer directly to bank and record UTR transaction number.</p>
                        </div>
                      </div>

                      <div 
                        onClick={() => setPaymentMethod('CashCollection')}
                        className={`p-3.5 bg-white/5 border rounded-[12px] flex gap-3 items-start cursor-pointer transition-all ${
                          paymentMethod === 'CashCollection' ? 'border-gold bg-gold/5' : 'border-white/5 opacity-55'
                        }`}
                      >
                        <input 
                          type="radio" 
                          checked={paymentMethod === 'CashCollection'} 
                          onChange={() => setPaymentMethod('CashCollection')} 
                          className="accent-primary mt-1"
                        />
                        <div className="flex-1">
                          <span className="font-extrabold text-xs text-white">Store Cash Collection</span>
                          <p className="text-[10px] text-text-secondary leading-relaxed mt-1">Submit payment in cash directly at the Turbhe store outlet.</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    // B2C Retail payments
                    <>
                      <div 
                        onClick={() => setPaymentMethod('COD')}
                        className={`p-3.5 bg-white/5 border rounded-[12px] flex gap-3 items-start cursor-pointer transition-all ${
                          paymentMethod === 'COD' ? 'border-gold bg-gold/5' : 'border-white/5 opacity-55'
                        }`}
                      >
                        <input 
                          type="radio" 
                          checked={paymentMethod === 'COD'} 
                          onChange={() => setPaymentMethod('COD')} 
                          className="accent-primary mt-1"
                        />
                        <div className="flex-1">
                          <span className="font-extrabold text-xs text-white">Cash on Delivery (COD)</span>
                          <p className="text-[10px] text-text-secondary leading-relaxed mt-1">Pay with cash or scan UPI code when order arrives at doorstep.</p>
                        </div>
                      </div>

                      <div 
                        onClick={() => setPaymentMethod('UPI')}
                        className={`p-3.5 bg-white/5 border rounded-[12px] flex gap-3 items-start cursor-pointer transition-all ${
                          paymentMethod === 'UPI' ? 'border-gold bg-gold/5' : 'border-white/5 opacity-55'
                        }`}
                      >
                        <input 
                          type="radio" 
                          checked={paymentMethod === 'UPI'} 
                          onChange={() => setPaymentMethod('UPI')} 
                          className="accent-primary mt-1"
                        />
                        <div className="flex-1">
                          <span className="font-extrabold text-xs text-white">UPI Scan / App Pay</span>
                          <p className="text-[10px] text-text-secondary leading-relaxed mt-1">Simulated instant redirect scan to verify.</p>
                        </div>
                      </div>

                      <div 
                        onClick={() => setPaymentMethod('Razorpay')}
                        className={`p-3.5 bg-white/5 border rounded-[12px] flex gap-3 items-start cursor-pointer transition-all ${
                          paymentMethod === 'Razorpay' ? 'border-gold bg-gold/5' : 'border-white/5 opacity-55'
                        }`}
                      >
                        <input 
                          type="radio" 
                          checked={paymentMethod === 'Razorpay'} 
                          onChange={() => setPaymentMethod('Razorpay')} 
                          className="accent-primary mt-1"
                        />
                        <div className="flex-1">
                          <span className="font-extrabold text-xs text-white">Credit / Debit Card / Razorpay</span>
                          <p className="text-[10px] text-text-secondary leading-relaxed mt-1">Secure simulated checkout overlay with cards, wallets or netbanking.</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Sub Forms based on selection */}
                {paymentMethod === 'UPI' && (
                  <div className="bg-white/5 border border-white/5 p-4 rounded-[12px] flex flex-col gap-2">
                    <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">UPI Handle ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g. name@okhdfcbank" 
                      value={upiId} 
                      onChange={e => setUpiId(e.target.value)} 
                      className="bg-neutral-850 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none"
                    />
                    {upiError && <p className="text-primary text-[10px] font-bold mt-0.5">{upiError}</p>}
                  </div>
                )}

                {paymentMethod === 'BankTransfer' && (
                  <div className="bg-white/5 border border-white/5 p-4 rounded-[12px] flex flex-col gap-3">
                    <div className="text-[11px] text-text-secondary leading-relaxed bg-black/40 p-3 rounded-[8px] border border-white/5">
                      Please transfer <strong className="text-white">₹{total}</strong> to:<br/>
                      <strong>Bank:</strong> HDFC Bank Ltd<br/>
                      <strong>A/c Name:</strong> Meat City Turbhe Branch<br/>
                      <strong>A/c No:</strong> 50200087612344<br/>
                      <strong>IFSC:</strong> HDFC0000421
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Transaction UTR Number</label>
                      <input 
                        type="text" 
                        placeholder="12-digit UTR reference" 
                        value={bankUtr} 
                        onChange={e => setBankUtr(e.target.value)} 
                        className="bg-neutral-850 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none"
                      />
                      {bankError && <p className="text-primary text-[10px] font-bold mt-0.5">{bankError}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Basket items list */}
              <div className="bg-neutral-900 border border-white/5 rounded-[16px] p-4 flex flex-col gap-3.5">
                <h3 className="text-white text-xs font-extrabold uppercase tracking-wide">🛒 Order Summary</h3>
                <div className="flex flex-col gap-3.5 max-h-[300px] overflow-y-auto pr-1">
                  {cartItems.map(({ cartKey, product, quantity, price }) => (
                    <div key={cartKey} className="flex justify-between items-center gap-3">
                      <div className="flex gap-3 items-center flex-1">
                        <img 
                          src={product?.image_url} 
                          alt={product?.name} 
                          className="w-12 h-12 object-cover rounded-[8px] bg-neutral-950 border border-white/5" 
                        />
                        <div className="flex-1 flex flex-col">
                          <span className="font-extrabold text-xs text-white tracking-tight line-clamp-1">{product?.name}</span>
                          <span className="text-[10px] text-text-secondary mt-0.5">{product?.unit} x ₹{price}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5">
                        {/* Selector */}
                        <div className="flex items-center bg-white/5 rounded-[10px] border border-white/5 p-0.5">
                          <button
                            type="button"
                            onClick={() => handleDecrement(cartKey)}
                            className="w-6 h-6 flex items-center justify-center font-bold text-white text-xs active:scale-75 transition-transform"
                          >
                            -
                          </button>
                          <span className="px-1.5 text-white font-extrabold text-[11px] min-w-[14px] text-center">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleIncrement(cartKey)}
                            className="w-6 h-6 flex items-center justify-center font-bold text-white text-xs active:scale-75 transition-transform"
                          >
                            +
                          </button>
                        </div>
                        <span className="font-extrabold text-xs text-white w-[60px] text-right">
                          ₹{price * quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Coupons application (B2C Only) */}
              {userRole !== 'b2b' && (
                <div className="bg-neutral-900 border border-white/5 rounded-[16px] p-4 flex flex-col gap-3.5">
                  <h3 className="text-white text-xs font-extrabold uppercase tracking-wide">🏷️ Coupon Code</h3>
                  {appliedCoupon ? (
                    <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/25 p-3 rounded-[12px]">
                      <div className="flex flex-col">
                        <span className="text-emerald-400 font-extrabold text-xs">✓ Coupon {appliedCoupon.code}</span>
                        <span className="text-[10px] text-emerald-500 font-bold">You saved ₹{discountAmount}!</span>
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
                          className="flex-1 bg-[#1E2020] border border-white/5 text-white rounded-[12px] px-3.5 py-3 text-xs outline-none focus:border-gold/50 text-transform-uppercase"
                        />
                        <button 
                          onClick={handleApplyCoupon} 
                          className="px-5 py-3 bg-gold text-black text-xs font-black uppercase rounded-[12px] active:scale-95 transition-all"
                        >
                          Apply
                        </button>
                      </div>
                      {couponError && <p className="text-primary text-[10px] font-bold mt-0.5">{couponError}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* 5. Bill Details */}
              <div className="bg-neutral-900 border border-white/5 rounded-[16px] p-4 flex flex-col gap-3.5">
                <h3 className="text-white text-xs font-extrabold uppercase tracking-wide pb-1 border-b border-white/5">
                  🧾 Bill Breakdown
                </h3>
                <div className="flex flex-col gap-3.5 text-xs">
                  <div className="flex justify-between text-text-secondary">
                    <span>Items Total</span>
                    <span className="text-white font-bold">₹{subtotal}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>Discount ({appliedCoupon?.code})</span>
                      <span>-₹{discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-text-secondary">
                    <span>Delivery Charge</span>
                    <span>
                      {deliveryFee === 0 
                        ? <strong className="text-emerald-400 font-extrabold">FREE</strong> 
                        : `₹${deliveryFee}`
                      }
                    </span>
                  </div>
                  <div className="border-t border-white/5 border-dashed pt-3 mt-1 flex justify-between items-center">
                    <span className="text-white font-black text-sm uppercase tracking-tight">Grand Total</span>
                    <span className="text-gold font-extrabold text-base">₹{total}</span>
                  </div>
                </div>
              </div>

              {/* FSSAI Certified Trust Badge */}
              <div className="bg-gradient-to-r from-emerald-950/20 to-emerald-900/10 border border-emerald-500/20 rounded-[16px] p-3.5 flex gap-3.5 items-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-lg">
                  🛡️
                </div>
                <div className="flex flex-col text-left text-xs">
                  <span className="text-emerald-400 font-extrabold text-[9px] uppercase tracking-wide">FSSAI Certified Safety</span>
                  <span className="text-white font-black mt-0.5">Registration: 21525016001365</span>
                  <span className="text-[9px] text-text-secondary font-bold mt-0.5">Quality Assured • Hygienic • Fresh Daily • Safe Pack</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* UPI PAYMENT VERIFICATION MODAL */}
      {showUpiPaymentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#111111] border border-white/10 p-5 rounded-[16px] w-full max-w-[380px] flex flex-col gap-4">
            <h3 className="text-gold text-sm font-black uppercase tracking-wide flex items-center gap-1.5">
              <span>📱</span> UPI Verification
            </h3>
            <p className="text-text-secondary text-[11px] leading-relaxed">
              Please scan the QR code below or transfer <strong>₹{total}</strong> directly to our store UPI handle. Enter the transaction Reference/UTR number after payment.
            </p>
            
            <div className="flex flex-col items-center gap-2.5 p-3.5 bg-white/5 border border-white/5 rounded-[12px]">
              <div className="w-[140px] h-[140px] border border-white/10 rounded-[8px] p-2 bg-white flex justify-center items-center">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`upi://pay?pa=meatcity@ybl&pn=Meat%20City&am=${total}&cu=INR`)}`} 
                  alt="Meat City Dynamic UPI QR" 
                  className="w-full h-full object-contain" 
                />
              </div>
              <div className="text-center">
                <span className="text-[9px] text-text-secondary uppercase font-bold block">UPI ID (Store Handle)</span>
                <strong className="text-white text-xs font-extrabold">meatcity@ybl</strong>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Transaction Reference ID / UTR</label>
              <input 
                type="text" 
                required
                value={upiTxRef}
                onChange={e => setUpiTxRef(e.target.value)}
                placeholder="12-digit reference number"
                className="bg-neutral-800 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
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
              {upiScreenshot && <span className="text-[10px] text-emerald-400 font-bold">✓ {upiScreenshot} selected</span>}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <button 
                type="button"
                onClick={() => setShowUpiPaymentModal(false)}
                className="py-2.5 bg-neutral-850 text-white font-bold text-xs rounded-[10px] border border-white/5 active:scale-95"
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
                className="py-2.5 bg-primary hover:bg-red-700 disabled:opacity-40 disabled:pointer-events-none text-white font-black text-xs rounded-[10px] active:scale-95 shadow-md"
              >
                I Have Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RAZORPAY TEST MODE MODAL */}
      {showRazorpayModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#111111] border border-white/10 rounded-[16px] w-full max-w-[380px] overflow-hidden flex flex-col">
            <div className="bg-neutral-900 border-b border-white/5 px-4 py-3 flex justify-between items-center">
              <span className="font-extrabold text-white text-xs">Razorpay Secure Checkout</span>
              <span className="text-[8px] bg-white/10 text-text-secondary px-2 py-0.5 rounded-full uppercase tracking-wider">
                Test Mode
              </span>
            </div>
            
            <div className="p-4 flex flex-col gap-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-secondary">Merchant</span>
                <strong className="text-white">Meat City Navi Mumbai</strong>
              </div>
              <div className="flex justify-between items-center text-xs pb-3 border-b border-white/5">
                <span className="text-text-secondary font-bold">Amount Due</span>
                <strong className="text-gold text-base">₹{total}</strong>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Dummy Card Number</label>
                <input 
                  type="text" 
                  maxLength={16}
                  value={razorpayCard.number}
                  onChange={e => setRazorpayCard({...razorpayCard, number: e.target.value})}
                  placeholder="4111 1111 1111 1111" 
                  className="bg-neutral-800 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Expiry Date</label>
                  <input 
                    type="text" 
                    maxLength={5}
                    value={razorpayCard.expiry}
                    onChange={e => setRazorpayCard({...razorpayCard, expiry: e.target.value})}
                    placeholder="MM/YY" 
                    className="bg-neutral-800 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">CVV</label>
                  <input 
                    type="password" 
                    maxLength={3}
                    value={razorpayCard.cvv}
                    onChange={e => setRazorpayCard({...razorpayCard, cvv: e.target.value})}
                    placeholder="123" 
                    className="bg-neutral-800 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <button 
                  type="button"
                  onClick={() => setShowRazorpayModal(false)}
                  disabled={isProcessingPayment}
                  className="py-2.5 bg-neutral-855 text-white font-bold text-xs rounded-[10px] border border-white/5 active:scale-95"
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
                  {isProcessingPayment ? 'Authorizing...' : `Pay ₹${total}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FIXED BOTTOM CHECKOUT ACTION BAR */}
      {cartItems.length > 0 && !showCreditDuesScreen && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#111111]/95 backdrop-blur-md border-t border-white/5 py-4 px-4 shadow-2xl">
          <div className="max-w-[480px] mx-auto flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-white text-base font-extrabold">₹{total}</span>
              <span className="text-[9px] text-text-secondary uppercase tracking-wider font-bold mt-0.5 truncate max-w-[160px]">
                {cartItems.reduce((acc, i) => acc + i.quantity, 0)} Items • {addresses.find(a => a.id === selectedAddressId)?.name || '...'}
              </span>
            </div>

            <button 
              onClick={handleCheckout} 
              disabled={isProcessingPayment || isCreditBlocked}
              className="flex-1 max-w-[240px] py-3.5 bg-primary hover:bg-red-700 active:scale-[0.98] disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-[12px] shadow-lg transition-all text-center"
            >
              {isProcessingPayment 
                ? 'Processing Securely...' 
                : userRole === 'guest' 
                  ? 'Login to Checkout' 
                  : userRole === 'b2b' && isCreditBlocked
                    ? 'Credit Clearance Required'
                    : `Proceed to Pay • ₹${total}`
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
