'use client';

import { useState } from 'react';
import Image from 'next/image';

interface GenerationPanelProps {
  selectedModel: any;
  userTier: string;
  onGenerate: (result: any) => void;
}

export default function GenerationPanel({ selectedModel, userTier, onGenerate }: GenerationPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [parameters, setParameters] = useState({
    temperature: 0.7,
    top_p: 0.95,
    guidanceScale: 7.5,
    steps: 50
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Please login to generate images');
        setGenerating(false);
        return;
      }

      const response = await fetch('http://localhost:8000/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt,
          model_id: selectedModel?.id,
          parameters: {
            ...parameters,
            negative_prompt: negativePrompt
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Generation failed');
      }

      const result = await response.json();
      setGeneratedImage(result.image_url);
      onGenerate(result);
    } catch (err: any) {
      setError(err.message || 'Failed to generate image');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your image..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Negative Prompt (Optional)
            </label>
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="Things to avoid..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          {selectedModel && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Using model: <strong>{selectedModel.name}</strong>
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Temperature: {parameters.temperature}
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={parameters.temperature}
                onChange={(e) => setParameters({ ...parameters, temperature: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Guidance Scale: {parameters.guidanceScale}
              </label>
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={parameters.guidanceScale}
                onChange={(e) => setParameters({ ...parameters, guidanceScale: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {generating ? 'Generating...' : 'Generate Image'}
          </button>
        </div>

        <div className="flex items-center justify-center">
          {generatedImage ? (
            <div className="relative w-full aspect-square rounded-lg overflow-hidden">
              <img
                src={generatedImage}
                alt="Generated"
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => window.open(generatedImage, '_blank')}
                className="absolute top-2 right-2 p-2 bg-white/80 dark:bg-gray-800/80 rounded-lg hover:bg-white dark:hover:bg-gray-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="w-full aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">Your generated image will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}