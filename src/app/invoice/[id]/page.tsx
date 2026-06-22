"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface OrderItem {
  product_id?: string;
  name?: string;
  product_name?: string;
  quantity?: number;
  qty?: number;
  price?: number;
  unit_price?: number;
  total?: number;
}

interface Order {
  id: string;
  created_at: string;
  customer_name: string;
  business_name?: string;
  customer_phone: string;
  delivery_address: string;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  payment_status: string;
  delivery_slot?: string;
  coupon_code?: string;
  coupon_discount?: number;
  items: OrderItem[];
}

export default function InvoicePage() {
  const { id } = useParams() || {};
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!id) return;

    const fetchOrder = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setOrder(data);
      } catch (err) {
        console.error('Failed to load order for invoice:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 bg-black text-white">
        <div className="relative w-16 h-16 animate-bounce">
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" stroke="#D4AF37" strokeWidth="3" fill="#111" />
            <path d="M30 65V35L50 50L70 35V65" stroke="#D60000" strokeWidth="6" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-gold text-xs font-extrabold uppercase tracking-wider animate-pulse">Loading Invoice...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6 bg-black text-white">
        <span className="text-5xl mb-4">⚠️</span>
        <h2 className="text-gold text-lg font-black uppercase">Invoice Not Found</h2>
        <p className="text-text-secondary text-xs mt-2 max-w-[280px]">
          We couldn't retrieve the details for order ID: {id}
        </p>
        <Link 
          href="/profile" 
          className="mt-6 px-5 py-3 bg-primary text-white text-xs font-extrabold uppercase rounded-[12px]"
        >
          Back to Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-primary py-8 px-4 print:bg-white print:text-black">
      {/* CSS overrides for print layout */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-border {
            border-color: #ddd !important;
          }
          .print-bg-gray {
            background-color: #f5f5f5 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-text-dark {
            color: #111 !important;
          }
          .print-text-muted {
            color: #666 !important;
          }
        }
      `}</style>

      <div className="max-w-[650px] mx-auto bg-neutral-900 border border-white/5 rounded-[24px] p-6 shadow-xl flex flex-col gap-6 print:border-0 print:bg-white print:shadow-none print:p-0">
        
        {/* Navigation & Actions Header */}
        <div className="no-print flex justify-between items-center pb-4 border-b border-white/5">
          <Link 
            href="/profile?tab=orders" 
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-white border border-white/5 text-xs font-bold rounded-[10px] transition-all"
          >
            ← Back to Orders
          </Link>
          <button 
            onClick={handlePrint}
            className="px-5 py-2.5 bg-gold hover:bg-yellow-600 text-black text-xs font-black uppercase rounded-[10px] transition-all flex items-center gap-1.5 shadow-md shadow-gold/5"
          >
            🖨️ Print / Download PDF
          </button>
        </div>

        {/* Invoice Header */}
        <div className="flex justify-between items-start border-b border-white/5 pb-5 print:border-gray-200">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tight text-white print:text-black">
              MEAT<span className="text-gold print:text-red-600">CITY</span>
            </h1>
            <span className="text-gold print:text-red-600 text-[8px] font-black uppercase tracking-[0.2em] mt-0.5">
              MEAT THAT MATTERS
            </span>
            <span className="text-[10px] text-text-secondary print:text-gray-500 font-bold mt-2">
              FSSAI: 21525016001365
            </span>
            <span className="text-[10px] text-text-secondary print:text-gray-500 font-bold">
              GSTIN: Applied For (NA)
            </span>
          </div>

          <div className="text-right flex flex-col gap-1">
            <span className="text-[9px] text-text-secondary print:text-gray-500 uppercase tracking-widest font-black block">Tax Invoice</span>
            <strong className="text-white print:text-black text-sm font-black uppercase">#{order.id}</strong>
            <span className="text-[10px] text-text-secondary print:text-gray-500 font-bold">
              Date: {new Date(order.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Customer, Delivery & Payment details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/5 border border-white/5 p-4 rounded-[16px] print:grid-cols-3 print:border-gray-200 print:bg-gray-50 print-bg-gray">
          <div className="flex flex-col gap-1 text-xs">
            <span className="text-[9px] text-text-secondary print:text-gray-500 uppercase tracking-wider font-extrabold">Bill To</span>
            <strong className="text-white print:text-black font-extrabold text-sm">
              {order.customer_name}
            </strong>
            {order.business_name && (
              <span className="text-text-secondary print:text-gray-600 font-bold">{order.business_name}</span>
            )}
            <span className="text-text-secondary print:text-gray-600 font-bold mt-1">📞 {order.customer_phone}</span>
          </div>

          <div className="flex flex-col gap-1 text-xs">
            <span className="text-[9px] text-text-secondary print:text-gray-500 uppercase tracking-wider font-extrabold">Delivery Details</span>
            <span className="text-white print:text-black font-semibold leading-relaxed line-clamp-2">
              {order.delivery_address}
            </span>
            <span className="text-gold print:text-red-600 font-extrabold mt-1 uppercase tracking-wide text-[10px]">
              Slot: {order.delivery_slot || 'ASAP'}
            </span>
          </div>

          <div className="flex flex-col gap-1 text-xs">
            <span className="text-[9px] text-text-secondary print:text-gray-500 uppercase tracking-wider font-extrabold">Payment Details</span>
            <span className="text-white print:text-black font-extrabold uppercase">
              {order.payment_method || 'COD'}
            </span>
            <span className={`font-extrabold mt-1 uppercase text-[10px] ${order.payment_status?.toLowerCase() === 'paid' ? 'text-emerald-400 print:text-emerald-600' : 'text-amber-400 print:text-amber-600'}`}>
              Status: {order.payment_status || 'Pending'}
            </span>
          </div>
        </div>

        {/* Product Items Table */}
        <div className="flex flex-col">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 text-text-secondary print:border-gray-200 print:text-gray-500 font-black">
                <th className="py-2.5 font-bold uppercase tracking-wider">Item Details</th>
                <th className="py-2.5 pr-4 text-right font-bold uppercase tracking-wider">Rate</th>
                <th className="py-2.5 pr-4 text-center font-bold uppercase tracking-wider">Qty</th>
                <th className="py-2.5 text-right font-bold uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items && order.items.map((item, index) => {
                const name = item.product_name || item.name || 'Cut';
                const rate = item.unit_price || item.price || 0;
                const qty = item.quantity || item.qty || 0;
                const amt = item.total || (rate * qty);

                return (
                  <tr key={index} className="border-b border-white/5 print:border-gray-200 print:text-black">
                    <td className="py-3 font-extrabold">{name}</td>
                    <td className="py-3 pr-4 text-right font-bold text-text-secondary print:text-gray-600">₹{rate}</td>
                    <td className="py-3 pr-4 text-center font-bold">{qty}</td>
                    <td className="py-3 text-right font-extrabold text-white print:text-black">₹{amt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Calculation Totals */}
        <div className="flex justify-end pt-2">
          <div className="w-[240px] flex flex-col gap-2.5 text-xs">
            <div className="flex justify-between text-text-secondary print:text-gray-600">
              <span>Subtotal</span>
              <span className="text-white print:text-black font-semibold">₹{order.subtotal}</span>
            </div>
            
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-400 font-bold">
                <span>Discount {order.coupon_code ? `(${order.coupon_code})` : ''}</span>
                <span>-₹{order.discount}</span>
              </div>
            )}

            <div className="flex justify-between text-text-secondary print:text-gray-600 border-b border-white/5 pb-2.5 print:border-gray-200">
              <span>Delivery Fee</span>
              <span className="text-white print:text-black">
                {order.delivery_fee === 0 ? 'FREE' : `₹${order.delivery_fee}`}
              </span>
            </div>

            <div className="flex justify-between items-center pt-1.5">
              <span className="text-white print:text-black font-black text-sm uppercase">Total Owed</span>
              <span className="text-gold print:text-red-600 font-extrabold text-base">₹{order.total}</span>
            </div>
          </div>
        </div>

        {/* Trust certification footer in PDF */}
        <div className="mt-4 pt-5 border-t border-white/5 print:border-gray-200 flex flex-col items-center gap-3 text-center">
          <div className="flex gap-4 items-center justify-center flex-wrap opacity-85">
            <span className="text-[10px] text-text-secondary print:text-gray-500 font-bold flex items-center gap-1">
              🛡️ Quality Assured
            </span>
            <span className="text-[10px] text-text-secondary print:text-gray-500 font-bold flex items-center gap-1">
              🧼 Hygienic Processing
            </span>
            <span className="text-[10px] text-text-secondary print:text-gray-500 font-bold flex items-center gap-1">
              ❄️ Fresh Daily
            </span>
            <span className="text-[10px] text-text-secondary print:text-gray-500 font-bold flex items-center gap-1">
              📦 Safe Packaging
            </span>
          </div>

          <div className="text-[9px] text-text-secondary print:text-gray-400 max-w-[340px] leading-relaxed mt-1">
            MeatCity Navi Mumbai: A/2 Room No.126, Shop No.2, Sector 20, Turbhe, Navi Mumbai - 400705.
            For delivery questions, call 7977630912.
          </div>
        </div>
      </div>
    </div>
  );
}
