'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import CharacterSidebar from '@/components/CharacterSidebar';
import StartCard from '@/components/StartCard';
import CharacterWizard, { type DatasetOrigin } from '@/components/CharacterWizard';
import CharacterCard from '@/components/CharacterCard';
import { pushAdminUrl } from '@/lib/admin-routes';

interface Character {
  id: string;
  slug: string;
  name: string;
  description?: string;
  avatar_url?: string;
  training_status?: string;
}

interface ModelRelease {
  id: string;
  legal_name: string;
  stage_name: string | null;
  signed_at: string | null;
  revoked_at: string | null;
  character_sources: { character_id: string }[];
}

interface ScreenResult {
  path: string;
  status: 'passed' | 'rejected' | 'pending';
  flags: string[];
}

const EMPTY_RELEASE = {
  legal_name: '',
  stage_name: '',
  verification_provider: '',
  verification_ref: '',
  signed_at: '',
  age_verified_21: false,
  covers_all_scopes: false,
};

const INPUT_CLASS = 'w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-200';
const SCREEN_BATCH_SIZE = 5;

async function postJson<T>(url: string, body: unknown, method = 'POST'): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}

async function putFile(uploadUrl: string, file: Blob, contentType: string) {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!response.ok) throw new Error(`Upload failed (${response.status})`);
}

