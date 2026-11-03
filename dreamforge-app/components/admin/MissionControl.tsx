'use client';

import { usePathname } from 'next/navigation';
import {
  type MissionControlTab,
  missionControlTabFromPath,
  missionControlTabPath,
  pushAdminUrl,
} from '@/lib/admin-routes';
import MissionControlDashboard from './MissionControlDashboard';
import MissionControlChat from './MissionControlChat';
import MissionControlBrowser from './MissionControlBrowser';
import MissionControlChannels from './MissionControlChannels';

const SUB_TABS: { id: MissionControlTab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    id: 'control-ui',
    label: 'Control UI',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'channels',
    label: 'Channels',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
];

export default function MissionControl() {
  const activeSubTab = missionControlTabFromPath(usePathname());

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Mission Control
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          OpenClaw Bot Management
        </span>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex space-x-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => pushAdminUrl(missionControlTabPath(tab.id))}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeSubTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab Content */}
      <div>
        {activeSubTab === 'dashboard' && <MissionControlDashboard />}
        {activeSubTab === 'chat' && <MissionControlChat />}
        {activeSubTab === 'control-ui' && <MissionControlBrowser />}
        {activeSubTab === 'channels' && <MissionControlChannels />}
      </div>
    </div>
  );
}
