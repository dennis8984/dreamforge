import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { requireBetterAuthAdmin, isAdminUser } from '@/lib/admin-auth-helpers';

// GET /api/admin/characters
export async function GET(request: NextRequest) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching characters:', error);
    return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 });
  }
}

// POST /api/admin/characters
export async function POST(request: NextRequest) {
  const auth = await requireBetterAuthAdmin(request);
  if (!isAdminUser(auth)) return auth;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const id = body.id || uuidv4();
    const name: string = body.name?.trim();
    let slug: string = (body.slug || name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name (or slug) is required' }, { status: 400 });
    }

    // Ensure slug uniqueness
    const { data: existing } = await supabase
      .from('characters')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (existing) {
      slug = `${slug}-${id.substring(0, 6)}`;
    }

    const now = new Date().toISOString();
    const newCharacter = {
      id,
      slug,
      name,
      description: body.description || '',
      avatar_url: body.avatar_url || '',
      cover_url: body.cover_url || '',
      tags: Array.isArray(body.tags) ? body.tags : [],
      owner_id: body.owner_id || null,
      training_status: 'draft',
      training_job_id: null,
      model_ref: null,
      created_at: now,
      updated_at: now
    };

    const { data, error } = await supabase
      .from('characters')
      .insert([newCharacter])
      .select()
      .single();
    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: 'Failed to create character' }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating character:', error);
    return NextResponse.json({ error: 'Failed to create character' }, { status: 500 });
  }
}
