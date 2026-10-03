'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

export interface StageCharacter {
  slug: string;
  name: string;
  age?: string;
  avatar_url?: string;
  clip?: string;
  description?: string;
  body?: string;
  ethnicity?: string;
  occupation?: string;
}

export function CamPhone({ character, onClose }: { character: StageCharacter; onClose: () => void }) {
  const { t } = useI18n();
  const [sheet, setSheet] = useState(false);
  const [draft, setDraft] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const viewers = 420 + (character.name.charCodeAt(0) % 180);
  const age = character.age ? parseInt(character.age, 10) : null;

  return (
    <div className="fixed inset-0 z-[70] bg-black md:static md:z-auto md:flex md:min-h-[calc(100vh-4rem)] md:items-start md:justify-center md:bg-[#0d0d0d] md:py-6">
      <div className="relative h-dvh w-full overflow-hidden bg-[#131313] md:h-[852px] md:max-h-[calc(100dvh-48px)] md:w-[390px] md:rounded-3xl">
        {character.avatar_url ? (
          <img src={character.clip || character.avatar_url} alt="" className="absolute inset-0 size-full object-cover" />
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[160px] bg-gradient-to-b from-black/50 to-transparent" />
        <p className="absolute left-3 right-12 top-3 z-30 text-[10px] leading-snug text-white/80">{t('cam.disclaimer')}</p>
        <div className="absolute left-3 right-3 top-12 z-30 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 overflow-hidden rounded-full border border-white/30">
              {character.avatar_url ? <img src={character.avatar_url} alt="" className="size-full object-cover" /> : null}
            </span>
            <span>
              <span className="block text-[14px] font-medium leading-5 text-[#e8e8e8]">
                {character.name}
                {age && !Number.isNaN(age) ? <span className="ml-1 text-white/70">{age}</span> : null}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5">
                <span className="rounded-sm bg-[#ff2d55] px-1 text-[10px] font-extrabold leading-4 text-white">{t('cam.live')}</span>
                <span className="text-[13px] font-medium text-white/80">
                  {viewers} {t('cam.viewers')}
                </span>
              </span>
            </span>
          </div>
          <button type="button" aria-label={t('cam.close')} onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white">
            ×
          </button>
        </div>
        <div className="pointer-events-none absolute bottom-[136px] left-0 z-30 w-full px-6 pr-4">
          <div className="flex max-h-[220px] flex-col justify-end gap-1.5 text-[13px] leading-5 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
            <p><span className="font-semibold text-[#d7b4ff]">nightowl</span> {t('cam.line1')}</p>
            <p><span className="font-semibold text-[#9fd7ff]">guest</span> {t('cam.line2')}</p>
            <p><span className="font-semibold text-[#ffd0e0]">{character.name.split(' ')[0]}</span> {t('cam.line3')}</p>
            {notes.map((note) => (
              <p key={note}><span className="font-semibold text-white">you</span> {note}</p>
            ))}
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-30 px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <form
            className="mb-2 flex h-11 items-center rounded-full bg-black/55 px-4"
            onSubmit={(event) => {
              event.preventDefault();
              const text = draft.trim();
              if (!text) return;
              setNotes((prev) => [...prev, text]);
              setDraft('');
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t('cam.send')}
              className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/60"
            />
          </form>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSheet(true)}
              className="flex h-[42px] w-[133px] shrink-0 items-center justify-center rounded-full border border-[#ff7b91] bg-black/60 text-[14px] font-medium text-white"
            >
              {t('cam.tip')}
            </button>
            <Link
              href="/pricing"
              className="flex h-[42px] flex-1 items-center justify-center rounded-full bg-[linear-gradient(180deg,#ffe08a,#f5c518)] text-[14px] font-semibold text-[#131313]"
            >
              {t('cam.start')}
            </Link>
          </div>
        </div>
        {sheet ? (
          <div className="absolute inset-x-0 bottom-0 z-40 flex max-h-[75%] flex-col overflow-hidden rounded-t-[20px] bg-[#171717]">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-[18px] font-semibold text-[#e8e8e8]">{t('cam.sheet')}</h2>
              <button type="button" aria-label={t('cam.close')} onClick={() => setSheet(false)} className="text-white">
                ×
              </button>
            </div>
            <div className="flex flex-col gap-2.5 overflow-y-auto px-5 pb-6">
              {[
                [t('cam.wave'), '5'],
                [t('cam.look'), '10'],
                [t('cam.turn'), '15'],
              ].map(([label, cost]) => (
                <div key={label} className="flex h-[52px] items-center justify-between rounded-xl bg-[#1c1c1c] px-5 text-white">
                  <span>{label}</span>
                  <span className="text-[#f5c518]">{cost}</span>
                </div>
              ))}
              <Link href="/pricing" className="mt-2 flex h-10 items-center justify-center rounded-full bg-[linear-gradient(256deg,#fc768a_15%,#e65073)] text-[13px] font-bold text-white">
                {t('cam.signup')}
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ProfileModal({ character, onClose }: { character: StageCharacter; onClose: () => void }) {
  const { t } = useI18n();
  const age = character.age ? parseInt(character.age, 10) : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 md:items-center" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0" aria-label={t('modal.close')} onClick={onClose} />
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#141416] md:h-auto md:max-h-[860px] md:w-[420px] md:rounded-[24px]">
        <div className="relative h-[58%] min-h-[280px] md:h-[460px]">
          {character.avatar_url ? <img src={character.avatar_url} alt="" className="size-full object-cover" /> : null}
          <button
            type="button"
            aria-label={t('modal.close')}
            onClick={onClose}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-xl text-white"
          >
            ×
          </button>
        </div>
        <div className="flex flex-1 flex-col px-5 py-4">
          <h2 className="text-[22px] font-semibold">
            {character.name}
            {age && !Number.isNaN(age) ? <span className="ml-2 text-[16px] text-[#cbb6bf]">{age}</span> : null}
          </h2>
          <p className="mt-2 text-[14px] leading-6 text-white/80">
            {character.name} {t('profile.bio')}
          </p>
          <div className="mt-auto flex gap-2 pt-4 pb-[max(12px,env(safe-area-inset-bottom))]">
            <Link
              href={`/character/${character.slug}?view=chat`}
              className="flex h-[46px] flex-1 items-center justify-center rounded-full bg-[#F53B70] text-[15px] font-semibold text-white"
            >
              {t('modal.play')}
            </Link>
            <Link
              href={`/character/${character.slug}?view=chat`}
              className="flex h-[46px] items-center justify-center rounded-full border border-white/20 px-4 text-[14px] font-semibold"
            >
              {t('modal.openChat')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
