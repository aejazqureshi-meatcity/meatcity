'use client';
import React, { useState } from 'react';

// This component must be a client component because it uses React state

export default function MobileHeader({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="app-header mobile-header">
        <button
          className="hamburger"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
        >
          ☰
        </button>
        <div className="brand-title">
          Meat <span>City</span>
        </div>
      </header>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
      )}

      {/* Mobile drawer */}
      <nav className={`mobile-drawer ${drawerOpen ? 'open' : ''}`}>
        <ul className="drawer-menu">
          <li><a href="/admin/dashboard">Dashboard</a></li>
          <li><a href="/admin/orders">Orders</a></li>
          <li><a href="/admin/products">Products</a></li>
          <li><a href="/admin/delivery">Delivery Partners</a></li>
          <li><a href="/admin/b2b">B2B</a></li>
          <li><a href="/admin/settings">Settings</a></li>
        </ul>
      </nav>

      {children}
    </>
  );
}
