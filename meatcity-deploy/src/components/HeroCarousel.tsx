"use client";

import React, { useState, useEffect } from 'react';

interface CarouselItem {
  id: number;
  title: string;
  subtitle: string;
  badge: string;
  bgGradient: string;
  accentText: string;
}

export default function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  const items: CarouselItem[] = [
    {
      id: 1,
      title: "Fresh Chicken Cuts",
      subtitle: "Farm fresh, 100% Halal chicken delivered in 45 mins.",
      badge: "Flat 20% Off",
      bgGradient: "from-red-950 via-neutral-900 to-black",
      accentText: "Use Code: WELCOME20"
    },
    {
      id: 2,
      title: "Premium Mutton",
      subtitle: "Tender goat mutton, expertly carved by butchers.",
      badge: "Free Delivery",
      bgGradient: "from-neutral-900 via-stone-900 to-black",
      accentText: "Orders above ₹999"
    },
    {
      id: 3,
      title: "Seafood Selections",
      subtitle: "Fresh catch of the day, cleaned and descaled.",
      badge: "Weekend Special",
      bgGradient: "from-[#112211] via-neutral-900 to-black",
      accentText: "Limited stock daily"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [items.length]);

  return (
    <div className="relative w-full rounded-[16px] overflow-hidden aspect-[21/9] bg-neutral-900 shadow-xl border border-white/5 mt-4">
      {/* Slider view */}
      {items.map((item, idx) => (
        <div
          key={item.id}
          className={`absolute inset-0 bg-gradient-to-r ${item.bgGradient} p-5 flex flex-col justify-center gap-2 transition-opacity duration-700 ${
            activeIndex === idx ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          {/* Badge */}
          <span className="bg-gold text-black text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full w-max">
            {item.badge}
          </span>
          {/* Title & Desc */}
          <div>
            <h3 className="text-white text-base font-extrabold tracking-tight leading-tight">{item.title}</h3>
            <p className="text-text-secondary text-[11px] font-medium leading-relaxed max-w-[280px] mt-0.5">{item.subtitle}</p>
          </div>
          {/* Accent text */}
          <span className="text-gold text-[10px] font-bold tracking-wide uppercase mt-1">{item.accentText}</span>
        </div>
      ))}

      {/* Dots Indicator */}
      <div className="absolute bottom-3 right-4 flex gap-1.5 z-20">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              activeIndex === idx ? 'w-4 bg-gold' : 'w-1.5 bg-white/20'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
