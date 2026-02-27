import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-server';

const VALID_CONTENT_TYPES = ['message', 'character', 'image', 'video', 'post', 'comment'];

// POST /api/moderation/report - Submit a content report
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  try {
    const body = await request.json();
    const { contentType, contentId, reason } = body;

    // Validate required fields
    if (!contentType || !contentId || !reason) {
      return NextResponse.json(
        { error: 'contentType, contentId, and reason are required' },
        { status: 400 }
      );
    }

    if (!VALID_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: `Invalid content type. Must be one of: ${VALID_CONTENT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (typeof reason !== 'string' || reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'Reason must be at least 5 characters long' },
        { status: 400 }
      );
    }

    if (reason.trim().length > 1000) {
      return NextResponse.json(
        { error: 'Reason must be no longer than 1000 characters' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Check for duplicate report from same user on same content
    const { data: existingReport } = await supabase
      .from('content_reports')
      .select('id')
      .eq('reporter_id', auth.id)
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingReport) {
      return NextResponse.json(
        { error: 'You have already reported this content' },
        { status: 409 }
      );
    }

    // Create the report
    const { data: report, error: insertError } = await supabase
      .from('content_reports')
      .insert({
        reporter_id: auth.id,
        content_type: contentType,
        content_id: contentId,
        reason: reason.trim(),
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating content report:', insertError);
      return NextResponse.json(
        { error: 'Failed to submit report' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        reportId: report.id,
        status: 'pending',
        message: 'Report submitted successfully. Our team will review it shortly.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Moderation report error:', error);
    return NextResponse.json(
      { error: 'Failed to submit report' },
      { status: 500 }
    );
  }
}
