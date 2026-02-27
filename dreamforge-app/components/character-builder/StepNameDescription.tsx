'use client';

interface NameDescriptionData {
  name: string;
  description: string;
  greetingMessage: string;
}

interface StepNameDescriptionProps {
  value: NameDescriptionData;
  onChange: (data: NameDescriptionData) => void;
}

export default function StepNameDescription({ value, onChange }: StepNameDescriptionProps) {
  const update = (key: keyof NameDescriptionData, val: string) => {
    onChange({ ...value, [key]: val });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Name & Description</h2>
        <p className="text-gray-400 mt-1">Give your character an identity</p>
      </div>

      <div className="space-y-5 max-w-lg mx-auto">
        <div className="space-y-2">
          <label htmlFor="char-name" className="text-sm font-medium text-gray-300">
            Character Name <span className="text-red-400">*</span>
          </label>
          <input
            id="char-name"
            type="text"
            value={value.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Enter a name for your character"
            maxLength={50}
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
          <p className="text-xs text-gray-500">{value.name.length} / 50 characters</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="char-desc" className="text-sm font-medium text-gray-300">
            Bio / Description
          </label>
          <textarea
            id="char-desc"
            value={value.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Describe your character's background, story, or personality..."
            rows={4}
            maxLength={500}
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
          />
          <p className="text-xs text-gray-500">{value.description.length} / 500 characters</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="char-greeting" className="text-sm font-medium text-gray-300">
            Greeting Message
          </label>
          <textarea
            id="char-greeting"
            value={value.greetingMessage}
            onChange={(e) => update('greetingMessage', e.target.value)}
            placeholder="What does your character say when they first meet someone?"
            rows={3}
            maxLength={300}
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
          />
          <p className="text-xs text-gray-500">{value.greetingMessage.length} / 300 characters</p>
        </div>
      </div>
    </div>
  );
}
