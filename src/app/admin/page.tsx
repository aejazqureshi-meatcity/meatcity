"use client";

import { useState, useEffect } from 'react';
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
  is_available: boolean;
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
  last_payment_date?: string;
  ledger?: any[];
  created_at?: string;
}

interface OrderItem {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  user_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  payment_status: string;
  payment_ref?: string;
  status: 'New' | 'Processing' | 'Packed' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  delivery_status?: string;
  delivery_partner_id?: string;
  delivery_partner_name?: string;
  delivery_otp?: string;
  items: OrderItem[];
  created_at: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'approvals' | 'customers' | 'products' | 'categories' | 'orders' | 'deliveries' | 'analytics' | 'settings' | 'payments' | 'pincodes' | 'coupons' | 'reviews'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  // Delivery Partner Form States
  const [editingPartner, setEditingPartner] = useState<any | null>(null);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    email: '',
    mobile: '',
    password: 'password123',
    status: 'active'
  });
  
  // Database States
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  
  // Custom states for pincodes, coupons, and reviews
  const [serviceablePincodes, setServiceablePincodes] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  // Pincode form state
  const [newPincode, setNewPincode] = useState('');
  const [newPincodeCharge, setNewPincodeCharge] = useState<number>(50);

  // Coupon form state
  const [couponForm, setCouponForm] = useState({
    code: '',
    discount_percent: 0,
    flat_discount: 0,
    min_order_amount: 0,
    expiry_date: '',
    usage_limit: 100,
    is_active: true
  });
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any | null>(null);
  
  // Dashboard & Analytics metrics
  const [stats, setStats] = useState({
    todaySales: 0,
    weeklySales: 0,
    monthlySales: 0,
    totalSales: 0,
    b2bRevenue: 0,
    b2cRevenue: 0,
    totalOrders: 0,
    activeOrders: 0,
    pendingB2B: 0,
    totalCustomers: 0,
    pendingPayments: 0,
    todayOrdersCount: 0,
    totalProductsCount: 0,
    pendingOrdersCount: 0
  });

  // Credit Balance Modifiers
  const [editingLimitUserId, setEditingLimitUserId] = useState<string | null>(null);
  const [newLimitAmount, setNewLimitAmount] = useState<number>(50000);

  // Selected User for Collections and Ledgers
  const [selectedB2BUserForPayment, setSelectedB2BUserForPayment] = useState<UserProfile | null>(null);
  const [paymentType, setPaymentType] = useState<'cash' | 'online'>('cash');
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payRemarks, setPayRemarks] = useState<string>('');
  const [payUtr, setPayUtr] = useState<string>('');
  const [payBankRef, setPayBankRef] = useState<string>('');

  const [selectedB2BUserForLedger, setSelectedB2BUserForLedger] = useState<UserProfile | null>(null);
  const [selectedB2BUserForHistory, setSelectedB2BUserForHistory] = useState<UserProfile | null>(null);
  const [cashCollectionRequests, setCashCollectionRequests] = useState<any[]>([]);
  const [activeProcessingRequestId, setActiveProcessingRequestId] = useState<string | null>(null);

  // Product Form State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<{
    name: string;
    description: string;
    category: string;
    price_b2c: number;
    price_b2b: number;
    unit: string;
    image_url: string;
    stock: number;
    is_available: boolean;
    stock_status: string;
    variants: Array<{ weight: string; price_b2c: number; price_b2b: number }>;
  }>({
    name: '',
    description: '',
    category: 'Chicken',
    price_b2c: 0,
    price_b2b: 0,
    unit: 'kg',
    image_url: '',
    stock: 10,
    is_available: true,
    stock_status: 'Available',
    variants: []
  });
  const [showProductForm, setShowProductForm] = useState(false);

  // Category Form State
  const [newCategoryName, setNewCategoryName] = useState('');

  // Settings Mock State
  const [shopSettings, setShopSettings] = useState({
    isOpen: true,
    deliveryFee: 50,
    freeDeliveryAbove: 999,
    minimumB2COrder: 200,
    minimumB2BOrder: 1000,
    whatsappNotificationsEnabled: true,
    adminWhatsappNumber: '917977630912'
  });

  const supabase = createClient();

  const loadData = async () => {
    // 1. Fetch Users
    const { data: usersData } = await supabase.from('users').select('*');
    const uList = usersData || [];
    setUsers(uList);

    // 2. Fetch Products
    const { data: productsData } = await supabase.from('products').select('*');
    setProducts(productsData || []);

    // 3. Fetch Categories
    const { data: catData } = await supabase.from('categories').select('*');
    setCategories(catData ? catData.map((c: any) => c.name || c.id) : ['Chicken', 'Mutton', 'Seafood', 'Eggs', 'Ready To Cook']);

    // 4. Fetch Orders
    const { data: ordersData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    const oList = ordersData || [];
    setOrders(oList);

    // 5. Fetch Cash Pickup requests
    const { data: requestsData } = await supabase.from('cash_collection_requests').select('*');
    setCashCollectionRequests(requestsData || []);

    // 6. Fetch B2B repayments
    const { data: paymentsData } = await supabase.from('payments').select('*');
    const pList = paymentsData || [];
    setPayments(pList);

    // Fetch Custom tables
    const { data: pinsData } = await supabase.from('serviceable_pincodes').select('*');
    setServiceablePincodes(pinsData || []);

    const { data: couponsData } = await supabase.from('coupons').select('*');
    setCoupons(couponsData || []);

    const { data: reviewsData } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
    setReviews(reviewsData || []);

    // Fetch Admin Settings
    const { data: settingsData } = await supabase.from('admin_settings').select('*');
    if (settingsData && settingsData.length > 0) {
      const settingsObj: any = {};
      settingsData.forEach((s: any) => {
        settingsObj[s.key] = s.value;
      });
      setShopSettings({
        isOpen: settingsObj.is_open === 'true',
        deliveryFee: Number(settingsObj.delivery_fee || 50),
        freeDeliveryAbove: Number(settingsObj.free_delivery_above || 999),
        minimumB2COrder: Number(settingsObj.minimum_b2c_order || 200),
        minimumB2BOrder: Number(settingsObj.minimum_b2b_order || 1000),
        whatsappNotificationsEnabled: settingsObj.whatsapp_notifications_enabled === 'true',
        adminWhatsappNumber: settingsObj.admin_whatsapp_number || '917977630912'
      });
    }

    // Update active user states in case limit/ledger details changed
    if (selectedB2BUserForLedger) {
      const freshUser = uList.find((u: UserProfile) => u.id === selectedB2BUserForLedger.id);
      if (freshUser) setSelectedB2BUserForLedger(freshUser);
    }
    if (selectedB2BUserForPayment) {
      const freshUser = uList.find((u: UserProfile) => u.id === selectedB2BUserForPayment.id);
      if (freshUser) setSelectedB2BUserForPayment(freshUser);
    }

    // Calculate detailed stats and analytics
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);

    let todaySales = 0;
    let weeklySales = 0;
    let monthlySales = 0;
    let totalSales = 0;
    let b2bRevenue = 0;
    let b2cRevenue = 0;
    let activeOrders = 0;
    let todayOrdersCount = 0;
    let pendingOrdersCount = 0;

    oList.forEach((order: Order) => {
      const orderDateStr = order.created_at?.split('T')[0];
      const orderDate = new Date(order.created_at);

      if (orderDateStr === todayStr) {
        todayOrdersCount++;
      }

      const statusLower = (order.status || '').toLowerCase();
      if (statusLower === 'pending' || statusLower === 'new') {
        pendingOrdersCount++;
      }

      if (order.status !== 'Cancelled') {
        // Sales totals
        totalSales += order.total;

        if (orderDateStr === todayStr) {
          todaySales += order.total;
        }
        if (orderDate >= oneWeekAgo) {
          weeklySales += order.total;
        }
        if (orderDate >= oneMonthAgo) {
          monthlySales += order.total;
        }

        // B2B vs B2C split
        const customer = uList.find((u: UserProfile) => u.id === order.user_id);
        if (customer?.user_type === 'b2b') {
          b2bRevenue += order.total;
        } else {
          b2cRevenue += order.total;
        }

        // Active orders
        if (order.status !== 'Delivered') {
          activeOrders++;
        }
      }
    });

    const pendingB2B = uList.filter((u: UserProfile) => u.user_type === 'b2b' && u.status === 'pending').length;
    const totalCustomers = uList.filter((u: UserProfile) => u.user_type !== 'admin').length;
    const pendingPayments = pList.filter((p: any) => p.status === 'pending' || p.status === 'Pending Verification').length;
    const totalProductsCount = productsData?.length || 0;

    setStats({
      todaySales,
      weeklySales,
      monthlySales,
      totalSales,
      b2bRevenue,
      b2cRevenue,
      totalOrders: oList.length,
      activeOrders,
      pendingB2B,
      totalCustomers,
      pendingPayments,
      todayOrdersCount,
      totalProductsCount,
      pendingOrdersCount
    });
  };

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      const { data: profile } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', user.id)
        .single();
      const role = profile?.user_type || user.user_metadata?.user_type;
      if (role !== 'admin') {
        window.location.href = '/';
      }
    };
    checkAdmin();
    loadData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // User Actions (B2B/B2C Approvals, Suspensions)
  const handleUpdateUserStatus = async (userId: string, newStatus: string) => {
    const isApproval = newStatus === 'active' || newStatus === 'approved';
    // If approving a B2B partner, seed empty credit limits and statements
    if (isApproval) {
      const userToApprove = users.find(u => u.id === userId);
      if (userToApprove && userToApprove.user_type === 'b2b') {
        // Calculate due date (30 days from now)
        const due = new Date();
        due.setDate(due.getDate() + 30);
        const dueStr = due.toISOString().split('T')[0];

        await supabase.from('users').update({ 
          status: 'active',
          credit_limit: 50000,
          credit_used: 0,
          credit_available: 50000,
          outstanding_balance: 0,
          payment_due_date: dueStr,
          ledger: []
        }).eq('id', userId);

        try {
          await supabase.from('notifications').insert({
            user_id: userId,
            title: 'B2B Account Approved 🤝',
            message: 'Your B2B retail partner account has been approved. Credit limit set to ₹50,000.',
            type: 'b2b_approval'
          });
        } catch (nErr) {
          console.error('Failed to trigger B2B approval notification:', nErr);
        }

        loadData();
        return;
      }
    }

    await supabase.from('users').update({ status: isApproval ? 'active' : newStatus }).eq('id', userId);

    if (isApproval) {
      try {
        await supabase.from('notifications').insert({
          user_id: userId,
          title: 'Account Activated 👍',
          message: 'Your Meat City user account has been successfully approved/unlocked.',
          type: 'account_activation'
        });
      } catch (nErr) {
        console.error('Failed to trigger account status notification:', nErr);
      }
    }

    loadData();
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to permanently delete this user?')) {
      await supabase.from('users').delete().eq('id', userId);
      if (selectedB2BUserForHistory?.id === userId) setSelectedB2BUserForHistory(null);
      if (selectedB2BUserForLedger?.id === userId) setSelectedB2BUserForLedger(null);
      if (selectedB2BUserForPayment?.id === userId) setSelectedB2BUserForPayment(null);
      loadData();
    }
  };

  const handleApprovePayment = async (payment: any) => {
    if (!payment) return;
    
    const { data: u } = await supabase.from('users').select('*').eq('id', payment.user_id).single();
    if (!u) {
      alert('User profile not found.');
      return;
    }

    const amount = payment.amount;
    const newOutstanding = Math.max(0, (u.outstanding_balance || 0) - amount);
    const newUsed = Math.max(0, (u.credit_used || 0) - amount);
    const newAvailable = (u.credit_limit || 50000) - newOutstanding;

    const desc = `Online Payment (Approved) - Ref: ${payment.payment_ref}`;
    const ledgerEntry = {
      date: new Date().toISOString(),
      description: desc,
      debit: 0,
      credit: amount,
      balance: newOutstanding
    };
    const updatedLedger = [...(u.ledger || []), ledgerEntry];

    await supabase.from('users').update({
      outstanding_balance: newOutstanding,
      credit_used: newUsed,
      credit_available: newAvailable,
      last_payment_date: new Date().toISOString().split('T')[0],
      ledger: updatedLedger
    }).eq('id', payment.user_id);

    await supabase.from('payments').update({
      status: 'Verified'
    }).eq('id', payment.id);

    try {
      await supabase.from('notifications').insert({
        user_id: payment.user_id,
        title: 'Repayment Approved 👍',
        message: `Your online payment of ₹${amount} has been approved. Available credit updated to ₹${newAvailable}.`,
        type: 'payment_repayment'
      });
    } catch (nErr) {
      console.error('Failed to trigger payment approval notification:', nErr);
    }

    loadData();
  };

  const handleRejectPayment = async (paymentId: string, userId: string, amount: number) => {
    if (!confirm('Are you sure you want to reject this payment?')) return;

    await supabase.from('payments').update({
      status: 'Rejected'
    }).eq('id', paymentId);

    try {
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Repayment Rejected ❌',
        message: `Your online payment of ₹${amount} was rejected. Please contact the administrator.`,
        type: 'payment_repayment'
      });
    } catch (nErr) {
      console.error('Failed to trigger payment rejection notification:', nErr);
    }

    loadData();
  };

  // Modify Credit Limits
  const handleUpdateCreditLimit = async (userId: string, outstanding: number) => {
    const available = newLimitAmount - outstanding;
    await supabase.from('users').update({ 
      credit_limit: newLimitAmount,
      credit_available: available
    }).eq('id', userId);
    
    setEditingLimitUserId(null);
    loadData();
  };

  // Record Collections Payments
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedB2BUserForPayment) return;

    const u = selectedB2BUserForPayment;
    const amount = Number(payAmount);
    
    // Recalculate balances
    const newOutstanding = Math.max(0, (u.outstanding_balance || 0) - amount);
    const newUsed = Math.max(0, (u.credit_used || 0) - amount);
    const newAvailable = (u.credit_limit || 50000) - newOutstanding;

    // Build ledger description
    let desc = '';
    if (paymentType === 'cash') {
      desc = `Cash Payment - ${payRemarks || 'Received'}`;
    } else {
      desc = `Online Payment - UTR: ${payUtr || 'N/A'} (Bank: ${payBankRef || 'N/A'})`;
    }

    const ledgerEntry = {
      date: new Date(payDate).toISOString(),
      description: desc,
      debit: 0,
      credit: amount,
      balance: newOutstanding
    };

    const updatedLedger = [...(u.ledger || []), ledgerEntry];

    // Update in mock db
    await supabase.from('users').update({
      outstanding_balance: newOutstanding,
      credit_used: newUsed,
      credit_available: newAvailable,
      last_payment_date: payDate,
      ledger: updatedLedger
    }).eq('id', u.id);

    // Update cash collection request if active
    if (activeProcessingRequestId) {
      await supabase.from('cash_collection_requests').update({
        status: 'Processed'
      }).eq('id', activeProcessingRequestId);
      setActiveProcessingRequestId(null);
    }

    // Reset payment states
    setSelectedB2BUserForPayment(null);
    setPayAmount(0);
    setPayRemarks('');
    setPayUtr('');
    setPayBankRef('');
    
    alert('Payment collection recorded successfully!');
    loadData();
  };

  // Order Actions
  const triggerWhatsAppCustomerNotification = (order: any, newStatus: string) => {
    if (!shopSettings.whatsappNotificationsEnabled) return;
    
    let text = '';
    const cleanStatus = newStatus.toLowerCase();
    
    if (cleanStatus.includes('confirmed')) {
      text = `Order Confirmed ✅\n\nYour MeatCity order #${order.id} has been confirmed.`;
    } else if (cleanStatus.includes('processing')) {
      text = `Order Processing 🔄\n\nYour order is being prepared.`;
    } else if (cleanStatus.includes('out for delivery')) {
      text = `Out For Delivery 🚚\n\nYour order is on the way.`;
    } else if (cleanStatus.includes('delivered')) {
      text = `Delivered ✅\n\nThank you for ordering from MeatCity.`;
    } else if (cleanStatus.includes('cancelled')) {
      text = `Cancelled ❌\n\nYour order has been cancelled.`;
    } else {
      text = `Your MeatCity order #${order.id} status updated to: ${newStatus}`;
    }

    const phone = order.customer_phone || '';
    if (!phone) return;

    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    
    const orderObj = orders.find(o => o.id === orderId);
    if (orderObj) {
      triggerWhatsAppCustomerNotification(orderObj, newStatus);
    }
    
    loadData();
  };

  const handleSaveSystemSettings = async () => {
    try {
      const settingsList = [
        { key: 'is_open', value: String(shopSettings.isOpen) },
        { key: 'delivery_fee', value: String(shopSettings.deliveryFee) },
        { key: 'free_delivery_above', value: String(shopSettings.freeDeliveryAbove) },
        { key: 'minimum_b2c_order', value: String(shopSettings.minimumB2COrder) },
        { key: 'minimum_b2b_order', value: String(shopSettings.minimumB2BOrder) },
        { key: 'whatsapp_notifications_enabled', value: String(shopSettings.whatsappNotificationsEnabled) },
        { key: 'admin_whatsapp_number', value: String(shopSettings.adminWhatsappNumber) }
      ];

      for (const setting of settingsList) {
        await supabase.from('admin_settings').upsert(setting);
      }
      alert('Settings saved successfully!');
      loadData();
    } catch (err: any) {
      alert('Failed to save settings: ' + err.message);
    }
  };

  const handleVerifyPayment = async (orderId: string, newPaymentStatus: string) => {
    await supabase.from('orders').update({ payment_status: newPaymentStatus }).eq('id', orderId);
    
    try {
      const orderObj = orders.find(o => o.id === orderId);
      if (orderObj) {
        await supabase.from('notifications').insert({
          user_id: orderObj.user_id,
          title: `Payment ${newPaymentStatus} 💳`,
          message: `Your payment of ₹${orderObj.total} for Order ${orderId} has been ${newPaymentStatus.toLowerCase()}.`,
          type: 'payment_verification'
        });
      }
    } catch (nErr) {
      console.error('Failed to trigger payment verification notification:', nErr);
    }

    loadData();
  };

  // Product Actions
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: productForm.name,
      description: productForm.description,
      category: productForm.category,
      price_b2c: Number(productForm.price_b2c),
      price_b2b: Number(productForm.price_b2b),
      unit: productForm.unit,
      image_url: productForm.image_url,
      stock: Number(productForm.stock),
      is_available: productForm.is_available,
      stock_status: productForm.stock_status,
      variants: typeof productForm.variants === 'string' ? productForm.variants : JSON.stringify(productForm.variants)
    };

    if (editingProduct) {
      await supabase.from('products').update(payload).eq('id', editingProduct.id);
    } else {
      await supabase.from('products').insert({
        id: 'prod-' + Math.random().toString(36).substr(2, 9),
        ...payload
      });
    }

    setEditingProduct(null);
    setProductForm({
      name: '',
      description: '',
      category: categories[0] || 'Chicken',
      price_b2c: 0,
      price_b2b: 0,
      unit: 'kg',
      image_url: '',
      stock: 10,
      is_available: true,
      stock_status: 'Available',
      variants: []
    });
    setShowProductForm(false);
    loadData();
  };

  const handleEditProduct = (prod: any) => {
    setEditingProduct(prod);
    const parsedVariants = prod.variants
      ? (typeof prod.variants === 'string'
          ? JSON.parse(prod.variants)
          : prod.variants)
      : [];

    setProductForm({
      name: prod.name,
      description: prod.description || '',
      category: prod.category || 'Chicken',
      price_b2c: prod.price_b2c || 0,
      price_b2b: prod.price_b2b || 0,
      unit: prod.unit || 'kg',
      image_url: prod.image_url || '',
      stock: prod.stock || 0,
      is_available: prod.is_available !== false,
      stock_status: prod.stock_status || 'Available',
      variants: parsedVariants
    });
    setShowProductForm(true);
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await supabase.from('products').delete().eq('id', prodId);
      loadData();
    }
  };

  // Category Actions
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName) return;

    if (categories.includes(newCategoryName)) {
      alert('Category already exists');
      return;
    }

    await supabase.from('categories').insert({ id: newCategoryName, name: newCategoryName });
    setNewCategoryName('');
    loadData();
  };

  const handleDeleteCategory = async (catName: string) => {
    if (confirm(`Are you sure you want to delete the category "${catName}"?`)) {
      await supabase.from('categories').delete().eq('id', catName);
      loadData();
    }
  };

  // Pincode Actions
  const handleAddPincode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPincode) return;
    const cleanPin = newPincode.trim();
    // Validate pincode format (6 digits)
    if (!/^\d{6}$/.test(cleanPin)) {
      showToast('Please enter a valid 6-digit pincode', 'error');
      return;
    }
    if (serviceablePincodes.some(p => p.pincode === cleanPin)) {
      showToast('Pincode already added', 'error');
      return;
    }
    try {
      const { error } = await supabase
        .from('serviceable_pincodes')
        .insert({ pincode: cleanPin, delivery_charge: Number(newPincodeCharge) || 0 });
      if (error) throw error;
      setNewPincode('');
      setNewPincodeCharge(50);
      showToast('Pincode added successfully!', 'success');
      await loadData();
    } catch (err: any) {
      console.error('Error adding pincode', err);
      showToast(err.message || 'Failed to add pincode. Please try again.', 'error');
    }
  };

  const handleDeletePincode = async (pincode: string) => {
    if (confirm(`Remove delivery service for pincode ${pincode}?`)) {
      try {
        const { error } = await supabase.from('serviceable_pincodes').delete().eq('pincode', pincode);
        if (error) throw error;
        showToast('Pincode removed successfully!', 'success');
        await loadData();
      } catch (err: any) {
        console.error('Error deleting pincode', err);
        showToast(err.message || 'Failed to delete pincode.', 'error');
      }
    }
  };

  const handleExportCSV = (tableName: string, data: any[]) => {
    if (!data || data.length === 0) {
      alert(`No data available to export for ${tableName}`);
      return;
    }
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.map(header => `"${header.replace(/"/g, '""')}"`).join(','));
    data.forEach(row => {
      const values = headers.map(header => {
        let value = row[header];
        if (value === null || value === undefined) {
          value = '';
        } else if (typeof value === 'object') {
          value = JSON.stringify(value);
        } else {
          value = String(value);
        }
        return `"${value.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    });
    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `meatcity_${tableName}_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Coupon Actions
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      code: couponForm.code.toUpperCase().trim(),
      discount_percent: Number(couponForm.discount_percent),
      flat_discount: Number(couponForm.flat_discount),
      min_order_amount: Number(couponForm.min_order_amount),
      expiry_date: couponForm.expiry_date,
      usage_limit: Number(couponForm.usage_limit),
      is_active: couponForm.is_active
    };

    if (editingCoupon) {
      await supabase.from('coupons').update(payload).eq('code', editingCoupon.code);
    } else {
      await supabase.from('coupons').insert(payload);
    }

    setEditingCoupon(null);
    setCouponForm({ code: '', discount_percent: 0, flat_discount: 0, min_order_amount: 0, expiry_date: '', usage_limit: 100, is_active: true });
    setShowCouponForm(false);
    loadData();
  };

  const handleDeleteCoupon = async (code: string) => {
    if (confirm(`Delete coupon ${code}?`)) {
      await supabase.from('coupons').delete().eq('code', code);
      loadData();
    }
  };

  const handleToggleCoupon = async (code: string, currentStatus: boolean) => {
    await supabase.from('coupons').update({ is_active: !currentStatus }).eq('code', code);
    loadData();
  };

  // Review Actions
  const handleApproveReview = async (reviewId: string) => {
    await supabase.from('reviews').update({ status: 'approved' }).eq('id', reviewId);
    loadData();
  };

  const handleRejectReview = async (reviewId: string) => {
    await supabase.from('reviews').update({ status: 'rejected' }).eq('id', reviewId);
    loadData();
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (confirm('Delete this review?')) {
      await supabase.from('reviews').delete().eq('id', reviewId);
      loadData();
    }
  };

  // Helper selectors
  const pendingB2bUsers = users.filter(u => u.user_type === 'b2b' && u.status === 'pending');
  const b2bUsers = users.filter(u => u.user_type === 'b2b' && u.status !== 'pending');
  const b2cUsers = users.filter(u => u.user_type === 'b2c');

  // Top Products Calculation
  const getTopProducts = () => {
    const productCounts: Record<string, { name: string; quantity: number; total: number }> = {};
    orders.forEach((o: Order) => {
      if (o.status !== 'Cancelled') {
        o.items?.forEach((item: OrderItem) => {
          if (!productCounts[item.product_id]) {
            productCounts[item.product_id] = { name: item.name, quantity: 0, total: 0 };
          }
          productCounts[item.product_id].quantity += item.quantity;
          productCounts[item.product_id].total += (item.price * item.quantity);
        });
      }
    });

    return Object.values(productCounts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  };

  // Sales by Category Calculation
  const getSalesByCategory = () => {
    const categoryTotals: Record<string, number> = {};
    categories.forEach(cat => {
      categoryTotals[cat] = 0;
    });

    orders.forEach((o: Order) => {
      if (o.status !== 'Cancelled') {
        o.items?.forEach((item: OrderItem) => {
          const product = products.find(p => p.id === item.product_id);
          const cat = product?.category || 'Chicken';
          if (!categoryTotals[cat]) {
            categoryTotals[cat] = 0;
          }
          categoryTotals[cat] += (item.price * item.quantity);
        });
      }
    });

    return categoryTotals;
  };

  return (
    <div className="admin-layout">
      {/* Left Sidebar */}
      <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-brand" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="admin-sidebar-logo">
              Meat <span>City</span>
            </div>
            <div className="admin-sidebar-logo-subtitle">Admin Central Panel</div>
          </div>
          {/* Close button for mobile */}
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1 text-gray-400 hover:text-white transition-colors"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
            aria-label="Close sidebar"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <ul className="admin-sidebar-menu">
          <li className="admin-sidebar-menu-item">
            <div 
              className={`admin-sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
            >
              <span className="admin-sidebar-link-left">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                Dashboard
              </span>
            </div>
          </li>

          <li className="admin-sidebar-menu-item">
            <div 
              className={`admin-sidebar-link ${activeTab === 'approvals' ? 'active' : ''}`}
              onClick={() => { setActiveTab('approvals'); setIsSidebarOpen(false); }}
            >
              <span className="admin-sidebar-link-left">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                B2B Approvals
              </span>
              {stats.pendingB2B > 0 && <span className="badge-count">{stats.pendingB2B}</span>}
            </div>
          </li>

          <li className="admin-sidebar-menu-item">
            <div 
              className={`admin-sidebar-link ${activeTab === 'customers' ? 'active' : ''}`}
              onClick={() => { setActiveTab('customers'); setIsSidebarOpen(false); }}
            >
              <span className="admin-sidebar-link-left">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                Customers
              </span>
            </div>
          </li>

          <li className="admin-sidebar-menu-item">
            <div 
              className={`admin-sidebar-link ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => { setActiveTab('products'); setIsSidebarOpen(false); }}
            >
              <span className="admin-sidebar-link-left">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                Products
              </span>
            </div>
          </li>

          <li className="admin-sidebar-menu-item">
            <div 
              className={`admin-sidebar-link ${activeTab === 'categories' ? 'active' : ''}`}
              onClick={() => { setActiveTab('categories'); setIsSidebarOpen(false); }}
            >
              <span className="admin-sidebar-link-left">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
                Categories
              </span>
            </div>
          </li>

          <li className="admin-sidebar-menu-item">
            <div 
              className={`admin-sidebar-link ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => { setActiveTab('orders'); setIsSidebarOpen(false); }}
            >
              <span className="admin-sidebar-link-left">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
                Orders
              </span>
              {stats.activeOrders > 0 && <span className="badge-count" style={{ backgroundColor: 'var(--color-gold)', color: 'black' }}>{stats.activeOrders}</span>}
            </div>
          </li>

          <li className="admin-sidebar-menu-item">
            <div 
              className={`admin-sidebar-link ${activeTab === 'deliveries' ? 'active' : ''}`}
              onClick={() => { setActiveTab('deliveries'); setIsSidebarOpen(false); }}
            >
              <span className="admin-sidebar-link-left">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.75A1.125 1.125 0 0 1 2.625 17.625V4.5A1.5 1.5 0 0 1 4.125 3h11.75c.621 0 1.125.504 1.125 1.125V18.75m-15 0h15m-1.5-3.75h3.375c.621 0 1.125.504 1.125 1.125v1.5a1.125 1.125 0 0 1-1.125 1.125H16.5m-3-12h2.25m-2.25 3h2.25m-2.25 3h2.25M6.75 21a.75.75 0 0 1-.75-.75V3.75a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 .75.75v16.5a.75.75 0 0 1-.75.75H6.75Z" /></svg>
                Delivery Partners
              </span>
              {users.filter(u => u.user_type === 'delivery_partner' && u.status === 'active').length > 0 && (
                <span className="badge-count" style={{ backgroundColor: 'var(--color-gold)', color: 'black' }}>
                  {users.filter(u => u.user_type === 'delivery_partner' && u.status === 'active').length}
                </span>
              )}
            </div>
          </li>

          <li className="admin-sidebar-menu-item">
            <div 
              className={`admin-sidebar-link ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => { setActiveTab('analytics'); setIsSidebarOpen(false); }}
            >
              <span className="admin-sidebar-link-left">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                Analytics
              </span>
            </div>
          </li>

          <li className="admin-sidebar-menu-item">
            <div 
              className={`admin-sidebar-link ${activeTab === 'payments' ? 'active' : ''}`}
              onClick={() => { setActiveTab('payments'); setIsSidebarOpen(false); }}
            >
              <span className="admin-sidebar-link-left">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a6.002 6.002 0 0 1 11.69-2.031c.13.53.513.966 1.012 1.157l3.851 1.48a1.5 1.5 0 0 1-.954 2.833l-3.851-1.48a1.5 1.5 0 0 1-.79-1.92L17.75 8M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                B2B Payments
              </span>
              {stats.pendingPayments > 0 && (
                <span className="badge-count" style={{ backgroundColor: 'var(--color-gold)', color: 'black' }}>
                  {stats.pendingPayments}
                </span>
              )}
            </div>
          </li>

          <li className="admin-sidebar-menu-item">
            <div 
              className={`admin-sidebar-link ${activeTab === 'pincodes' ? 'active' : ''}`}
              onClick={() => { setActiveTab('pincodes'); setIsSidebarOpen(false); }}
            >
              <span className="admin-sidebar-link-left">
                📍 Pincode Management
              </span>
            </div>
          </li>

          <li className="admin-sidebar-menu-item">
            <div 
              className={`admin-sidebar-link ${activeTab === 'coupons' ? 'active' : ''}`}
              onClick={() => { setActiveTab('coupons'); setIsSidebarOpen(false); }}
            >
              <span className="admin-sidebar-link-left">
                🏷️ Coupon Config
              </span>
            </div>
          </li>

          <li className="admin-sidebar-menu-item">
            <div 
              className={`admin-sidebar-link ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => { setActiveTab('reviews'); setIsSidebarOpen(false); }}
            >
              <span className="admin-sidebar-link-left">
                ⭐ Reviews Moderation
              </span>
            </div>
          </li>

          <li className="admin-sidebar-menu-item">
            <div 
              className={`admin-sidebar-link ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
            >
              <span className="admin-sidebar-link-left">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                Settings
              </span>
            </div>
          </li>
        </ul>

        <div className="admin-sidebar-footer">
          <div className="admin-user-profile">
            <div className="admin-avatar">AQ</div>
            <div className="admin-user-info">
              <span className="admin-username">Aejaz Qureshi</span>
              <span className="admin-userrole">Super Admin</span>
            </div>
          </div>

          <button onClick={handleLogout} className="admin-logout-btn">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        {/* Top Header */}
        <header className="admin-top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Hamburger button for mobile */}
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-white hover:text-gold transition-colors"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              aria-label="Open sidebar"
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="admin-header-title-block">
               <h1>
                {activeTab === 'dashboard' && 'Welcome, Admin Dashboard'}
                {activeTab === 'approvals' && 'B2B Approvals Queue'}
                {activeTab === 'customers' && 'Customer Management'}
                {activeTab === 'products' && 'Product CRUD Management'}
                {activeTab === 'categories' && 'Category Configuration'}
                {activeTab === 'orders' && 'Live Order Tracking'}
                {activeTab === 'deliveries' && 'Delivery Partner Management'}
                {activeTab === 'analytics' && 'Branch Analytics Summary'}
                {activeTab === 'settings' && 'System Parameters'}
                {activeTab === 'payments' && 'B2B Credit Repayments'}
              </h1>
              <p>
                {activeTab === 'dashboard' && 'Visual overview of Meat City Turbhe sales performance.'}
                {activeTab === 'approvals' && 'Review and approve wholesale partner credentials.'}
                {activeTab === 'customers' && 'Manage B2C consumers and B2B credit accounts.'}
                {activeTab === 'products' && 'Add, edit, adjust stock and configure dynamic price layers.'}
                {activeTab === 'categories' && 'Manage listing categories in the customer application.'}
                {activeTab === 'orders' && 'Fulfill and dispatch current customer order requests.'}
                {activeTab === 'deliveries' && 'Add, edit, activate and track delivery agent performance.'}
                {activeTab === 'analytics' && 'Detailed financial insights, metrics, and top products.'}
                {activeTab === 'settings' && 'Toggle store operational states and standard delivery variables.'}
                {activeTab === 'payments' && 'Verify and manually approve B2B credit repayment records.'}
              </p>
            </div>
          </div>

          <div className="admin-header-actions">
            <div className="admin-branch-pill">
              <span className="admin-branch-dot"></span>
              Turbhe branch: Active
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="admin-content">

          {/* Tab 1: Dashboard */}
          {activeTab === 'dashboard' && (
            <div>
              {/* Summary Cards */}
              <div className="admin-cards-grid">
                <div className="admin-card">
                  <div className="admin-card-header">
                    Today's Sales
                    <div className="admin-card-icon red">₹</div>
                  </div>
                  <div className="admin-card-value">₹{stats.todaySales}</div>
                  <div className="admin-card-change up">Live today</div>
                </div>

                <div className="admin-card">
                  <div className="admin-card-header">
                    Total Revenue
                    <div className="admin-card-icon gold">₹</div>
                  </div>
                  <div className="admin-card-value">₹{stats.totalSales}</div>
                  <div className="admin-card-change up">Cumulative</div>
                </div>

                <div className="admin-card">
                  <div className="admin-card-header">
                    Customers
                    <div className="admin-card-icon blue">👤</div>
                  </div>
                  <div className="admin-card-value">{stats.totalCustomers}</div>
                  <div className="admin-card-change up">B2C + B2B</div>
                </div>

                <div className="admin-card">
                  <div className="admin-card-header">
                    Pending B2B
                    <div className="admin-card-icon red">💼</div>
                  </div>
                  <div className="admin-card-value">{stats.pendingB2B}</div>
                  <div className="admin-card-change down">Needs review</div>
                </div>

                <div className="admin-card">
                  <div className="admin-card-header">
                    Active Orders
                    <div className="admin-card-icon green">📦</div>
                  </div>
                  <div className="admin-card-value">{stats.activeOrders}</div>
                  <div className="admin-card-change up">In pipeline</div>
                </div>
              </div>

              {/* Grid sections */}
              <div className="admin-grid-2">
                {/* Section A: Pending B2B registrations */}
                <div className="admin-section-card">
                  <div className="admin-section-header">
                    <h2 className="admin-section-title">New B2B Applications ({pendingB2bUsers.length})</h2>
                    <button onClick={() => setActiveTab('approvals')} className="admin-btn admin-btn-sm admin-btn-secondary">View Queue</button>
                  </div>

                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Business</th>
                          <th>Owner</th>
                          <th>Location</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingB2bUsers.slice(0, 3).map(u => (
                          <tr key={u.id}>
                            <td data-label="Business"><strong>{u.business_name}</strong></td>
                            <td data-label="Owner">{u.full_name}<br/><span style={{ fontSize: '0.8rem' }}>{u.phone}</span></td>
                            <td data-label="Location">{u.shop_address || 'Navi Mumbai'}</td>
                            <td data-label="Action">
                              <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <button onClick={() => handleUpdateUserStatus(u.id, 'active')} className="admin-btn admin-btn-sm admin-btn-success">Approve</button>
                                <button onClick={() => handleUpdateUserStatus(u.id, 'rejected')} className="admin-btn admin-btn-sm admin-btn-danger">Reject</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {pendingB2bUsers.length === 0 && (
                          <tr>
                            <td data-label="Business" colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', color: '#888' }}>No pending applications.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section B: Active Orders */}
                <div className="admin-section-card">
                  <div className="admin-section-header">
                    <h2 className="admin-section-title">Latest Active Orders</h2>
                    <button onClick={() => setActiveTab('orders')} className="admin-btn admin-btn-sm admin-btn-secondary">View All</button>
                  </div>

                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Customer</th>
                          <th>Total</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').slice(0, 5).map(o => (
                          <tr key={o.id}>
                            <td data-label="ID"><strong>{o.id}</strong></td>
                            <td data-label="Customer">
                              {(() => {
                                const orderUser = users.find(u => u.id === o.user_id);
                                return (
                                  <>
                                    <strong>{orderUser ? orderUser.full_name : o.customer_name}</strong>
                                    {orderUser?.business_name && (
                                      <span style={{ display: 'block', fontSize: '0.75rem', color: '#666' }}>
                                        🏭 {orderUser.business_name}
                                      </span>
                                    )}
                                    <span style={{ fontSize: '0.8rem', display: 'block', color: '#6b7280' }}>
                                      📞 {orderUser ? orderUser.phone : o.customer_phone}
                                    </span>
                                  </>
                                );
                              })()}
                            </td>
                            <td data-label="Total">₹{o.total}</td>
                            <td data-label="Status">
                              <span className={`admin-badge ${o.status === 'New' ? 'admin-badge-danger' : 'admin-badge-warning'}`}>
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length === 0 && (
                          <tr>
                            <td data-label="ID" colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', color: '#888' }}>No active orders.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Approvals Queue */}
          {activeTab === 'approvals' && (
            <div className="admin-section-card">
              <h2 className="admin-section-title" style={{ marginBottom: '1rem' }}>B2B Registration Queue</h2>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Business Details</th>
                      <th>Owner details</th>
                      <th>License Numbers</th>
                      <th>Shop Address</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingB2bUsers.map(u => (
                      <tr key={u.id}>
                        <td data-label="Business Details">
                          <strong style={{ fontSize: '1.05rem', color: 'var(--color-red)' }}>{u.business_name}</strong>
                          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.15rem' }}>B2B wholesale applicant</div>
                        </td>
                        <td data-label="Owner details">
                          <strong>{u.full_name}</strong><br/>
                          <span>📞 {u.phone}</span><br/>
                          <span style={{ fontSize: '0.8rem', color: '#666' }}>✉️ {u.email}</span>
                        </td>
                        <td data-label="License Numbers">
                          <strong>GST:</strong> {u.gst_number || 'N/A'}<br/>
                          <strong>FSSAI:</strong> {u.fssai_license || 'N/A'}
                        </td>
                        <td data-label="Shop Address" style={{ maxWidth: '200px', fontSize: '0.85rem' }}>{u.shop_address || 'N/A'}</td>
                        <td data-label="Action">
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleUpdateUserStatus(u.id, 'active')} className="admin-btn admin-btn-success">Approve Partner</button>
                            <button onClick={() => handleUpdateUserStatus(u.id, 'rejected')} className="admin-btn admin-btn-danger">Reject</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pendingB2bUsers.length === 0 && (
                      <tr>
                        <td data-label="Business Details" colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
                          No pending applications. All registration submissions processed.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Customer directory */}
          {activeTab === 'customers' && (
            <div>
              {/* Collapsible B2B Payment Recorder Form */}
              {selectedB2BUserForPayment && (
                <div className="admin-section-card" style={{ border: '2px solid var(--color-gold)', backgroundColor: '#111111', marginBottom: '1.5rem' }}>
                  <div className="admin-section-header">
                    <h2 className="admin-section-title">
                      💰 Record Collection Payment: <span style={{ color: 'var(--color-red)' }}>{selectedB2BUserForPayment.business_name}</span>
                    </h2>
                    <button onClick={() => setSelectedB2BUserForPayment(null)} className="admin-btn admin-btn-secondary">Close Form</button>
                  </div>
                  
                  <form onSubmit={handleRecordPayment}>
                    <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 700 }}>
                        <input type="radio" name="payType" checked={paymentType === 'cash'} onChange={() => setPaymentType('cash')} />
                        💵 Cash Collection
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 700 }}>
                        <input type="radio" name="payType" checked={paymentType === 'online'} onChange={() => setPaymentType('online')} />
                        🖥️ Online Collection (Bank/UPI)
                      </label>
                    </div>

                    <div className="admin-grid-3">
                      <div className="admin-form-group">
                        <label className="admin-form-label">Amount Collected (₹)</label>
                        <input 
                          type="number" 
                          className="admin-form-input" 
                          required 
                          value={payAmount || ''} 
                          onChange={e => setPayAmount(Number(e.target.value))} 
                          placeholder="e.g. 5000"
                        />
                      </div>
                      
                      <div className="admin-form-group">
                        <label className="admin-form-label">Payment Date</label>
                        <input 
                          type="date" 
                          className="admin-form-input" 
                          required 
                          value={payDate} 
                          onChange={e => setPayDate(e.target.value)} 
                        />
                      </div>

                      {paymentType === 'cash' ? (
                        <div className="admin-form-group">
                          <label className="admin-form-label">Remarks / Description</label>
                          <input 
                            type="text" 
                            className="admin-form-input" 
                            value={payRemarks} 
                            onChange={e => setPayRemarks(e.target.value)} 
                            placeholder="Received at store"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="admin-form-group">
                            <label className="admin-form-label">UTR / Transaction Ref Number</label>
                            <input 
                              type="text" 
                              className="admin-form-input" 
                              required 
                              value={payUtr} 
                              onChange={e => setPayUtr(e.target.value)} 
                              placeholder="12-digit UTR ref"
                            />
                          </div>
                          <div className="admin-form-group" style={{ gridColumn: 'span 3' }}>
                            <label className="admin-form-label">Bank Reference Name</label>
                            <input 
                              type="text" 
                              className="admin-form-input" 
                              value={payBankRef} 
                              onChange={e => setPayBankRef(e.target.value)} 
                              placeholder="e.g. HDFC Bank, GPay"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <button type="submit" className="admin-btn admin-btn-success">Record payment collection receipt</button>
                  </form>
                </div>
              )}

              {/* Collapsible B2B Ledger statement Table */}
              {selectedB2BUserForLedger && (
                <div className="admin-section-card" style={{ border: '2px solid rgba(255, 255, 255, 0.08)', backgroundColor: '#111111', marginBottom: '1.5rem' }}>
                  <div className="admin-section-header">
                    <h2 className="admin-section-title">
                      📊 Account Ledger Ledger: <span style={{ color: 'var(--color-gold)' }}>{selectedB2BUserForLedger.business_name}</span>
                    </h2>
                    <button onClick={() => setSelectedB2BUserForLedger(null)} className="admin-btn admin-btn-secondary">Close Ledger</button>
                  </div>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Description</th>
                          <th style={{ textAlign: 'right' }}>Debit (Dr)</th>
                          <th style={{ textAlign: 'right' }}>Credit (Cr)</th>
                          <th style={{ textAlign: 'right' }}>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedB2BUserForLedger.ledger && selectedB2BUserForLedger.ledger.map((entry: any, idx: number) => (
                          <tr key={idx}>
                            <td data-label="Date">{new Date(entry.date).toLocaleDateString()} {new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                            <td data-label="Description"><strong>{entry.description}</strong></td>
                            <td data-label="Debit (Dr)" style={{ textAlign: 'right', color: entry.debit > 0 ? 'var(--color-red)' : '#888', fontWeight: entry.debit > 0 ? 700 : 'normal' }}>
                              {entry.debit > 0 ? `₹${entry.debit}` : '—'}
                            </td>
                            <td data-label="Credit (Cr)" style={{ textAlign: 'right', color: entry.credit > 0 ? '#059669' : '#888', fontWeight: entry.credit > 0 ? 700 : 'normal' }}>
                              {entry.credit > 0 ? `₹${entry.credit}` : '—'}
                            </td>
                            <td data-label="Balance" style={{ textAlign: 'right', fontWeight: 800, color: '#FFFFFF' }}>₹{entry.balance}</td>
                          </tr>
                        ))}
                        {(!selectedB2BUserForLedger.ledger || selectedB2BUserForLedger.ledger.length === 0) && (
                          <tr>
                            <td data-label="Date" colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: '#888' }}>No ledger transaction history recorded.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Overlay selected user order history if active */}
              {selectedB2BUserForHistory && (
                <div className="admin-section-card" style={{ border: '2px solid var(--color-red)', backgroundColor: '#111111', marginBottom: '2rem' }}>
                  <div className="admin-section-header">
                    <h2 className="admin-section-title">
                      Order History: <span style={{ color: 'var(--color-red)' }}>{selectedB2BUserForHistory.business_name || selectedB2BUserForHistory.full_name}</span>
                    </h2>
                    <button onClick={() => setSelectedB2BUserForHistory(null)} className="admin-btn admin-btn-secondary">Close History</button>
                  </div>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Items</th>
                          <th>Total Amount</th>
                          <th>Payment</th>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.filter(o => o.user_id === selectedB2BUserForHistory.id).map(o => (
                          <tr key={o.id}>
                            <td data-label="Order ID"><strong>{o.id}</strong></td>
                            <td data-label="Items">
                              {o.items?.map((item, idx) => (
                                <div key={idx} style={{ fontSize: '0.85rem' }}>- {item.name} (x{item.quantity})</div>
                              ))}
                            </td>
                            <td data-label="Total Amount"><strong>₹{o.total}</strong></td>
                            <td data-label="Payment">{o.payment_method} ({o.payment_status})</td>
                            <td data-label="Date">{new Date(o.created_at).toLocaleString()}</td>
                            <td data-label="Status">
                              <span className={`admin-badge ${o.status === 'Delivered' ? 'admin-badge-success' : o.status === 'Cancelled' ? 'admin-badge-danger' : 'admin-badge-warning'}`}>
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {orders.filter(o => o.user_id === selectedB2BUserForHistory.id).length === 0 && (
                          <tr>
                            <td data-label="Order ID" colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: '#888' }}>This customer has not placed any orders yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Full Width layout for Customer separations */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {/* B2B Cash Collection Pickup Requests Panel */}
                <div className="admin-section-card" style={{ borderLeft: '5px solid var(--color-gold)' }}>
                  <h2 className="admin-section-title" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>🛵 B2B Cash Collection Requests ({cashCollectionRequests.filter(r => r.status === 'Pending').length})</span>
                    <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(212,175,55,0.15)', color: 'var(--color-gold)', padding: '0.25rem 0.65rem', borderRadius: '4px', textTransform: 'uppercase' }}>Pickup Queue</span>
                  </h2>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Customer & Business</th>
                          <th>Request Amount</th>
                          <th>Preferred Date</th>
                          <th>Remarks / Instructions</th>
                          <th>Date Requested</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cashCollectionRequests.map(r => {
                          const requestUser = users.find(usr => usr.id === r.user_id);
                          return (
                            <tr key={r.id} style={{ backgroundColor: r.status === 'Pending' ? 'rgba(212,175,55,0.02)' : 'inherit' }}>
                              <td data-label="Customer & Business">
                                <strong>{requestUser ? requestUser.business_name : r.business_name}</strong><br/>
                                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                  👤 {requestUser ? requestUser.full_name : r.customer_name} | 📞 {requestUser ? requestUser.phone : r.customer_phone}
                                </span>
                              </td>
                              <td data-label="Request Amount" style={{ fontWeight: 800, color: 'var(--color-gold)' }}>₹{r.amount}</td>
                              <td data-label="Preferred Date"><strong>{r.preferred_date}</strong></td>
                              <td data-label="Remarks / Instructions" style={{ fontSize: '0.85rem', color: '#4b5563', maxWidth: '250px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                {r.remarks || '—'}
                              </td>
                              <td data-label="Date Requested">{new Date(r.created_at).toLocaleDateString()}</td>
                              <td data-label="Status">
                                <span className={`admin-badge ${r.status === 'Pending' ? 'admin-badge-warning' : 'admin-badge-success'}`}>
                                  {r.status}
                                </span>
                              </td>
                              <td data-label="Action">
                                {r.status === 'Pending' ? (
                                  <button
                                    onClick={() => {
                                      if (requestUser) {
                                        setSelectedB2BUserForPayment(requestUser);
                                        setPayAmount(r.amount);
                                        setPaymentType('cash');
                                        setPayRemarks(`Collection request processed: Ref ${r.id}`);
                                        setActiveProcessingRequestId(r.id);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                      } else {
                                        alert('Customer profile not found in database.');
                                      }
                                    }}
                                    className="admin-btn admin-btn-sm admin-btn-success"
                                  >
                                    ⚙️ Process pickup
                                  </button>
                                ) : (
                                  <span style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: 600 }}>Completed</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {cashCollectionRequests.length === 0 && (
                          <tr>
                            <td data-label="Customer & Business" colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: '#888' }}>
                              No cash collection requests submitted yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* B2B Wholesale Partners Directory */}
                <div className="admin-section-card">
                  <h2 className="admin-section-title" style={{ marginBottom: '1.25rem' }}>B2B Wholesale Customers ({b2bUsers.length})</h2>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Business Name & Owner</th>
                          <th>Credit Limit</th>
                          <th>Outstanding</th>
                          <th>Available Credit</th>
                          <th>Due Date</th>
                          <th>Last Payment</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {b2bUsers.map(u => (
                          <tr key={u.id}>
                            <td data-label="Business Name & Owner">
                              <strong>{u.business_name}</strong><br/>
                              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>👤 {u.full_name} | 📞 {u.phone}</span>
                            </td>
                            <td data-label="Credit Limit">
                              {editingLimitUserId === u.id ? (
                                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                  <input 
                                    type="number" 
                                    className="admin-form-input" 
                                    style={{ width: '100px', padding: '0.25rem' }}
                                    value={newLimitAmount} 
                                    onChange={e => setNewLimitAmount(Number(e.target.value))}
                                    required 
                                  />
                                  <button onClick={() => handleUpdateCreditLimit(u.id, u.outstanding_balance || 0)} className="admin-btn admin-btn-sm admin-btn-success">Save</button>
                                  <button onClick={() => setEditingLimitUserId(null)} className="admin-btn admin-btn-sm admin-btn-secondary">Cancel</button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 700 }}>₹{u.credit_limit || 0}</span>
                                  <button 
                                    onClick={() => {
                                      setEditingLimitUserId(u.id);
                                      setNewLimitAmount(u.credit_limit || 50000);
                                    }} 
                                    className="admin-btn admin-btn-sm admin-btn-secondary"
                                    style={{ fontSize: '0.75rem', padding: '2px 6px' }}
                                  >
                                    Adjust Limit
                                  </button>
                                </div>
                              )}
                            </td>
                            <td data-label="Outstanding" style={{ color: (u.outstanding_balance || 0) > 0 ? 'var(--color-red)' : 'inherit', fontWeight: (u.outstanding_balance || 0) > 0 ? 700 : 'normal' }}>
                              ₹{u.outstanding_balance || 0}
                            </td>
                            <td data-label="Available Credit" style={{ color: '#059669', fontWeight: 800 }}>
                              ₹{u.credit_available || 0}
                            </td>
                            <td data-label="Due Date">{u.payment_due_date || '—'}</td>
                            <td data-label="Last Payment">{u.last_payment_date || '—'}</td>
                            <td data-label="Status">
                              {u.status === 'suspended' ? (
                                <span className="admin-badge admin-badge-danger">Hold</span>
                              ) : (u.outstanding_balance || 0) >= (u.credit_limit || 50000) ? (
                                <span className="admin-badge admin-badge-warning">Exceeded</span>
                              ) : (
                                <span className="admin-badge admin-badge-success">Active</span>
                              )}
                            </td>
                            <td data-label="Action">
                              <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <button 
                                  onClick={() => setSelectedB2BUserForPayment(u)} 
                                  className="admin-btn admin-btn-sm admin-btn-success"
                                >
                                  💳 Collection
                                </button>
                                <button 
                                  onClick={() => setSelectedB2BUserForLedger(u)} 
                                  className="admin-btn admin-btn-sm admin-btn-primary"
                                >
                                  📊 Ledger
                                </button>
                                <button 
                                  onClick={() => setSelectedB2BUserForHistory(u)} 
                                  className="admin-btn admin-btn-sm admin-btn-gold"
                                >
                                  Orders
                                </button>
                                <button 
                                  onClick={() => alert(`WhatsApp and SMS reminder sent to ${u.full_name} (${u.phone}) regarding outstanding dues of ₹${u.outstanding_balance || 0}.`)}
                                  className="admin-btn admin-btn-sm admin-btn-secondary"
                                  disabled={(u.outstanding_balance || 0) <= 0}
                                  style={{ cursor: (u.outstanding_balance || 0) <= 0 ? 'not-allowed' : 'pointer' }}
                                >
                                  🔔 Remind
                                </button>
                                {u.status === 'approved' ? (
                                  <button onClick={() => handleUpdateUserStatus(u.id, 'suspended')} className="admin-btn admin-btn-sm admin-btn-secondary">Hold</button>
                                ) : (
                                  <button onClick={() => handleUpdateUserStatus(u.id, 'approved')} className="admin-btn admin-btn-sm admin-btn-success">Unhold</button>
                                )}
                                <button onClick={() => handleDeleteUser(u.id)} className="admin-btn admin-btn-sm admin-btn-danger">Del</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* B2C Retail Customers Directory */}
                <div className="admin-section-card">
                  <h2 className="admin-section-title" style={{ marginBottom: '1.25rem' }}>B2C Retail Customers ({b2cUsers.length})</h2>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Name & Mobile</th>
                          <th>Email Address</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {b2cUsers.map(u => (
                          <tr key={u.id}>
                            <td data-label="Name & Mobile">
                              <strong>{u.full_name}</strong><br/>
                              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>📞 {u.phone}</span>
                            </td>
                            <td data-label="Email Address">{u.email}</td>
                            <td data-label="Status">
                              <span className={`admin-badge ${u.status === 'approved' ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                                {u.status === 'approved' ? 'Active' : 'Blocked'}
                              </span>
                            </td>
                            <td data-label="Action">
                              <div style={{ display: 'flex', gap: '0.25rem' }}>
                                {u.status === 'approved' ? (
                                  <button onClick={() => handleUpdateUserStatus(u.id, 'suspended')} className="admin-btn admin-btn-sm admin-btn-danger">Block Account</button>
                                ) : (
                                  <button onClick={() => handleUpdateUserStatus(u.id, 'approved')} className="admin-btn admin-btn-sm admin-btn-success">Unblock</button>
                                )}
                                <button onClick={() => handleDeleteUser(u.id)} className="admin-btn admin-btn-sm admin-btn-secondary">Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Tab 4: Product CRUD */}
          {activeTab === 'products' && (
            <div>
              {/* Product catalog form overlay */}
              {showProductForm && (
                <div className="admin-section-card" style={{ border: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: '#111111', padding: '1.5rem', marginBottom: '2rem' }}>
                  <h3 className="admin-section-title" style={{ color: 'var(--color-red)', marginBottom: '1rem' }}>
                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                  </h3>
                  
                  <form onSubmit={handleSaveProduct}>
                    <div className="admin-grid-3">
                      <div className="admin-form-group">
                        <label className="admin-form-label">Product Name</label>
                        <input type="text" className="admin-form-input" required value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} placeholder="e.g. Fresh Goat Legs" />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-form-label">Category</label>
                        <select className="admin-form-select" value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})}>
                          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-form-label">Unit of Measure</label>
                        <input type="text" className="admin-form-input" required value={productForm.unit} onChange={e => setProductForm({...productForm, unit: e.target.value})} placeholder="kg or pack" />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-form-label">B2C Retail Price (₹)</label>
                        <input type="number" className="admin-form-input" required value={productForm.price_b2c} onChange={e => setProductForm({...productForm, price_b2c: Number(e.target.value)})} />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-form-label">B2B Wholesale Price (₹)</label>
                        <input type="number" className="admin-form-input" required value={productForm.price_b2b} onChange={e => setProductForm({...productForm, price_b2b: Number(e.target.value)})} />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-form-label">Initial Stock</label>
                        <input type="number" className="admin-form-input" required value={productForm.stock} onChange={e => setProductForm({...productForm, stock: Number(e.target.value)})} />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-form-label">Stock Status</label>
                        <select className="admin-form-select" value={productForm.stock_status || 'Available'} onChange={e => setProductForm({...productForm, stock_status: e.target.value})}>
                          <option value="Available">Available</option>
                          <option value="Low Stock">Low Stock</option>
                          <option value="Out Of Stock">Out Of Stock</option>
                        </select>
                      </div>
                    </div>

                    <div className="admin-form-group">
                      <label className="admin-form-label">Image URL</label>
                      <input type="url" className="admin-form-input" value={productForm.image_url} onChange={e => setProductForm({...productForm, image_url: e.target.value})} placeholder="https://images.unsplash.com/..." />
                    </div>

                    <div className="admin-form-group">
                      <label className="admin-form-label">Product Description</label>
                      <textarea className="admin-form-textarea" required value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} placeholder="Describe quality cuts, hygiene..." rows={3} />
                    </div>

                    {/* Weight Variants Section */}
                    <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem' }}>
                      <h4 style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-gold)', marginBottom: '0.75rem', textTransform: 'uppercase', tracking: '0.05em' }}>⚖️ Product Weight Variants</h4>
                      
                      {productForm.variants && productForm.variants.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                          {productForm.variants.map((v, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'white' }}>{v.weight}</span>
                              <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Retail: <strong>₹{v.price_b2c}</strong> | Wholesale: <strong>₹{v.price_b2b}</strong></span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = productForm.variants.filter((_, i) => i !== idx);
                                  setProductForm({ ...productForm, variants: updated });
                                }}
                                className="admin-btn admin-btn-sm admin-btn-danger"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                              >
                                Delete
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '1.25rem' }}>No variants added yet. Storing standard price/unit above.</p>
                      )}

                      {/* Add Variant Form Inline */}
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end', flexWrap: 'wrap', backgroundColor: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ flex: 1, minWidth: '100px' }}>
                          <label className="admin-form-label" style={{ fontSize: '0.7rem', marginBottom: '0.25rem' }}>Weight (e.g. 500g)</label>
                          <input type="text" id="newVarWeight" placeholder="500g" className="admin-form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: '80px' }}>
                          <label className="admin-form-label" style={{ fontSize: '0.7rem', marginBottom: '0.25rem' }}>B2C Price (₹)</label>
                          <input type="number" id="newVarB2C" placeholder="300" className="admin-form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: '80px' }}>
                          <label className="admin-form-label" style={{ fontSize: '0.7rem', marginBottom: '0.25rem' }}>B2B Price (₹)</label>
                          <input type="number" id="newVarB2B" placeholder="270" className="admin-form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const weightEl = document.getElementById('newVarWeight') as HTMLInputElement;
                            const b2cEl = document.getElementById('newVarB2C') as HTMLInputElement;
                            const b2bEl = document.getElementById('newVarB2B') as HTMLInputElement;
                            if (weightEl && b2cEl && b2bEl) {
                              const weight = weightEl.value.trim();
                              const price_b2c = Number(b2cEl.value);
                              const price_b2b = Number(b2bEl.value);
                              if (weight && price_b2c > 0 && price_b2b > 0) {
                                setProductForm({
                                  ...productForm,
                                  variants: [...productForm.variants, { weight, price_b2c, price_b2b }]
                                });
                                weightEl.value = '';
                                b2cEl.value = '';
                                b2bEl.value = '';
                              } else {
                                alert('Please enter valid variant details.');
                              }
                            }
                          }}
                          className="admin-btn admin-btn-gold"
                          style={{ padding: '0.45rem 1.2rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                        >
                          + Add Variant
                        </button>
                      </div>
                    </div>

                    <div className="admin-form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input type="checkbox" id="isAvail" checked={productForm.is_available} onChange={e => setProductForm({...productForm, is_available: e.target.checked})} />
                      <label htmlFor="isAvail" style={{ fontWeight: 700 }}>Enable listing active</label>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button type="submit" className="admin-btn admin-btn-primary">Save Product</button>
                      <button type="button" onClick={() => setShowProductForm(false)} className="admin-btn admin-btn-secondary">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {/* Products Table */}
              <div className="admin-section-card">
                <div className="admin-section-header">
                  <h2 className="admin-section-title">Product Inventory Catalog ({products.length})</h2>
                  <button 
                    onClick={() => {
                      setEditingProduct(null);
                      setProductForm({ name: '', description: '', category: categories[0] || 'Chicken', price_b2c: 0, price_b2b: 0, unit: 'kg', image_url: '', stock: 10, is_available: true });
                      setShowProductForm(true);
                    }} 
                    className="admin-btn admin-btn-primary"
                  >
                    + Add Product
                  </button>
                </div>

                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Product Info</th>
                        <th>Category</th>
                        <th>Retail (B2C)</th>
                        <th>Wholesale (B2B)</th>
                        <th>Stock Inventory</th>
                        <th>Availability</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(prod => (
                        <tr key={prod.id}>
                          <td data-label="Image">
                            <img src={prod.image_url} alt={prod.name} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', backgroundColor: '#eee' }} />
                          </td>
                          <td data-label="Product Info" style={{ maxWidth: '250px' }}>
                            <strong>{prod.name}</strong><br/>
                            <span style={{ fontSize: '0.8rem', color: '#666' }}>{prod.description}</span>
                          </td>
                          <td data-label="Category"><span className="admin-badge admin-badge-secondary">{prod.category}</span></td>
                          <td data-label="Retail (B2C)"><strong>₹{prod.price_b2c}</strong>/{prod.unit}</td>
                          <td data-label="Wholesale (B2B)"><strong>₹{prod.price_b2b}</strong>/{prod.unit}</td>
                          <td data-label="Stock Inventory" style={{ fontWeight: 700, color: prod.stock <= 5 ? 'var(--color-red)' : 'inherit' }}>{prod.stock}</td>
                          <td data-label="Availability">
                            <span className={`admin-badge ${prod.is_available ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                              {prod.is_available ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td data-label="Action">
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button onClick={() => handleEditProduct(prod)} className="admin-btn admin-btn-sm admin-btn-gold">Edit</button>
                              <button onClick={() => handleDeleteProduct(prod.id)} className="admin-btn admin-btn-sm admin-btn-danger">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Categories */}
          {activeTab === 'categories' && (
            <div className="admin-grid-2">
              <div className="admin-section-card">
                <h2 className="admin-section-title" style={{ marginBottom: '1.25rem' }}>Add Category</h2>
                <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '1rem' }}>
                  <input 
                    type="text" 
                    className="admin-form-input" 
                    placeholder="New category name (e.g. Offal)" 
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)} 
                    required
                  />
                  <button type="submit" className="admin-btn admin-btn-primary" style={{ whiteSpace: 'nowrap' }}>Add Category</button>
                </form>
              </div>

              <div className="admin-section-card">
                <h2 className="admin-section-title" style={{ marginBottom: '1.25rem' }}>Manage Categories</h2>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Category Name</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map(cat => (
                        <tr key={cat}>
                          <td data-label="Category Name"><strong>{cat}</strong></td>
                          <td data-label="Action">
                            <button onClick={() => handleDeleteCategory(cat)} className="admin-btn admin-btn-sm admin-btn-danger">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 6: Orders tracking */}
          {activeTab === 'orders' && (
            <div className="admin-section-card">
              <h2 className="admin-section-title" style={{ marginBottom: '1.25rem' }}>Current Orders Queue ({orders.length})</h2>
              
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer info</th>
                      <th>Address</th>
                      <th>Delivery Slot</th>
                      <th>Items ordered</th>
                      <th>Totals</th>
                      <th>Method</th>
                      <th>Order status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id}>
                        <td data-label="Order ID"><strong>{order.id}</strong></td>
                        <td data-label="Customer info">
                          <div className="admin-cell-stack">
                            {(() => {
                              const orderUser = users.find(u => u.id === order.user_id);
                              return (
                                <>
                                  <strong>{orderUser ? orderUser.full_name : order.customer_name}</strong>
                                  {orderUser?.business_name && (
                                    <span style={{ fontSize: '0.75rem', color: '#666' }}>
                                      🏭 {orderUser.business_name}
                                    </span>
                                  )}
                                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                    📞 {orderUser ? orderUser.phone : order.customer_phone}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        </td>
                        <td data-label="Address" style={{ maxWidth: '180px', fontSize: '0.8rem' }}>{order.delivery_address}</td>
                        <td data-label="Delivery Slot">
                          <span className="admin-badge admin-badge-secondary">
                            {order.delivery_slot || 'ASAP'}
                          </span>
                        </td>
                        <td data-label="Items ordered">
                          <div className="admin-cell-stack">
                            {order.items?.map((item, idx) => (
                              <div key={idx} style={{ fontSize: '0.85rem' }}>- {item.name} x {item.quantity}</div>
                            ))}
                          </div>
                        </td>
                        <td data-label="Totals">
                          <div className="admin-cell-stack">
                            <strong>₹{order.total}</strong>
                            <span style={{ fontSize: '0.75rem', color: '#666' }}>Sub: ₹{order.subtotal}</span>
                          </div>
                        </td>
                        <td data-label="Method">
                          <div className="admin-cell-stack">
                            <span className={`admin-badge ${
                              order.payment_status === 'Paid' ? 'admin-badge-success' :
                              order.payment_status === 'Payment Rejected' ? 'admin-badge-danger' :
                              'admin-badge-warning'
                            }`}>
                              {order.payment_method} ({order.payment_status})
                            </span>
                            {order.payment_ref && (
                              <div style={{ fontSize: '0.75rem', color: '#4b5563', fontFamily: 'monospace' }}>
                                Ref: <strong>{order.payment_ref}</strong>
                              </div>
                            )}
                          </div>
                        </td>
                        <td data-label="Order status">
                          <span className={`admin-badge ${
                            order.status === 'Delivered' ? 'admin-badge-success' :
                            order.status === 'Cancelled' ? 'admin-badge-danger' :
                            order.status === 'New' ? 'admin-badge-danger' : 'admin-badge-warning'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td data-label="Action">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <select 
                              className="admin-form-select" 
                              style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', width: 'auto' }}
                              value={order.status} 
                              onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as any)}
                            >
                              <option value="New">New</option>
                              <option value="Processing">Processing</option>
                              <option value="Packed">Packed</option>
                              <option value="Out for Delivery">Out for Delivery</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>

                            {order.payment_status === 'Pending Verification' && (
                              <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.2rem' }}>
                                <button 
                                  onClick={() => handleVerifyPayment(order.id, 'Paid')} 
                                  className="admin-btn admin-btn-sm admin-btn-success"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', flex: 1 }}
                                >
                                  Approve Pay
                                </button>
                                <button 
                                  onClick={() => handleVerifyPayment(order.id, 'Payment Rejected')} 
                                  className="admin-btn admin-btn-sm admin-btn-danger"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', flex: 1 }}
                                >
                                  Reject Pay
                                </button>
                              </div>
                            )}

                            {/* Delivery Partner Dropdown Selector */}
                            <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                              <span style={{ fontSize: '0.72rem', color: '#B8B8B8', fontWeight: 700 }}>Courier Assignment:</span>
                              <select 
                                className="admin-form-select"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: '100%', borderColor: order.delivery_partner_id ? '#10b981' : 'rgba(255,255,255,0.08)' }}
                                value={order.delivery_partner_id || ''}
                                onChange={async (e) => {
                                  const partnerId = e.target.value;
                                  const partnerUser = users.find(u => u.id === partnerId);
                                  const randomOtp = Math.floor(1000 + Math.random() * 9000).toString(); // prefilled dynamic random 4-digit code
                                  
                                  await supabase.from('orders').update({
                                    delivery_partner_id: partnerId,
                                    delivery_partner_name: partnerUser ? (partnerUser.full_name || partnerUser.name) : '',
                                    delivery_status: partnerId ? 'assigned' : '',
                                    delivery_otp: partnerId ? randomOtp : ''
                                  }).eq('id', order.id);

                                  if (partnerId) {
                                    try {
                                      await supabase.from('notifications').insert({
                                        user_id: partnerId,
                                        title: 'New Delivery Assigned 🛵',
                                        message: `You have been assigned Order ${order.id} for delivery to ${order.customer_name || 'Customer'}.`,
                                        type: 'delivery_assigned'
                                      });
                                      await supabase.from('notifications').insert({
                                        user_id: order.user_id,
                                        title: 'Delivery Partner Assigned 🛵',
                                        message: `Your order ${order.id} has been assigned to ${partnerUser?.full_name || partnerUser?.name || 'Delivery Partner'} (OTP: ${randomOtp}).`,
                                        type: 'delivery_assigned'
                                      });
                                    } catch (nErr) {
                                      console.error('Failed to trigger assignment notifications:', nErr);
                                    }
                                  }

                                  loadData();
                                }}
                              >
                                <option value="">Unassigned</option>
                                {users.filter(u => u.user_type === 'delivery_partner' && u.status === 'active').map(u => (
                                  <option key={u.id} value={u.id}>{u.full_name || u.name}</option>
                                ))}
                              </select>
                              {order.delivery_partner_id && (
                                <div style={{ fontSize: '0.72rem', color: order.delivery_status === 'delivered' ? '#10b981' : '#D4AF37', marginTop: '0.15rem' }}>
                                  Status: <span style={{ textTransform: 'capitalize', fontWeight: 800 }}>{order.delivery_status || 'assigned'}</span>
                                  {order.delivery_otp && ` (OTP: ${order.delivery_otp})`}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td data-label="Order ID" colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
                          No orders placed in this branch database.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 7: Analytics Dashboard */}
          {activeTab === 'analytics' && (
            <div>
              {/* Financial metrics row */}
              <div className="admin-cards-grid">
                <div className="admin-card">
                  <div className="admin-card-header">Today's Sales</div>
                  <div className="admin-card-value">₹{stats.todaySales}</div>
                </div>

                <div className="admin-card">
                  <div className="admin-card-header">Weekly Sales</div>
                  <div className="admin-card-value">₹{stats.weeklySales}</div>
                </div>

                <div className="admin-card">
                  <div className="admin-card-header">Monthly Sales</div>
                  <div className="admin-card-value">₹{stats.monthlySales}</div>
                </div>

                <div className="admin-card">
                  <div className="admin-card-header">B2B Revenue</div>
                  <div className="admin-card-value" style={{ color: 'var(--color-gold)' }}>₹{stats.b2bRevenue}</div>
                </div>

                <div className="admin-card">
                  <div className="admin-card-header">B2C Revenue</div>
                  <div className="admin-card-value" style={{ color: 'var(--color-red)' }}>₹{stats.b2cRevenue}</div>
                </div>
              </div>

              {/* Operational metrics row */}
              <div className="admin-cards-grid" style={{ marginTop: '1.25rem' }}>
                <div className="admin-card">
                  <div className="admin-card-header">Today's Orders</div>
                  <div className="admin-card-value">{stats.todayOrdersCount}</div>
                </div>

                <div className="admin-card">
                  <div className="admin-card-header">Pending Orders</div>
                  <div className="admin-card-value" style={{ color: 'var(--color-gold)' }}>{stats.pendingOrdersCount}</div>
                </div>

                <div className="admin-card">
                  <div className="admin-card-header">Total Customers</div>
                  <div className="admin-card-value">{stats.totalCustomers}</div>
                </div>

                <div className="admin-card">
                  <div className="admin-card-header">Total Products</div>
                  <div className="admin-card-value">{stats.totalProductsCount}</div>
                </div>
              </div>

              {/* Dynamic graph & list */}
              <div className="admin-grid-2">
                
                {/* Sales by Category Graph */}
                <div className="admin-section-card">
                  <h2 className="admin-section-title" style={{ marginBottom: '1.5rem' }}>Sales Revenue by Category (₹)</h2>
                  <div className="admin-bar-chart">
                    {Object.entries(getSalesByCategory()).map(([cat, total]) => {
                      // Calculate height percentage relative to highest category total
                      const maxVal = Math.max(...Object.values(getSalesByCategory()), 100);
                      const heightPercent = Math.max((total / maxVal) * 100, 5);
                      return (
                        <div key={cat} className="admin-bar-col">
                          <span className="admin-bar-val">₹{total}</span>
                          <div 
                            className={`admin-bar ${cat === 'Chicken' || cat === 'Seafood' ? 'red' : 'gold'}`} 
                            style={{ height: `${heightPercent}%` }}
                          />
                          <span className="admin-bar-label">{cat}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top Selling Products */}
                <div className="admin-section-card">
                  <h2 className="admin-section-title" style={{ marginBottom: '1.25rem' }}>Top Selling Products (Quantities Ordered)</h2>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Product Name</th>
                          <th>Units Sold</th>
                          <th>Total Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getTopProducts().map((prod, idx) => (
                          <tr key={idx}>
                            <td data-label="Rank"><strong>#{idx + 1}</strong></td>
                            <td data-label="Product Name"><strong>{prod.name}</strong></td>
                            <td data-label="Units Sold">{prod.quantity} kg/pack</td>
                            <td data-label="Total Revenue"><strong>₹{prod.total}</strong></td>
                          </tr>
                        ))}
                        {getTopProducts().length === 0 && (
                          <tr>
                            <td data-label="Rank" colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', color: '#888' }}>No order analytics available.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Tab 8: Settings panel */}
          {activeTab === 'settings' && (
            <div className="admin-grid-2">
              <div className="admin-section-card">
                <h2 className="admin-section-title" style={{ marginBottom: '1.25rem' }}>Turbhe Branch Controls</h2>
                
                <div className="admin-form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
                  <div>
                    <strong>Branch Operations State</strong>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>Toggle branch open or temporarily closed.</div>
                  </div>
                  <button 
                    onClick={() => setShopSettings({...shopSettings, isOpen: !shopSettings.isOpen})}
                    className={`admin-btn ${shopSettings.isOpen ? 'admin-btn-success' : 'admin-btn-danger'}`}
                  >
                    {shopSettings.isOpen ? 'STORE OPEN' : 'STORE CLOSED'}
                  </button>
                </div>

                <div className="admin-grid-2" style={{ marginTop: '1.5rem' }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Delivery Fee (₹)</label>
                    <input 
                      type="number" 
                      className="admin-form-input" 
                      value={shopSettings.deliveryFee} 
                      onChange={e => setShopSettings({...shopSettings, deliveryFee: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Free Delivery Above (₹)</label>
                    <input 
                      type="number" 
                      className="admin-form-input" 
                      value={shopSettings.freeDeliveryAbove ?? 999} 
                      onChange={e => setShopSettings({...shopSettings, freeDeliveryAbove: Number(e.target.value)})} 
                    />
                  </div>
                </div>

                <div className="admin-grid-2" style={{ marginTop: '1.5rem' }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Min B2C Order Amount (₹)</label>
                    <input 
                      type="number" 
                      className="admin-form-input" 
                      value={shopSettings.minimumB2COrder} 
                      onChange={e => setShopSettings({...shopSettings, minimumB2COrder: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Min B2B Order Amount (₹)</label>
                    <input 
                      type="number" 
                      className="admin-form-input" 
                      value={shopSettings.minimumB2BOrder} 
                      onChange={e => setShopSettings({...shopSettings, minimumB2BOrder: Number(e.target.value)})} 
                    />
                  </div>
                </div>

                <div className="admin-form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', borderBottom: '1px solid #eee', marginTop: '1.5rem', padding: '1rem 0' }}>
                  <div>
                    <strong>WhatsApp Notifications System</strong>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>Trigger instant customer/admin redirection alerts.</div>
                  </div>
                  <button 
                    onClick={() => setShopSettings({...shopSettings, whatsappNotificationsEnabled: !shopSettings.whatsappNotificationsEnabled})}
                    className={`admin-btn ${shopSettings.whatsappNotificationsEnabled ? 'admin-btn-success' : 'admin-btn-danger'}`}
                  >
                    {shopSettings.whatsappNotificationsEnabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>

                <div className="admin-form-group" style={{ marginTop: '1.5rem' }}>
                  <label className="admin-form-label">Admin WhatsApp Number (For Placement Notifications)</label>
                  <input 
                    type="text" 
                    className="admin-form-input" 
                    value={shopSettings.adminWhatsappNumber} 
                    onChange={e => setShopSettings({...shopSettings, adminWhatsappNumber: e.target.value})} 
                  />
                </div>

                <button onClick={handleSaveSystemSettings} className="admin-btn admin-btn-primary" style={{ marginTop: '1.5rem' }}>Save System Parameters</button>
              </div>

              <div className="admin-section-card">
                <h2 className="admin-section-title" style={{ marginBottom: '1.25rem' }}>Central Branch Details</h2>
                <div style={{ lineHeight: '2' }}>
                  <p><strong>Owner Name:</strong> Aejaz Qureshi</p>
                  <p><strong>Branch Location:</strong> Turbhe, Sector 20 A/2 Shop No 2, Navi Mumbai</p>
                  <p><strong>Support Email:</strong> support@meatcity.com</p>
                  <p><strong>Branch Support:</strong> +91 7977630912</p>
                  <p><strong>Simulated Database Engine:</strong> Filesystem Local JSON Interceptor</p>
                </div>

                <div style={{ borderTop: '1px solid #eee', marginTop: '1.5rem', paddingTop: '1.5rem' }}>
                  <h3 className="admin-section-title" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Backup & Data Recovery</h3>
                  <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1.25rem', lineHeight: '1.4' }}>
                    Export system database tables to CSV format for local backup.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <button 
                      onClick={() => handleExportCSV('orders', orders)} 
                      className="admin-btn admin-btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.6rem 0.5rem', display: 'flex', gap: '0.25rem', alignItems: 'center', justifyContent: 'center' }}
                    >
                      📥 Orders
                    </button>
                    <button 
                      onClick={() => handleExportCSV('customers', users.filter(u => u.user_type !== 'admin'))} 
                      className="admin-btn admin-btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.6rem 0.5rem', display: 'flex', gap: '0.25rem', alignItems: 'center', justifyContent: 'center' }}
                    >
                      📥 Customers
                    </button>
                    <button 
                      onClick={() => handleExportCSV('products', products)} 
                      className="admin-btn admin-btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.6rem 0.5rem', display: 'flex', gap: '0.25rem', alignItems: 'center', justifyContent: 'center' }}
                    >
                      📥 Products
                    </button>
                    <button 
                      onClick={() => handleExportCSV('reviews', reviews)} 
                      className="admin-btn admin-btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.6rem 0.5rem', display: 'flex', gap: '0.25rem', alignItems: 'center', justifyContent: 'center' }}
                    >
                      📥 Reviews
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 10: B2B Payments Manual Approval */}
          {activeTab === 'payments' && (
            <div>
              <div className="admin-section-card">
                <h2 className="admin-section-title" style={{ marginBottom: '1.25rem' }}>Pending B2B Repayments</h2>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Customer / Business</th>
                        <th>Amount</th>
                        <th>Reference</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.filter(p => p.status === 'pending' || p.status === 'Pending Verification').map((p: any) => {
                        const customer = users.find(u => u.id === p.user_id);
                        return (
                          <tr key={p.id}>
                            <td data-label="Customer / Business">
                              <strong>{customer ? customer.business_name : 'Loading...'}</strong>
                              <div style={{ fontSize: '0.8rem', color: '#888' }}>
                                {customer ? customer.full_name : ''}
                              </div>
                            </td>
                            <td data-label="Amount" style={{ fontWeight: 800 }}>₹{p.amount}</td>
                            <td data-label="Reference"><code>{p.payment_ref}</code></td>
                            <td data-label="Date">{new Date(p.created_at).toLocaleString()}</td>
                            <td data-label="Status">
                              <span className="admin-badge admin-badge-warning">{p.status}</span>
                            </td>
                            <td data-label="Actions">
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  onClick={() => handleApprovePayment(p)}
                                  className="admin-btn admin-btn-success"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectPayment(p.id, p.user_id, p.amount)}
                                  className="admin-btn admin-btn-danger"
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {payments.filter(p => p.status === 'pending' || p.status === 'Pending Verification').length === 0 && (
                        <tr>
                          <td data-label="Customer / Business" colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#888' }}>
                            No pending B2B repayments in approval queue.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="admin-section-card" style={{ marginTop: '2rem' }}>
                <h2 className="admin-section-title" style={{ marginBottom: '1.25rem' }}>Repayment History Log</h2>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Customer / Business</th>
                        <th>Amount</th>
                        <th>Reference</th>
                        <th>Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.filter(p => p.status !== 'pending' && p.status !== 'Pending Verification').map((p: any) => {
                        const customer = users.find(u => u.id === p.user_id);
                        return (
                          <tr key={p.id}>
                            <td data-label="Customer / Business">
                              <strong>{customer ? customer.business_name : 'Loading...'}</strong>
                              <div style={{ fontSize: '0.8rem', color: '#888' }}>
                                {customer ? customer.full_name : ''}
                              </div>
                            </td>
                            <td data-label="Amount" style={{ fontWeight: 800 }}>₹{p.amount}</td>
                            <td data-label="Reference"><code>{p.payment_ref}</code></td>
                            <td data-label="Date">{new Date(p.created_at).toLocaleString()}</td>
                            <td data-label="Status">
                              <span className={`admin-badge ${p.status === 'approved' || p.status === 'Verified' ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {payments.filter(p => p.status !== 'pending' && p.status !== 'Pending Verification').length === 0 && (
                        <tr>
                          <td data-label="Customer / Business" colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: '#888' }}>
                            No past repayment transactions recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 11: Pincodes Management */}
          {activeTab === 'pincodes' && (
            <div className="admin-grid-2">
              <div className="admin-section-card">
                <h2 className="admin-section-title" style={{ marginBottom: '1.25rem' }}>Add Serviceable Pincode</h2>
                <form onSubmit={handleAddPincode} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Pincode</label>
                    <input 
                      type="text" 
                      className="admin-form-input" 
                      placeholder="Enter 6-digit Pincode (e.g. 400705)" 
                      value={newPincode}
                      onChange={e => setNewPincode(e.target.value)} 
                      required
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Delivery Charge (₹)</label>
                    <input 
                      type="number" 
                      className="admin-form-input" 
                      placeholder="Delivery Charge (e.g. 50)" 
                      value={newPincodeCharge}
                      onChange={e => setNewPincodeCharge(Number(e.target.value))} 
                      required
                      min={0}
                    />
                  </div>
                  <button type="submit" className="admin-btn admin-btn-primary" style={{ width: '100%' }}>Add Pincode</button>
                </form>
              </div>

              <div className="admin-section-card">
                <h2 className="admin-section-title" style={{ marginBottom: '1.25rem' }}>Active Serviceable Pincodes</h2>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Pincode</th>
                        <th>Delivery Charge</th>
                        <th>Created At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviceablePincodes.map(p => (
                        <tr key={p.pincode}>
                          <td data-label="Pincode"><strong>{p.pincode}</strong></td>
                          <td data-label="Delivery Charge">
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.85rem' }}>₹</span>
                              <input 
                                type="number" 
                                className="admin-form-input" 
                                style={{ width: '70px', padding: '0.25rem 0.5rem', margin: 0, height: 'auto', fontSize: '0.85rem' }}
                                value={p.delivery_charge ?? 50} 
                                onChange={e => {
                                  const val = Number(e.target.value);
                                  setServiceablePincodes(prev => prev.map(item => item.pincode === p.pincode ? { ...item, delivery_charge: val } : item));
                                }}
                              />
                              <button 
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase.from('serviceable_pincodes').update({ delivery_charge: p.delivery_charge }).eq('pincode', p.pincode);
                                    if (error) throw error;
                                    showToast('Delivery charge updated successfully for pincode ' + p.pincode, 'success');
                                    await loadData();
                                  } catch (err: any) {
                                    console.error('Error updating delivery charge', err);
                                    showToast(err.message || 'Failed to update delivery charge.', 'error');
                                  }
                                }}
                                className="admin-btn admin-btn-sm admin-btn-success"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              >
                                Save
                              </button>
                            </div>
                          </td>
                          <td data-label="Created At">{p.created_at ? new Date(p.created_at).toLocaleDateString() : 'System Seed'}</td>
                          <td data-label="Actions">
                            <button onClick={() => handleDeletePincode(p.pincode)} className="admin-btn admin-btn-sm admin-btn-danger">Delete</button>
                          </td>
                        </tr>
                      ))}
                      {serviceablePincodes.length === 0 && (
                        <tr>
                          <td data-label="Pincode" colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No pincodes defined. All checkouts will be blocked!</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 12: Coupon Configuration */}
          {activeTab === 'coupons' && (
            <div>
              {showCouponForm && (
                <div className="admin-section-card" style={{ border: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: '#111111', padding: '1.5rem', marginBottom: '2rem' }}>
                  <h3 className="admin-section-title" style={{ color: 'var(--color-red)', marginBottom: '1.25rem' }}>
                    {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                  </h3>
                  
                  <form onSubmit={handleSaveCoupon}>
                    <div className="admin-grid-3">
                      <div className="admin-form-group">
                        <label className="admin-form-label">Coupon Code</label>
                        <input type="text" className="admin-form-input" required value={couponForm.code} onChange={e => setCouponForm({...couponForm, code: e.target.value.toUpperCase()})} placeholder="e.g. SAVE20" disabled={!!editingCoupon} />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-form-label">Discount Percentage (%)</label>
                        <input type="number" className="admin-form-input" required value={couponForm.discount_percent} onChange={e => setCouponForm({...couponForm, discount_percent: Number(e.target.value)})} />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-form-label">Flat Discount (₹)</label>
                        <input type="number" className="admin-form-input" required value={couponForm.flat_discount} onChange={e => setCouponForm({...couponForm, flat_discount: Number(e.target.value)})} />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-form-label">Min Order Amount (₹)</label>
                        <input type="number" className="admin-form-input" required value={couponForm.min_order_amount} onChange={e => setCouponForm({...couponForm, min_order_amount: Number(e.target.value)})} />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-form-label">Expiry Date</label>
                        <input type="date" className="admin-form-input" required value={couponForm.expiry_date} onChange={e => setCouponForm({...couponForm, expiry_date: e.target.value})} />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-form-label">Usage Limit</label>
                        <input type="number" className="admin-form-input" required value={couponForm.usage_limit} onChange={e => setCouponForm({...couponForm, usage_limit: Number(e.target.value)})} />
                      </div>
                    </div>

                    <div className="admin-form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                      <input type="checkbox" id="couponActive" checked={couponForm.is_active} onChange={e => setCouponForm({...couponForm, is_active: e.target.checked})} />
                      <label htmlFor="couponActive" style={{ fontWeight: 700 }}>Enable Coupon Listing Active</label>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                      <button type="submit" className="admin-btn admin-btn-primary">Save Coupon</button>
                      <button type="button" onClick={() => setShowCouponForm(false)} className="admin-btn admin-btn-secondary">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="admin-section-card">
                <div className="admin-section-header">
                  <h2 className="admin-section-title">Active Coupons ({coupons.length})</h2>
                  <button 
                    onClick={() => {
                      setEditingCoupon(null);
                      setCouponForm({ code: '', discount_percent: 0, flat_discount: 0, min_order_amount: 0, expiry_date: '', usage_limit: 100, is_active: true });
                      setShowCouponForm(true);
                    }} 
                    className="admin-btn admin-btn-primary"
                  >
                    + Create Coupon
                  </button>
                </div>

                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Type</th>
                        <th>Discount Value</th>
                        <th>Min Order</th>
                        <th>Expiry</th>
                        <th>Limit</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.map(c => (
                        <tr key={c.code}>
                          <td data-label="Code"><strong>{c.code}</strong></td>
                          <td data-label="Type">{c.discount_percent > 0 ? 'Percentage' : 'Flat Discount'}</td>
                          <td data-label="Discount Value">{c.discount_percent > 0 ? `${c.discount_percent}%` : `₹${c.flat_discount}`}</td>
                          <td data-label="Min Order">₹{c.min_order_amount}</td>
                          <td data-label="Expiry">{c.expiry_date || 'None'}</td>
                          <td data-label="Limit">{c.usage_limit}</td>
                          <td data-label="Status">
                            <span onClick={() => handleToggleCoupon(c.code, c.is_active)} className={`admin-badge cursor-pointer ${c.is_active ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                              {c.is_active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td data-label="Actions">
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button onClick={() => {
                                setEditingCoupon(c);
                                setCouponForm({
                                  code: c.code,
                                  discount_percent: c.discount_percent,
                                  flat_discount: c.flat_discount,
                                  min_order_amount: c.min_order_amount,
                                  expiry_date: c.expiry_date || '',
                                  usage_limit: c.usage_limit || 100,
                                  is_active: c.is_active
                                });
                                setShowCouponForm(true);
                              }} className="admin-btn admin-btn-sm admin-btn-gold">Edit</button>
                              <button onClick={() => handleDeleteCoupon(c.code)} className="admin-btn admin-btn-sm admin-btn-danger">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {coupons.length === 0 && (
                        <tr>
                          <td data-label="Code" colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No coupons defined. Create one above!</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 13: Customer Reviews Moderation */}
          {activeTab === 'reviews' && (
            <div className="admin-section-card">
              <h2 className="admin-section-title" style={{ marginBottom: '1.25rem' }}>Customer Reviews Moderation Queue ({reviews.length})</h2>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th>Rating</th>
                      <th>Comment</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map(r => (
                      <tr key={r.id}>
                        <td data-label="Customer Name"><strong>{r.customer_name}</strong></td>
                        <td data-label="Rating" style={{ color: 'var(--color-gold)', fontWeight: 900 }}>
                          {'⭐'.repeat(r.rating)} ({r.rating}/5)
                        </td>
                        <td data-label="Comment" style={{ fontStyle: 'italic', maxWidth: '300px' }}>"{r.comment}"</td>
                        <td data-label="Status">
                          <span className={`admin-badge ${
                            r.status === 'approved' ? 'admin-badge-success' :
                            r.status === 'rejected' ? 'admin-badge-danger' :
                            'admin-badge-warning'
                          }`}>
                            {r.status.toUpperCase()}
                          </span>
                        </td>
                        <td data-label="Actions">
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            {r.status !== 'approved' && (
                              <button onClick={() => handleApproveReview(r.id)} className="admin-btn admin-btn-sm admin-btn-success">Approve</button>
                            )}
                            {r.status !== 'rejected' && (
                              <button onClick={() => handleRejectReview(r.id)} className="admin-btn admin-btn-sm admin-btn-danger">Reject</button>
                            )}
                            <button onClick={() => handleDeleteReview(r.id)} className="admin-btn admin-btn-sm admin-btn-secondary">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {reviews.length === 0 && (
                      <tr>
                        <td data-label="Customer" colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>No customer reviews submitted yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 9: Deliveries Management */}
          {activeTab === 'deliveries' && (
            <div>
              {/* Add / Edit Delivery Partner Form Panel */}
              {showPartnerForm && (
                <div className="admin-section-card" style={{ border: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: '#111111', padding: '1.5rem', marginBottom: '2rem' }}>
                  <h3 className="admin-section-title" style={{ color: 'var(--color-red)', marginBottom: '1rem' }}>
                    {editingPartner ? 'Edit Delivery Partner' : 'Add New Delivery Partner'}
                  </h3>
                  
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    
                    const payload = {
                      name: partnerForm.name,
                      full_name: partnerForm.name,
                      email: partnerForm.email,
                      mobile: partnerForm.mobile,
                      phone: partnerForm.mobile,
                      password: partnerForm.password,
                      status: partnerForm.status,
                      user_type: 'delivery_partner',
                      role: 'delivery_partner'
                    };

                    if (editingPartner) {
                      await supabase.from('users').update({
                        name: partnerForm.name,
                        full_name: partnerForm.name,
                        email: partnerForm.email,
                        mobile: partnerForm.mobile,
                        phone: partnerForm.mobile,
                        status: partnerForm.status
                      }).eq('id', editingPartner.id);
                    } else {
                      const res = await fetch('/api/admin/create-partner', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: partnerForm.name,
                          email: partnerForm.email,
                          mobile: partnerForm.mobile,
                          password: partnerForm.password,
                          status: partnerForm.status
                        })
                      });
                      const resData = await res.json();
                      if (resData.error) {
                        alert('Error creating delivery partner: ' + resData.error);
                        return;
                      }
                    }

                    setEditingPartner(null);
                    setPartnerForm({ name: '', email: '', mobile: '', password: 'password123', status: 'active' });
                    setShowPartnerForm(false);
                    loadData();
                  }}>
                    <div className="admin-grid-3">
                      <div className="admin-form-group">
                        <label className="admin-form-label">Full Name</label>
                        <input 
                          type="text" 
                          className="admin-form-input" 
                          required 
                          value={partnerForm.name} 
                          onChange={e => setPartnerForm({...partnerForm, name: e.target.value})} 
                          placeholder="Rashid Khan" 
                        />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-form-label">Email Address</label>
                        <input 
                          type="email" 
                          className="admin-form-input" 
                          required 
                          value={partnerForm.email} 
                          onChange={e => setPartnerForm({...partnerForm, email: e.target.value})} 
                          placeholder="rashid@meatcity.com" 
                        />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-form-label">Mobile Number</label>
                        <input 
                          type="tel" 
                          className="admin-form-input" 
                          required 
                          value={partnerForm.mobile} 
                          onChange={e => setPartnerForm({...partnerForm, mobile: e.target.value})} 
                          placeholder="10-digit phone" 
                        />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-form-label">Password</label>
                        <input 
                          type="password" 
                          className="admin-form-input" 
                          required 
                          value={partnerForm.password} 
                          onChange={e => setPartnerForm({...partnerForm, password: e.target.value})} 
                        />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-form-label">Account Status</label>
                        <select 
                          className="admin-form-select" 
                          value={partnerForm.status} 
                          onChange={e => setPartnerForm({...partnerForm, status: e.target.value})}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                      <button type="submit" className="admin-btn admin-btn-primary">Save Delivery Agent</button>
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowPartnerForm(false);
                          setEditingPartner(null);
                        }} 
                        className="admin-btn admin-btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Delivery Partners Table */}
              <div className="admin-section-card">
                <div className="admin-section-header">
                  <h2 className="admin-section-title">Delivery Partners Performance & Metrics ({users.filter(u => u.user_type === 'delivery_partner').length})</h2>
                  <button 
                    onClick={() => {
                      setEditingPartner(null);
                      setPartnerForm({ name: '', email: '', mobile: '', password: 'password123', status: 'active' });
                      setShowPartnerForm(true);
                    }} 
                    className="admin-btn admin-btn-primary"
                  >
                    + Add Partner
                  </button>
                </div>

                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Agent Name</th>
                        <th>Contact info</th>
                        <th>Status</th>
                        <th>Assigned</th>
                        <th>Delivered</th>
                        <th>COD Collected</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.filter(u => u.user_type === 'delivery_partner').map(p => {
                        const assignedCount = orders.filter(o => o.delivery_partner_id === p.id).length;
                        const deliveredCount = orders.filter(o => o.delivery_partner_id === p.id && o.delivery_status === 'delivered').length;
                        const codCollectedTotal = orders
                          .filter(o => o.delivery_partner_id === p.id && o.delivery_status === 'delivered' && o.payment_method?.toLowerCase().includes('cod'))
                          .reduce((sum, o) => sum + o.total, 0);

                        return (
                          <tr key={p.id}>
                            <td data-label="Agent Name"><strong>{p.full_name || p.name}</strong><br/><span style={{ fontSize: '0.75rem', color: '#666' }}>ID: {p.id}</span></td>
                            <td data-label="Contact info">
                              <span>📞 {p.phone || p.mobile}</span><br/>
                              <span style={{ fontSize: '0.8rem', color: '#666' }}>✉️ {p.email}</span>
                            </td>
                            <td data-label="Status">
                              <span className={`admin-badge ${p.status === 'active' ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                                {p.status === 'active' ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td data-label="Assigned"><strong style={{ color: 'var(--color-gold)' }}>{assignedCount}</strong> orders</td>
                            <td data-label="Delivered"><strong style={{ color: '#10b981' }}>{deliveredCount}</strong> completed</td>
                            <td data-label="COD Collected"><strong>₹{codCollectedTotal}</strong> collected</td>
                            <td data-label="Action">
                              <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <button 
                                  onClick={() => {
                                    setEditingPartner(p);
                                    setPartnerForm({
                                      name: p.full_name || p.name || '',
                                      email: p.email || '',
                                      mobile: p.phone || p.mobile || '',
                                      password: p.password || 'password123',
                                      status: p.status || 'active'
                                    });
                                    setShowPartnerForm(true);
                                  }} 
                                  className="admin-btn admin-btn-sm admin-btn-gold"
                                >
                                  Edit
                                </button>
                                <button 
                                  onClick={async () => {
                                    const nextStatus = p.status === 'active' ? 'inactive' : 'active';
                                    await supabase.from('users').update({ status: nextStatus }).eq('id', p.id);
                                    loadData();
                                  }} 
                                  className={`admin-btn admin-btn-sm ${p.status === 'active' ? 'admin-btn-secondary' : 'admin-btn-success'}`}
                                >
                                  {p.status === 'active' ? 'Deactivate' : 'Activate'}
                                </button>
                                <button 
                                  onClick={async () => {
                                    if (confirm('Delete this delivery partner account?')) {
                                      await supabase.from('users').delete().eq('id', p.id);
                                      loadData();
                                    }
                                  }} 
                                  className="admin-btn admin-btn-sm admin-btn-danger"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {users.filter(u => u.user_type === 'delivery_partner').length === 0 && (
                        <tr>
                          <td data-label="Agent Name" colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                            No delivery partners registered. Click "+ Add Partner" to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          <div style={{ height: '40px' }} />

        </div>
      </main>
      
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '12px 24px',
          borderRadius: '12px',
          backgroundColor: toast.type === 'success' ? '#10B981' : '#EF4444',
          color: '#ffffff',
          fontWeight: 600,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px)'
        }}>
          {toast.type === 'success' ? (
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
