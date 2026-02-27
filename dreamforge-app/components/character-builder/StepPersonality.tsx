'use client';

interface StepPersonalityProps {
  value: string[];
  onChange: (traits: string[]) => void;
}

const allTraits = [
  'Caring',
  'Witty',
  'Mysterious',
  'Bold',
  'Playful',
  'Intellectual',
  'Adventurous',
  'Romantic',
  'Sarcastic',
  'Gentle',
  'Confident',
  'Creative',
  'Loyal',
  'Mischievous',
  'Philosophical',
];

const MIN_TRAITS = 3;
const MAX_TRAITS = 5;

export default function StepPersonality({ value, onChange }: StepPersonalityProps) {
  const toggleTrait = (trait: string) => {
    if (value.includes(trait)) {
      onChange(value.filter((t) => t !== trait));
    } else if (value.length < MAX_TRAITS) {
      onChange([...value, trait]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Personality Traits</h2>
        <p className="text-gray-400 mt-1">
          Select {MIN_TRAITS}-{MAX_TRAITS} traits that define your character
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {value.length} / {MAX_TRAITS} selected
          {value.length < MIN_TRAITS && (
            <span className="text-amber-400 ml-2">
              (select at least {MIN_TRAITS - value.length} more)
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 justify-center max-w-lg mx-auto">
        {allTraits.map((trait) => {
          const selected = value.includes(trait);
          const disabled = !selected && value.length >= MAX_TRAITS;
          return (
            <button
              key={trait}
              type="button"
              onClick={() => toggleTrait(trait)}
              disabled={disabled}
              className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                selected
                  ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                  : disabled
                    ? 'border-gray-800 bg-gray-900 text-gray-600 cursor-not-allowed'
                    : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-500 hover:bg-gray-800'
              }`}
            >
              {selected && (
                <svg
                  className="w-4 h-4 inline mr-1 -mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              {trait}
            </button>
          );
        })}
      </div>
    </div>
  );
}
