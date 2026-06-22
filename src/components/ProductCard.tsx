"use client";

import React, { useState } from 'react';

interface Variant {
  weight: string;
  price_b2c: number;
  price_b2b: number;
}

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
  variants?: Variant[] | string;
  stock_status?: string; // 'Available', 'Low Stock', 'Out Of Stock'
}

interface ProductCardProps {
  product: Product;
  userRole: 'guest' | 'b2c' | 'b2b';
  cart: { [key: string]: number };
  onIncrement: (productId: string, variantWeight?: string) => void;
  onDecrement: (productId: string, variantWeight?: string) => void;
  onAddToCart: (productId: string, variantWeight?: string) => void;
  isWishlisted: boolean;
  onToggleWishlist: () => void;
}

export default function ProductCard({
  product,
  userRole,
  cart,
  onIncrement,
  onDecrement,
  onAddToCart,
  isWishlisted,
  onToggleWishlist
}: ProductCardProps) {
  // Parse variants if they are stored as JSON string
  const variants: Variant[] = product.variants
    ? (typeof product.variants === 'string'
        ? JSON.parse(product.variants)
        : product.variants)
    : [];

  const [selectedVariant, setSelectedVariant] = useState<string | null>(
    variants.length > 0 ? variants[0].weight : null
  );

  // Calculate dynamic price based on active variant
  let price = userRole === 'b2b' ? product.price_b2b : product.price_b2c;
  if (selectedVariant && variants.length > 0) {
    const activeVariant = variants.find(v => v.weight === selectedVariant);
    if (activeVariant) {
      price = userRole === 'b2b' ? activeVariant.price_b2b : activeVariant.price_b2c;
    }
  }

  // Get active key in the cart
  const cartKey = selectedVariant ? `${product.id}_${selectedVariant}` : product.id;
  const quantityInCart = cart[cartKey] || 0;

  const isOutOfStock = product.stock_status === 'Out Of Stock';
  const isLowStock = product.stock_status === 'Low Stock';

  return (
    <div 
      className={`bg-[#111111] border border-white/5 rounded-[16px] overflow-hidden flex flex-col justify-between shadow-lg transition-all duration-200 w-full relative ${
        isOutOfStock ? 'opacity-55 grayscale-[30%]' : 'active:scale-[0.99]'
      }`}
    >
      {/* Product Image and Badges */}
      <div className="relative aspect-square w-full bg-neutral-900 flex items-center justify-center overflow-hidden">
        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist();
          }}
          disabled={isOutOfStock}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-black/60 backdrop-blur-md border border-white/10 text-sm z-10 transition-transform active:scale-90`}
          aria-label="Toggle Wishlist"
        >
          {isWishlisted ? '❤️' : '🤍'}
        </button>

        {/* Status Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full w-max">
            Halal Fresh
          </span>
          {isOutOfStock && (
            <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-red-500/25 text-red-400 border border-red-500/40 rounded-full w-max shadow-md animate-pulse">
              Out Of Stock
            </span>
          )}
          {isLowStock && !isOutOfStock && (
            <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-500/25 text-amber-400 border border-amber-500/40 rounded-full w-max shadow-md">
              Only Few Left
            </span>
          )}
        </div>

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
          
          {/* Variants Selector */}
          {variants.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-2.5 mb-1">
              {variants.map(v => (
                <button
                  key={v.weight}
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => setSelectedVariant(v.weight)}
                  className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-full border transition-all ${
                    selectedVariant === v.weight
                      ? 'bg-gold/10 text-gold border-gold/30'
                      : 'bg-white/5 text-text-secondary border-white/5 hover:border-white/10'
                  }`}
                >
                  {v.weight}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-1">
          <div className="flex flex-col">
            <span className="text-white text-base font-extrabold tracking-tight">₹{price}</span>
            <span className="text-[10px] text-text-secondary font-medium">
              /{selectedVariant || product.unit}
            </span>
          </div>

          {isOutOfStock ? (
            <button
              disabled
              className="px-4 py-2 bg-neutral-800 text-neutral-500 font-extrabold text-[10px] uppercase rounded-[12px] border border-white/5 cursor-not-allowed select-none"
            >
              Sold Out
            </button>
          ) : quantityInCart > 0 ? (
            <div className="flex items-center bg-primary rounded-[12px] p-0.5 shadow-md border border-primary/20">
              <button 
                onClick={() => onDecrement(product.id, selectedVariant || undefined)} 
                className="w-8 h-8 flex items-center justify-center text-white font-black text-sm active:scale-75 transition-transform"
              >
                -
              </button>
              <span className="px-2 text-white font-extrabold text-xs select-none min-w-[20px] text-center">
                {quantityInCart}
              </span>
              <button 
                onClick={() => onIncrement(product.id, selectedVariant || undefined)} 
                className="w-8 h-8 flex items-center justify-center text-white font-black text-sm active:scale-75 transition-transform"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={() => onAddToCart(product.id, selectedVariant || undefined)}
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
