'use client';

import { useCallback, useEffect, useState } from 'react';
import { pushAdminUrl } from '@/lib/admin-routes';

interface Character {
  id: string;
  name: string;
}

interface Background {
  slot: 1 | 2;
  in_use: boolean;
  url: string;
}

interface Result {
  task_id: string;
  kind: 'image' | 'video';
  media_url: string | null;
}

interface TaskStatus {
  task_id: string;
  kind: 'image' | 'video';
  state: 'pending' | 'claimed' | 'succeeded' | 'failed';
  url: string | null;
  error: string | null;
}

const SLOTS = [1, 2] as const;
const MAX_SHOTS = 4;
const POLL_MS = 4000;
const INPUT_CLASS = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white';
const BUTTON_CLASS = 'px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed';

async function requestJson<T>(url: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: 'include',
    ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}

export default function PhotoShootStudio() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [characterId, setCharacterId] = useState('');
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [pending, setPending] = useState<string[]>([]);
  const [direction, setDirection] = useState('');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [count, setCount] = useState(1);
  const [clipSource, setClipSource] = useState<string | null>(null);
  const [clipDirection, setClipDirection] = useState('');
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shootUrl = characterId ? `/api/admin/characters/${characterId}/shoot` : '';
  const inUseCount = backgrounds.filter((background) => background.in_use).length;

  useEffect(() => {
    requestJson<Character[]>('/api/admin/characters', 'GET')
      .then((list) => {
        setCharacters(list);
        const fromUrl = new URLSearchParams(window.location.search).get('character');
        setCharacterId(list.some((item) => item.id === fromUrl) && fromUrl ? fromUrl : list[0]?.id ?? '');
      })
      .catch((err) => setError(err.message));
  }, []);

  const loadShoot = useCallback(async () => {
    if (!shootUrl) return;
    try {
      const data = await requestJson<{ backgrounds: Background[]; results: Result[] }>(shootUrl, 'GET');
      setBackgrounds(data.backgrounds);
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this shoot.');
    }
  }, [shootUrl]);

  useEffect(() => {
    setBackgrounds([]);
    setResults([]);
    setPending([]);
    setClipSource(null);
    setError(null);
    loadShoot();
  }, [loadShoot]);

  useEffect(() => {
    if (pending.length === 0 || !shootUrl) return;
    const timer = setTimeout(async () => {
      try {
        const { tasks } = await requestJson<{ tasks: TaskStatus[] }>(`${shootUrl}?tasks=${pending.join(',')}`, 'GET');
        const finished = tasks.filter((task) => task.state === 'succeeded' || task.state === 'failed');
        if (finished.some((task) => task.state === 'failed')) setError('A shot failed. Try it again.');
        const finishedIds = new Set(finished.map((task) => task.task_id));
        setPending((current) => current.filter((id) => !finishedIds.has(id)));
        const done = finished.filter((task) => task.state === 'succeeded');
        if (done.length > 0) {
          setResults((current) => [
            ...done.map((task) => ({ task_id: task.task_id, kind: task.kind, media_url: task.url })),
            ...current,
          ]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not check the shots.');
      }
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [pending, shootUrl]);

  const chooseCharacter = (id: string) => {
    setCharacterId(id);
    pushAdminUrl(`/admin/create-model?character=${id}`);
  };

  const uploadBackground = async (slot: 1 | 2, file: File | undefined) => {
    if (!file) return;
    setBusySlot(slot);
    setError(null);
    try {
      const upload = await requestJson<{ path: string; uploadUrl: string }>(`${shootUrl}/backgrounds`, 'POST', {
        contentType: file.type,
        bytes: file.size,
      });
      const put = await fetch(upload.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      const data = await requestJson<{ backgrounds: Background[] }>(`${shootUrl}/backgrounds`, 'PUT', { slot, path: upload.path });
      setBackgrounds(data.backgrounds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload the background.');
    } finally {
      setBusySlot(null);
    }
  };

  const changeBackground = async (slot: 1 | 2, change: { inUse: boolean } | 'remove') => {
    setBusySlot(slot);
    setError(null);
    try {
      const data = change === 'remove'
        ? await requestJson<{ backgrounds: Background[] }>(`${shootUrl}/backgrounds?slot=${slot}`, 'DELETE')
        : await requestJson<{ backgrounds: Background[] }>(`${shootUrl}/backgrounds`, 'PATCH', { slot, inUse: change.inUse });
      setBackgrounds(data.backgrounds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the background.');
    } finally {
      setBusySlot(null);
    }
  };

  const start = async (body: Record<string, unknown>) => {
    setStarting(true);
    setError(null);
    try {
      const data = await requestJson<{ taskIds: string[]; failedToStart: number }>(shootUrl, 'POST', body);
      setPending((current) => [...current, ...data.taskIds]);
      if (data.failedToStart > 0) setError(`${data.failedToStart} shot(s) could not start.`);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start this shoot.');
      return false;
    } finally {
      setStarting(false);
    }
  };

  const startClip = async () => {
    if (await start({ kind: 'video', direction: clipDirection, sourceTaskId: clipSource })) {
      setClipSource(null);
      setClipDirection('');
    }
  };

  return (
    <section className="mb-10 space-y-6 border-b border-gray-200 dark:border-gray-700 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Photo and Video Shoot</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Every photo is shot in the backgrounds below until you change them.
        </p>
      </div>

      <label className="block max-w-md text-sm font-medium text-gray-700 dark:text-gray-300">
        Character
        <select value={characterId} onChange={(e) => chooseCharacter(e.target.value)} className={`mt-1 ${INPUT_CLASS}`}>
          {characters.length === 0 && <option value="">No characters yet</option>}
          {characters.map((character) => (
            <option key={character.id} value={character.id}>{character.name}</option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SLOTS.map((slot) => {
          const background = backgrounds.find((item) => item.slot === slot);
          const busy = busySlot === slot;
          return (
            <div key={slot} className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Background {slot}</h3>
              {background ? (
                // Signed storage links change on every load, so next/image can't cache them.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={background.url} alt={`Background ${slot}`} className="w-full aspect-video object-cover rounded" />
              ) : (
                <div className="w-full aspect-video rounded bg-gray-100 dark:bg-gray-900 grid place-items-center text-sm text-gray-500">
                  No background
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700 dark:text-gray-300">
                <label>
                  <span className="sr-only">Upload background {slot}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy || !characterId}
                    onChange={(e) => {
                      uploadBackground(slot, e.target.files?.[0]);
                      e.target.value = '';
                    }}
                    className="block w-full text-sm"
                  />
                </label>
                {background && (
                  <>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={background.in_use}
                        disabled={busy}
                        onChange={(e) => changeBackground(slot, { inUse: e.target.checked })}
                      />
                      Use in shoot
                    </label>
                    <button type="button" disabled={busy} onClick={() => changeBackground(slot, 'remove')} className="text-red-600 hover:text-red-700 disabled:opacity-50">
                      Remove
                    </button>
                  </>
                )}
                {busy && <span>Working...</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Shot direction: pose, outfit and expression
          <textarea
            rows={3}
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            placeholder="Sitting on the bench, wearing a black slip dress, looking off to the side"
            className={`mt-1 ${INPUT_CLASS}`}
          />
        </label>
        <div className="flex flex-wrap items-end gap-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Format
            <select value={orientation} onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape')} className={`mt-1 ${INPUT_CLASS}`}>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Photos
            <select value={count} onChange={(e) => setCount(Number(e.target.value))} className={`mt-1 ${INPUT_CLASS}`}>
              {Array.from({ length: MAX_SHOTS }, (_, index) => (
                <option key={index + 1} value={index + 1}>{index + 1}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={starting || !direction.trim() || inUseCount === 0}
            onClick={() => start({ kind: 'photo', direction, orientation, count })}
            className={BUTTON_CLASS}
          >
            Shoot Photos
          </button>
          {inUseCount === 2 && count > 1 && (
            <span className="text-sm text-gray-500 dark:text-gray-400">Shots take turns between both backgrounds.</span>
          )}
          {inUseCount === 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400">Add a background to start shooting.</span>
          )}
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      {pending.length > 0 && (
        <p role="status" className="text-sm text-gray-600 dark:text-gray-400">
          {pending.length} shot(s) in progress. Photos take about a minute, and clips can take longer.
        </p>
      )}

      {clipSource && (
        <div className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Make a clip from this photo</h3>
          <textarea
            aria-label="Clip direction"
            rows={2}
            value={clipDirection}
            onChange={(e) => setClipDirection(e.target.value)}
            placeholder="She turns toward the camera and smiles"
            className={INPUT_CLASS}
          />
          <div className="flex gap-3">
            <button type="button" disabled={starting || !clipDirection.trim()} onClick={startClip} className={BUTTON_CLASS}>
              Shoot Clip
            </button>
            <button type="button" onClick={() => setClipSource(null)} className="px-4 py-2 text-gray-600 dark:text-gray-300">
              Cancel
            </button>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {results.map((result) => result.media_url && (
            <div key={result.task_id} className="space-y-1">
              {result.kind === 'video' ? (
                <video src={result.media_url} controls className="w-full rounded" />
              ) : (
                // Generated media can be any size, so it isn't run through next/image here.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={result.media_url} alt="Shoot result" className="w-full rounded" />
              )}
              {result.kind === 'image' && (
                <button type="button" onClick={() => setClipSource(result.task_id)} className="text-sm text-purple-600 hover:text-purple-700">
                  Make clip
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
