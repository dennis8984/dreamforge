export const ADMIN_TABS = ['models', 'create-model', 'characters', 'settings', 'mission-control'] as const;
export type AdminTab = (typeof ADMIN_TABS)[number];

export const MISSION_CONTROL_TABS = ['dashboard', 'chat', 'control-ui', 'channels'] as const;
export type MissionControlTab = (typeof MISSION_CONTROL_TABS)[number];

export const ADMIN_HOME_PATH = '/admin/models';
export const MISSION_CONTROL_HOME_PATH = '/admin/mission-control/dashboard';

export function adminTabPath(tab: AdminTab): string {
  return tab === 'mission-control' ? MISSION_CONTROL_HOME_PATH : `/admin/${tab}`;
}

export function missionControlTabPath(tab: MissionControlTab): string {
  return `/admin/mission-control/${tab}`;
}

function includes<T extends string>(values: readonly T[], value: string | undefined): value is T {
  return values.includes(value as T);
}

export function adminTabFromPath(pathname: string): AdminTab {
  const segment = pathname.split('/')[2];
  return includes(ADMIN_TABS, segment) ? segment : 'models';
}

export function missionControlTabFromPath(pathname: string): MissionControlTab {
  const segment = pathname.split('/')[3];
  return includes(MISSION_CONTROL_TABS, segment) ? segment : 'dashboard';
}

export function isAdminSection(segments: string[]): boolean {
  const [tab, subTab, ...rest] = segments;
  if (rest.length > 0 || !includes(ADMIN_TABS, tab)) return false;
  if (tab === 'mission-control') return subTab === undefined || includes(MISSION_CONTROL_TABS, subTab);
  return subTab === undefined;
}

/**
 * Updates the URL without a route change, so switching tabs keeps in-progress
 * state such as a half-filled form. Next.js syncs this with usePathname and
 * useSearchParams, and the back and forward buttons keep working.
 */
export function pushAdminUrl(url: string): void {
  if (window.location.pathname + window.location.search !== url) {
    window.history.pushState(null, '', url);
  }
}
