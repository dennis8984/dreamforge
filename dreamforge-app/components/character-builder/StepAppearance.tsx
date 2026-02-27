'use client';

interface AppearanceData {
  hairColor: string;
  hairStyle: string;
  eyeColor: string;
  bodyType: string;
  skinTone: string;
  ageRange: string;
}

interface StepAppearanceProps {
  value: AppearanceData;
  onChange: (appearance: AppearanceData) => void;
}

const hairColors = [
  'Black', 'Brown', 'Blonde', 'Red', 'Auburn', 'Platinum', 'Silver', 'Blue',
  'Pink', 'Purple', 'Green', 'White',
];

const hairStyles = [
  'Long Straight', 'Long Wavy', 'Long Curly', 'Short Cropped', 'Pixie Cut',
  'Bob', 'Braided', 'Ponytail', 'Bun', 'Mohawk', 'Shaved', 'Messy',
];

const eyeColors = [
  'Brown', 'Blue', 'Green', 'Hazel', 'Gray', 'Amber', 'Violet', 'Red',
];

const bodyTypes = [
  'Slim', 'Athletic', 'Average', 'Muscular', 'Curvy', 'Petite', 'Tall',
];

const skinTones = [
  'Fair', 'Light', 'Medium', 'Olive', 'Tan', 'Brown', 'Dark', 'Ebony',
];

const ageRanges = [
  '18-22', '23-27', '28-32', '33-40', '40-50', '50+',
];

interface OptionGridProps {
  label: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}

function OptionGrid({ label, options, selected, onSelect }: OptionGridProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-300">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selected === option
                ? 'bg-blue-500/20 border border-blue-500 text-blue-300'
                : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function StepAppearance({ value, onChange }: StepAppearanceProps) {
  const update = (key: keyof AppearanceData, val: string) => {
    onChange({ ...value, [key]: val });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Customize Appearance</h2>
        <p className="text-gray-400 mt-1">Define how your character looks</p>
      </div>

      <div className="space-y-5 max-w-lg mx-auto max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
        <OptionGrid
          label="Hair Color"
          options={hairColors}
          selected={value.hairColor}
          onSelect={(v) => update('hairColor', v)}
        />
        <OptionGrid
          label="Hair Style"
          options={hairStyles}
          selected={value.hairStyle}
          onSelect={(v) => update('hairStyle', v)}
        />
        <OptionGrid
          label="Eye Color"
          options={eyeColors}
          selected={value.eyeColor}
          onSelect={(v) => update('eyeColor', v)}
        />
        <OptionGrid
          label="Body Type"
          options={bodyTypes}
          selected={value.bodyType}
          onSelect={(v) => update('bodyType', v)}
        />
        <OptionGrid
          label="Skin Tone"
          options={skinTones}
          selected={value.skinTone}
          onSelect={(v) => update('skinTone', v)}
        />
        <OptionGrid
          label="Age Range"
          options={ageRanges}
          selected={value.ageRange}
          onSelect={(v) => update('ageRange', v)}
        />
      </div>
    </div>
  );
}
