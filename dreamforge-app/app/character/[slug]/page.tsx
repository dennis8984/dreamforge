'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import SecretsLayout from '@/components/SecretsLayout';
import ChatInput from '@/components/chat/ChatInput';
import VoiceCallModal from '@/components/voice/VoiceCallModal';
import { supabase } from '@/lib/supabase';

interface Character {
  id: string;
  slug: string;
  name: string;
  avatar_url?: string;
  description?: string;
  age?: string;
  personality_traits?: string[];
  tags?: string[];
  category?: string;
  body?: string;
  ethnicity?: string;
  language?: string;
  relationship?: string;
  occupation?: string;
  hobbies?: string;
}

interface Line {
  role: 'user' | 'assistant';
  content: string;
}

const ACTIONS = ['Wave', 'Smile', 'Look over'];

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('sb-access-token');
  if (raw) return raw;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '');
        return parsed?.access_token || null;
      } catch {
        continue;
      }
    }
  }
  return localStorage.getItem('access_token');
}

export default function CharacterDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userTier, setUserTier] = useState('free');
  const [character, setCharacter] = useState<Character | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sceneStatus, setSceneStatus] = useState<string | null>(null);
  const [calling, setCalling] = useState(false);
  const [ask, setAsk] = useState('');

  useEffect(() => {
    const boot = async () => {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
        if (session?.user) {
          const { data } = await supabase.from('users').select('subscription_tier').eq('id', session.user.id).single();
          if (data) setUserTier(data.subscription_tier || 'free');
        }
      }
      const res = await fetch(`/api/characters/${slug}`);
      const data = await res.json();
      const next = data.character as Character | undefined;
      setCharacter(next || null);
      if (next?.description) setLines([{ role: 'assistant', content: next.description }]);
    };
    boot();
  }, [slug]);

  const ensureConversation = async (token: string, characterId: string) => {
    if (conversationId) return conversationId;
    const res = await fetch('/api/chat/conversations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ character_id: characterId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not start chat');
    setConversationId(data.id || data.conversation?.id);
    return (data.id || data.conversation?.id) as string;
  };

  const send = async (content: string) => {
    if (!character) return;
    const token = getToken();
    setLines((prev) => [...prev, { role: 'user', content }]);
    if (!token) {
      setLines((prev) => [...prev, { role: 'assistant', content: 'Join free to keep talking.' }]);
      return;
    }
    setSending(true);
    try {
      const id = await ensureConversation(token, character.id);
      const res = await fetch(`/api/chat/conversations/${id}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      const reply = data.assistantMessage?.content || data.message?.content;
      if (reply) setLines((prev) => [...prev, { role: 'assistant', content: reply }]);
      else if (!res.ok) setLines((prev) => [...prev, { role: 'assistant', content: data.error || 'Message failed' }]);
    } catch (err) {
      setLines((prev) => [...prev, { role: 'assistant', content: err instanceof Error ? err.message : 'Message failed' }]);
    } finally {
      setSending(false);
    }
  };

  const requestImage = async (prompt: string) => {
    if (!character) return;
    const token = getToken();
    if (!token) {
      setSceneStatus('Log in to make a still.');
      return;
    }
    setSceneStatus('Making a still…');
    setSending(true);
    try {
      const res = await fetch(`/api/characters/${character.slug}/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Image failed');
      if (data.image_url) {
        setCharacter((prev) => (prev ? { ...prev, avatar_url: prev.avatar_url || data.image_url } : prev));
        setSceneStatus('Still is ready.');
      } else if (data.jobId) {
        setSceneStatus('Still is queued.');
      }
    } catch (err) {
      setSceneStatus(err instanceof Error ? err.message : 'Image failed');
    } finally {
      setSending(false);
    }
  };

  const requestVideo = async (prompt: string) => {
    if (!character) return;
    if (!character.avatar_url) {
      setSceneStatus('Make a still first. Video animates that still.');
      return;
    }
    const token = getToken();
    if (!token) {
      setSceneStatus('Log in to make a clip.');
      return;
    }
    setSceneStatus('Animating the still…');
    setSending(true);
    try {
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          sourceImageUrl: character.avatar_url,
          durationSeconds: 5,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Video failed');
      setSceneStatus('Five-second clip queued.');
    } catch (err) {
      setSceneStatus(err instanceof Error ? err.message : 'Video failed');
    } finally {
      setSending(false);
    }
  };

  const age = character?.age ? parseInt(character.age, 10) : NaN;
  const facts = character
    ? [
        ['Age', Number.isNaN(age) ? character.age : String(age)],
        ['Body', character.body],
        ['Ethnicity', character.ethnicity],
        ['Language', character.language],
        ['Relationship', character.relationship],
        ['Occupation', character.occupation],
        ['Hobbies', character.hobbies],
        ['Personality', character.personality_traits?.join(', ')],
      ].filter((row) => row[1])
    : [];

  return (
    <SecretsLayout isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} userTier={userTier}>
      <div className="grid lg:grid-cols-[1fr_280px] min-h-[calc(100vh-3.5rem)]">
        <section className="flex flex-col min-h-[70vh]">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1c1c1f]">
              {character?.avatar_url && <img src={character.avatar_url} alt="" className="w-full h-full object-cover" />}
            </div>
            <div>
              <h1 className="font-medium">{character?.name || 'Chat'}</h1>
              <p className="text-xs text-gray-500">{character?.category}</p>
            </div>
            {userTier === 'free' ? (
              <Link href="/pricing" className="ml-auto text-xs px-3 py-1.5 rounded-full bg-[#ff4d8d]">
                AI Phone Call
              </Link>
            ) : (
              <button type="button" onClick={() => setCalling(true)} className="ml-auto text-xs px-3 py-1.5 rounded-full bg-[#ff4d8d]">
                AI Phone Call
              </button>
            )}
          </div>
          <div className="flex-1 px-4 py-4 space-y-3 overflow-auto">
            {lines.map((line, i) => (
              <p
                key={i}
                className={`max-w-lg text-sm leading-relaxed ${
                  line.role === 'user' ? 'ml-auto text-right text-white' : 'text-gray-200'
                }`}
              >
                {line.content}
              </p>
            ))}
            <div className="max-w-md mt-6 p-4 rounded-2xl bg-[#141416] border border-white/5">
              <p className="text-sm mb-2">Ask anything</p>
              <div className="flex gap-2">
                <input
                  value={ask}
                  onChange={(e) => setAsk(e.target.value)}
                  placeholder="Ask anything"
                  className="flex-1 bg-[#0c0c0e] rounded-full px-3 py-2 text-sm outline-none"
                />
                <button type="button" onClick={() => ask.trim() && requestVideo(ask.trim())} className="text-sm text-[#ff4d8d]">
                  Request
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {ACTIONS.map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => requestVideo(action)}
                    className="text-xs px-2 py-1 rounded-full bg-white/5"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <ChatInput
            onSend={send}
            isSending={sending}
            userTier={userTier}
            onRequestImage={requestImage}
            onRequestVideo={requestVideo}
            sceneStatus={sceneStatus}
          />
        </section>
        <aside className="hidden lg:block border-l border-white/5 p-5">
          <h2 className="text-sm text-gray-400 mb-3">About me</h2>
          <dl className="space-y-3">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[10px] uppercase tracking-wide text-gray-500">{label}</dt>
                <dd className="text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
      {calling && character && (
        <VoiceCallModal
          characterId={character.id}
          characterName={character.name}
          characterAvatarUrl={character.avatar_url}
          onClose={() => setCalling(false)}
        />
      )}
    </SecretsLayout>
  );
}
