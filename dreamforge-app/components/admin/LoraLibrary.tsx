'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LORA_KINDS,
  MAX_LORA_STRENGTH,
  loraGroupName,
  pairedTarget,
  type LoraFamily,
  type LoraKind,
  type LoraTarget,
} from '@/lib/lora-library';

interface Lora {
  id: string;
  name: string;
  kind: LoraKind;
  base_model: string;
  weights_path: string | null;
  trigger_word: string | null;
  default_strength: number | string;
  licence: string | null;
  source_url: string | null;
  is_nsfw: boolean;
  status: string;
  character_loras: { character_id: string }[];
}

interface Character {
  id: string;
  name: string;
  avatar_url?: string | null;
}

interface Assignment {
  id: string;
  target: LoraTarget;
  strength: number | string;
  lora_models: { id: string; name: string; base_model: string; status: string } | null;
}

interface Library {
  loras: Lora[];
  families: LoraFamily[];
  active: { image: string; video: string };
}

interface TestTask {
  task_id: string;
  state: 'pending' | 'claimed' | 'succeeded' | 'failed';
  url: string | null;
  error: string | null;
}

interface TestRun {
  groupName: string;
  kind: 'image' | 'video';
  withLora: string;
  without: string;
  tasks: Record<string, TestTask>;
}

const POLL_MS = 4000;
const INPUT_CLASS = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white';
const LABEL_CLASS = 'block text-sm font-medium text-gray-700 dark:text-gray-300';
const BUTTON_CLASS = 'px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed';
const SECONDARY_BUTTON_CLASS = 'px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed';
const NOTE_CLASS = 'text-sm text-gray-600 dark:text-gray-400';

const KIND_LABELS: Record<LoraKind, string> = {
  style: 'Style, action or camera',
  detail: 'Detail or realism',
  character: 'Character',
};
const STATUS_LABELS: Record<string, string> = {
  pending: 'Not enabled',
  ready: 'Enabled',
  disabled: 'Disabled',
  failed: 'Failed',
  training: 'Training',
};
const TARGET_LABELS: Record<LoraTarget, string> = {
  image: 'Stills',
  video: 'Clips',
  video_high_noise: 'High-noise pass',
  video_low_noise: 'Low-noise pass',
};
const DEFAULT_TEST_PROMPTS = {
  image: 'Waist-up photo of a woman in a sunlit room, natural skin texture',
  video: 'She turns slowly toward the camera and smiles, natural light',
};
const EMPTY_FORM = {
  name: '',
  kind: 'style' as LoraKind,
  base_model: 'wan-2.2',
  isPair: true,
  link: '',
  high_link: '',
  low_link: '',
  trigger_word: '',
  default_strength: 1,
  licence: '',
  source_url: '',
  is_nsfw: false,
  confirmed_licence: false,
  confirmed_people: false,
};

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

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function groupByName<T>(items: T[], nameOf: (item: T) => string): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = loraGroupName(nameOf(item));
    groups.set(key, [...(groups.get(key) || []), item]);
  }
  // Sorting by name puts "(high)" before "(low)".
  return [...groups.entries()].map(([name, group]) => [name, [...group].sort((a, b) => nameOf(a).localeCompare(nameOf(b)))]);
}

function targetFor(lora: Lora, families: LoraFamily[]): LoraTarget {
  return pairedTarget(lora.name) ?? families.find((family) => family.base === lora.base_model)?.targets.at(-1) ?? 'image';
}

