"use client";

import React, { useState, useEffect } from 'react';

interface CarouselSlide {
  id: number;
  title: string;
  subtitle: string;
  ctaText: string;
  bgGradient: string;
  image: string;
  imageAlt: string;
}

export default function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  const slides: CarouselSlide[] = [
    {
      id: 1,
      title: "Fresh Cuts.\nBetter Meals.",
      subtitle: "Freshness you can trust.",
      ctaText: "Shop Now",
      bgGradient: "from-[#8B0000] via-[#A00000] to-[#7B0000]",
      image: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=500&auto=format&fit=crop&q=80",
      imageAlt: "Fresh Chicken Cuts"
    },
    {
      id: 2,
      title: "Prime Goat\nMutton Cuts.",
      subtitle: "Hand-carved & tender daily.",
      ctaText: "Order Now",
      bgGradient: "from-[#5B0606] via-[#7A0B0B] to-[#450303]",
      image: "https://images.unsplash.com/photo-1558030006-450675393462?w=500&auto=format&fit=crop&q=80",
      imageAlt: "Fresh Goat Mutton"
    },
    {
      id: 3,
      title: "Catch of the Day\nFresh Seafood.",
      subtitle: "Cleaned, descaled & ready.",
      ctaText: "Explore Catch",
      bgGradient: "from-[#0F2027] via-[#1B3038] to-[#0A171D]",
      image: "https://images.unsplash.com/photo-1534948216015-843149f72be3?w=500&auto=format&fit=crop&q=80",
      imageAlt: "Fresh Seafood Catch"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="relative w-full rounded-[20px] overflow-hidden shadow-lg border border-black/5 dark:border-white/5 my-2 aspect-[16/8] sm:aspect-[21/9]">
      {slides.map((slide, idx) => (
        <div
          key={slide.id}
          className={`absolute inset-0 bg-gradient-to-r ${slide.bgGradient} p-5 flex items-center justify-between transition-opacity duration-700 ${
            activeIndex === idx ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          {/* Left Text Content */}
          <div className="flex flex-col justify-center gap-1.5 z-10 max-w-[55%]">
            <h3 className="text-white text-xl sm:text-2xl font-black tracking-tight leading-[1.15] whitespace-pre-line drop-shadow-sm">
              {slide.title}
            </h3>
            <p className="text-white/85 text-xs font-medium tracking-tight mt-0.5">
              {slide.subtitle}
            </p>
            <div className="mt-2.5">
              <span className="inline-flex items-center gap-1 text-white font-extrabold text-xs bg-black/25 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 hover:bg-black/40 transition-colors shadow-sm">
                {slide.ctaText}
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </span>
            </div>
          </div>

          {/* Right Product Image */}
          <div className="relative w-[44%] h-full flex items-center justify-end">
            <div className="w-[125px] sm:w-[155px] h-[105px] sm:h-[135px] rounded-[14px] overflow-hidden shadow-2xl border-2 border-white/15 transform rotate-1 hover:rotate-0 transition-transform">
              <img
                src={slide.image}
                alt={slide.imageAlt}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      ))}

      {/* Indicator dots */}
      <div className="absolute bottom-2.5 left-5 flex gap-1.5 z-20">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              activeIndex === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/40'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
