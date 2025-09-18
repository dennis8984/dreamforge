import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

// Path to store models
const MODELS_FILE = path.join(process.cwd(), 'models.json');

// Get models from file or memory
function getModels() {
  try {
    if (fs.existsSync(MODELS_FILE)) {
      const data = fs.readFileSync(MODELS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading models file:', error);
  }
  return [];
}

// Save models to file
function saveModels(models: unknown[]) {
  try {
    fs.writeFileSync(MODELS_FILE, JSON.stringify(models, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving models:', error);
    return false;
  }
}

// Simple admin authentication check
function isAdminAuthenticated(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');

  // Also check referrer for admin page access
  const referrer = request.headers.get('referer');
  const isFromAdmin = referrer?.includes('admin=true');

  return adminKey === 'dreamforge_admin_2024' ||
         request.nextUrl.searchParams.get('admin') === 'true' ||
         isFromAdmin === true;
}

// PATCH /api/admin/models/[id] - Update model
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Try to update in Supabase first if configured
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('ai_models')
          .update({
            ...body,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          return NextResponse.json(data);
        }
        if (error) {
          console.error('Supabase update error:', error);
        }
      } catch (supabaseError) {
        console.error('Supabase update error:', supabaseError);
      }
    }
      // Fall back to file system
      const models = getModels();
      const modelIndex = models.findIndex((m: unknown) => (m as {id: string}).id === id);

      if (modelIndex === -1) {
        return NextResponse.json({ error: 'Model not found' }, { status: 404 });
      }

      models[modelIndex] = {
        ...models[modelIndex],
        ...body,
        updated_at: new Date().toISOString()
      };

      saveModels(models);
      return NextResponse.json(models[modelIndex]);
  } catch (error) {
    console.error('Error updating model:', error);
    return NextResponse.json(
      { error: 'Failed to update model' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/models/[id] - Delete model
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Try to delete from Supabase first if configured
    if (supabase) {
      try {
        const { error } = await supabase
          .from('ai_models')
          .delete()
          .eq('id', id);

        if (!error) {
          return NextResponse.json({ success: true, message: 'Model deleted' });
        }
        console.error('Supabase delete error:', error);
      } catch (supabaseError) {
        console.error('Supabase delete error:', supabaseError);
      }
    }
      // Fall back to file system
      const models = getModels();
      const filteredModels = models.filter((m: unknown) => (m as {id: string}).id !== id);

      if (models.length === filteredModels.length) {
        return NextResponse.json({ error: 'Model not found' }, { status: 404 });
      }

      saveModels(filteredModels);
      return NextResponse.json({ success: true, message: 'Model deleted' });
  } catch (error) {
    console.error('Error deleting model:', error);
    return NextResponse.json(
      { error: 'Failed to delete model' },
      { status: 500 }
    );
  }
}