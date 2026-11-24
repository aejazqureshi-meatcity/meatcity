"use client";

import React from 'react';

interface CategoryCardProps {
  name: string;
  isActive: boolean;
  onClick: () => void;
  imageUrl?: string;
}

export default function CategoryCard({ name, isActive, onClick, imageUrl }: CategoryCardProps) {
  // Category default high-res photography matching mockup style
  const getCategoryImage = (cat: string) => {
    if (imageUrl) return imageUrl;
    const norm = cat.toLowerCase();
    if (norm.includes('chicken')) {
      return "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=240&auto=format&fit=crop&q=80";
    }
    if (norm.includes('mutton')) {
      return "https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=240&auto=format&fit=crop&q=80";
    }
    if (norm.includes('egg')) {
      return "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=240&auto=format&fit=crop&q=80";
    }
    if (norm.includes('seafood') || norm.includes('fish')) {
      return "https://images.unsplash.com/photo-1534948216015-843149f72be3?w=240&auto=format&fit=crop&q=80";
    }
    if (norm.includes('ready')) {
      return "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=240&auto=format&fit=crop&q=80";
    }
    return "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=240&auto=format&fit=crop&q=80";
  };

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 group transition-transform active:scale-95 focus:outline-none flex-shrink-0"
    >
      <div 
        className={`w-[84px] h-[84px] sm:w-[92px] sm:h-[92px] rounded-[18px] overflow-hidden p-1.5 transition-all duration-200 border ${
          isActive 
            ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-md shadow-primary/10' 
            : 'border-border bg-surface hover:border-primary/40 shadow-sm'
        }`}
      >
        <div className="w-full h-full rounded-[14px] overflow-hidden bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
          <img 
            src={getCategoryImage(name)} 
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      </div>
      <span 
        className={`text-xs font-bold tracking-tight text-center max-w-[84px] truncate transition-colors ${
          isActive ? 'text-primary font-black' : 'text-text-primary group-hover:text-primary'
        }`}
      >
        {name}
      </span>
    </button>
  );
}
