'use client';

interface Props {
  name: string;
  avatar_url?: string;
  tags?: string[];
  creator?: string;
  training_status?: 'draft'|'queued'|'training'|'ready'|'failed';
  onGenerateClick: () => void;
}

export default function CharacterHeader({ name, avatar_url, tags = [], creator, training_status = 'ready', onGenerateClick }: Props) {
  return (
    <div className="flex items-center gap-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={avatar_url || 'https://picsum.photos/seed/' + name + '/200/200'} alt={name} className="w-24 h-24 rounded-lg object-cover" />
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">{name}</h1>
          <span
            className={`px-2 py-0.5 rounded text-xs ${
              training_status === 'ready'
                ? 'bg-emerald-600/20 text-emerald-300'
                : training_status === 'failed'
                ? 'bg-rose-600/20 text-rose-300'
                : 'bg-amber-600/20 text-amber-300'
            }`}
          >
            {training_status}
          </span>
        </div>
        {creator && <div className="text-gray-400 text-sm mt-1">Created by {creator}</div>}
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.map((t) => (
            <span key={t} className="px-2 py-1 rounded bg-gray-800 text-gray-300 text-xs">#{t}</span>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onGenerateClick} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm">Create Visual</button>
        <button className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm">Generate Video</button>
      </div>
    </div>
  );
}


