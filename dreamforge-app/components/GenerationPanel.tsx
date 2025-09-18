'use client';

import { useState } from 'react';
import { GENERATION_PRESETS, applyPreset } from '@/lib/generation-presets';

interface Model {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tier?: string;
  sample_image?: string;
  style?: string;
  thumbnail_url?: string;
  is_premium?: boolean;
  is_featured?: boolean;
  view_count?: number;
  like_count?: number;
}

interface GenerationResult {
  id?: string;
  image_url: string;
  generation_time_ms?: number;
  width?: number;
  height?: number;
  cached?: boolean;
  status?: string;
}

interface GenerationPanelProps {
  selectedModel: Model | null;
  userTier: string;
  onGenerate: (result: GenerationResult) => void;
}

export default function GenerationPanel({ selectedModel, onGenerate }: GenerationPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [parameters, setParameters] = useState({
    temperature: 0.7,
    top_p: 0.95,
    guidanceScale: 7.5,
    steps: 30,
    width: 1024,
    height: 1024,
    seed: -1,
    sampler: 'DPMSolverMultistepScheduler'
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      // Use the Next.js API route instead of backend directly
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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

      // Check if job is processing (async generation)
      if (result.status === 'processing' && result.id) {
        // Poll for job completion
        const pollJob = async () => {
          const statusResponse = await fetch(`/api/generate?job_id=${result.id}`);
          const statusData = await statusResponse.json();

          if (statusData.status === 'completed' && statusData.image_url) {
            setGeneratedImage(statusData.image_url);
            onGenerate(statusData);
            setGenerating(false);
          } else if (statusData.status === 'error') {
            throw new Error(statusData.error || 'Generation failed');
          } else {
            // Continue polling
            setTimeout(pollJob, 2000);
          }
        };

        // Using original prompt directly

        // Start polling
        setTimeout(pollJob, 2000);
      } else if (result.image_url) {
        // Direct result
        setGeneratedImage(result.image_url);
        onGenerate(result);
        setGenerating(false);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to generate image');
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
              Style Preset
            </label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  const preset = GENERATION_PRESETS[e.target.value];
                  if (preset) {
                    const applied = applyPreset(preset, prompt);
                    setPrompt(applied.prompt);
                    setNegativePrompt(applied.negativePrompt);
                    setParameters(prev => ({ ...prev, ...applied.parameters }));
                  }
                }
              }}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select a preset style...</option>
              <option value="artistic-portrait">Artistic Portrait</option>
              <option value="anime-character">Anime Character</option>
              <option value="photorealistic">Photorealistic</option>
              <option value="artistic-nsfw">Artistic Figure</option>
              <option value="fantasy-art">Fantasy Art</option>
              <option value="cinematic">Cinematic</option>
              <option value="oil-painting">Oil Painting</option>
              <option value="quick-draft">Quick Draft</option>
              <option value="high-detail">High Detail</option>
            </select>
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
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-1">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Using model: <strong>{selectedModel.name}</strong>
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Powered by Nano Banana (Google Gemini + Runpod)
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Width: {parameters.width}
                </label>
                <select
                  value={parameters.width}
                  onChange={(e) => setParameters({ ...parameters, width: parseInt(e.target.value) })}
                  className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                >
                  <option value="512">512</option>
                  <option value="768">768</option>
                  <option value="1024">1024</option>
                  <option value="1280">1280</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Height: {parameters.height}
                </label>
                <select
                  value={parameters.height}
                  onChange={(e) => setParameters({ ...parameters, height: parseInt(e.target.value) })}
                  className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                >
                  <option value="512">512</option>
                  <option value="768">768</option>
                  <option value="1024">1024</option>
                  <option value="1280">1280</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Guidance Scale: {parameters.guidanceScale} (Higher = More prompt adherence)
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

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Steps: {parameters.steps} (Higher = Better quality, slower)
              </label>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={parameters.steps}
                onChange={(e) => setParameters({ ...parameters, steps: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Seed: {parameters.seed === -1 ? 'Random' : parameters.seed}
              </label>
              <input
                type="number"
                value={parameters.seed}
                onChange={(e) => setParameters({ ...parameters, seed: parseInt(e.target.value) || -1 })}
                placeholder="-1 for random"
                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              />
            </div>

            <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-800 dark:text-amber-300">
              <strong>Note:</strong> Your exact prompt will be used for NSFW generation without any modification.
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
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating with Nano Banana...
              </span>
            ) : (
              'Generate with AI'
            )}
          </button>
        </div>

        <div className="flex items-center justify-center">
          {generatedImage ? (
            <div className="relative w-full aspect-square rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
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