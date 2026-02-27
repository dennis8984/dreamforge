interface ChatAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatAIParams {
  systemPrompt: string;
  messages: ChatAIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface ChatAIResponse {
  content: string;
  tokenCount: number;
  model: string;
  latencyMs: number;
}

async function callRunpod(params: ChatAIParams): Promise<ChatAIResponse> {
  const url = process.env.RUNPOD_CHAT_API_URL;
  const model = params.model || process.env.RUNPOD_CHAT_MODEL || 'glm-4.7-flash';
  if (!url) throw new Error('RUNPOD_CHAT_API_URL not configured');

  const startTime = Date.now();
  const body = {
    input: {
      model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        ...params.messages,
      ],
      temperature: params.temperature ?? 0.8,
      max_tokens: params.maxTokens ?? 2048,
      stream: false,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RUNPOD_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`Runpod error: ${response.status}`);
  const data = await response.json();

  // Handle async Runpod response (poll if needed)
  let result = data;
  if (data.id && data.status === 'IN_QUEUE') {
    // Poll for result
    const statusUrl = url.replace('/run', `/status/${data.id}`);
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const statusRes = await fetch(statusUrl, {
        headers: { 'Authorization': `Bearer ${process.env.RUNPOD_API_KEY}` },
      });
      result = await statusRes.json();
      if (result.status === 'COMPLETED') break;
      if (result.status === 'FAILED') throw new Error('Runpod job failed');
    }
  }

  const output = result.output || result;
  const content = output?.choices?.[0]?.message?.content || output?.content || String(output);
  const latencyMs = Date.now() - startTime;

  return {
    content,
    tokenCount: output?.usage?.total_tokens || Math.ceil(content.length / 4),
    model,
    latencyMs,
  };
}

async function callOpenRouter(params: ChatAIParams): Promise<ChatAIResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'google/gemini-flash-1.5';
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  const startTime = Date.now();
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://dreamforge.app',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        ...params.messages,
      ],
      temperature: params.temperature ?? 0.8,
      max_tokens: params.maxTokens ?? 2048,
    }),
  });

  if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const latencyMs = Date.now() - startTime;

  return {
    content,
    tokenCount: data.usage?.total_tokens || Math.ceil(content.length / 4),
    model,
    latencyMs,
  };
}

export async function generateChatResponse(params: ChatAIParams): Promise<ChatAIResponse> {
  // Try Runpod first, fallback to OpenRouter
  try {
    if (process.env.RUNPOD_CHAT_API_URL) {
      return await callRunpod(params);
    }
  } catch (error) {
    console.error('Runpod chat failed, falling back to OpenRouter:', error);
  }

  try {
    return await callOpenRouter(params);
  } catch (error) {
    console.error('OpenRouter chat also failed:', error);
    throw new Error('All chat providers failed');
  }
}
