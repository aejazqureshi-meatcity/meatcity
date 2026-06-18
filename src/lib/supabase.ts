import { createBrowserClient } from '@supabase/ssr';
import { MockSupabaseClient } from './supabase-mock';

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true' || 
                !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your_supabase_project_url_here');

export const supabase = useMock
  ? (new MockSupabaseClient() as any)
  : createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

// Database Schema Notes for B2B vs B2C Logic
/*
Table: products
- id: uuid
- name: string
- description: string
- category: string ('chicken', 'mutton', 'seafood')
- image_url: string
- price_b2c: numeric (Standard retail price per kg)
- price_b2b: numeric (Discounted wholesale price per kg)
- min_order_b2b: numeric (Minimum kg required for B2B price)
- is_available: boolean

Table: users
- id: uuid (auth.uid)
- full_name: string
- phone: string
- user_type: string ('b2c', 'b2b', 'admin')
- address: string

Table: orders
- id: uuid
- user_id: uuid
- total_amount: numeric
- status: string ('pending', 'confirmed', 'delivered', 'cancelled')
- payment_method: string ('COD', 'UPI')
- created_at: timestamp
*/
