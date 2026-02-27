'use client';

import { useEffect, useState, useRef, use } from 'react';
import Header, { AuthModalTrigger } from '@/components/Header';
import CharacterHeader from '@/components/CharacterHeader';
import CharacterMediaGrid from '@/components/CharacterMediaGrid';
import GenerationPanel from '@/components/GenerationPanel';

interface Character { id: string; slug: string; name: string; avatar_url?: string; tags?: string[]; training_status?: string; description?: string; personality_traits?: string[]; category?: string; fan_count?: number }
interface Media { id: string; type: 'image' | 'video'; url: string; is_hd: boolean; visibility: 'public' | 'members' }

type Tab = 'gallery' | 'feed' | 'about' | 'voice';

export default function CharacterDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userTier] = useState('free');
  const [character, setCharacter] = useState<Character | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [showGenerationPanel, setShowGenerationPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('gallery');
  const [isFollowing, setIsFollowing] = useState(false);
  const authModalTrigger = useRef<AuthModalTrigger | undefined>(undefined);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) setIsAuthenticated(true);
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const load = async () => {
    const res = await fetch(`/api/characters/${slug}`);
    const data = await res.json();
    setCharacter(data.character);
    setMedia(data.media?.items || []);
  };

  const handleGenerationComplete = (newImage: { url: string }) => {
    const newMediaItem: Media = {
      id: Math.random().toString(),
      url: newImage.url,
      type: 'image',
      is_hd: true,
      visibility: 'public',
    };
    setMedia(prev => [newMediaItem, ...prev]);
    setShowGenerationPanel(false);
  };

  const handleFollow = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { authModalTrigger.current?.open('register'); return; }
    try {
      await fetch('/api/follow', {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: character?.id }),
      });
      setIsFollowing(!isFollowing);
    } catch (e) {
      console.error('Follow error:', e);
    }
  };

  const isPaid = userTier !== 'free';

  const TABS: { id: Tab; label: string }[] = [
    { id: 'gallery', label: 'Gallery' },
    { id: 'feed', label: 'Posts' },
    { id: 'about', label: 'About' },
    { id: 'voice', label: 'Voice' },
  ];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
        userTier={userTier}
        authModalTrigger={authModalTrigger}
      />
      <div className="container mx-auto px-4 py-8 space-y-6">
        {character && (
          <>
            <CharacterHeader
              name={character.name}
              slug={character.slug}
              avatar_url={character.avatar_url}
              tags={character.tags}
              training_status={(character as unknown as { training_status?: 'draft' | 'queued' | 'training' | 'ready' | 'failed' }).training_status}
              onGenerateClick={() => setShowGenerationPanel(!showGenerationPanel)}
              onVideoClick={() => alert('Video generation coming soon!')}
              onVoiceClick={() => alert('Voice calls coming soon!')}
            />

            {/* Follow button */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleFollow}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isFollowing
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
              {character.fan_count !== undefined && (
                <span className="text-sm text-gray-400">{character.fan_count} followers</span>
              )}
              {character.category && (
                <span className="px-2 py-1 rounded bg-gray-800 text-gray-300 text-xs">{character.category}</span>
              )}
            </div>
          </>
        )}

        {showGenerationPanel && character && (
          <GenerationPanel
            characterSlug={character.slug}
            characterName={character.name}
            onGenerationComplete={handleGenerationComplete}
          />
        )}

        {/* Tab navigation */}
        <div className="flex gap-1 border-b border-gray-700">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'gallery' && (
          <CharacterMediaGrid
            items={media}
            isAuthenticated={isAuthenticated}
            isPaidUser={isPaid}
            onAuthClick={() => authModalTrigger.current?.open('register')}
          />
        )}

        {activeTab === 'feed' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-center py-8">Character posts will appear here.</p>
          </div>
        )}

        {activeTab === 'about' && character && (
          <div className="bg-gray-800 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">About {character.name}</h3>
            {character.description && <p className="text-gray-300">{character.description}</p>}
            {character.personality_traits && character.personality_traits.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Personality</h4>
                <div className="flex flex-wrap gap-2">
                  {character.personality_traits.map((t) => (
                    <span key={t} className="px-3 py-1 rounded-full bg-gray-700 text-gray-300 text-sm">{t}</span>
                  ))}
                </div>
              </div>
            )}
            {character.tags && character.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {character.tags.map((t) => (
                    <span key={t} className="px-2 py-1 rounded bg-gray-700 text-gray-300 text-xs">#{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'voice' && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-pink-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Voice Calls</h3>
            <p className="text-gray-400 mb-4">Have a voice conversation with {character?.name}</p>
            <button className="px-6 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-medium">
              Start Voice Call (100 Moments/min)
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
