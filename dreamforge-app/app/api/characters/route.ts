import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/characters?search=&tag=&page=1&pageSize=24
export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get('search') || '';
    const tag = request.nextUrl.searchParams.get('tag') || '';
    const category = request.nextUrl.searchParams.get('category') || '';
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '24', 10);

    if (!supabase) {
      // Minimal fallback without DB
      return NextResponse.json({ items: [], total: 0, page, pageSize });
    }

    let query = supabase.from('characters').select('*', { count: 'exact' });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    if (tag) {
      query = query.contains('tags', [tag]);
    }
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
    if (error) throw error;

    return NextResponse.json({ items: data || [], total: count || 0, page, pageSize });
  } catch (error) {
    console.error('Error listing characters:', error);
    return NextResponse.json({ items: [], total: 0, page: 1, pageSize: 24 });
  }
}


