import { executeServerRpc } from '@/lib/supabase-mock-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { functionName, params } = await request.json();
    const result = await executeServerRpc(functionName, params);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { data: null, error: { message: error.message || 'Server RPC error' } },
      { status: 500 }
    );
  }
}
