'use client';

import { useState, useCallback } from 'react';
import StepGender from './StepGender';
import StepStyle from './StepStyle';
import StepAppearance from './StepAppearance';
import StepPersonality from './StepPersonality';
import StepVoice from './StepVoice';
import StepNameDescription from './StepNameDescription';
import StepConfirmation from './StepConfirmation';

interface CharacterBuilderModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (character: Record<string, unknown>) => void;
  isFirstCharacter?: boolean;
}

interface AppearanceData {
  hairColor: string;
  hairStyle: string;
  eyeColor: string;
  bodyType: string;
  skinTone: string;
  ageRange: string;
}

const STEPS = [
  'Gender',
  'Style',
  'Appearance',
  'Personality',
  'Voice',
  'Details',
  'Confirm',
] as const;

type StepName = (typeof STEPS)[number];

const defaultAppearance: AppearanceData = {
  hairColor: '',
  hairStyle: '',
  eyeColor: '',
  bodyType: '',
  skinTone: '',
  ageRange: '',
};

export default function CharacterBuilderModal({
  open,
  onClose,
  onCreated,
  isFirstCharacter = true,
}: CharacterBuilderModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for each step
  const [gender, setGender] = useState('female');
  const [style, setStyle] = useState('realistic');
  const [appearance, setAppearance] = useState<AppearanceData>(defaultAppearance);
  const [personalityTraits, setPersonalityTraits] = useState<string[]>([]);
  const [voice, setVoice] = useState({ voiceId: '', voiceName: '' });
  const [nameDescription, setNameDescription] = useState({
    name: '',
    description: '',
    greetingMessage: '',
  });

  const canProceed = useCallback((): boolean => {
    const step = STEPS[currentStep];
    switch (step) {
      case 'Gender':
        return !!gender;
      case 'Style':
        return !!style;
      case 'Appearance':
        return true; // Appearance selections are optional
      case 'Personality':
        return personalityTraits.length >= 3;
      case 'Voice':
        return true; // Voice is optional
      case 'Details':
        return nameDescription.name.trim().length > 0;
      case 'Confirm':
        return true;
      default:
        return false;
    }
  }, [currentStep, gender, style, personalityTraits, nameDescription]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1 && canProceed()) {
      setCurrentStep((s) => s + 1);
      setError(null);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      setError(null);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Please log in to create a character.');
        setIsCreating(false);
        return;
      }

      const payload = {
        name: nameDescription.name.trim(),
        description: nameDescription.description.trim(),
        greeting_message: nameDescription.greetingMessage.trim(),
        gender,
        style,
        appearance,
        personality_traits: personalityTraits,
        voice_id: voice.voiceId || null,
        voice_name: voice.voiceName || null,
      };

      const response = await fetch('/api/characters/create', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create character.');
        setIsCreating(false);
        return;
      }

      onCreated?.(data.character);
      resetAndClose();
    } catch (err) {
      console.error('Character creation error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const resetAndClose = () => {
    setCurrentStep(0);
    setGender('female');
    setStyle('realistic');
    setAppearance(defaultAppearance);
    setPersonalityTraits([]);
    setVoice({ voiceId: '', voiceName: '' });
    setNameDescription({ name: '', description: '', greetingMessage: '' });
    setError(null);
    setIsCreating(false);
    onClose();
  };

  if (!open) return null;

  const stepName: StepName = STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={resetAndClose}>
      <div
        className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h1 className="text-lg font-bold text-white">Create Character</h1>
          <button
            type="button"
            onClick={resetAndClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((step, i) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i < currentStep
                      ? 'bg-blue-600 text-white'
                      : i === currentStep
                        ? 'bg-blue-500 text-white ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900'
                        : 'bg-gray-700 text-gray-500'
                  }`}
                >
                  {i < currentStep ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 w-6 sm:w-10 mx-1 transition-colors ${
                      i < currentStep ? 'bg-blue-600' : 'bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-400 text-center mb-1">
            Step {currentStep + 1} of {STEPS.length} &mdash; {stepName}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {stepName === 'Gender' && <StepGender value={gender} onChange={setGender} />}
          {stepName === 'Style' && <StepStyle value={style} onChange={setStyle} />}
          {stepName === 'Appearance' && <StepAppearance value={appearance} onChange={setAppearance} />}
          {stepName === 'Personality' && (
            <StepPersonality value={personalityTraits} onChange={setPersonalityTraits} />
          )}
          {stepName === 'Voice' && <StepVoice value={voice} onChange={setVoice} />}
          {stepName === 'Details' && (
            <StepNameDescription value={nameDescription} onChange={setNameDescription} />
          )}
          {stepName === 'Confirm' && (
            <StepConfirmation
              state={{ gender, style, appearance, personalityTraits, voice, nameDescription }}
              isFirstCharacter={isFirstCharacter}
              isCreating={isCreating}
              onCreate={handleCreate}
            />
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-2 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="px-5 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium"
          >
            Back
          </button>

          {/* Step dots */}
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentStep ? 'bg-blue-500 w-4' : i < currentStep ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>

          {currentStep < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
            >
              Next
            </button>
          ) : (
            <div className="w-[72px]" /> // Spacer to balance layout; Create button is in the step
          )}
        </div>
      </div>
    </div>
  );
}
