'use client';

interface VoiceOption {
  id: string;
  name: string;
  description: string;
  gender: string;
}

interface StepVoiceProps {
  value: { voiceId: string; voiceName: string };
  onChange: (voice: { voiceId: string; voiceName: string }) => void;
}

const voiceOptions: VoiceOption[] = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced, versatile tone', gender: 'neutral' },
  { id: 'echo', name: 'Echo', description: 'Warm and resonant male voice', gender: 'male' },
  { id: 'fable', name: 'Fable', description: 'Expressive and dynamic storyteller', gender: 'neutral' },
  { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative male voice', gender: 'male' },
  { id: 'nova', name: 'Nova', description: 'Friendly and energetic female voice', gender: 'female' },
  { id: 'shimmer', name: 'Shimmer', description: 'Soft and soothing female voice', gender: 'female' },
  { id: 'breeze', name: 'Breeze', description: 'Light and airy, gentle tone', gender: 'female' },
  { id: 'ember', name: 'Ember', description: 'Warm, confident, and charismatic', gender: 'female' },
  { id: 'storm', name: 'Storm', description: 'Bold and commanding presence', gender: 'male' },
  { id: 'sage', name: 'Sage', description: 'Calm and wise, measured delivery', gender: 'neutral' },
];

export default function StepVoice({ value, onChange }: StepVoiceProps) {
  const handlePreview = (voiceId: string) => {
    // Placeholder for voice preview functionality
    console.log('Preview voice:', voiceId);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Select Voice</h2>
        <p className="text-gray-400 mt-1">Choose a voice for your character</p>
      </div>

      <div className="max-w-lg mx-auto max-h-[400px] overflow-y-auto pr-2 space-y-2">
        {voiceOptions.map((voice) => (
          <button
            key={voice.id}
            type="button"
            onClick={() => onChange({ voiceId: voice.id, voiceName: voice.name })}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
              value.voiceId === voice.id
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                value.voiceId === voice.id ? 'bg-blue-500/20' : 'bg-gray-700'
              }`}
            >
              <svg
                className={`w-5 h-5 ${value.voiceId === voice.id ? 'text-blue-400' : 'text-gray-400'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                />
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-semibold text-sm ${value.voiceId === voice.id ? 'text-blue-300' : 'text-white'}`}>
                  {voice.name}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400 capitalize">
                  {voice.gender}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{voice.description}</p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePreview(voice.id);
              }}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors shrink-0"
            >
              Preview
            </button>
          </button>
        ))}
      </div>
    </div>
  );
}
