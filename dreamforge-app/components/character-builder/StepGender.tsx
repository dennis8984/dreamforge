'use client';

interface StepGenderProps {
  value: string;
  onChange: (gender: string) => void;
}

const genderOptions = [
  {
    id: 'female',
    label: 'Female',
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="5" strokeWidth={1.5} />
        <path strokeLinecap="round" strokeWidth={1.5} d="M12 13v8M9 18h6" />
      </svg>
    ),
  },
  {
    id: 'male',
    label: 'Male',
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="10" cy="14" r="5" strokeWidth={1.5} />
        <path strokeLinecap="round" strokeWidth={1.5} d="M14.5 9.5L19 5M19 5h-5M19 5v5" />
      </svg>
    ),
  },
  {
    id: 'non-binary',
    label: 'Non-Binary',
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="5" strokeWidth={1.5} />
        <path strokeLinecap="round" strokeWidth={1.5} d="M12 7V2M9.5 3.5h5M12 17v5M9.5 20.5h5" />
      </svg>
    ),
  },
];

export default function StepGender({ value, onChange }: StepGenderProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Choose Gender</h2>
        <p className="text-gray-400 mt-1">Select your character&apos;s gender identity</p>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
        {genderOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${
              value === option.id
                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:bg-gray-800'
            }`}
          >
            {option.icon}
            <span className="font-semibold text-sm">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
