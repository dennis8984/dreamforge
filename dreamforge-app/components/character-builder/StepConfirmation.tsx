'use client';

interface AppearanceData {
  hairColor: string;
  hairStyle: string;
  eyeColor: string;
  bodyType: string;
  skinTone: string;
  ageRange: string;
}

interface CharacterBuilderState {
  gender: string;
  style: string;
  appearance: AppearanceData;
  personalityTraits: string[];
  voice: { voiceId: string; voiceName: string };
  nameDescription: { name: string; description: string; greetingMessage: string };
}

interface StepConfirmationProps {
  state: CharacterBuilderState;
  isFirstCharacter: boolean;
  isCreating: boolean;
  onCreate: () => void;
}

export default function StepConfirmation({
  state,
  isFirstCharacter,
  isCreating,
  onCreate,
}: StepConfirmationProps) {
  const cost = isFirstCharacter ? 0 : 500;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Review & Create</h2>
        <p className="text-gray-400 mt-1">Review your character before creating</p>
      </div>

      <div className="max-w-lg mx-auto space-y-4">
        {/* Character Name */}
        <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-5">
          <h3 className="text-lg font-bold text-white mb-1">{state.nameDescription.name || 'Unnamed Character'}</h3>
          {state.nameDescription.description && (
            <p className="text-sm text-gray-400">{state.nameDescription.description}</p>
          )}
        </div>

        {/* Attributes Grid */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryItem label="Gender" value={capitalize(state.gender)} />
          <SummaryItem label="Style" value={formatStyle(state.style)} />
          <SummaryItem label="Hair" value={[state.appearance.hairColor, state.appearance.hairStyle].filter(Boolean).join(' ') || 'Not set'} />
          <SummaryItem label="Eyes" value={state.appearance.eyeColor || 'Not set'} />
          <SummaryItem label="Body Type" value={state.appearance.bodyType || 'Not set'} />
          <SummaryItem label="Skin Tone" value={state.appearance.skinTone || 'Not set'} />
          <SummaryItem label="Age Range" value={state.appearance.ageRange || 'Not set'} />
          <SummaryItem label="Voice" value={state.voice.voiceName || 'Not set'} />
        </div>

        {/* Personality Traits */}
        <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-4">
          <div className="text-xs font-medium text-gray-400 mb-2">Personality Traits</div>
          <div className="flex flex-wrap gap-2">
            {state.personalityTraits.length > 0 ? (
              state.personalityTraits.map((trait) => (
                <span
                  key={trait}
                  className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-medium"
                >
                  {trait}
                </span>
              ))
            ) : (
              <span className="text-gray-500 text-sm">No traits selected</span>
            )}
          </div>
        </div>

        {/* Greeting Message */}
        {state.nameDescription.greetingMessage && (
          <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-4">
            <div className="text-xs font-medium text-gray-400 mb-2">Greeting Message</div>
            <p className="text-sm text-gray-300 italic">
              &quot;{state.nameDescription.greetingMessage}&quot;
            </p>
          </div>
        )}

        {/* Cost */}
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Creation Cost</div>
            <div className="text-xs text-gray-400">
              {isFirstCharacter
                ? 'Your first character is free!'
                : '500 Moments will be deducted from your balance'}
            </div>
          </div>
          <div className="text-right">
            {isFirstCharacter ? (
              <div className="text-lg font-bold text-green-400">FREE</div>
            ) : (
              <div className="text-lg font-bold text-amber-400">500 Moments</div>
            )}
          </div>
        </div>

        {/* Create Button */}
        <button
          type="button"
          onClick={onCreate}
          disabled={isCreating || !state.nameDescription.name.trim()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isCreating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating Character...
            </span>
          ) : (
            'Create Character'
          )}
        </button>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-3">
      <div className="text-xs font-medium text-gray-400">{label}</div>
      <div className="text-sm text-white mt-0.5">{value}</div>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ').replace(/_/g, ' ');
}

function formatStyle(style: string): string {
  const map: Record<string, string> = {
    realistic: 'Realistic',
    anime: 'Anime',
    fantasy: 'Fantasy',
    sci_fi: 'Sci-Fi',
  };
  return map[style] || capitalize(style);
}
