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
  const [statusMessage, setStatusMessage] = useState('');

  const pollForJobCompletion = async (jobId: string, characterId: string) => {
    setStatusMessage('Job is in queue...');
    const startTime = Date.now();
    const pollInterval = 3000; // 3 seconds
    const maxDuration = 120000; // 2 minutes

    while (Date.now() - startTime < maxDuration) {
      try {
        const res = await fetch('/api/characters/poll-and-save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, characterId, prompt, visibility }),
        });

        const data = await res.json();
        
        if (res.status === 202) { // Job is still processing
          setStatusMessage(data.message || 'Processing...');
        } else if (res.ok) { // Job complete
          setStatusMessage('');
          onGenerationComplete({ url: data.imageUrl });
          return; // Exit loop
        } else { // Error or job failed
          throw new Error(data.error || 'Polling failed');
        }
      } catch (error) {
        console.error(error);
        alert(`An error occurred: ${(error as Error).message}`);
        setStatusMessage('');
        setLoading(false);
        return; // Exit loop
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    alert('Generation timed out. Please try again.');
    setStatusMessage('');
    setLoading(false);
  };

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setStatusMessage('Sending request...');
    try {
      const res = await fetch(`/api/characters/${characterSlug}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, visibility }),
      });

      if (!res.ok) {
        throw new Error('Failed to start generation job');
      }

      const data = await res.json();
      if (data.jobId) {
        await pollForJobCompletion(data.jobId, data.characterId);
      } else if (data.image_url) {
        onGenerationComplete({ url: data.image_url });
      } else {
        throw new Error('Invalid response from server');
      }
      
    } catch (error) {
      alert(`Failed to generate: ${(error as Error).message}`);
      setLoading(false);
      setStatusMessage('');
    } finally {
      // setLoading(false) is handled by the polling function on completion/error
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
          {loading ? statusMessage || 'Generating...' : 'Generate'}
        </button>
      </div>
    </div>
  );
}