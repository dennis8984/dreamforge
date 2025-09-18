import { NextRequest, NextResponse } from 'next/server';

// Simulated AI personalities for each model
const modelPersonalities: { [key: string]: { name: string; style: string; traits: string[] } } = {
  'f47ac10b-58cc-4372-a567-0e02b2c3d479': {
    name: 'DreamForge XL',
    style: 'professional',
    traits: ['detailed', 'versatile', 'technical']
  },
  '6ba7b810-9dad-11d1-80b4-00c04fd430c8': {
    name: 'Anime Pro Max',
    style: 'enthusiastic',
    traits: ['creative', 'vibrant', 'expressive']
  },
  '6ba7b811-9dad-11d1-80b4-00c04fd430c8': {
    name: 'Photorealistic Vision',
    style: 'sophisticated',
    traits: ['precise', 'realistic', 'professional']
  },
  '6ba7b812-9dad-11d1-80b4-00c04fd430c8': {
    name: 'Abstract Dreams',
    style: 'artistic',
    traits: ['imaginative', 'conceptual', 'experimental']
  },
  '6ba7b813-9dad-11d1-80b4-00c04fd430c8': {
    name: '3D Render Pro',
    style: 'technical',
    traits: ['detailed', 'dimensional', 'precise']
  },
  '6ba7b814-9dad-11d1-80b4-00c04fd430c8': {
    name: 'Fantasy Worlds',
    style: 'imaginative',
    traits: ['magical', 'storytelling', 'adventurous']
  },
  '7': {
    name: 'Pixel Art Master',
    style: 'nostalgic',
    traits: ['retro', 'playful', 'minimalist']
  },
  '8': {
    name: 'Sci-Fi Generator',
    style: 'futuristic',
    traits: ['innovative', 'technical', 'visionary']
  }
};

// Generate contextual responses based on model personality
function generateResponse(modelId: string, message: string): string {
  const personality = modelPersonalities[modelId] || modelPersonalities['f47ac10b-58cc-4372-a567-0e02b2c3d479'];
  const lowerMessage = message.toLowerCase();

  // Image generation related responses
  if (lowerMessage.includes('create') || lowerMessage.includes('generate') || lowerMessage.includes('make')) {
    const responses = {
      professional: `I'd be happy to help you create that! Based on your description, I suggest we focus on achieving maximum detail and clarity. Would you like me to emphasize any particular aspect?`,
      enthusiastic: `Oh, that sounds amazing! I can already visualize the vibrant colors and dynamic composition! Let's bring this to life with bold, expressive strokes!`,
      sophisticated: `Excellent choice. I'll ensure photorealistic quality with proper lighting and texture details. What specific mood or atmosphere would you like to convey?`,
      artistic: `What a fascinating concept! Let's explore unconventional perspectives and abstract interpretations. How about we experiment with surreal elements?`,
      technical: `I'll render that with precise geometric accuracy and realistic lighting. Would you prefer a specific camera angle or lighting setup?`,
      imaginative: `What a magical idea! I can see mystical elements weaving through this creation. Shall we add some enchanted details?`,
      nostalgic: `Awesome! I'll give it that classic pixel art charm with limited color palette. 8-bit or 16-bit style?`,
      futuristic: `Fascinating! I'll incorporate cutting-edge sci-fi elements with holographic effects. Any specific technology you'd like featured?`
    };
    return responses[personality.style as keyof typeof responses] || responses.professional;
  }

  // Style questions
  if (lowerMessage.includes('style') || lowerMessage.includes('look')) {
    return `As ${personality.name}, I specialize in ${personality.traits.join(', ')} approaches. I can adapt to your vision while maintaining my signature qualities. What aesthetic appeals to you most?`;
  }

  // Capability questions
  if (lowerMessage.includes('can you') || lowerMessage.includes('able to')) {
    return `Absolutely! With my ${personality.traits[0]} capabilities, I can help you achieve that. I excel at ${personality.traits.join(' and ')} creations. Shall we start with a concept?`;
  }

  // Inspiration questions
  if (lowerMessage.includes('idea') || lowerMessage.includes('inspire') || lowerMessage.includes('suggest')) {
    const suggestions = {
      professional: `How about a scene that combines natural elements with architectural precision? Or perhaps a portrait with dramatic lighting?`,
      enthusiastic: `Ooh! How about a dynamic action scene with flowing hair and energy effects? Or a cute character in a magical setting?`,
      sophisticated: `Consider a cinematic portrait with golden hour lighting, or perhaps a stunning landscape with atmospheric depth?`,
      artistic: `Let's explore dreamlike landscapes, fluid forms merging with geometric patterns, or emotions visualized as abstract colors!`,
      technical: `I suggest a complex mechanical structure, architectural visualization, or product rendering with studio lighting?`,
      imaginative: `Picture enchanted forests with glowing creatures, floating islands in the sky, or ancient ruins with magical portals!`,
      nostalgic: `How about a retro game scene, pixelated landscape, or 8-bit character portrait with chiptune vibes?`,
      futuristic: `Envision cyberpunk cityscapes, space stations, advanced robotics, or holographic interfaces!`
    };
    return suggestions[personality.style as keyof typeof suggestions] || suggestions.professional;
  }

  // Default conversational response
  const defaultResponses = [
    `That's interesting! As ${personality.name}, I bring a ${personality.style} approach to every creation. How can I help visualize your ideas?`,
    `I appreciate your thoughts! With my ${personality.traits[0]} nature, I'm always excited to explore new creative directions. What would you like to create?`,
    `Great question! My ${personality.traits.join(' and ')} capabilities allow me to approach this from unique angles. Shall we brainstorm together?`
  ];

  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelId, message } = body;

    if (!message || !modelId) {
      return NextResponse.json(
        { error: 'Model ID and message are required' },
        { status: 400 }
      );
    }

    // In production, this would integrate with Nano Banana SDK for actual AI responses
    // For now, we'll generate contextual responses based on model personality

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate response based on model personality and message context
    const response = generateResponse(modelId, message);

    return NextResponse.json({
      response,
      modelId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    status: 'Chat API is running',
    models: Object.keys(modelPersonalities).length,
    endpoint: '/api/chat'
  });
}