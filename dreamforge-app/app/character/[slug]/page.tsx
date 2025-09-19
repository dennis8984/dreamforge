'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import CharacterHeader from '@/components/CharacterHeader';
import CharacterMediaGrid from '@/components/CharacterMediaGrid';

interface Character { id:string; slug:string; name:string; avatar_url?:string; tags?:string[]; training_status?:string }
interface Media { id:string; type:'image'|'video'; url:string; is_hd:boolean; visibility:'public'|'members' }

export default function CharacterDetail({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userTier] = useState('free');
  const [character, setCharacter] = useState<Character | null>(null);
  const [media, setMedia] = useState<Media[]>([]);

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

  const isPaid = userTier !== 'free';

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} userTier={userTier} />
      <div className="container mx-auto px-4 py-8 space-y-6">
        {character && (
          <CharacterHeader name={character.name} avatar_url={character.avatar_url} tags={character.tags} training_status={(character as any).training_status} />
        )}
        <CharacterMediaGrid items={media} isPaidUser={isPaid} />
      </div>
    </main>
  );
}


