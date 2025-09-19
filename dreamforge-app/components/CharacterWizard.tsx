'use client';

import { useState } from 'react';
import { generateWithNanoBanana } from '@/lib/nano-banana';

interface Props {
  open: boolean;
  onClose: () => void;
  onDatasetReady: (images: string[]) => void; // dataset as data URLs or URLs
}

export default function CharacterWizard({ open, onClose, onDatasetReady }: Props) {
  const [tab, setTab] = useState<'multi' | 'single' | 'desc'>('multi');
  const [uploads, setUploads] = useState<string[]>([]);
  const [singleImage, setSingleImage] = useState<string | null>(null);
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
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

  const synthesizeFromSingle = async () => {
    if (!singleImage) return;
    setBusy(true);
    try {
      const results: string[] = [];
      for (let i = 0; i < 3; i++) {
        const r = await generateWithNanoBanana('portrait photo, same person, different angle', 'stable-diffusion-xl', { input_image: singleImage, strength: 0.7, enhance: true });
        if (r.success && r.imageUrl) results.push(r.imageUrl);
      }
      onDatasetReady([singleImage, ...results]);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const generateFromDesc = async () => {
    if (!desc.trim()) return;
    setBusy(true);
    try {
      const results: string[] = [];
      for (let i = 0; i < 4; i++) {
        const r = await generateWithNanoBanana(desc, 'stable-diffusion-xl', { enhance: true });
        if (r.success && r.imageUrl) results.push(r.imageUrl);
      }
      onDatasetReady(results);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const datasetReadyFromMulti = () => {
    if (uploads.length < 4) return;
    onDatasetReady(uploads);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4" onClick={onClose}>
      <div className="max-w-4xl w-full bg-gray-900 border border-gray-800 rounded-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center border-b border-gray-800">
          {(['multi','single','desc'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
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
          {tab === 'multi' && (
            <div className="space-y-4">
              <input type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} />
              <div className="grid grid-cols-4 gap-2">
                {uploads.map((u, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={u} alt="upload" className="w-full aspect-square object-cover rounded" />
                ))}
              </div>
              <button
                type="button"
                disabled={uploads.length < 4 || busy}
                onClick={datasetReadyFromMulti}
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              >
                {busy? 'Working...' : 'Use These Images'}
              </button>
            </div>
          )}

          {tab === 'single' && (
            <div className="space-y-4">
              <input type="file" accept="image/*" onChange={(e) => handleSingle(e.target.files)} />
              {singleImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={singleImage} alt="single" className="w-48 rounded" />
              )}
              <button
                type="button"
                disabled={!singleImage || busy}
                onClick={synthesizeFromSingle}
                className="px-4 py-2 rounded bg-purple-600 text-white disabled:opacity-50"
              >
                {busy? 'Generating...' : 'Synthesize More'}
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
                {busy? 'Generating...' : 'Generate Base Images'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


