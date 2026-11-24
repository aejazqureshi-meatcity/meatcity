"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

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
  stock_status?: string;
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
  const router = useRouter();

  // Parse variants if they are stored as JSON string
  const variants: Variant[] = product.variants
    ? (typeof product.variants === 'string'
        ? JSON.parse(product.variants)
        : product.variants)
    : [];

  const [selectedVariant, setSelectedVariant] = useState<string | null>(
    variants.length > 0 ? variants[0].weight : null
  );

  // Dynamic price calculation
  let price = userRole === 'b2b' ? product.price_b2b : product.price_b2c;
  if (selectedVariant && variants.length > 0) {
    const activeVariant = variants.find(v => v.weight === selectedVariant);
    if (activeVariant) {
      price = userRole === 'b2b' ? activeVariant.price_b2b : activeVariant.price_b2c;
    }
  }

  const cartKey = selectedVariant ? `${product.id}_${selectedVariant}` : product.id;
  const quantityInCart = cart[cartKey] || 0;

  const isOutOfStock = product.stock_status === 'Out Of Stock';
  const isLowStock = product.stock_status === 'Low Stock';

  // Subtitle extractor helper
  const getSubtitle = () => {
    const desc = product.description || '';
    if (desc.includes('•')) {
      return desc.split('\n')[0];
    }
    const cat = product.category.toLowerCase();
    if (cat.includes('chicken')) return 'Skinless • Bone-in';
    if (cat.includes('mutton')) return 'Tender • Curry Cut';
    if (cat.includes('seafood')) return 'Cleaned • Descaled';
    if (cat.includes('egg')) return 'Farm Fresh • Graded';
    return 'Freshly Cut • Hygienic';
  };

  const handleCardClick = () => {
    router.push(`/product/${product.id}`);
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`group bg-surface border border-border rounded-[18px] overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer relative ${
        isOutOfStock ? 'opacity-60 grayscale-[25%]' : 'active:scale-[0.99]'
      }`}
    >
      {/* Product Image and Tray Container */}
      <div className="relative aspect-square w-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden flex items-center justify-center p-2.5">
        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist();
          }}
          disabled={isOutOfStock}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center bg-white/80 dark:bg-black/60 backdrop-blur-md border border-black/5 dark:border-white/10 text-xs z-10 transition-transform active:scale-90 hover:scale-105"
          aria-label="Toggle Wishlist"
        >
          {isWishlisted ? '❤️' : '🤍'}
        </button>

        {/* Status Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full w-max flex items-center gap-1 backdrop-blur-md">
            <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Halal
          </span>

          {userRole === 'b2b' && (
            <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide bg-gold/15 text-gold border border-gold/30 rounded-full w-max backdrop-blur-md">
              Wholesale
            </span>
          )}

          {isOutOfStock && (
            <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wide bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 rounded-full w-max">
              Out of Stock
            </span>
          )}

          {isLowStock && !isOutOfStock && (
            <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wide bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-full w-max">
              Few Left
            </span>
          )}
        </div>

        {/* Product Image inside rounded tray */}
        <div className="w-full h-full rounded-[14px] overflow-hidden bg-black/5 dark:bg-black/40 flex items-center justify-center">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=500&auto=format&fit=crop&q=60";
              }}
            />
          ) : (
            <span className="text-4xl select-none">🥩</span>
          )}
        </div>
      </div>

      {/* Info & Action Row */}
      <div className="p-3.5 flex flex-col justify-between flex-1 gap-2.5">
        <div className="flex flex-col gap-0.5">
          <h4 className="text-text-primary font-black text-sm tracking-tight leading-snug line-clamp-1 group-hover:text-primary transition-colors">
            {product.name}
          </h4>
          <p className="text-text-secondary text-xs font-medium line-clamp-1">
            {getSubtitle()}
          </p>
          <span className="text-[11px] text-text-secondary font-semibold mt-0.5">
            {selectedVariant || product.unit || '1 kg'}
          </span>

          {/* Variants Selector */}
          {variants.length > 1 && (
            <div className="flex gap-1 flex-wrap mt-2" onClick={(e) => e.stopPropagation()}>
              {variants.map(v => (
                <button
                  key={v.weight}
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => setSelectedVariant(v.weight)}
                  className={`px-2 py-0.5 text-[9px] font-black rounded-full border transition-all ${
                    selectedVariant === v.weight
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-text-secondary border-border hover:border-primary/30'
                  }`}
                >
                  {v.weight}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Price & Add to Cart row */}
        <div className="flex justify-between items-center pt-1 border-t border-border" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col">
            <span className="text-text-primary text-base sm:text-lg font-black tracking-tight leading-none">
              ₹{price}
            </span>
            {userRole === 'b2b' && (
              <span className="text-[9px] text-gold font-bold uppercase mt-0.5">
                Wholesale /kg
              </span>
            )}
          </div>

          {isOutOfStock ? (
            <button
              disabled
              className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-400 font-extrabold text-[11px] rounded-[10px] cursor-not-allowed select-none"
            >
              Sold Out
            </button>
          ) : quantityInCart > 0 ? (
            <div className="flex items-center bg-primary text-white rounded-[10px] p-0.5 shadow-sm">
              <button 
                onClick={() => onDecrement(product.id, selectedVariant || undefined)} 
                className="w-7 h-7 flex items-center justify-center font-black text-sm active:scale-75 transition-transform"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="px-2 font-black text-xs select-none min-w-[18px] text-center">
                {quantityInCart}
              </span>
              <button 
                onClick={() => onIncrement(product.id, selectedVariant || undefined)} 
                className="w-7 h-7 flex items-center justify-center font-black text-sm active:scale-75 transition-transform"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={() => onAddToCart(product.id, selectedVariant || undefined)}
              className="px-3.5 py-1.5 bg-primary hover:bg-[#B80000] active:scale-95 text-white font-black text-xs uppercase tracking-wide rounded-[10px] shadow-sm transition-all duration-200"
            >
              + ADD
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
