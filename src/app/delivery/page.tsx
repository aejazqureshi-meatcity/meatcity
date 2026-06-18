"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  payment_status: string;
  status: string;
  delivery_status?: string;
  delivery_partner_id?: string;
  delivery_partner_name?: string;
  delivery_otp?: string;
  items: OrderItem[];
  created_at: string;
}

export default function DeliveryDashboard() {
  const [partner, setPartner] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'deliveries' | 'earnings'>('deliveries');
  const [loading, setLoading] = useState(true);

  // OTP Modal State
  const [verifyingOrder, setVerifyingOrder] = useState<Order | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  
  // Notification Log State (simulating SMS/Push alerts)
  const [notificationLog, setNotificationLog] = useState<string[]>([]);

  const supabase = createClient();
  const router = useRouter();

  // Load Data
  const loadDashboardData = async () => {
    // 1. Get logged-in partner
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/delivery/login');
      return;
    }
    setPartner(user);

    // 2. Fetch orders assigned to this partner
    const { data: ordersData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    const allOrders: Order[] = ordersData || [];
    const assigned = allOrders.filter(o => o.delivery_partner_id === user.id);
    setOrders(assigned);
    setLoading(false);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/delivery/login');
  };

  // Simulates sending SMS / Push notifications to Customer, Admin, and Partner
  const triggerNotification = (message: string) => {
    console.log(`[NOTIFICATION ALERT]: ${message}`);
    setNotificationLog(prev => [message, ...prev.slice(0, 4)]);
  };

  // Workflow Action Handlers
  const handleUpdateDeliveryStatus = async (orderId: string, nextStatus: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    let updatePayload: Partial<Order> = { delivery_status: nextStatus };
    let orderStatus = targetOrder.status;

    if (nextStatus === 'accepted') {
      triggerNotification(`Order ${orderId} accepted by Rashid Khan. Customer notified.`);
    } else if (nextStatus === 'picked_up') {
      triggerNotification(`Order ${orderId} picked up by Rashid Khan. Out for delivery shortly.`);
    } else if (nextStatus === 'out_for_delivery') {
      orderStatus = 'Out for Delivery';
      triggerNotification(`Order ${orderId} is Out for Delivery! Customer received tracking notification.`);
    } else if (nextStatus === 'delivered') {
      orderStatus = 'Delivered';
      updatePayload.payment_status = 'Paid';
      triggerNotification(`Order ${orderId} successfully delivered! Admin dashboard updated.`);
    } else if (nextStatus === 'failed_delivery') {
      orderStatus = 'Processing'; // returns to branch processing
      triggerNotification(`Delivery failed for Order ${orderId}. Returned to Turbhe branch.`);
    } else if (nextStatus === 'rejected') {
      // Release order from this partner
      updatePayload = {
        delivery_partner_id: '',
        delivery_partner_name: '',
        delivery_status: ''
      };
      triggerNotification(`Order ${orderId} rejected by partner Rashid Khan. Re-queued for assignment.`);
    }

    updatePayload.status = orderStatus;

    // Update in mock DB
    await supabase.from('orders').update(updatePayload).eq('id', orderId);
    await loadDashboardData();
  };

  // OTP Complete Delivery Submit
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingOrder) return;

    const correctOtp = verifyingOrder.delivery_otp || '6482'; // Default/seeded fallback
    if (enteredOtp !== correctOtp) {
      setOtpError('Invalid OTP. Please double-check with the customer.');
      return;
    }

    // Success! Update status to delivered
    await handleUpdateDeliveryStatus(verifyingOrder.id, 'delivered');
    setVerifyingOrder(null);
    setEnteredOtp('');
    setOtpError('');
  };

  // Summary Metrics calculations
  const todaySummary = {
    assigned: orders.filter(o => o.delivery_status === 'assigned').length,
    delivered: orders.filter(o => o.delivery_status === 'delivered').length,
    pending: orders.filter(o => o.delivery_status && ['accepted', 'picked_up', 'out_for_delivery'].includes(o.delivery_status)).length,
    codCollected: orders
      .filter(o => o.delivery_status === 'delivered' && o.payment_method?.toLowerCase().includes('cod'))
      .reduce((sum, o) => sum + o.total, 0)
  };

  // Payout calculation (₹50 incentive per successful delivery)
  const earnings = {
    today: orders.filter(o => o.delivery_status === 'delivered').length * 50,
    weekly: orders.filter(o => o.delivery_status === 'delivered').length * 50, // Mock weekly sum
    monthly: orders.filter(o => o.delivery_status === 'delivered').length * 50, // Mock monthly sum
    totalDeliveries: orders.filter(o => o.delivery_status === 'delivered').length,
    codCollected: todaySummary.codCollected
  };

  if (loading) return <div style={{ color: 'var(--color-gold)', textAlign: 'center', padding: '4rem' }}>Loading Delivery Portal...</div>;

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', backgroundColor: '#f3f4f6', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Mobile Top Header */}
      <header style={{ backgroundColor: '#111', color: 'white', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid var(--color-gold)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-gold)' }}>Meat City</h1>
          <span style={{ fontSize: '0.7rem', color: '#bbb' }}>Delivery Agent: {partner?.user_metadata?.full_name || 'Rashid Khan'}</span>
        </div>
        <button 
          onClick={handleLogout}
          style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Logout 🚪
        </button>
      </header>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <button 
          onClick={() => setActiveTab('deliveries')}
          style={{ flex: 1, padding: '1rem', border: 'none', background: 'none', borderBottom: activeTab === 'deliveries' ? '3px solid var(--color-red)' : 'none', fontWeight: 700, color: activeTab === 'deliveries' ? 'var(--color-red)' : '#6b7280' }}
        >
          📦 Active Deliveries ({orders.filter(o => o.delivery_status !== 'delivered' && o.delivery_status !== 'cancelled').length})
        </button>
        <button 
          onClick={() => setActiveTab('earnings')}
          style={{ flex: 1, padding: '1rem', border: 'none', background: 'none', borderBottom: activeTab === 'earnings' ? '3px solid var(--color-red)' : 'none', fontWeight: 700, color: activeTab === 'earnings' ? 'var(--color-red)' : '#6b7280' }}
        >
          💰 Earnings (₹{earnings.today})
        </button>
      </div>

      {/* Notification Simulator Bar */}
      {notificationLog.length > 0 && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#eff6ff', borderBottom: '1px solid #dbeafe', fontSize: '0.8rem', color: '#1e40af' }}>
          <strong style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#2563eb', marginBottom: '0.2rem' }}>🔔 Notification Log (Simulated)</strong>
          {notificationLog[0]}
        </div>
      )}

      {activeTab === 'deliveries' ? (
        <div style={{ padding: '1rem' }}>
          
          {/* Summary Metrics Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ backgroundColor: 'white', padding: '0.85rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Assigned Today</span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--color-black)' }}>{orders.length}</strong>
            </div>
            <div style={{ backgroundColor: 'white', padding: '0.85rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Delivered</span>
              <strong style={{ fontSize: '1.25rem', color: '#10b981' }}>{todaySummary.delivered}</strong>
            </div>
            <div style={{ backgroundColor: 'white', padding: '0.85rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Pending</span>
              <strong style={{ fontSize: '1.25rem', color: '#f59e0b' }}>{todaySummary.pending}</strong>
            </div>
            <div style={{ backgroundColor: 'white', padding: '0.85rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>COD Collection</span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--color-red)' }}>₹{todaySummary.codCollected}</strong>
            </div>
          </div>

          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem', textTransform: 'uppercase', color: '#4b5563' }}>Deliveries List</h3>

          {/* Delivery Queue Cards */}
          {orders.filter(o => o.delivery_status !== 'delivered' && o.delivery_status !== 'cancelled').length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', backgroundColor: 'white', borderRadius: '8px', color: '#888' }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>📭</span>
              No assigned deliveries. Relax or check back later!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {orders.filter(o => o.delivery_status !== 'delivered' && o.delivery_status !== 'cancelled').map(order => {
                const isCod = order.payment_method?.toLowerCase().includes('cod');
                
                return (
                  <div key={order.id} style={{ backgroundColor: 'white', borderRadius: '12px', borderLeft: '5px solid var(--color-gold)', padding: '1rem', boxShadow: '0 3px 6px rgba(0,0,0,0.05)' }}>
                    
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{order.id}</span>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        textTransform: 'uppercase', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '4px',
                        backgroundColor: 
                          order.delivery_status === 'assigned' ? '#fee2e2' :
                          order.delivery_status === 'accepted' ? '#eff6ff' :
                          order.delivery_status === 'picked_up' ? '#fef3c7' :
                          '#dcfce7',
                        color:
                          order.delivery_status === 'assigned' ? '#b91c1c' :
                          order.delivery_status === 'accepted' ? '#1e40af' :
                          order.delivery_status === 'picked_up' ? '#d97706' :
                          '#15803d'
                      }}>
                        {order.delivery_status}
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: '#374151' }}>
                      <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>👤 {order.customer_name}</div>
                      <div style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '0.4rem' }}>📞 {order.customer_phone}</div>
                      <div style={{ fontSize: '0.85rem', padding: '0.5rem', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                        📍 <strong>Address:</strong> {order.delivery_address}
                      </div>
                    </div>

                    {/* Order items summary */}
                    <div style={{ backgroundColor: '#fafafa', padding: '0.5rem', borderRadius: '6px', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                      <strong style={{ color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Items Ordered:</strong>
                      {order.items?.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                          <span>• {item.name} (x{item.quantity})</span>
                          <span>₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>

                    {/* Financial details */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '1rem', borderTop: '1px solid #f3f4f6', paddingTop: '0.5rem' }}>
                      <span>Payment: <strong style={{ color: isCod ? 'var(--color-red)' : '#10b981' }}>{order.payment_method}</strong></span>
                      <span>Total: <strong style={{ fontSize: '1rem' }}>₹{order.total}</strong></span>
                    </div>

                    {/* Action buttons based on status */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      
                      {order.delivery_status === 'assigned' && (
                        <>
                          <button 
                            onClick={() => handleUpdateDeliveryStatus(order.id, 'accepted')}
                            style={{ flex: 1, padding: '0.65rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                          >
                            Accept Order ✓
                          </button>
                          <button 
                            onClick={() => handleUpdateDeliveryStatus(order.id, 'rejected')}
                            style={{ padding: '0.65rem', backgroundColor: '#f3f4f6', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {order.delivery_status === 'accepted' && (
                        <button 
                          onClick={() => handleUpdateDeliveryStatus(order.id, 'picked_up')}
                          style={{ flex: 1, padding: '0.65rem', backgroundColor: '#d97706', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                        >
                          📦 Mark Picked Up
                        </button>
                      )}

                      {order.delivery_status === 'picked_up' && (
                        <button 
                          onClick={() => handleUpdateDeliveryStatus(order.id, 'out_for_delivery')}
                          style={{ flex: 1, padding: '0.65rem', backgroundColor: 'var(--color-red)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                        >
                          🛵 Mark Out For Delivery
                        </button>
                      )}

                      {order.delivery_status === 'out_for_delivery' && (
                        <button 
                          onClick={() => {
                            // Focus OTP overlay modal
                            setVerifyingOrder(order);
                            setEnteredOtp('');
                            setOtpError('');
                          }}
                          style={{ flex: 1, padding: '0.65rem', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                        >
                          🏁 Complete Delivery (OTP/COD)
                        </button>
                      )}

                      {/* Call and Navigation helper triggers */}
                      <a 
                        href={`tel:${order.customer_phone}`}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', padding: '0.5rem', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', cursor: 'pointer' }}
                        title="Call Customer"
                      >
                        📞 Call
                      </a>

                      <button 
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`, '_blank')}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 0.85rem', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        🗺️ Navigate
                      </button>

                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      ) : (
        // Earnings Tab
        <div style={{ padding: '1rem' }}>
          
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
              Payout Ledger Statement
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: '#4b5563' }}>Today's Earnings (₹50/del)</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--color-gold)' }}>₹{earnings.today}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: '#4b5563' }}>Weekly Earnings</span>
                <strong style={{ fontSize: '1.2rem' }}>₹{earnings.weekly}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: '#4b5563' }}>Monthly Earnings</span>
                <strong style={{ fontSize: '1.2rem' }}>₹{earnings.monthly}</strong>
              </div>
              <hr style={{ border: 'none', borderTop: '1px dashed #e5e7eb', margin: '0.5rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: '#4b5563' }}>Total Completed Deliveries</span>
                <strong style={{ fontSize: '1.1rem', color: '#10b981' }}>{earnings.totalDeliveries}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: '#4b5563' }}>Total COD Cash Collected</span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--color-red)' }}>₹{earnings.codCollected}</strong>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', color: '#4b5563', fontSize: '0.85rem', lineHeight: '1.5' }}>
            <strong>💡 Earnings Note:</strong> Incentive collection payouts are calculated at ₹50 per successful package verification completion. COD cash balances must be deposited at the Turbhe store outlet branch manager daily.
          </div>

        </div>
      )}

      {/* OTP Delivery Verification Overlay Modal */}
      {verifyingOrder && (
        <div className="flex-center" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1200, padding: '1rem' }}>
          <div className="checkout-card" style={{ maxWidth: '400px', width: '100%', backgroundColor: '#fff', padding: '1.75rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontWeight: 800, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-gold)' }}>
              🏁 Complete Order: {verifyingOrder.id}
            </h3>

            {/* COD Cash Collection Module prefilled checks */}
            {verifyingOrder.payment_method?.toLowerCase().includes('cod') && (
              <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#b45309', display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>💵 CASH ON DELIVERY ORDER</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Amount to Collect:</span>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--color-red)' }}>₹{verifyingOrder.total}</strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  Please collect cash from the customer first before entering the verification OTP.
                </div>
              </div>
            )}

            <form onSubmit={handleVerifyOtp}>
              {otpError && (
                <div style={{ color: 'var(--color-red)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem', textAlign: 'center' }}>
                  {otpError}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>
                  Enter Customer Delivery OTP
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  maxLength={4}
                  required
                  value={enteredOtp}
                  onChange={e => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 6482"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1.25rem', fontWeight: 800, textAlign: 'center', letterSpacing: '0.5rem' }}
                />
                <span style={{ fontSize: '0.7rem', color: '#6b7280', display: 'block', marginTop: '0.4rem', textAlign: 'center' }}>
                  Ask the customer for the 4-digit code shown in their Order History details. (Test OTP code is: <strong>{verifyingOrder.delivery_otp || '6482'}</strong>)
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button 
                  type="button" 
                  onClick={() => setVerifyingOrder(null)}
                  className="admin-btn admin-btn-secondary"
                  style={{ fontWeight: 700 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="admin-btn admin-btn-success"
                  style={{ fontWeight: 700 }}
                >
                  Confirm Delivery ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
