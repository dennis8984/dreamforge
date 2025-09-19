'use client';

import Link from 'next/link';

interface SidebarProps {
  active?: 'create' | 'visual' | 'mine' | 'library' | 'lipsync';
}

const Item = ({ href, children, active = false }: { href: string; children: React.ReactNode; active?: boolean }) => (
  <Link
    href={href}
    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
      active
        ? 'bg-gray-800 text-white'
        : 'text-gray-300 hover:text-white hover:bg-gray-800'
    }`}
  >
    {children}
  </Link>
);

export default function CharacterSidebar({ active = 'create' }: SidebarProps) {
  return (
    <aside className="w-64 shrink-0 bg-gray-900/60 border-r border-gray-800 p-3 rounded-lg h-fit">
      <div className="text-gray-400 uppercase text-xs font-semibold px-2 mb-2">Character</div>
      <nav className="space-y-1">
        <Item href="#" active={active === 'create'}>
          <span className="w-5 h-5 rounded bg-blue-600/20 text-blue-400 grid place-items-center">+</span>
          <span>Create Character</span>
        </Item>
        <Item href="#" active={active === 'visual'}>
          <span className="w-5 h-5 rounded bg-purple-600/20 text-purple-400 grid place-items-center">🎨</span>
          <span>Create Visual</span>
        </Item>
        <Item href="#" active={active === 'mine'}>
          <span className="w-5 h-5 rounded bg-emerald-600/20 text-emerald-400 grid place-items-center">🗂</span>
          <span>My Characters</span>
        </Item>
        <Item href="#" active={active === 'library'}>
          <span className="w-5 h-5 rounded bg-amber-600/20 text-amber-400 grid place-items-center">📚</span>
          <span>Community Library</span>
        </Item>
        <Item href="#" active={active === 'lipsync'}>
          <span className="w-5 h-5 rounded bg-pink-600/20 text-pink-400 grid place-items-center">💬</span>
          <span>Lip-Sync Character</span>
        </Item>
      </nav>
    </aside>
  );
}


