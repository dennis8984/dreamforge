'use client';

import { useState, useEffect } from 'react';
import { MIN_UPLOADS, MAX_UPLOADS, UPLOAD_TYPES, mergeUploads, uploadFileProblem, uploadStatus } from '@/lib/upload-selection';

export type DatasetOrigin = 'upload' | 'generated';

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

interface Props {
  open: boolean;
  onClose: () => void;
  onDatasetReady: (images: string[], origin: DatasetOrigin) => void; // data URLs or URLs
  initialTab?: 'multi' | 'single' | 'desc';
  onTabChange?: (tab: 'multi' | 'single' | 'desc') => void;
}

export default function CharacterWizard({ open, onClose, onDatasetReady, initialTab = 'multi', onTabChange }: Props) {
  const [tab, setTab] = useState<'multi' | 'single' | 'desc'>(initialTab);
  const [uploads, setUploads] = useState<string[]>([]);
  const [singleImage, setSingleImage] = useState<string | null>(null);
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
    }
  }, [open, initialTab]);

  if (!open) return null;

  // The picker is disabled while reading, so `uploads` is still current when this finishes.
  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    setReading(true);
    const problems: string[] = [];
    const usable = files.filter((file) => {
      const problem = uploadFileProblem(file);
      if (problem) problems.push(problem);
      return !problem;
    });
    const results = await Promise.allSettled(usable.map(readAsDataUrl));
    const images = results.flatMap((result, index) => {
      if (result.status === 'fulfilled') return [result.value];
      problems.push(`${usable[index].name} could not be read`);
      return [];
    });
    const merged = mergeUploads(uploads, images);
    if (merged.duplicates > 0) problems.push(`${merged.duplicates} already selected`);
    if (merged.overLimit > 0) problems.push(`${merged.overLimit} over the limit of ${MAX_UPLOADS}`);
    setUploads(merged.images);
    if (problems.length > 0) setError(`Left out: ${problems.join('; ')}.`);
    setReading(false);
  };

  const removeUpload = (index: number) => {
    setError(null);
    setUploads((current) => current.filter((_, i) => i !== index));
  };

  const handleSingle = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setSingleImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const useSingleImage = () => {
    if (!singleImage) return;
    onDatasetReady([singleImage], 'upload');
    onClose();
  };

  const generateFromDesc = async () => {
    if (!desc.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/characters/generate-dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ description: desc }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not generate images.');
      onDatasetReady(result.images, 'generated');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate images.');
    } finally {
      setBusy(false);
    }
  };

  const datasetReadyFromMulti = () => {
    if (uploads.length < MIN_UPLOADS) return;
    onDatasetReady(uploads, 'upload');
    // Selections add up, so without this the next character would start with these photos.
    setUploads([]);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4" onClick={onClose}>
      <div className="max-w-4xl w-full bg-gray-900 border border-gray-800 rounded-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center border-b border-gray-800">
          {(['multi','single','desc'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); onTabChange?.(t); }}
              className={`px-4 py-3 text-sm ${tab===t? 'text-white border-b-2 border-blue-500' : 'text-gray-400'}`}
            >
              {t==='multi'?'4+ Images':t==='single'?'One Image':'Description'}
            </button>
          ))}
          <div className="ml-auto pr-3">
            <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
          </div>
        </div>

        <div className="p-4">
          {error && <p role="alert" className="mb-3 text-sm text-red-400">{error}</p>}
          {tab === 'multi' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Upload at least {MIN_UPLOADS} clear images of the same adult. The first three become the character&apos;s references, so put your best ones first.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label className={`px-4 py-2 rounded bg-gray-800 border border-gray-700 text-white text-sm focus-within:ring-2 focus-within:ring-blue-500 ${reading ? 'opacity-50' : 'cursor-pointer hover:bg-gray-700'}`}>
                  {reading ? 'Reading...' : 'Add Images'}
                  <input
                    type="file"
                    className="sr-only"
                    accept={UPLOAD_TYPES.join(',')}
                    multiple
                    disabled={reading}
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      // Lets the same file be picked again after removing it.
                      e.target.value = '';
                      void handleFiles(files);
                    }}
                  />
                </label>
                <p aria-live="polite" className="text-sm text-gray-300">{uploadStatus(uploads.length)}</p>
                {uploads.length > 0 && (
                  <button type="button" onClick={() => { setUploads([]); setError(null); }} className="text-sm text-gray-400 hover:text-white underline">
                    Clear all
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto">
                {uploads.map((u, i) => (
                  <div key={u} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt={`Uploaded image ${i + 1}`} className="w-full aspect-square object-cover rounded" />
                    <button
                      type="button"
                      onClick={() => removeUpload(i)}
                      aria-label={`Remove image ${i + 1}`}
                      className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/70 text-white hover:bg-black"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                disabled={uploads.length < MIN_UPLOADS || busy || reading}
                onClick={datasetReadyFromMulti}
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              >
                {busy? 'Working...' : 'Use These Images'}
              </button>
            </div>
          )}

          {tab === 'single' && (
            <div className="space-y-4">
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleSingle(e.target.files)} />
              {singleImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={singleImage} alt="single" className="w-48 rounded" />
              )}
              <button
                type="button"
                disabled={!singleImage || busy}
                onClick={useSingleImage}
                className="px-4 py-2 rounded bg-purple-600 text-white disabled:opacity-50"
              >
                Use This Image
              </button>
            </div>
          )}

          {tab === 'desc' && (
            <div className="space-y-4">
              <textarea
                className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-gray-200"
                rows={4}
                placeholder="Describe your character"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
              <button
                type="button"
                disabled={!desc.trim() || busy}
                onClick={generateFromDesc}
                className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50"
              >
                {busy? 'Generating, this can take a minute...' : 'Generate Base Images'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


