"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

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

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  const supabase = createClient();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'guest' | 'b2c' | 'b2b'>('guest');
  const [selectedWeight, setSelectedWeight] = useState<string>('1kg');
  const [cuttingPreference, setCuttingPreference] = useState<string>('Medium');
  const [quantity, setQuantity] = useState<number>(1);
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [isWishlisted, setIsWishlisted] = useState<boolean>(false);
  const [addedToast, setAddedToast] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<boolean>(false);

  // Load product and user role
  useEffect(() => {
    const fetchData = async () => {
      try {
        // User session & role
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: dbProfile } = await supabase.from('users').select('*').eq('id', user.id).single();
          if (dbProfile) {
            setUserRole(dbProfile.user_type === 'b2b' ? 'b2b' : 'b2c');
            if (dbProfile.user_type === 'b2b') {
              setQuantity(5); // Minimum wholesale order quantity
            }
          }
        }

        // Fetch product from Supabase
        const { data: prodData, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (prodData && !error) {
          setProduct(prodData);
          if (prodData.variants) {
            const vList = typeof prodData.variants === 'string' ? JSON.parse(prodData.variants) : prodData.variants;
            if (vList && vList.length > 0) {
              setSelectedWeight(vList[0].weight);
            }
          }
        } else {
          // Fallback product data if not found or offline
          setProduct({
            id: productId || 'prod-1',
            name: 'Fresh Chicken Curry Cut',
            description: 'Fresh skinless chicken, cut into bone-in pieces. Ideal for homemade chicken curry, masala and gravy dishes.',
            category: 'Chicken',
            price_b2c: 280,
            price_b2b: 220,
            unit: '1 kg',
            image_url: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800&auto=format&fit=crop&q=80',
            stock: 50,
            stock_status: 'Available'
          });
        }

        // Wishlist state
        const savedWishlist = localStorage.getItem('meatcity_wishlist');
        if (savedWishlist) {
          try {
            const list = JSON.parse(savedWishlist);
            setIsWishlisted(list.includes(productId));
          } catch (e) {}
        }
      } catch (err) {
        console.error('Failed to load product details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchData();
    }
  }, [productId]);

  const toggleWishlist = () => {
    let savedWishlist: string[] = [];
    try {
      savedWishlist = JSON.parse(localStorage.getItem('meatcity_wishlist') || '[]');
    } catch (e) {}

    let updated: string[];
    if (savedWishlist.includes(productId)) {
      updated = savedWishlist.filter(id => id !== productId);
      setIsWishlisted(false);
    } else {
      updated = [...savedWishlist, productId];
      setIsWishlisted(true);
    }
    localStorage.setItem('meatcity_wishlist', JSON.stringify(updated));
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name || 'MeatCity',
          text: `Order fresh ${product?.name} from MeatCity — Meat that matters.`,
          url: window.location.href,
        });
      } catch (e) {}
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2500);
      } catch (e) {}
    }
  };

  // Weight options
  const defaultWeights = ['250g', '500g', '1kg', '2kg'];
  const variantsList: Variant[] = product?.variants
    ? (typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants)
    : [];

  const weightOptions = variantsList.length > 0 
    ? variantsList.map(v => v.weight) 
    : defaultWeights;

  // Calculate current unit price
  const calculateUnitPrice = (): number => {
    if (!product) return 0;
    const basePrice = userRole === 'b2b' ? product.price_b2b : product.price_b2c;

    if (variantsList.length > 0) {
      const activeVariant = variantsList.find(v => v.weight === selectedWeight);
      if (activeVariant) {
        return userRole === 'b2b' ? activeVariant.price_b2b : activeVariant.price_b2c;
      }
    }

    // Weight multiplier calculation if no exact variant
    if (selectedWeight === '250g') return Math.round(basePrice * 0.28);
    if (selectedWeight === '500g') return Math.round(basePrice * 0.52);
    if (selectedWeight === '1kg') return basePrice;
    if (selectedWeight === '2kg') return Math.round(basePrice * 1.95);
    return basePrice;
  };

  const unitPrice = calculateUnitPrice();
  const totalPrice = unitPrice * quantity;

  const handleAddToCart = () => {
    if (!product) return;

    try {
      const savedCart = localStorage.getItem('meatcity_cart');
      const cartObj = savedCart ? JSON.parse(savedCart) : {};
      const cartKey = `${product.id}_${selectedWeight}`;

      cartObj[cartKey] = (cartObj[cartKey] || 0) + quantity;
      localStorage.setItem('meatcity_cart', JSON.stringify(cartObj));

      // Also store custom cutting instructions in session if provided
      if (specialInstructions.trim()) {
        try {
          const notesKey = `meatcity_instructions_${product.id}`;
          localStorage.setItem(notesKey, `${cuttingPreference} cut: ${specialInstructions.trim()}`);
        } catch (e) {}
      }

      window.dispatchEvent(new Event('cart-updated'));

      setAddedToast(true);
      setTimeout(() => setAddedToast(false), 2500);
    } catch (e) {
      console.error('Failed to add to cart:', e);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-text-secondary text-xs font-bold uppercase tracking-wider animate-pulse">
          Loading product...
        </p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 px-6 text-center">
        <span className="text-4xl">🥩</span>
        <h3 className="text-text-primary text-base font-extrabold">Product Not Found</h3>
        <p className="text-text-secondary text-xs max-w-[260px]">
          The product cut you are looking for is currently unavailable or has been moved.
        </p>
        <Link
          href="/"
          className="px-5 py-2.5 bg-primary text-white text-xs font-black uppercase rounded-[12px] shadow-sm hover:bg-[#B80000] active:scale-95 transition-all"
        >
          Back to Store
        </Link>
      </div>
    );
  }

  const isOutOfStock = product.stock_status === 'Out Of Stock';

  return (
    <div className="flex flex-col w-full pb-32 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-text-primary hover:text-primary font-bold text-sm transition-colors active:scale-95"
          aria-label="Go back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-extrabold text-sm tracking-tight">Product Details</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Wishlist Button */}
          <button
            onClick={toggleWishlist}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 border border-border text-base active:scale-90 transition-transform"
            aria-label="Wishlist"
          >
            {isWishlisted ? '❤️' : '🤍'}
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 border border-border text-text-primary active:scale-90 transition-transform"
            aria-label="Share"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Share Toast */}
      {shareToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg border border-white/10 animate-in fade-in duration-200">
          Link copied to clipboard! 📋
        </div>
      )}

      {/* Added Toast */}
      {addedToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-extrabold px-5 py-2.5 rounded-full shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <span>✓</span> Added {quantity} item{quantity > 1 ? 's' : ''} to cart!
        </div>
      )}

      {/* Product Hero Image inside card container */}
      <div className="px-4 pt-2">
        <div className="relative w-full aspect-square sm:aspect-[4/3] rounded-[24px] overflow-hidden bg-neutral-950 flex items-center justify-center shadow-sm border border-border">
          <img
            src={product.image_url || 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800&auto=format&fit=crop&q=80'}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=800&auto=format&fit=crop&q=80";
            }}
          />
        </div>
      </div>

      {/* Content Body */}
      <div className="px-5 py-4 flex flex-col gap-5">
        {/* Badges & Category */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Halal
          </span>

          <span className="text-xs font-extrabold text-text-secondary uppercase tracking-wider">
            {product.category}
          </span>
        </div>

        {/* Title & Subtitle */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black text-text-primary tracking-tight leading-snug">
            {product.name}
          </h1>
          <p className="text-xs text-text-secondary font-medium">
            Skinless • Bone-in • Freshly cut
          </p>
        </div>

        {/* Price Tag in Bold Red */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-primary tracking-tight">
            ₹{unitPrice}
          </span>
          <span className="text-xs text-text-secondary font-semibold">
            /{selectedWeight}
          </span>
          {userRole === 'b2b' && (
            <span className="ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-gold/15 text-gold border border-gold/30">
              Wholesale Rate
            </span>
          )}
        </div>

        {/* Select Weight Section */}
        <div className="flex flex-col gap-2.5 pt-2 border-t border-border">
          <label className="text-xs font-extrabold text-text-primary tracking-tight">
            Select weight
          </label>
          <div className="flex flex-wrap gap-4 items-center">
            {weightOptions.map((w) => {
              const isSelected = selectedWeight === w;
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => setSelectedWeight(w)}
                  className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-text-primary hover:text-primary transition-colors focus:outline-none"
                >
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? 'border-neutral-900 dark:border-white bg-transparent'
                      : 'border-neutral-400 dark:border-neutral-600'
                  }`}>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-neutral-900 dark:bg-white" />}
                  </span>
                  <span>{w}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cutting Preference Section */}
        <div className="flex flex-col gap-2.5 pt-2 border-t border-border">
          <label className="text-xs font-extrabold text-text-primary tracking-tight">
            Cutting preference
          </label>
          <div className="flex gap-2">
            {['Small', 'Medium', 'Large'].map((cut) => {
              const isSelected = cuttingPreference === cut;
              return (
                <button
                  key={cut}
                  type="button"
                  onClick={() => setCuttingPreference(cut)}
                  className={`flex-1 py-2 px-3 rounded-full text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-neutral-200 dark:bg-neutral-800 text-text-primary font-black shadow-xs'
                      : 'bg-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {cut}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quantity Stepper */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <label className="text-xs font-extrabold text-text-primary tracking-tight uppercase">
            Quantity
          </label>
          <div className="flex items-center border border-border rounded-full p-1 bg-surface shadow-xs">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-full flex items-center justify-center text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 font-black text-sm active:scale-75 transition-transform"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="px-3 text-xs font-black text-text-primary min-w-[28px] text-center">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 font-black text-sm active:scale-75 transition-transform"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        {/* About this product */}
        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          <h3 className="text-xs font-extrabold text-text-primary tracking-tight uppercase">
            About this product
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed font-medium">
            {product.description || 'Fresh skinless chicken, cut into bone-in pieces. Ideal for homemade chicken curry, masala and gravy dishes.'}
          </p>
        </div>

        {/* 4 Feature Cards Grid (2x2) */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Feature 1 */}
          <div className="bg-surface border border-border p-3.5 rounded-[16px] flex flex-col items-center justify-center text-center gap-1.5 shadow-xs">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
              </svg>
            </div>
            <span className="text-xs font-bold text-text-primary">Ideal for curry</span>
          </div>

          {/* Feature 2 */}
          <div className="bg-surface border border-border p-3.5 rounded-[16px] flex flex-col items-center justify-center text-center gap-1.5 shadow-xs">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
              </svg>
            </div>
            <span className="text-xs font-bold text-text-primary">Halal assured</span>
          </div>

          {/* Feature 3 */}
          <div className="bg-surface border border-border p-3.5 rounded-[16px] flex flex-col items-center justify-center text-center gap-1.5 shadow-xs">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3h-3z" />
              </svg>
            </div>
            <span className="text-xs font-bold text-text-primary">Custom cutting</span>
          </div>

          {/* Feature 4 */}
          <div className="bg-surface border border-border p-3.5 rounded-[16px] flex flex-col items-center justify-center text-center gap-1.5 shadow-xs">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18M6 6l12 12M6 18L18 6" />
              </svg>
            </div>
            <span className="text-xs font-bold text-text-primary">Storage guidance</span>
          </div>
        </div>

        {/* Special Cutting Instructions Input */}
        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          <label className="text-xs font-extrabold text-text-primary tracking-tight">
            Special cutting instructions
          </label>
          <input
            type="text"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Any special requirements?"
            className="w-full bg-surface border border-border rounded-[14px] px-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-secondary outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border px-5 py-3 shadow-xl">
        <div className="max-w-[480px] mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-text-secondary leading-none">
              Total price
            </span>
            <span className="text-2xl font-black text-text-primary tracking-tight mt-1 leading-none">
              ₹{totalPrice}
            </span>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="flex-1 py-3 px-6 bg-primary hover:bg-[#B80000] active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white text-sm font-black uppercase tracking-wider rounded-[14px] shadow-lg shadow-primary/20 transition-all text-center"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
