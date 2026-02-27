'use client';

interface AvatarInfo {
  name: string;
  avatar_url?: string;
}

interface ChatGroupAvatarStackProps {
  avatars: AvatarInfo[];
  maxVisible?: number;
  size?: 'sm' | 'md';
}

export default function ChatGroupAvatarStack({
  avatars,
  maxVisible = 3,
  size = 'md',
}: ChatGroupAvatarStackProps) {
  const visible = avatars.slice(0, maxVisible);
  const overflow = avatars.length - maxVisible;

  const sizeClasses = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm';
  const overlapOffset = size === 'sm' ? '-ml-2' : '-ml-3';

  return (
    <div className="flex items-center">
      {visible.map((avatar, i) => (
        <div
          key={i}
          className={`
            ${sizeClasses} rounded-full border-2 border-gray-900 flex-shrink-0
            ${i > 0 ? overlapOffset : ''}
          `}
          style={{ zIndex: maxVisible - i }}
          title={avatar.name}
        >
          {avatar.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar.avatar_url}
              alt={avatar.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              <span className="text-white font-semibold" style={{ fontSize: size === 'sm' ? '0.5rem' : '0.625rem' }}>
                {avatar.name[0].toUpperCase()}
              </span>
            </div>
          )}
        </div>
      ))}

      {overflow > 0 && (
        <div
          className={`
            ${sizeClasses} rounded-full border-2 border-gray-900 bg-gray-700
            flex items-center justify-center ${overlapOffset} flex-shrink-0
          `}
          style={{ zIndex: 0 }}
        >
          <span className="text-gray-300 font-medium" style={{ fontSize: size === 'sm' ? '0.5rem' : '0.625rem' }}>
            +{overflow}
          </span>
        </div>
      )}
    </div>
  );
}
