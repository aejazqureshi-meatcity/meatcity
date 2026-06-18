"use client";

import React from 'react';

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
}

interface ProductCardProps {
  product: Product;
  userRole: 'guest' | 'b2c' | 'b2b';
  quantityInCart: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onAddToCart: () => void;
  isWishlisted: boolean;
  onToggleWishlist: () => void;
}

export default function ProductCard({
  product,
  userRole,
  quantityInCart,
  onIncrement,
  onDecrement,
  onAddToCart,
  isWishlisted,
  onToggleWishlist
}: ProductCardProps) {
  const price = userRole === 'b2b' ? product.price_b2b : product.price_b2c;

  return (
    <div className="bg-[#111111] border border-white/5 rounded-[16px] overflow-hidden flex flex-col justify-between shadow-lg transition-transform duration-200 active:scale-[0.99] w-full">
      {/* Product Image and Badges */}
      <div className="relative aspect-square w-full bg-neutral-900 flex items-center justify-center overflow-hidden">
        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist();
          }}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-black/60 backdrop-blur-md border border-white/10 text-sm z-10 transition-transform active:scale-90`}
          aria-label="Toggle Wishlist"
        >
          {isWishlisted ? '❤️' : '🤍'}
        </button>

        {/* Halal Badge */}
        <span className="absolute top-3 left-3 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full z-10">
          Halal Fresh
        </span>

        {/* Image */}
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=500&auto=format&fit=crop&q=60";
            }}
          />
        ) : (
          <span className="text-4xl select-none">🥩</span>
        )}
      </div>

      {/* Info and Actions */}
      <div className="p-4 flex flex-col justify-between flex-1 gap-3">
        <div className="flex flex-col gap-1">
          <h4 className="text-white font-extrabold text-sm tracking-tight leading-tight line-clamp-1">{product.name}</h4>
          <p className="text-text-secondary text-xs line-clamp-2 leading-relaxed h-8">{product.description}</p>
        </div>

        <div className="flex justify-between items-center mt-1">
          <div className="flex flex-col">
            <span className="text-white text-base font-extrabold tracking-tight">₹{price}</span>
            <span className="text-[10px] text-text-secondary font-medium">/{product.unit}</span>
          </div>

          {quantityInCart > 0 ? (
            <div className="flex items-center bg-primary rounded-[12px] p-0.5 shadow-md border border-primary/20">
              <button 
                onClick={onDecrement} 
                className="w-8 h-8 flex items-center justify-center text-white font-black text-sm active:scale-75 transition-transform"
              >
                -
              </button>
              <span className="px-2 text-white font-extrabold text-xs select-none min-w-[20px] text-center">
                {quantityInCart}
              </span>
              <button 
                onClick={onIncrement} 
                className="w-8 h-8 flex items-center justify-center text-white font-black text-sm active:scale-75 transition-transform"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={onAddToCart}
              className="px-5 py-2 bg-primary hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-[12px] shadow-md transition-all duration-200"
            >
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
