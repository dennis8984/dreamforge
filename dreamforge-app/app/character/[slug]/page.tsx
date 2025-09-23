'use client';

import { useEffect, useState, useRef } from 'react';
import Header, { AuthModalTrigger } from '@/components/Header';
import CharacterHeader from '@/components/CharacterHeader';
import CharacterMediaGrid from '@/components/CharacterMediaGrid';
import GenerationPanel from '@/components/GenerationPanel';

interface Character { id:string; slug:string; name:string; avatar_url?:string; tags?:string[]; training_status?:string }
interface Media { id:string; type:'image'|'video'; url:string; is_hd:boolean; visibility:'public'|'members' }

export default function CharacterDetail({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userTier] = useState('free');
  const [character, setCharacter] = useState<Character | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [showGenerationPanel, setShowGenerationPanel] = useState(false);
  const authModalTrigger = useRef<AuthModalTrigger>();

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
    // A bit of a hack to make it appear without full ID/props
    const newMediaItem: Media = {
      id: Math.random().toString(), // temporary unique key
      url: newImage.url,
      type: 'image',
      is_hd: true,
      visibility: 'public', // assumption
    };
    setMedia(prev => [newMediaItem, ...prev]);
    setShowGenerationPanel(false);
  };

  const isPaid = userTier !== 'free';

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
          <CharacterHeader
            name={character.name}
            avatar_url={character.avatar_url}
            tags={character.tags}
            training_status={(character as unknown as { training_status?: 'draft'|'queued'|'training'|'ready'|'failed' }).training_status}
            onGenerateClick={() => setShowGenerationPanel(!showGenerationPanel)}
          />
        )}
        {showGenerationPanel && character && (
          <GenerationPanel
            characterSlug={character.slug}
            characterName={character.name}
            onGenerationComplete={handleGenerationComplete}
          />
        )}
        <CharacterMediaGrid
          items={media}
          isAuthenticated={isAuthenticated}
          isPaidUser={isPaid}
          onAuthClick={() => authModalTrigger.current?.open('register')}
        />
      </div>
    </main>
  );
}