function CharacterAdminPageContent() {
  const searchParams = useSearchParams();
  const [isAuthenticated] = useState(true);
  const [userTier] = useState('admin');
  const [showWizard, setShowWizard] = useState(false);
  const [wizardMode, setWizardMode] = useState<'multi' | 'single' | 'desc'>('multi');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataset, setDataset] = useState<string[] | null>(null);
  const [datasetOrigin, setDatasetOrigin] = useState<DatasetOrigin>('upload');
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [age, setAge] = useState('');
  const [isAdult, setIsAdult] = useState(true);
  const [sourceType, setSourceType] = useState<'ai_generated' | 'licensed_model'>('ai_generated');
  const [attested, setAttested] = useState(false);
  const [release, setRelease] = useState(EMPTY_RELEASE);
  const [releaseFile, setReleaseFile] = useState<File | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [releases, setReleases] = useState<ModelRelease[]>([]);

  // Auth is guaranteed by the admin layout server component

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
    if (mode !== 'single' && mode !== 'multi' && mode !== 'desc' && !createName) {
      setShowWizard(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadCharacters();
    loadReleases();
  }, []);

  const loadCharacters = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/characters', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setCharacters(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadReleases = async () => {
    const res = await fetch('/api/admin/model-releases', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setReleases(data.releases);
    }
  };

  const openWizard = (mode: 'multi' | 'single' | 'desc') => {
    setDataset(null);
    setNewName('');
    setDraftId(null);
    setFormError(null);
    pushAdminUrl(`/admin/character?mode=${mode}`);
  };

  const onDatasetReady = (images: string[], origin: DatasetOrigin) => {
    setDataset(images);
    setDatasetOrigin(origin);
    if (origin === 'generated') setSourceType('ai_generated');
  };

  const ageIsValid = /^\d+$/.test(age) && Number(age) >= 21;
  const sourceIsReady = sourceType === 'ai_generated'
    ? attested
    : Boolean(
        release.legal_name.trim() && release.verification_provider.trim() && release.verification_ref.trim()
        && release.signed_at && release.age_verified_21 && release.covers_all_scopes && releaseFile
      );

  const canCreate = useMemo(
    () => !!dataset?.length && newName.trim().length > 0 && ageIsValid && sourceIsReady,
    [dataset, newName, ageIsValid, sourceIsReady]
  );

  const saveSource = async (characterId: string) => {
    if (sourceType === 'ai_generated') {
      await postJson(`/api/admin/characters/${characterId}/source`, { type: 'ai_generated', attested: true });
      return;
    }
    if (!releaseFile) throw new Error('Upload the signed release.');
    const contentType = releaseFile.type;
    const upload = await postJson<{ path: string; uploadUrl: string }>('/api/admin/model-releases', { contentType });
    await putFile(upload.uploadUrl, releaseFile, contentType);
    await postJson(`/api/admin/characters/${characterId}/source`, {
      type: 'licensed_model',
      release: {
        legal_name: release.legal_name,
        stage_name: release.stage_name,
        verification_provider: release.verification_provider,
        verification_ref: release.verification_ref,
        age_verified_21: release.age_verified_21,
        signed_at: release.signed_at,
        release_document_path: upload.path,
        scope_ai_training: release.covers_all_scopes,
        scope_adult_content: release.covers_all_scopes,
        scope_video: release.covers_all_scopes,
      },
    });
  };

  const uploadAndScreen = async (characterId: string, images: string[]) => {
    const paths: string[] = [];
    for (let index = 0; index < images.length; index++) {
      setProgress(`Uploading image ${index + 1} of ${images.length}...`);
      const blob = await (await fetch(images[index])).blob();
      const upload = await postJson<{ path: string; uploadUrl: string }>(
        `/api/admin/characters/${characterId}/references`,
        { contentType: blob.type, bytes: blob.size }
      );
      await putFile(upload.uploadUrl, blob, blob.type);
      paths.push(upload.path);
    }

    const results: ScreenResult[] = [];
    for (let start = 0; start < paths.length; start += SCREEN_BATCH_SIZE) {
      setProgress(`Screening images (${start + 1} of ${paths.length})...`);
      const data = await postJson<{ results: ScreenResult[] }>(
        `/api/admin/characters/${characterId}/references`,
        { paths: paths.slice(start, start + SCREEN_BATCH_SIZE) },
        'PUT'
      );
      results.push(...data.results);
    }
    return results;
  };

  const createCharacter = async () => {
    if (!canCreate || !dataset) return;
    setCreating(true);
    setFormError(null);
    try {
      // A retry reuses the same draft instead of leaving a second one behind.
      let characterId = draftId;
      if (!characterId) {
        setProgress('Creating character...');
        const created = await postJson<{ id: string }>('/api/admin/characters', {
          name: newName,
          age,
          is_nsfw: isAdult,
        });
        characterId = created.id;
        setDraftId(created.id);
      }

      setProgress('Saving image source...');
      await saveSource(characterId);

      const results = await uploadAndScreen(characterId, dataset);
      const rejected = results.filter((result) => result.status === 'rejected').length;

      setProgress('Generating first portrait...');
      await postJson(`/api/admin/characters/${characterId}/activate`, {});

      setProgress(rejected > 0 ? `Character is live. ${rejected} image(s) failed screening and won't be used.` : 'Character is live.');
      await Promise.all([loadCharacters(), loadReleases()]);
      setDataset(null);
      setNewName('');
      setAge('');
      setAttested(false);
      setRelease(EMPTY_RELEASE);
      setReleaseFile(null);
      setDraftId(null);
      setShowWizard(false);
    } catch (e) {
      console.error('Character creation process failed:', e);
      setProgress(null);
      setFormError(e instanceof Error ? e.message : 'Could not create this character.');
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (item: ModelRelease) => {
    const count = item.character_sources.length;
    const reason = window.prompt(
      `Revoke the release for ${item.legal_name}? This permanently removes ${count} character(s), their reference images and generated media. Enter the reason to continue.`
    );
    if (!reason?.trim()) return;
    try {
      await postJson(`/api/admin/model-releases/${item.id}/revoke`, { reason });
      await Promise.all([loadCharacters(), loadReleases()]);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Revocation did not finish. Run it again.');
    }
  };

  const updateRelease = (field: keyof typeof EMPTY_RELEASE, value: string | boolean) => {
    setRelease((current) => ({ ...current, [field]: value }));
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header isAuthenticated={isAuthenticated} setIsAuthenticated={() => {}} userTier={userTier} />

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-6">
          <CharacterSidebar active="create" />

          <div className="flex-1 space-y-8">
            {/* Create Your Character */}
            <section className="bg-gray-900/70 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-white">Create Your Character</h1>
                  <p className="text-gray-400">Reference images keep the same person across every still and clip.</p>
                </div>
                <button onClick={() => alert('Tutorial coming soon')} className="px-3 py-1.5 rounded bg-gray-800 text-gray-300 border border-gray-700">View Tutorial</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StartCard title="Start with 4+ Images" subtitle="Upload reference images" onClick={() => openWizard('multi')} />
                <StartCard title="Start with One Image" subtitle="Use a single reference" onClick={() => openWizard('single')} />
                <StartCard title="Start with Description" subtitle="Generate a starter set" onClick={() => openWizard('desc')} />
              </div>

              {progress && !dataset && <p className="mt-4 text-sm text-gray-300">{progress}</p>}

              {dataset && (
                <div className="mt-6 border-t border-gray-800 pt-6 space-y-4">
                  <h3 className="text-white font-semibold">Finalize Character</h3>
                  <p className="text-sm text-gray-400">{dataset.length} image(s) ready.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="block text-sm text-gray-300">
                      Character name
                      <input value={newName} onChange={(e) => setNewName(e.target.value)} className={`mt-1 ${INPUT_CLASS}`} />
                    </label>
                    <label className="block text-sm text-gray-300">
                      Age (21 or older)
                      <input
                        type="number"
                        min={21}
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className={`mt-1 ${INPUT_CLASS}`}
                      />
                    </label>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input type="checkbox" checked={isAdult} onChange={(e) => setIsAdult(e.target.checked)} />
                    Adult (NSFW) character
                  </label>

                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium text-gray-200">Where do these images come from?</legend>
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="radio"
                        name="source"
                        checked={sourceType === 'ai_generated'}
                        onChange={() => setSourceType('ai_generated')}
                      />
                      AI-generated, fictional person
                    </label>
                    {datasetOrigin === 'upload' && (
                      <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input
                          type="radio"
                          name="source"
                          checked={sourceType === 'licensed_model'}
                          onChange={() => setSourceType('licensed_model')}
                        />
                        A real model with a signed release
                      </label>
                    )}
                  </fieldset>

                  {sourceType === 'ai_generated' ? (
                    <label className="flex items-start gap-2 text-sm text-gray-300">
                      <input className="mt-1" type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} />
                      I confirm these images are AI-generated, show a fictional adult aged 21 or older, and don&apos;t resemble a real person.
                    </label>
                  ) : (
                    <div className="space-y-3 rounded-lg border border-gray-800 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="block text-sm text-gray-300">
                          Legal name
                          <input value={release.legal_name} onChange={(e) => updateRelease('legal_name', e.target.value)} className={`mt-1 ${INPUT_CLASS}`} />
                        </label>
                        <label className="block text-sm text-gray-300">
                          Stage name (optional)
                          <input value={release.stage_name} onChange={(e) => updateRelease('stage_name', e.target.value)} className={`mt-1 ${INPUT_CLASS}`} />
                        </label>
                        <label className="block text-sm text-gray-300">
                          ID verified by
                          <input value={release.verification_provider} onChange={(e) => updateRelease('verification_provider', e.target.value)} className={`mt-1 ${INPUT_CLASS}`} />
                        </label>
                        <label className="block text-sm text-gray-300">
                          Verification reference
                          <input value={release.verification_ref} onChange={(e) => updateRelease('verification_ref', e.target.value)} className={`mt-1 ${INPUT_CLASS}`} />
                        </label>
                        <label className="block text-sm text-gray-300">
                          Date release was signed
                          <input type="date" value={release.signed_at} onChange={(e) => updateRelease('signed_at', e.target.value)} className={`mt-1 ${INPUT_CLASS}`} />
                        </label>
                        <label className="block text-sm text-gray-300">
                          Signed release (PDF, JPEG or PNG)
                          <input
                            type="file"
                            accept="application/pdf,image/jpeg,image/png"
                            onChange={(e) => setReleaseFile(e.target.files?.[0] ?? null)}
                            className="mt-1 block w-full text-gray-300"
                          />
                        </label>
                      </div>
                      <label className="flex items-start gap-2 text-sm text-gray-300">
                        <input className="mt-1" type="checkbox" checked={release.age_verified_21} onChange={(e) => updateRelease('age_verified_21', e.target.checked)} />
                        This person&apos;s government ID was checked, and they are 21 or older.
                      </label>
                      <label className="flex items-start gap-2 text-sm text-gray-300">
                        <input className="mt-1" type="checkbox" checked={release.covers_all_scopes} onChange={(e) => updateRelease('covers_all_scopes', e.target.checked)} />
                        The signed release explicitly covers AI training, adult content and video. A DMCA document alone doesn&apos;t.
                      </label>
                    </div>
                  )}

                  {formError && <p role="alert" className="text-sm text-red-400">{formError}</p>}
                  {progress && <p className="text-sm text-gray-300">{progress}</p>}

                  <button
                    disabled={!canCreate || creating}
                    onClick={createCharacter}
                    className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                  >
                    {creating ? 'Working...' : draftId ? 'Try Again' : 'Create Character'}
                  </button>
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

            {/* Model Releases */}
            <section>
              <h2 className="text-xl font-bold text-white mb-3">Model Releases</h2>
              {releases.length === 0 ? (
                <p className="text-sm text-gray-400">No model releases on file.</p>
              ) : (
                <ul className="divide-y divide-gray-800 rounded-lg border border-gray-800">
                  {releases.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-4 p-3 text-sm text-gray-300">
                      <span>
                        {item.legal_name}
                        {item.stage_name ? ` (${item.stage_name})` : ''} · {item.character_sources.length} character(s)
                      </span>
                      {item.revoked_at ? (
                        <span className="text-gray-500">Revoked</span>
                      ) : (
                        <button onClick={() => revoke(item)} className="px-3 py-1 rounded bg-red-700 text-white">
                          Revoke
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
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
                  <div key={title} className="rounded-lg bg-gray-900/70 border border-gray-800 p-4 text-gray-300 text-center">
                    {title}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      <CharacterWizard
        open={showWizard}
        onClose={() => pushAdminUrl('/admin/character')}
        onDatasetReady={onDatasetReady}
        initialTab={wizardMode}
        onTabChange={(mode) => pushAdminUrl(`/admin/character?mode=${mode}`)}
      />
    </main>
  );
}

export default function AdminCharacterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CharacterAdminPageContent />
    </Suspense>
  );
}
