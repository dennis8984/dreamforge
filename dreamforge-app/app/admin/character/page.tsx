'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import CharacterSidebar from '@/components/CharacterSidebar';
import StartCard from '@/components/StartCard';
import CharacterWizard from '@/components/CharacterWizard';
import CharacterCard from '@/components/CharacterCard';

interface Character {
  id: string;
  slug: string;
  name: string;
  description?: string;
  avatar_url?: string;
  training_status?: string;
}

function CharacterAdminPageContent() {
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userTier] = useState('admin');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardMode, setWizardMode] = useState<'multi' | 'single' | 'desc'>('multi');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataset, setDataset] = useState<string[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const adminKey = localStorage.getItem('admin_key');
    if (typeof window !== 'undefined' && (window.location.search.includes('admin=true') || adminKey === 'dreamforge_admin_2024')) {
      setIsAuthenticated(true);
      setIsAdmin(true);
    } else if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'single' || mode === 'multi' || mode === 'desc') {
      setWizardMode(mode);
      setShowWizard(true);
    }
    const createName = searchParams.get('create');
    if (createName) {
      setNewName(createName);
      setShowWizard(true);
    }
  }, [searchParams]);

  useEffect(() => {
    loadCharacters();
  }, []);

  const loadCharacters = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/characters?admin=true');
      if (res.ok) {
        const data = await res.json();
        setCharacters(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const openWizard = (mode: 'multi' | 'single' | 'desc') => {
    setWizardMode(mode);
    setShowWizard(true);
  };

  const onDatasetReady = (images: string[]) => {
    setDataset(images);
  };

  const canCreate = useMemo(() => !!dataset && newName.trim().length > 0, [dataset, newName]);

  const createCharacter = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      // 1) Create character
      const res = await fetch('/api/admin/characters?admin=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, avatar_url: dataset?.[0], training_status: 'queued' })
      });
      if (!res.ok) throw new Error('Create failed');
      const created = await res.json();

      // 2) Attach dataset as media
      if (dataset && dataset.length) {
        await fetch(`/api/admin/characters/${created.id}/media?admin=true`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataset.map((url) => ({ type: 'image', url })))
        });
      }

      // 3) Queue training
      const trainRes = await fetch(`/api/admin/characters/${created.id}/train?admin=true`, { method: 'POST' });
      const trainData = await trainRes.json();

      if (!trainRes.ok || !trainData.jobId) {
        throw new Error(trainData.error || 'Failed to queue training job');
      }

      // 4) Optimistic list refresh
      await loadCharacters();

      // 5) Poll training (simple)
      const poll = async () => {
        const statusRes = await fetch(`/api/admin/characters/${created.id}/train?admin=true&jobId=${trainData.jobId}`);
        const data = await statusRes.json();
        if (data.status === 'ready' || data.status === 'failed') {
          loadCharacters();
        } else {
          setTimeout(poll, 2000);
        }
      };
      setTimeout(poll, 2000);

      setDataset(null);
      setNewName('');
      setShowWizard(false);
    } catch (e) {
      console.error(e);
      alert('Failed to create character');
    } finally {
      setCreating(false);
    }
  };

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Admin Access Required</h1>
          <p className="text-gray-600 dark:text-gray-400">Add ?admin=true to the URL for demo access.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} userTier={userTier} />

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-6">
          <CharacterSidebar active="create" />

          <div className="flex-1 space-y-8">
            {/* Create Your Character */}
            <section className="bg-gray-900/70 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-white">Create Your Character</h1>
                  <p className="text-gray-400">Start building characters to use in your future image creation!</p>
                </div>
                <button onClick={() => alert('Tutorial coming soon')} className="px-3 py-1.5 rounded bg-gray-800 text-gray-300 text-sm">Tutorial</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StartCard title="Start with 4+ Images" subtitle="Upload a small dataset" onClick={() => openWizard('multi')} />
                <StartCard title="Start with One Image" subtitle="We will synthesize more" onClick={() => openWizard('single')} />
                <StartCard title="Start with Description" subtitle="Generate a base dataset" onClick={() => openWizard('desc')} />
              </div>

              {dataset && (
                <div className="mt-6 border-t border-gray-800 pt-6">
                  <h3 className="text-white font-semibold mb-3">Finalize Character</h3>
                  <div className="flex items-center gap-3">
                    <input
                      placeholder="Character name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="flex-1 px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-200"
                    />
                    <button
                      disabled={!canCreate || creating}
                      onClick={createCharacter}
                      className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                    >
                      {creating ? 'Creating...' : 'Create & Train'}
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* My Characters */}
            <section>
              <h2 className="text-xl font-bold text-white mb-3">My Characters</h2>
              {loading ? (
                <div className="text-gray-400">Loading...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {characters.map((c) => (
                    <CharacterCard key={c.id} slug={c.slug} name={c.name} avatar_url={c.avatar_url} />
                  ))}
                </div>
              )}
            </section>

            {/* Character Library (same for now) */}
            <section>
              <h2 className="text-xl font-bold text-white mb-3">Character Library</h2>
              {loading ? (
                <div className="text-gray-400">Loading...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {characters.map((c) => (
                    <CharacterCard key={c.id} slug={c.slug} name={c.name} avatar_url={c.avatar_url} />
                  ))}
                </div>
              )}
            </section>

            {/* Quick Templates */}
            <section>
              <h2 className="text-xl font-bold text-white mb-3">Quick Template</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {['Character Sheet', 'Action Sheet', 'Emotion Sheet', 'Studio Turnaround Video', 'Scene Turnaround Video'].map((title) => (
                  <div key={title} className="rounded-lg bg-gray-900/70 border border-gray-800 p-4 text-gray-300 text-center cursor-pointer hover:border-blue-600">
                    {title}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      <CharacterWizard open={showWizard} onClose={() => setShowWizard(false)} onDatasetReady={onDatasetReady} initialTab={wizardMode} />
    </main>
  );
}

export default function AdminCharacterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CharacterAdminPageContent />
    </Suspense>
  )
}


