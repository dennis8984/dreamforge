'use client';

import { Suspense, use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import SecretsLayout from '@/components/SecretsLayout';
import { CamPhone } from '@/components/ProfileViews';
import VoiceCallModal from '@/components/voice/VoiceCallModal';
import { findLayoutCharacter, LAYOUT_CAST } from '@/lib/layout-cast';
import { useI18n, type MessageKey } from '@/lib/i18n';
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
  clip?: string;
}

interface Line {
  role: 'user' | 'assistant';
  content: string;
}

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
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0e0e10]" />}>
      <CharacterScreen params={params} />
    </Suspense>
  );
}

function CharacterScreen({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const search = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();
  const view = search.get('view') === 'cam' ? 'cam' : 'chat';
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userTier, setUserTier] = useState('free');
  const [character, setCharacter] = useState<Character | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sceneStatus, setSceneStatus] = useState<string | null>(null);
  const [calling, setCalling] = useState(false);
  const [draft, setDraft] = useState('');
  const [motion, setMotion] = useState(false);

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
      const local = findLayoutCharacter(slug);
      let next = (local as Character | undefined) || undefined;
      try {
        const res = await fetch(`/api/characters/${slug}`);
        const data = await res.json();
        if (data.character) {
          const remote = data.character as Character;
          next = { ...(local || {}), ...remote, clip: remote.clip || local?.clip };
        }
      } catch {
        next = local as Character | undefined;
      }
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
      setLines((prev) => [...prev, { role: 'assistant', content: t('profile.needAccount') }]);
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
      else if (!res.ok) setLines((prev) => [...prev, { role: 'assistant', content: data.error || t('profile.messageFailed') }]);
    } catch (err) {
      setLines((prev) => [...prev, { role: 'assistant', content: err instanceof Error ? err.message : t('profile.messageFailed') }]);
    } finally {
      setSending(false);
    }
  };

  const requestImage = async (prompt: string) => {
    if (!character) return;
    const token = getToken();
    if (!token) {
      setSceneStatus(t('profile.loginStill'));
      return;
    }
    setSceneStatus(t('profile.makingStill'));
    setSending(true);
    try {
      const res = await fetch(`/api/characters/${character.slug}/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('profile.imageFailed'));
      if (data.image_url) {
        setCharacter((prev) => (prev ? { ...prev, avatar_url: prev.avatar_url || data.image_url } : prev));
        setSceneStatus(t('profile.stillReady'));
      } else if (data.jobId) {
        setSceneStatus(t('profile.stillQueued'));
      }
    } catch (err) {
      setSceneStatus(err instanceof Error ? err.message : t('profile.imageFailed'));
    } finally {
      setSending(false);
    }
  };

  const requestVideo = async (prompt: string) => {
    if (!character) return;
    if (!character.avatar_url) {
      setSceneStatus(t('profile.needStill'));
      return;
    }
    const token = getToken();
    if (!token) {
      setSceneStatus(t('profile.loginClip'));
      return;
    }
    setSceneStatus(t('profile.animating'));
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
      if (!res.ok) throw new Error(data.error || t('profile.clipFailed'));
      setSceneStatus(t('profile.clipQueued'));
    } catch (err) {
      setSceneStatus(err instanceof Error ? err.message : t('profile.clipFailed'));
    } finally {
      setSending(false);
    }
  };

  const age = character?.age ? parseInt(character.age, 10) : NaN;
  const facts: Array<[MessageKey, string | undefined]> = character
    ? [
        ['profile.age', Number.isNaN(age) ? character.age : String(age)],
        ['profile.body', character.body],
        ['profile.ethnicity', character.ethnicity],
        ['profile.language', character.language],
        ['profile.relationship', character.relationship],
        ['profile.work', character.occupation],
        ['profile.hobbies', character.hobbies],
        ['profile.personality', character.personality_traits?.join(', ')],
      ]
    : [];
  const shown = facts.filter((row): row is [MessageKey, string] => Boolean(row[1]));
  const photo = motion && character?.clip ? character.clip : character?.avatar_url;

  if (view === 'cam') {
    return (
      <SecretsLayout isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} userTier={userTier}>
        {character ? (
          <CamPhone character={character} onClose={() => router.push('/')} />
        ) : (
          <div className="h-dvh bg-[#131313] md:mx-auto md:my-6 md:h-[852px] md:w-[390px] md:rounded-3xl" />
        )}
      </SecretsLayout>
    );
  }

  return (
    <SecretsLayout isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} userTier={userTier}>
      <div className="flex h-[calc(100dvh-4rem-5rem)] min-h-0 flex-col bg-[#0c0c0e] lg:grid lg:h-[calc(100vh-4rem)] lg:grid-cols-[240px_minmax(0,1fr)_320px]">
        <aside className="hidden border-r border-white/5 bg-[#121214] lg:flex lg:flex-col">
          <h2 className="px-4 py-4 text-[18px] font-semibold">{t('profile.chat')}</h2>
          <label className="mx-3 mb-3 flex h-10 items-center rounded-full bg-[#252525] px-4">
            <span className="sr-only">{t('profile.search')}</span>
            <input readOnly placeholder={t('profile.search')} className="w-full bg-transparent text-[13px] outline-none placeholder:text-white/60" />
          </label>
          <div className="flex flex-col gap-1 overflow-auto px-2 pb-4">
            {LAYOUT_CAST.slice(0, 8).map((person) => (
              <Link
                key={person.slug}
                href={`/character/${person.slug}?view=chat`}
                className={`flex items-center gap-2 rounded-xl px-2 py-2 ${person.slug === slug ? 'bg-[#303030]' : 'hover:bg-white/5'}`}
              >
                <img src={person.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                <span className="truncate text-[14px] font-medium">{person.name}</span>
              </Link>
            ))}
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
            <Link href="/" aria-label={t('profile.back')} className="flex h-9 w-9 items-center justify-center text-white lg:hidden">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M15 5 8 12l7 7" />
              </svg>
            </Link>
            <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[#1c1c1f]">
              {character?.avatar_url ? <img src={character.avatar_url} alt="" className="size-full object-cover" /> : null}
            </span>
            <h1 className="min-w-0 truncate text-[20px] font-semibold leading-6">{character?.name || t('profile.chat')}</h1>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {!isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event('df-open-register'))}
                  className="h-[34px] whitespace-nowrap rounded-full bg-[#ee5876] px-3 text-[12px] font-semibold text-white"
                >
                  <span className="sm:hidden">{t('auth.join')}</span>
                  <span className="hidden sm:inline">{t('auth.create')}</span>
                </button>
              ) : null}
              {userTier === 'free' ? (
                <Link href="/pricing" aria-label={t('profile.phone')} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff4d8d] text-white">
                  <PhoneIcon />
                </Link>
              ) : (
                <button type="button" aria-label={t('profile.phone')} onClick={() => setCalling(true)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff4d8d] text-white">
                  <PhoneIcon />
                </button>
              )}
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-auto px-4 py-4">
            {lines.length === 0 ? (
              <p className="max-w-md rounded-2xl bg-[#2a2a2e] px-4 py-3 text-sm leading-relaxed text-gray-200">{t('profile.greeting')}</p>
            ) : null}
            {lines.map((line, i) => (
              <p
                key={i}
                className={`max-w-lg rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  line.role === 'user' ? 'ml-auto bg-[#3a2a38] text-right text-white' : 'bg-[#2a2a2e] text-gray-200'
                }`}
              >
                {line.content}
              </p>
            ))}
          </div>

          <form
            className="border-t border-white/5 bg-[#0c0c0e] px-3 py-3"
            onSubmit={(event) => {
              event.preventDefault();
              const text = draft.trim();
              if (!text || sending) return;
              setDraft('');
              send(text);
            }}
          >
            <p className="mb-2 text-[13px] text-white/70">{t('profile.scene')}</p>
            <div className="mb-2 flex gap-2">
              <button
                type="button"
                disabled={sending}
                onClick={() => requestImage(draft.trim() || 'fashion portrait, adult')}
                className="rounded-full border border-white/10 bg-[#1c1c1f] px-3 py-1.5 text-sm"
              >
                {t('profile.image')}
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={() => requestVideo(draft.trim() || 'subtle smile, slight head turn')}
                className="rounded-full border border-white/10 bg-[#1c1c1f] px-3 py-1.5 text-sm"
              >
                {t('profile.video')}
              </button>
            </div>
            {sceneStatus ? <p className="mb-2 text-xs text-gray-400">{sceneStatus}</p> : null}
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    const text = draft.trim();
                    if (!text || sending) return;
                    setDraft('');
                    send(text);
                  }
                }}
                placeholder={t('profile.write')}
                rows={1}
                className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-white/10 bg-[#1c1c1f] px-4 py-3 text-sm text-gray-100 outline-none placeholder:text-gray-500"
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                aria-label={t('cam.send')}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7c5cff] text-white disabled:bg-gray-700"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                  <path d="M3 11.5 21 3l-8.2 18-2.3-7.2L3 11.5z" />
                </svg>
              </button>
            </div>
          </form>
        </section>

        <aside className="hidden border-l border-white/5 lg:block">
          <div className="relative h-[360px] bg-[#141416]">
            {photo ? <img src={photo} alt="" className="size-full object-cover object-top" /> : null}
            {character?.clip ? (
              <>
                <button type="button" aria-label={t('profile.image')} onClick={() => setMotion(false)} className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white">
                  ‹
                </button>
                <button type="button" aria-label={t('profile.video')} onClick={() => setMotion(true)} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white">
                  ›
                </button>
              </>
            ) : null}
          </div>
          <div className="p-5">
            <h2 className="text-[20px] font-semibold">{character?.name}</h2>
            <p className="mt-2 text-sm leading-6 text-white/80">
              {character?.name} {t('profile.bio')}
            </p>
            <h3 className="mb-3 mt-5 text-sm text-gray-400">{t('profile.about')}</h3>
            <dl className="space-y-3">
              {shown.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[10px] uppercase tracking-wide text-gray-500">{t(label)}</dt>
                  <dd className="text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
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

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M7 3h4l1.5 4-2 1.5a12 12 0 0 0 5 5L17 12l4 1.5V18a2 2 0 0 1-2 2A15 15 0 0 1 4 5a2 2 0 0 1 2-2z" />
    </svg>
  );
}
