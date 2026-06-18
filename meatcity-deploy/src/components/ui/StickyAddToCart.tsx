"use client";

import React from 'react';

interface StickyAddToCartProps {
  price: number;
  unit: string;
  quantityInCart: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onAddToCart: () => void;
}

export function StickyAddToCart({
  price,
  unit,
  quantityInCart,
  onIncrement,
  onDecrement,
  onAddToCart
}: StickyAddToCartProps) {
  return (
    <div className="fixed bottom-[68px] left-0 right-0 z-40 bg-[#111111]/95 backdrop-blur-md border-t border-white/5 py-4 px-6 shadow-2xl">
      <div className="max-w-[480px] mx-auto flex justify-between items-center gap-4">
        {/* Left Side: Price info */}
        <div className="flex flex-col">
          <span className="text-text-secondary text-[10px] font-bold uppercase tracking-wider">Product Price</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-white text-lg font-extrabold">₹{price}</span>
            <span className="text-text-secondary text-[11px] font-medium">/{unit}</span>
          </div>
        </div>

        {/* Right Side: Button / Selector */}
        {quantityInCart > 0 ? (
          <div className="flex items-center bg-primary rounded-[12px] p-1 shadow-md border border-primary/20 min-w-[120px] justify-between">
            <button 
              onClick={onDecrement} 
              className="w-10 h-10 flex items-center justify-center text-white font-black text-base active:scale-75 transition-transform"
            >
              -
            </button>
            <span className="px-2 text-white font-extrabold text-sm select-none text-center">
              {quantityInCart}
            </span>
            <button 
              onClick={onIncrement} 
              className="w-10 h-10 flex items-center justify-center text-white font-black text-base active:scale-75 transition-transform"
            >
              +
            </button>
          </div>
        ) : (
          <button
            onClick={onAddToCart}
            className="flex-1 max-w-[200px] py-3.5 bg-primary hover:bg-red-700 active:scale-[0.98] text-white font-extrabold text-sm uppercase tracking-wider rounded-[12px] shadow-lg transition-all duration-200 text-center"
          >
            Add to Cart
          </button>
        )}
      </div>
    </div>
  );
}
