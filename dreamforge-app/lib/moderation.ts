import { GoogleGenerativeAI } from '@google/generative-ai';

interface ModerationResult {
  approved: boolean;
  flags: string[];
  confidence: number;
}

export async function moderateText(text: string): Promise<ModerationResult> {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) return { approved: true, flags: [], confidence: 0 };

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent(
      `Analyze this text for content moderation. Return JSON only: {"approved": boolean, "flags": string[], "confidence": number 0-1}. Flags can include: "violence", "hate_speech", "harassment", "self_harm", "illegal_activity", "spam". Approve all legal adult content. Only flag genuinely harmful content.\n\nText: "${text.substring(0, 2000)}"`
    );

    const response = result.response.text();
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { approved: true, flags: [], confidence: 0 };
  }
}

export async function moderateImage(imageUrl: string): Promise<ModerationResult> {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) return { approved: true, flags: [], confidence: 0 };

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

    const result = await model.generateContent([
      { inlineData: { data: base64, mimeType } },
      'Analyze this image for content moderation. Return JSON only: {"approved": boolean, "flags": string[], "confidence": number 0-1}. Flags: "violence", "csam", "hate_symbols", "gore". Approve legal adult content. Only flag genuinely harmful content.',
    ]);

    const response = result.response.text();
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { approved: true, flags: [], confidence: 0 };
  }
}
