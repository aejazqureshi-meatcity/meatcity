"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SearchBar } from '@/components/ui/SearchBar';

interface CategoryItem {
  id: string;
  name: string;
  description: string;
  image: string;
  tag: string;
}

export default function CategoriesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const categoryList: CategoryItem[] = [
    {
      id: 'chicken',
      name: 'Chicken',
      description: 'Curry cut, boneless breast, drumsticks, wings & keema',
      image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=500&auto=format&fit=crop&q=80',
      tag: 'Most Popular'
    },
    {
      id: 'mutton',
      name: 'Mutton',
      description: 'Rich goat curry cut, tender chops, biryani cuts & liver',
      image: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=500&auto=format&fit=crop&q=80',
      tag: 'Hand-Carved'
    },
    {
      id: 'eggs',
      name: 'Eggs',
      description: 'Farm-fresh white, brown country eggs & quail eggs',
      image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=500&auto=format&fit=crop&q=80',
      tag: 'Daily Fresh'
    },
    {
      id: 'seafood',
      name: 'Seafood',
      description: 'Cleaned fish fillets, prawns, steaks & river catch',
      image: 'https://images.unsplash.com/photo-1534948216015-843149f72be3?w=500&auto=format&fit=crop&q=80',
      tag: 'Catch of Day'
    },
    {
      id: 'ready-to-cook',
      name: 'Ready To Cook',
      description: 'Marinated tikkas, kebabs, spiced wings & patties',
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=80',
      tag: 'Instant Chef'
    }
  ];

  const filtered = categoryList.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full pb-24 px-4 py-3 gap-4 animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-1">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-text-primary hover:text-primary font-bold text-sm transition-colors active:scale-95"
          aria-label="Go back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-black text-base tracking-tight">Categories</span>
        </button>

        <span className="text-xs text-text-secondary font-bold">
          {categoryList.length} Categories
        </span>
      </div>

      {/* Search Bar */}
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search chicken, mutton, fish, eggs..."
      />

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-1">
        {filtered.map((cat) => (
          <Link
            key={cat.id}
            href={`/?category=${encodeURIComponent(cat.name)}`}
            className="group bg-surface border border-border rounded-[18px] overflow-hidden p-3.5 flex items-center justify-between shadow-sm hover:shadow-md transition-all active:scale-[0.99]"
          >
            <div className="flex flex-col gap-1 pr-3 flex-1 min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full w-max">
                {cat.tag}
              </span>
              <h3 className="text-base font-black text-text-primary tracking-tight group-hover:text-primary transition-colors">
                {cat.name}
              </h3>
              <p className="text-xs text-text-secondary font-medium leading-relaxed line-clamp-2">
                {cat.description}
              </p>
            </div>

            <div className="w-20 h-20 rounded-[14px] overflow-hidden flex-shrink-0 bg-neutral-100 dark:bg-neutral-900 border border-border">
              <img
                src={cat.image}
                alt={cat.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center gap-2">
            <span className="text-3xl">🔍</span>
            <p className="text-xs font-bold text-text-secondary">
              No categories match your search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
