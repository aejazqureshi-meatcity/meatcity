"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  user_type: 'admin' | 'b2c' | 'b2b' | 'delivery_partner';
  status: 'pending' | 'approved' | 'rejected' | 'suspended' | 'active' | 'inactive';
}

interface Address {
  id: string;
  name: string;
  roomNumber: string;
  sectorArea: string;
  pincode: string;
  addressLine: string;
  phone: string;
}

interface Order {
  id: string;
  created_at: string;
  total: number;
  status: string;
  delivery_slot?: string;
  items: any[];
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'addresses' | 'support'>('profile');

  // Address CRUD States
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddEditAddress, setShowAddEditAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState({ name: '', roomNumber: '', sectorArea: '', pincode: '', phone: '' });
  const [serviceablePincodes, setServiceablePincodes] = useState<string[]>([]);
  
  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);

  // Review System States
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'orders') {
        setActiveTab('orders');
      } else if (tabParam === 'addresses') {
        setActiveTab('addresses');
      }
    }
  }, []);

  // Load Initial User & Data
  useEffect(() => {
    const init = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.push('/login?redirect=profile');
        return;
      }
      setUser(currentUser);

      // Fetch profile
      const { data: dbProfile } = await supabase.from('users').select('*').eq('id', currentUser.id).single();
      if (dbProfile) {
        setProfile(dbProfile);
      } else {
        setProfile({
          id: currentUser.id,
          email: currentUser.email || '',
          full_name: currentUser.user_metadata?.full_name || 'Customer',
          phone: currentUser.user_metadata?.phone || currentUser.phone || '',
          user_type: currentUser.user_metadata?.user_type || 'b2c',
          status: currentUser.user_metadata?.status || 'active'
        });
      }

      // Fetch serviceable pincodes
      try {
        const { data: pinData } = await supabase.from('serviceable_pincodes').select('pincode');
        if (pinData) {
          setServiceablePincodes(pinData.map((p: any) => p.pincode));
        }
      } catch (e) {
        console.warn('Failed to load serviceable pincodes:', e);
      }

      // Fetch Addresses from DB
      await loadAddresses(currentUser.id);

      // Fetch Orders
      await loadOrders(currentUser.id);

      setLoading(false);
    };

    init();
  }, []);

  // Real-time updates subscription for orders
  useEffect(() => {
    if (!user) return;
    
    loadOrders(user.id);

    const channel = supabase
      .channel(`user-orders-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        (payload: any) => {
          console.log('[REALTIME LOG] Order changed:', payload);
          loadOrders(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadAddresses = async (userId: string) => {
    try {
      const { data: addrData } = await supabase.from('addresses').select('*').eq('user_id', userId);
      const localKey = `meatcity_addresses_${userId}`;
      if (addrData && addrData.length > 0) {
        const mappedAddrs: Address[] = addrData.map((a: any) => ({
          id: a.id,
          name: a.name,
          roomNumber: a.room_number || '',
          sectorArea: a.sector_area || '',
          pincode: a.pincode || '',
          addressLine: a.address_line || `${a.room_number || ''}, ${a.sector_area || ''}, Pincode: ${a.pincode || ''}`,
          phone: a.phone || ''
        }));
        setAddresses(mappedAddrs);
        localStorage.setItem(localKey, JSON.stringify(mappedAddrs));
      } else {
        // Fallback to local storage if DB is empty
        const saved = localStorage.getItem(localKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          setAddresses(parsed);
          // Sync to DB
          for (const item of parsed) {
            await supabase.from('addresses').insert({
              user_id: userId,
              name: item.name,
              room_number: item.roomNumber,
              sector_area: item.sectorArea,
              pincode: item.pincode,
              address_line: item.addressLine,
              phone: item.phone
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to load addresses:', err);
    }
  };

  const loadOrders = async (userId: string) => {
    try {
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (orderData) {
        setOrders(orderData);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.name || !newAddress.roomNumber || !newAddress.sectorArea || !newAddress.pincode || !newAddress.phone) {
      alert('Please fill in all address fields.');
      return;
    }

    const addressLine = `${newAddress.roomNumber}, ${newAddress.sectorArea}, Pincode: ${newAddress.pincode}`;

    try {
      if (editingAddressId) {
        // Update Address
        const { error } = await supabase
          .from('addresses')
          .update({
            name: newAddress.name,
            room_number: newAddress.roomNumber,
            sector_area: newAddress.sectorArea,
            pincode: newAddress.pincode,
            address_line: addressLine,
            phone: newAddress.phone
          })
          .eq('id', editingAddressId);

        if (error) throw error;
      } else {
        // Insert Address
        const { error } = await supabase
          .from('addresses')
          .insert({
            user_id: user.id,
            name: newAddress.name,
            room_number: newAddress.roomNumber,
            sector_area: newAddress.sectorArea,
            pincode: newAddress.pincode,
            address_line: addressLine,
            phone: newAddress.phone
          });

        if (error) throw error;
      }

      // Reload
      await loadAddresses(user.id);
      setNewAddress({ name: '', roomNumber: '', sectorArea: '', pincode: '', phone: '' });
      setShowAddEditAddress(false);
      setEditingAddressId(null);
    } catch (err: any) {
      alert('Error saving address: ' + err.message);
    }
  };

  const handleEditAddress = (addr: Address) => {
    setEditingAddressId(addr.id);
    setNewAddress({
      name: addr.name,
      roomNumber: addr.roomNumber,
      sectorArea: addr.sectorArea,
      pincode: addr.pincode,
      phone: addr.phone
    });
    setShowAddEditAddress(true);
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      const { error } = await supabase.from('addresses').delete().eq('id', id);
      if (error) throw error;
      await loadAddresses(user.id);
    } catch (err: any) {
      alert('Error deleting address: ' + err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(`meatcity_addresses_${user?.id || ''}`);
    localStorage.removeItem('meatcity_cart');
    window.dispatchEvent(new Event('cart-updated'));
    router.push('/login');
    router.refresh();
  };

  const openReviewModal = (order: Order) => {
    setReviewOrder(order);
    setRating(5);
    setReviewComment('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewOrder || !profile) return;
    setReviewSubmitting(true);

    try {
      const { error } = await supabase.from('reviews').insert({
        user_id: user.id,
        customer_name: profile.full_name,
        rating,
        comment: reviewComment,
        status: 'pending' // Admin must moderate
      });

      if (error) throw error;

      alert('Thank you! Your review has been submitted for approval.');
      setShowReviewModal(false);
      setReviewOrder(null);
    } catch (err: any) {
      alert('Error submitting review: ' + err.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      case 'confirmed': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'processing': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'out for delivery': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'delivered': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'cancelled': return 'text-red-500 bg-red-500/10 border-red-500/30';
      default: return 'text-text-secondary bg-white/5 border-white/10';
    }
  };

  const renderOrderTimeline = (status: string) => {
    const cleanStatus = status.toLowerCase();
    if (cleanStatus === 'cancelled') {
      return (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 p-3 rounded-[12px] text-red-500 text-[10px] font-black uppercase justify-center">
          <span>❌</span> Order Cancelled
        </div>
      );
    }

    const steps = [
      { label: 'Placed', active: true },
      { label: 'Confirmed', active: ['confirmed', 'processing', 'out for delivery', 'delivered'].includes(cleanStatus) },
      { label: 'Preparing', active: ['processing', 'out for delivery', 'delivered'].includes(cleanStatus) },
      { label: 'Out for Delivery', active: ['out for delivery', 'delivered'].includes(cleanStatus) },
      { label: 'Delivered', active: cleanStatus === 'delivered' }
    ];

    return (
      <div className="flex items-center justify-between gap-1 bg-white/5 border border-white/5 p-3.5 rounded-[12px]">
        {steps.map((step, idx) => (
          <React.Fragment key={idx}>
            <div className="flex flex-col items-center gap-1 flex-1 text-center">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border transition-all ${
                step.active 
                  ? 'bg-gold border-gold text-black' 
                  : 'bg-neutral-900 border-white/10 text-text-secondary'
              }`}>
                {step.active ? '✓' : idx + 1}
              </div>
              <span className={`text-[8px] font-extrabold uppercase tracking-tight ${
                step.active ? 'text-white' : 'text-text-secondary'
              }`}>
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`h-[2px] flex-1 max-w-[24px] ${
                steps[idx + 1].active ? 'bg-gold' : 'bg-white/10'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
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
        <p className="text-gold text-xs font-extrabold uppercase tracking-wider animate-pulse">Loading Profile...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 flex flex-col gap-6 bg-black min-h-screen text-white font-primary">
      {/* Top Banner Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-white/5">
        <div className="w-14 h-14 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center text-gold text-2xl font-black">
          {profile?.full_name?.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col">
          <h2 className="text-white text-lg font-black tracking-tight leading-none uppercase">
            {profile?.full_name}
          </h2>
          <span className="text-[10px] text-gold font-extrabold uppercase tracking-wider mt-1.5 bg-gold/10 px-2.5 py-0.5 rounded-full w-max">
            {profile?.user_type === 'b2b' ? 'Wholesale Partner' : 'Retail Customer'}
          </span>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-white/5 border border-white/5 rounded-[12px] text-center text-xs">
        {(['profile', 'orders', 'addresses', 'support'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setShowAddEditAddress(false);
              setEditingAddressId(null);
            }}
            className={`py-2 rounded-[9px] font-extrabold uppercase tracking-tight transition-all ${
              activeTab === tab 
                ? 'bg-gold text-black shadow-md' 
                : 'text-text-secondary hover:text-white'
            }`}
          >
            {tab === 'profile' && 'Profile'}
            {tab === 'orders' && 'Orders'}
            {tab === 'addresses' && 'Addresses'}
            {tab === 'support' && 'Support'}
          </button>
        ))}
      </div>

      {/* Profile Details Tab */}
      {activeTab === 'profile' && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-300">
          <div className="bg-neutral-900 border border-white/5 rounded-[16px] p-5 flex flex-col gap-4">
            <h3 className="text-white text-xs font-extrabold uppercase tracking-wide border-b border-white/5 pb-2">
              👤 Personal Information
            </h3>
            
            <div className="flex flex-col gap-3.5">
              <div>
                <span className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold block">Full Name</span>
                <span className="text-white text-sm font-bold block mt-0.5">{profile?.full_name}</span>
              </div>
              <div>
                <span className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold block">Mobile Number</span>
                <span className="text-white text-sm font-bold block mt-0.5">{profile?.phone || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold block">Email Address</span>
                <span className="text-white text-sm font-bold block mt-0.5">{profile?.email}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Link 
              href="/about"
              className="flex justify-between items-center px-5 py-4 bg-neutral-900 hover:bg-neutral-850 border border-white/5 rounded-[16px] text-white text-sm font-bold transition-all active:scale-[0.98]"
            >
              <span>ℹ️ About MeatCity</span>
              <span className="text-gold">→</span>
            </Link>

            <button 
              onClick={handleLogout}
              className="w-full py-4 bg-primary/10 border border-primary/20 hover:bg-primary/15 text-primary font-black text-sm uppercase tracking-wider rounded-[16px] transition-transform active:scale-[0.98]"
            >
              🚪 Sign Out Account
            </button>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
            <h3 className="text-white text-sm font-extrabold uppercase tracking-wide">
              📦 Order History
            </h3>
            <span className="text-[10px] text-text-secondary font-bold animate-pulse">
              ● Auto Refreshing
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12 bg-neutral-900 border border-white/5 rounded-[16px] flex flex-col items-center justify-center p-6 gap-2">
              <span className="text-4xl">🛒</span>
              <h4 className="text-white font-extrabold text-sm mt-2">No Orders Found</h4>
              <p className="text-text-secondary text-xs leading-relaxed max-w-[200px]">
                You haven't placed any orders with us yet.
              </p>
              <Link 
                href="/" 
                className="mt-3 px-5 py-2.5 bg-primary text-white text-[11px] font-extrabold uppercase rounded-[10px]"
              >
                Order Now
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {orders.map(order => (
                <div key={order.id} className="bg-neutral-900 border border-white/5 rounded-[16px] p-4.5 flex flex-col gap-3">
                  <div className="flex justify-between items-start border-b border-white/5 pb-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-white text-xs font-black">#{order.id}</span>
                      <span className="text-[10px] text-text-secondary font-semibold">
                        {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>

                  {renderOrderTimeline(order.status)}

                  <div className="flex justify-between items-center text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-text-secondary">Delivery Slot:</span>
                      <span className="text-white font-bold">{order.delivery_slot || 'ASAP'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-text-secondary block text-[10px]">Total Amount</span>
                      <strong className="text-gold font-extrabold text-sm">₹{order.total}</strong>
                    </div>
                  </div>

                  <div className="flex justify-between items-center gap-2 pt-2 border-t border-white/5">
                    <Link 
                      href={`/invoice/${order.id}`}
                      className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-white border border-white/5 text-[10px] font-extrabold uppercase rounded-[10px] transition-all"
                    >
                      📄 Download Invoice
                    </Link>

                    {order.status.toLowerCase() === 'delivered' && (
                      <button 
                        onClick={() => openReviewModal(order)}
                        className="px-4 py-2 bg-gold hover:bg-yellow-600 text-black text-[10px] font-black uppercase rounded-[10px] transition-all"
                      >
                        ⭐ Write Review
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Saved Addresses Tab */}
      {activeTab === 'addresses' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
            <h3 className="text-white text-sm font-extrabold uppercase tracking-wide">
              📍 Saved Addresses
            </h3>
            {!showAddEditAddress && (
              <button 
                onClick={() => setShowAddEditAddress(true)}
                className="text-primary text-xs font-bold uppercase hover:underline"
              >
                + Add New
              </button>
            )}
          </div>

          {showAddEditAddress && (
            <form onSubmit={handleSaveAddress} className="bg-neutral-900 border border-white/5 p-4 rounded-[16px] flex flex-col gap-3.5">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="font-extrabold text-xs text-white uppercase tracking-wider">
                  {editingAddressId ? '📝 Edit Address' : '📍 Add New Address'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddEditAddress(false);
                    setEditingAddressId(null);
                    setNewAddress({ name: '', roomNumber: '', sectorArea: '', pincode: '', phone: '' });
                  }}
                  className="text-text-secondary text-xs hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Label</label>
                  <input 
                    type="text" 
                    required 
                    value={newAddress.name} 
                    onChange={e => setNewAddress({...newAddress, name: e.target.value})} 
                    placeholder="Home / Shop / Office"
                    className="bg-neutral-850 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none focus:border-gold/30"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Contact Number</label>
                  <input 
                    type="tel" 
                    required 
                    value={newAddress.phone} 
                    onChange={e => setNewAddress({...newAddress, phone: e.target.value})} 
                    placeholder="10-digit number"
                    className="bg-neutral-850 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none focus:border-gold/30"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Room / Shop / Flat Number</label>
                <input 
                  type="text" 
                  required 
                  value={newAddress.roomNumber} 
                  onChange={e => setNewAddress({...newAddress, roomNumber: e.target.value})} 
                  placeholder="e.g. Room No 126, Shop 2, A/2"
                  className="bg-neutral-850 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none focus:border-gold/30"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Sector / Area</label>
                <input 
                  type="text" 
                  required 
                  value={newAddress.sectorArea} 
                  onChange={e => setNewAddress({...newAddress, sectorArea: e.target.value})} 
                  placeholder="e.g. Sector 20, Turbhe"
                  className="bg-neutral-850 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none focus:border-gold/30"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Pincode</label>
                <input 
                  type="text" 
                  required 
                  value={newAddress.pincode} 
                  onChange={e => setNewAddress({...newAddress, pincode: e.target.value})} 
                  placeholder="e.g. 400705"
                  className="bg-neutral-850 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none focus:border-gold/30"
                />
                {newAddress.pincode && serviceablePincodes.length > 0 && !serviceablePincodes.includes(newAddress.pincode) && (
                  <p className="text-primary text-[10px] font-bold mt-1">
                    ⚠️ Warning: Delivery is currently unavailable in this pincode.
                  </p>
                )}
              </div>

              <button 
                type="submit" 
                className="w-full mt-2 py-3 bg-primary hover:bg-red-750 text-white font-extrabold text-xs uppercase rounded-[12px] active:scale-95 transition-all shadow-md"
              >
                {editingAddressId ? 'Save Changes' : 'Add Address'}
              </button>
            </form>
          )}

          {addresses.length === 0 ? (
            <div className="text-center py-10 bg-neutral-900 border border-white/5 rounded-[16px] p-6 text-xs text-text-secondary font-bold">
              No saved addresses found. Add one to speed up checkout!
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {addresses.map(addr => (
                <div key={addr.id} className="bg-neutral-900 border border-white/5 rounded-[16px] p-4 flex justify-between items-start gap-4">
                  <div className="flex-1 flex flex-col gap-1">
                    <span className="font-extrabold text-xs text-white">{addr.name}</span>
                    <p className="text-[11px] text-text-secondary leading-relaxed mt-0.5">{addr.addressLine}</p>
                    <span className="text-[10px] text-text-secondary font-bold mt-1">📞 {addr.phone}</span>
                  </div>

                  <div className="flex gap-2.5">
                    <button 
                      onClick={() => handleEditAddress(addr)}
                      className="text-gold text-xs font-bold hover:underline"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="text-primary text-xs font-bold hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Help & Support Tab */}
      {activeTab === 'support' && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-300">
          <div className="bg-neutral-900 border border-white/5 rounded-[16px] p-5 flex flex-col gap-4">
            <h3 className="text-white text-xs font-extrabold uppercase tracking-wide border-b border-white/5 pb-2">
              📞 Help & Customer Support
            </h3>
            <p className="text-text-secondary text-xs leading-relaxed">
              If you have any issues with your order, delivery schedule, quality of cuts, or payment verification, please reach out to our team directly.
            </p>

            <div className="flex flex-col gap-4 mt-2">
              {/* Contact 1 */}
              <div className="bg-white/5 border border-white/5 p-4 rounded-[12px] flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gold uppercase font-bold tracking-wider">Owner</span>
                    <strong className="text-white text-sm font-extrabold mt-0.5">Aejaz Qureshi</strong>
                    <span className="text-[10px] text-text-secondary font-bold mt-0.5">📞 +91 7977630912</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <a 
                    href="tel:7977630912" 
                    className="py-2.5 bg-neutral-800 hover:bg-neutral-750 text-white text-xs font-black uppercase rounded-[8px] text-center border border-white/5 active:scale-[0.98] transition-all"
                  >
                    Call Us
                  </a>
                  <a 
                    href="https://wa.me/917977630912?text=Hi%20Aejaz,%20I%20need%2520support%20with%20my%20MeatCity%20order."
                    target="_blank; noreferrer"
                    className="py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-black uppercase rounded-[8px] text-center active:scale-[0.98] transition-all"
                  >
                    WhatsApp Us
                  </a>
                </div>
              </div>

              {/* Contact 2 */}
              <div className="bg-white/5 border border-white/5 p-4 rounded-[12px] flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gold uppercase font-bold tracking-wider">Owner</span>
                    <strong className="text-white text-sm font-extrabold mt-0.5">Salim Qureshi</strong>
                    <span className="text-[10px] text-text-secondary font-bold mt-0.5">📞 +91 9594332989</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <a 
                    href="tel:9594332989" 
                    className="py-2.5 bg-neutral-800 hover:bg-neutral-750 text-white text-xs font-black uppercase rounded-[8px] text-center border border-white/5 active:scale-[0.98] transition-all"
                  >
                    Call Us
                  </a>
                  <a 
                    href="https://wa.me/919594332989?text=Hi%20Salim,%20I%20need%2520support%20with%20my%20MeatCity%20order."
                    target="_blank; noreferrer"
                    className="py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-black uppercase rounded-[8px] text-center active:scale-[0.98] transition-all"
                  >
                    WhatsApp Us
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW RATING MODAL */}
      {showReviewModal && reviewOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <form onSubmit={handleSubmitReview} className="bg-[#111111] border border-white/10 p-5 rounded-[16px] w-full max-w-[360px] flex flex-col gap-4">
            <h3 className="text-gold text-sm font-black uppercase tracking-wide">
              ⭐ Write Product Review
            </h3>
            <p className="text-text-secondary text-[11px] leading-relaxed">
              Submit your experience for Order <strong>#{reviewOrder.id}</strong>. Your review helps us maintain premium quality.
            </p>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Star Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="text-2xl transition-transform active:scale-125 focus:outline-none"
                  >
                    {star <= rating ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">Review Comment</label>
              <textarea
                required
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                placeholder="Describe freshness, hygienic packaging or delivery speed..."
                className="bg-neutral-800 border border-white/5 text-white rounded-[12px] p-3 text-xs outline-none min-h-[90px] focus:border-gold/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <button 
                type="button"
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewOrder(null);
                }}
                disabled={reviewSubmitting}
                className="py-2.5 bg-neutral-850 text-white font-bold text-xs rounded-[10px] border border-white/5 active:scale-95"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={reviewSubmitting || !reviewComment}
                className="py-2.5 bg-gold hover:bg-yellow-600 disabled:opacity-40 text-black font-black text-xs rounded-[10px] active:scale-95 shadow-md"
              >
                {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