export default function LoraLibrary() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [testing, setTesting] = useState<string | null>(null);
  const [testPrompt, setTestPrompt] = useState('');
  const [testCharacter, setTestCharacter] = useState('');
  const [testRun, setTestRun] = useState<TestRun | null>(null);

  const [characterId, setCharacterId] = useState('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignGroup, setAssignGroup] = useState('');
  const [assignStrengths, setAssignStrengths] = useState<Record<string, number>>({});

  const families = library?.families ?? [];
  const family = families.find((item) => item.base === form.base_model);
  const isPair = Boolean(family?.hasPairs && form.isPair);

  const groups = useMemo(() => groupByName(library?.loras ?? [], (lora) => lora.name), [library]);
  const enabledGroups = groups.filter(([, files]) => files.every((file) => file.status === 'ready'));
  const assignFiles = enabledGroups.find(([name]) => name === assignGroup)?.[1] ?? [];

  const load = useCallback(async () => {
    setLibrary(await requestJson<Library>('/api/admin/loras', 'GET'));
  }, []);

  const loadAssignments = useCallback(async (id: string) => {
    if (!id) return setAssignments([]);
    const data = await requestJson<{ assignments: Assignment[] }>(`/api/admin/characters/${id}/loras`, 'GET');
    setAssignments(data.assignments);
  }, []);

  useEffect(() => {
    load().catch((caught) => setError(messageOf(caught)));
    requestJson<Character[]>('/api/admin/characters', 'GET')
      .then((list) => {
        setCharacters(list);
        setCharacterId(list[0]?.id ?? '');
      })
      .catch((caught) => setError(messageOf(caught)));
  }, [load]);

  useEffect(() => {
    loadAssignments(characterId).catch((caught) => setError(messageOf(caught)));
  }, [characterId, loadAssignments]);

  const testIds = testRun ? `${testRun.withLora},${testRun.without}` : null;
  const testFinished = testRun
    ? [testRun.withLora, testRun.without].every((id) => ['succeeded', 'failed'].includes(testRun.tasks[id]?.state ?? ''))
    : true;

  useEffect(() => {
    if (!testIds || testFinished) return;
    const timer = setInterval(() => {
      requestJson<{ tasks: TestTask[] }>(`/api/admin/loras/test?tasks=${testIds}`, 'GET')
        .then(({ tasks }) => {
          setTestRun((run) => run && { ...run, tasks: Object.fromEntries(tasks.map((task) => [task.task_id, task])) });
        })
        .catch((caught) => setError(messageOf(caught)));
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [testIds, testFinished]);

  async function run(action: () => Promise<void>, success?: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      if (success) setNotice(success);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }

  function addLora(event: React.FormEvent) {
    event.preventDefault();
    run(async () => {
      const { name, kind, base_model, trigger_word, default_strength, licence, source_url, is_nsfw, confirmed_licence, confirmed_people } = form;
      await requestJson('/api/admin/loras', 'POST', {
        name, kind, base_model, trigger_word, default_strength, licence, source_url, is_nsfw, confirmed_licence, confirmed_people,
        ...(isPair ? { high_link: form.high_link, low_link: form.low_link } : { link: form.link }),
      });
      setForm(EMPTY_FORM);
      await load();
    }, 'Added. Test it, then enable it.');
  }

  function setGroupStatus(files: Lora[], status: 'ready' | 'disabled') {
    run(async () => {
      await Promise.all(files.map((file) => requestJson(`/api/admin/loras/${file.id}`, 'PATCH', { status })));
      await load();
    });
  }

  function saveDefaultStrength(file: Lora, value: number) {
    run(async () => {
      await requestJson(`/api/admin/loras/${file.id}`, 'PATCH', { default_strength: value });
      await load();
    });
  }

  function deleteGroup(files: Lora[]) {
    run(async () => {
      await Promise.all(files.map((file) => requestJson(`/api/admin/loras/${file.id}`, 'DELETE')));
      await load();
    });
  }

  function openTest(name: string, media: 'image' | 'video') {
    setTesting(name);
    setTestPrompt(DEFAULT_TEST_PROMPTS[media]);
    setTestCharacter((current) => current || characters.find((item) => item.avatar_url)?.id || '');
    setTestRun(null);
  }

  function startTest(name: string, files: Lora[]) {
    run(async () => {
      const started = await requestJson<{ withLora: string; without: string; kind: 'image' | 'video' }>(
        '/api/admin/loras/test',
        'POST',
        { loraIds: files.map((file) => file.id), prompt: testPrompt, characterId: testCharacter }
      );
      setTestRun({ groupName: name, ...started, tasks: {} });
    });
  }

  function assign() {
    run(async () => {
      await requestJson(`/api/admin/characters/${characterId}/loras`, 'POST', {
        items: assignFiles.map((file) => ({
          lora_id: file.id,
          target: targetFor(file, families),
          strength: assignStrengths[file.id] ?? Number(file.default_strength),
        })),
      });
      setAssignGroup('');
      setAssignStrengths({});
      await Promise.all([loadAssignments(characterId), load()]);
    });
  }

  function changeStrength(assignment: Assignment, strength: number) {
    run(async () => {
      await requestJson(`/api/admin/characters/${characterId}/loras`, 'PATCH', { assignmentId: assignment.id, strength });
      await loadAssignments(characterId);
    });
  }

  function removeAssignment(items: Assignment[]) {
    run(async () => {
      const ids = items.map((item) => item.id).join(',');
      await requestJson(`/api/admin/characters/${characterId}/loras?assignment=${ids}`, 'DELETE');
      await Promise.all([loadAssignments(characterId), load()]);
    });
  }

  const assignmentGroups = groupByName(assignments, (item) => item.lora_models?.name ?? '');
  const usesWan = assignments.some((item) => item.lora_models?.base_model === 'wan-2.2' && item.lora_models.status === 'ready');
  const usesStillLora = assignments.some((item) => item.target === 'image' && item.lora_models?.status === 'ready');

  function assignmentWarning(items: Assignment[]): string | null {
    const lora = items[0]?.lora_models;
    if (!lora) return null;
    if (items.some((item) => item.lora_models?.status !== 'ready')) return 'Not used: this LoRA is not enabled.';
    if (items[0].target === 'image' && lora.base_model !== library?.active.image) {
      return `Not used: member stills run on ${library?.active.image}, and this LoRA is for ${lora.base_model}.`;
    }
    if (lora.base_model === 'minimax-h3' && usesWan) return 'Not used: this character also has Wan LoRAs, so clips run on Wan.';
    if (lora.base_model === 'minimax-h3' && library?.active.video !== 'minimax-h3') {
      return `Not used: clips run on ${library?.active.video}.`;
    }
    const hasPartner = items.length > 1;
    if (pairedTarget(lora.name) && !hasPartner) return 'Only one half of this pair is assigned, so it may not work as intended.';
    return null;
  }

  if (!library) {
    return error
      ? <p className="text-red-600 dark:text-red-400">{error}</p>
      : <p className={NOTE_CLASS}>Loading LoRAs…</p>;
  }

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">LoRAs</h2>
        <p className={`mt-1 ${NOTE_CLASS}`}>
          Add a LoRA by link, compare it with and without at the same seed, then assign it to a character.
          SpicyAPI runs LoRAs but does not train them.
        </p>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-700 dark:text-green-300">{notice}</p>}

      <form onSubmit={addLora} className="space-y-4 max-w-3xl rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add a LoRA</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className={LABEL_CLASS}>
            Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`mt-1 ${INPUT_CLASS}`} required maxLength={120} />
          </label>
          <label className={LABEL_CLASS}>
            Built for
            <select value={form.base_model} onChange={(e) => setForm({ ...form, base_model: e.target.value })} className={`mt-1 ${INPUT_CLASS}`}>
              {families.map((item) => <option key={item.base} value={item.base}>{item.label}</option>)}
            </select>
          </label>
          <label className={LABEL_CLASS}>
            Kind
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as LoraKind })} className={`mt-1 ${INPUT_CLASS}`}>
              {LORA_KINDS.map((kind) => <option key={kind} value={kind}>{KIND_LABELS[kind]}</option>)}
            </select>
          </label>
          <label className={LABEL_CLASS}>
            Trigger word (if it has one)
            <input value={form.trigger_word} onChange={(e) => setForm({ ...form, trigger_word: e.target.value })} className={`mt-1 ${INPUT_CLASS}`} maxLength={100} />
          </label>
        </div>

        {family?.hasPairs && (
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={form.isPair} onChange={(e) => setForm({ ...form, isPair: e.target.checked })} />
            This LoRA has separate HIGH and LOW files
          </label>
        )}

        {isPair ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className={LABEL_CLASS}>
              HIGH file link
              <input type="url" value={form.high_link} onChange={(e) => setForm({ ...form, high_link: e.target.value })} className={`mt-1 ${INPUT_CLASS}`} required />
            </label>
            <label className={LABEL_CLASS}>
              LOW file link
              <input type="url" value={form.low_link} onChange={(e) => setForm({ ...form, low_link: e.target.value })} className={`mt-1 ${INPUT_CLASS}`} required />
            </label>
          </div>
        ) : (
          <label className={LABEL_CLASS}>
            File link
            <input type="url" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className={`mt-1 ${INPUT_CLASS}`} required />
          </label>
        )}
        <p className={NOTE_CLASS}>
          Civitai: choose the version on the LoRA page and paste that address, or its download link. Hugging Face: paste the link to the .safetensors file.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className={LABEL_CLASS}>
            Default strength (0 to {MAX_LORA_STRENGTH})
            <input
              type="number"
              min={0}
              max={MAX_LORA_STRENGTH}
              step={0.05}
              value={form.default_strength}
              onChange={(e) => setForm({ ...form, default_strength: Number(e.target.value) })}
              className={`mt-1 ${INPUT_CLASS}`}
            />
          </label>
          <label className={LABEL_CLASS}>
            Source page
            <input type="url" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} className={`mt-1 ${INPUT_CLASS}`} />
          </label>
        </div>

        <label className={LABEL_CLASS}>
          License terms
          <input value={form.licence} onChange={(e) => setForm({ ...form, licence: e.target.value })} className={`mt-1 ${INPUT_CLASS}`} required placeholder="As listed on the source page" />
        </label>

        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={form.is_nsfw} onChange={(e) => setForm({ ...form, is_nsfw: e.target.checked })} className="mt-1" />
            This is an adult LoRA
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={form.confirmed_licence} onChange={(e) => setForm({ ...form, confirmed_licence: e.target.checked })} className="mt-1" />
            The license, or the creator&apos;s written permission, allows paid use on this platform
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={form.confirmed_people} onChange={(e) => setForm({ ...form, confirmed_people: e.target.checked })} className="mt-1" />
            It does not depict a real person without a release on file, and is not aimed at a youthful or childlike look
          </label>
        </div>

        <button type="submit" disabled={busy} className={BUTTON_CLASS}>Add LoRA</button>
      </form>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Library</h3>
        {groups.length === 0 && <p className={NOTE_CLASS}>No LoRAs yet.</p>}
        {groups.map(([name, files]) => {
          const first = files[0];
          const familyInfo = families.find((item) => item.base === first.base_model);
          const used = new Set(files.flatMap((file) => file.character_loras.map((row) => row.character_id))).size;
          const enabled = files.every((file) => file.status === 'ready');
          const isMine = testRun?.groupName === name;
          return (
            <article key={name} className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-semibold text-gray-900 dark:text-white break-words">{name}</h4>
                  <p className={NOTE_CLASS}>
                    {familyInfo?.label ?? first.base_model} · {STATUS_LABELS[first.status] ?? first.status} · used by {used}
                    {first.trigger_word ? ` · trigger: ${first.trigger_word}` : ''}
                  </p>
                  <p className={`${NOTE_CLASS} break-words`}>License: {first.licence}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => openTest(name, familyInfo?.media ?? 'image')} disabled={busy} className={SECONDARY_BUTTON_CLASS}>Test</button>
                  {enabled
                    ? <button type="button" onClick={() => setGroupStatus(files, 'disabled')} disabled={busy} className={SECONDARY_BUTTON_CLASS}>Disable</button>
                    : <button type="button" onClick={() => setGroupStatus(files, 'ready')} disabled={busy} className={SECONDARY_BUTTON_CLASS}>Enable</button>}
                  <button type="button" onClick={() => deleteGroup(files)} disabled={busy || used > 0} className={SECONDARY_BUTTON_CLASS} title={used > 0 ? 'Remove it from characters first' : undefined}>Delete</button>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                {files.map((file) => (
                  <label key={file.id} className="text-sm text-gray-700 dark:text-gray-300">
                    {pairedTarget(file.name) ? `${TARGET_LABELS[pairedTarget(file.name) as LoraTarget]} strength` : 'Default strength'}
                    <input
                      type="number"
                      min={0}
                      max={MAX_LORA_STRENGTH}
                      step={0.05}
                      defaultValue={Number(file.default_strength)}
                      onBlur={(e) => {
                        const value = Number(e.target.value);
                        if (value !== Number(file.default_strength)) saveDefaultStrength(file, value);
                      }}
                      className={`mt-1 block w-24 ${INPUT_CLASS}`}
                    />
                  </label>
                ))}
              </div>

              {testing === name && (
                <div className="space-y-3 rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
                  <label className={LABEL_CLASS}>
                    Test prompt
                    <textarea value={testPrompt} onChange={(e) => setTestPrompt(e.target.value)} rows={2} maxLength={1000} className={`mt-1 ${INPUT_CLASS}`} />
                  </label>
                  {familyInfo?.media === 'video' && (
                    <label className={`${LABEL_CLASS} max-w-md`}>
                      Character portrait to animate
                      <select value={testCharacter} onChange={(e) => setTestCharacter(e.target.value)} className={`mt-1 ${INPUT_CLASS}`}>
                        <option value="">Choose a character</option>
                        {characters.filter((item) => item.avatar_url).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    </label>
                  )}
                  <p className={NOTE_CLASS}>
                    {familyInfo?.media === 'video'
                      ? 'Runs two paid 5-second 480p clips.'
                      : 'Runs two paid images.'}
                    {' '}Results aren&apos;t checked automatically. Check that the person still clearly looks 21 or older, because a LoRA can shift apparent age.
                  </p>
                  <button type="button" onClick={() => startTest(name, files)} disabled={busy || !testPrompt.trim()} className={BUTTON_CLASS}>Run comparison</button>

                  {isMine && testRun && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {([['With LoRA', testRun.withLora], ['Without LoRA', testRun.without]] as const).map(([label, taskId]) => {
                        const task = testRun.tasks[taskId];
                        return (
                          <figure key={taskId} className="space-y-2">
                            <figcaption className="text-sm font-medium text-gray-900 dark:text-white">{label}</figcaption>
                            {task?.state === 'succeeded' && task.url && (
                              testRun.kind === 'video'
                                ? <video src={task.url} controls loop playsInline className="w-full rounded" />
                                // eslint-disable-next-line @next/next/no-img-element
                                : <img src={task.url} alt={label} className="w-full rounded" />
                            )}
                            {task?.state === 'failed' && <p className="text-sm text-red-600 dark:text-red-400">{task.error || 'This run failed.'}</p>}
                            {(!task || task.state === 'pending' || task.state === 'claimed') && <p className={NOTE_CLASS}>Generating…</p>}
                          </figure>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Character LoRAs</h3>
        <label className={`${LABEL_CLASS} max-w-md`}>
          Character
          <select value={characterId} onChange={(e) => setCharacterId(e.target.value)} className={`mt-1 ${INPUT_CLASS}`}>
            {characters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>

        {usesWan && (
          <p className={NOTE_CLASS}>
            This character&apos;s clips run on Wan 2.2, starting from the chosen image, because it has Wan LoRAs.
          </p>
        )}
        {usesStillLora && (
          <p className={NOTE_CLASS}>
            This character&apos;s member stills run on {library.active.image} instead of the usual reference model, because LoRAs can&apos;t run on Seedream. Check that the look still holds.
          </p>
        )}

        {assignmentGroups.length === 0 && characterId && <p className={NOTE_CLASS}>No LoRAs assigned.</p>}
        {assignmentGroups.map(([name, items]) => {
          const warning = assignmentWarning(items);
          return (
            <div key={name} className="space-y-2 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="font-medium text-gray-900 dark:text-white break-words">{name}</h4>
                <button type="button" onClick={() => removeAssignment(items)} disabled={busy} className={SECONDARY_BUTTON_CLASS}>Remove</button>
              </div>
              {warning && <p className="text-sm text-amber-700 dark:text-amber-400">{warning}</p>}
              <div className="flex flex-wrap gap-4">
                {items.map((item) => (
                  <label key={item.id} className="text-sm text-gray-700 dark:text-gray-300">
                    {TARGET_LABELS[item.target]} strength
                    <input
                      type="number"
                      min={0}
                      max={MAX_LORA_STRENGTH}
                      step={0.05}
                      defaultValue={Number(item.strength)}
                      onBlur={(e) => {
                        const value = Number(e.target.value);
                        if (value !== Number(item.strength)) changeStrength(item, value);
                      }}
                      className={`mt-1 block w-24 ${INPUT_CLASS}`}
                    />
                  </label>
                ))}
              </div>
            </div>
          );
        })}

        <div className="space-y-3 max-w-3xl rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
          <label className={LABEL_CLASS}>
            Assign an enabled LoRA
            <select value={assignGroup} onChange={(e) => { setAssignGroup(e.target.value); setAssignStrengths({}); }} className={`mt-1 ${INPUT_CLASS}`}>
              <option value="">Choose a LoRA</option>
              {enabledGroups.map(([name]) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          {assignFiles.length > 0 && (
            <div className="flex flex-wrap gap-4">
              {assignFiles.map((file) => (
                <label key={file.id} className="text-sm text-gray-700 dark:text-gray-300">
                  {TARGET_LABELS[targetFor(file, families)]} strength
                  <input
                    type="number"
                    min={0}
                    max={MAX_LORA_STRENGTH}
                    step={0.05}
                    value={assignStrengths[file.id] ?? Number(file.default_strength)}
                    onChange={(e) => setAssignStrengths({ ...assignStrengths, [file.id]: Number(e.target.value) })}
                    className={`mt-1 block w-24 ${INPUT_CLASS}`}
                  />
                </label>
              ))}
            </div>
          )}
          <button type="button" onClick={assign} disabled={busy || !characterId || assignFiles.length === 0} className={BUTTON_CLASS}>Assign</button>
        </div>
      </section>
    </div>
  );
}
