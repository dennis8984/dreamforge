import { NextRequest, NextResponse } from 'next/server';
import { sendAgentMessage } from '@/lib/openclaw';
import { addToChatHistory } from '@/lib/openclaw-chat-store';
import type { ChatSendPayload, ChatMessage } from '@/types/openclaw';
import { v4 as uuidv4 } from 'uuid';

function isAdminAuthenticated(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  const referrer = request.headers.get('referer');
  const isFromAdmin = referrer?.includes('admin=true');
  return adminKey === 'dreamforge_admin_2024' ||
         request.nextUrl.searchParams.get('admin') === 'true' ||
         isFromAdmin === true;
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: ChatSendPayload = await request.json();

    if (!body.message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Store user message in history
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: body.message,
      timestamp: new Date().toISOString(),
      channel: body.channel,
      agentId: body.agentId,
    };
    addToChatHistory(userMessage);

    // Send via agent hook
    const result = await sendAgentMessage({
      message: body.message,
      channel: body.channel,
      agentId: body.agentId,
      model: body.model,
      deliver: true,
    });

    if (result.success) {
      // Store system acknowledgment
      const ackMessage: ChatMessage = {
        id: uuidv4(),
        role: 'system',
        content: `Message sent to agent (status: ${result.status})`,
        timestamp: new Date().toISOString(),
        channel: body.channel,
      };
      addToChatHistory(ackMessage);
    }

    return NextResponse.json({
      success: result.success,
      messageId: userMessage.id,
      error: result.error,
    });
  } catch (error) {
    console.error('Chat send error:', error);
    return NextResponse.json(
      { error: 'Failed to send chat message' },
      { status: 500 }
    );
  }
}
