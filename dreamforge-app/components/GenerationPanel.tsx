'use client';
import { useState } from 'react';

interface Props {
  characterSlug: string;
  characterName: string;
  onGenerationComplete: (newImage: { url: string }) => void;
}

export default function GenerationPanel({ characterSlug, characterName, onGenerationComplete }: Props) {
  const [prompt, setPrompt] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'members'>('public');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/characters/${characterSlug}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, visibility }),
      });
      if (res.ok) {
        const data = await res.json();
        onGenerationComplete({ url: data.image_url });
        setPrompt('');
      } else {
        alert('Failed to generate. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800/50 p-4 rounded-lg mt-4">
      <h3 className="text-white font-semibold mb-2">Generate Media for {characterName}</h3>
      <textarea
        className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-gray-200"
        placeholder="Enter a prompt, e.g., 'close up, smiling'"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVisibility('public')}
            className={`px-2 py-1 text-xs rounded ${visibility === 'public' ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            Public
          </button>
          <button
            onClick={() => setVisibility('members')}
            className={`px-2 py-1 text-xs rounded ${visibility === 'members' ? 'bg-purple-600' : 'bg-gray-700'}`}
          >
            Members
          </button>
        </div>
        <button
          onClick={generate}
          disabled={!prompt.trim() || loading}
          className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>
    </div>
  );
}