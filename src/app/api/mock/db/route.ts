import { executeServerQuery } from '@/lib/supabase-mock-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const query = await request.json();
    const result = await executeServerQuery(query);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ data: null, error: { message: error.message || 'Server error' } }, { status: 500 });
  }
}
