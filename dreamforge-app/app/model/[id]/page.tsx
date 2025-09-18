'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import Header from '@/components/Header';

interface Model {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail_url: string;
  is_premium: boolean;
  is_featured?: boolean;
  generation_mode?: 'text-to-image' | 'image-to-image' | 'both';
  sample_prompts?: string[];
  negative_prompt?: string;
  generated_images?: string[];
  capabilities?: {
    max_resolution: string;
    styles: string[];
    speed: string;
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ModelProfilePage() {
  const params = useParams();
  const modelId = params?.id as string;

  const [model, setModel] = useState<Model | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userTier] = useState('free');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'gallery' | 'chat'>('gallery');

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadModel = async () => {
    setLoading(true);
    try {
      // Fetch real model from API
      const response = await fetch(`/api/models?id=${modelId}`);
      if (response.ok) {
        const models = await response.json();
        const model = models.find((m: Model) => m.id === modelId);

        if (model) {
          setModel(model);
          // Add greeting message based on model type
          const greeting = model.generation_mode === 'image-to-image'
            ? `Hi! I'm ${model.name}. Upload an image and I'll transform it into something amazing!`
            : `Hi! I'm ${model.name}. I specialize in creating ${model.category} content. What would you like me to generate today?`;

          setMessages([{
            id: '1',
            role: 'assistant',
            content: greeting,
            timestamp: new Date()
          }]);
        } else {
          // If model not found in API, try admin endpoint
          const adminResponse = await fetch(`/api/admin/models?admin=true`);
          if (adminResponse.ok) {
            const adminModels = await adminResponse.json();
            const adminModel = adminModels.find((m: Model) => m.id === modelId);
            if (adminModel) {
              setModel(adminModel);
              const greeting = adminModel.generation_mode === 'image-to-image'
                ? `Hi! I'm ${adminModel.name}. Upload an image and I'll transform it into something amazing!`
                : `Hi! I'm ${adminModel.name}. I specialize in creating ${adminModel.category} content. What would you like me to generate today?`;

              setMessages([{
                id: '1',
                role: 'assistant',
                content: greeting,
                timestamp: new Date()
              }]);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading model:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsAuthenticated(true);
    }
    loadModel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };



  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Call API for AI response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId,
          message: inputMessage,
          context: messages.slice(-5) // Send last 5 messages for context
        })
      });

      const data = await response.json();

      const aiMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: data.response || `That's interesting! As ${model?.name}, I'd love to help you explore that idea further. What specific aspect would you like to focus on?`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch {
      // Fallback response if API fails
      const aiMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `That's a great question! I'd be happy to help you with that. What specific details would you like to explore?`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header
          isAuthenticated={isAuthenticated}
          setIsAuthenticated={setIsAuthenticated}
          userTier={userTier}
        />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        </div>
      </main>
    );
  }

  if (!model) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header
          isAuthenticated={isAuthenticated}
          setIsAuthenticated={setIsAuthenticated}
          userTier={userTier}
        />
        <div className="container mx-auto px-4 py-8">
          <p>Model not found</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
        userTier={userTier}
      />

      <div className="container mx-auto px-4 py-8">
        {/* Model Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={model.thumbnail_url}
                alt={model.name}
                className="w-full h-auto rounded-lg"
              />
            </div>
            <div className="md:w-2/3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {model.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {model.description}
              </p>

              {model.generation_mode && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Generation Mode</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {model.generation_mode === 'both' ? 'Text to Image & Image to Image' :
                     model.generation_mode === 'image-to-image' ? 'Image to Image' : 'Text to Image'}
                  </p>
                </div>
              )}

              {model.capabilities?.styles && model.capabilities.styles.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Styles</h3>
                  <div className="flex flex-wrap gap-2">
                    {model.capabilities.styles.map((style, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full text-sm"
                      >
                        {style}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {model.sample_prompts && model.sample_prompts.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Sample Prompts</h3>
                  <div className="flex flex-wrap gap-2">
                    {model.sample_prompts.slice(0, 3).map((prompt, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 rounded-full text-sm cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-800"
                        onClick={() => navigator.clipboard.writeText(prompt)}
                        title="Click to copy"
                      >
                        {prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <Link
                  href={`/?model=${model.id}`}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700"
                >
                  Generate with {model.name}
                </Link>
                {model.is_premium && userTier === 'free' && (
                  <span className="px-4 py-3 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-lg">
                    Premium Model
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-6 py-3 rounded-t-lg font-medium transition-colors ${
              activeTab === 'gallery'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Gallery
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-6 py-3 rounded-t-lg font-medium transition-colors ${
              activeTab === 'chat'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Chat with {model.name}
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          {activeTab === 'gallery' ? (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Generated Images
              </h2>
              {model.generated_images && model.generated_images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {model.generated_images.map((image, idx) => (
                    <div key={idx} className="relative aspect-[2/3] rounded-lg overflow-hidden group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image}
                        alt={`Generated ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <span className="text-white text-sm">Generated {idx + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p className="mb-4">No generated images yet for this model.</p>
                  <Link
                    href={`/admin?admin=true`}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Go to Admin to generate images
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-[600px]">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isTyping}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}