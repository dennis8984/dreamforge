'use client';

interface ChatTypingIndicatorProps {
  characterName?: string;
}

export default function ChatTypingIndicator({ characterName }: ChatTypingIndicatorProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="flex items-center gap-2 bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1">
          <span
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: '0ms', animationDuration: '1.2s' }}
          />
          <span
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: '200ms', animationDuration: '1.2s' }}
          />
          <span
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: '400ms', animationDuration: '1.2s' }}
          />
        </div>
        {characterName && (
          <span className="text-xs text-gray-500 ml-1">
            {characterName} is typing
          </span>
        )}
      </div>
    </div>
  );
}
