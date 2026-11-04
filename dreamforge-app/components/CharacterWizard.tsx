'use client';

import { useState, useEffect } from 'react';

const MIN_UPLOADS = 4;
const MAX_UPLOADS = 20;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type DatasetOrigin = 'upload' | 'generated';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
    }
  }, [open, initialTab]);

  if (!open) return null;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setError(null);
    setUploads([]); // Clear existing uploads
    const chosen = Array.from(files);
    if (chosen.length > MAX_UPLOADS) {
      setError(`Choose up to ${MAX_UPLOADS} images.`);
      return;
    }
    if (chosen.some((file) => file.size > MAX_UPLOAD_BYTES)) {
      setError('Each image must be 10 MB or smaller.');
      return;
    }
    chosen.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => setUploads((u) => [...u, reader.result as string]);
      reader.readAsDataURL(file);
    });
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
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => handleFiles(e.target.files)} />
              <div className="grid grid-cols-4 gap-2">
                {uploads.map((u, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={u} alt="upload" className="w-full aspect-square object-cover rounded" />
                ))}
              </div>
              <button
                type="button"
                disabled={uploads.length < MIN_UPLOADS || busy}
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


