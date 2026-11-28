import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/linuskuSupabase';

const DEFAULT_FLEET = ['LINUS-01', 'LINUS-02', 'LINUS-03'].map((id) => ({
  id,
  name: id,
}));

export async function GET() {
  const supabase = getSupabaseClient();
  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json({ buses: DEFAULT_FLEET, source: 'default' });
  }

  const { data, error } = await supabase
    .from('buses')
    .select('id, name')
    .eq('is_active', true)
    .order('id');
  if (error) {
    return NextResponse.json(
      { error: `Daftar armada belum dapat dimuat: ${error.message}` },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { buses: data ?? [], source: 'database' },
    { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20' } }
  );
}
