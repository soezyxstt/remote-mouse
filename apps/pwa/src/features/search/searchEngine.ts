import { Action, AppInfo, PanelDefinition, WindowInfo } from '@remote/protocol';

export type SearchProvider = 'apps' | 'windows' | 'panels' | 'actions' | 'navigation';

export interface SearchResult {
  id: string;
  provider: SearchProvider;
  title: string;
  subtitle: string;
  score: number;
  action?: Action;
  route?: string;
  panelId?: string;
}

interface SearchSources {
  apps: AppInfo[];
  windows: WindowInfo[];
  panels: PanelDefinition[];
}

const normalize = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const score = (query: string, title: string, subtitle: string) => {
  if (!query) return 20;
  const normalizedTitle = normalize(title);
  const normalizedSubtitle = normalize(subtitle);
  if (normalizedTitle === query) return 120;
  if (normalizedTitle.startsWith(query)) return 100 - normalizedTitle.length / 100;
  if (normalizedTitle.includes(query)) return 75 - normalizedTitle.indexOf(query) / 100;
  if (normalizedSubtitle.includes(query)) return 45 - normalizedSubtitle.indexOf(query) / 100;
  const tokens = query.split(/\s+/).filter(Boolean);
  return tokens.every((token) => `${normalizedTitle} ${normalizedSubtitle}`.includes(token))
    ? 35
    : -1;
};

export function searchCapabilities(queryValue: string, sources: SearchSources): SearchResult[] {
  const query = normalize(queryValue);
  const candidates: Omit<SearchResult, 'score'>[] = [
    ...sources.apps.map((app) => ({
      id: `app:${app.id}`,
      provider: 'apps' as const,
      title: app.name,
      subtitle: 'Installed app',
      action: { type: 'apps.launch', appId: app.id } as Action,
    })),
    ...sources.windows.map((window) => ({
      id: `window:${window.id}`,
      provider: 'windows' as const,
      title: window.title,
      subtitle: `${window.processName} · Display ${window.displayIndex + 1}`,
      action: { type: 'windows.action', windowId: window.id, action: 'focus' } as Action,
    })),
    ...sources.panels.map((panel) => ({
      id: `panel:${panel.id}`,
      provider: 'panels' as const,
      title: panel.name,
      subtitle: `${panel.category} panel`,
      panelId: panel.id,
    })),
    {
      id: 'action:lock',
      provider: 'actions',
      title: 'Lock PC',
      subtitle: 'System action',
      action: { type: 'power.command', action: 'lock' },
    },
    {
      id: 'action:play-pause',
      provider: 'actions',
      title: 'Play or pause media',
      subtitle: 'Media action',
      action: { type: 'media.command', action: 'play_pause' },
    },
    ...[
      'control',
      'keyboard',
      'apps',
      'panels',
      'clipboard',
      'files',
      'media',
      'slides',
      'system',
    ].map((route) => ({
      id: `navigation:${route}`,
      provider: 'navigation' as const,
      title: route[0].toUpperCase() + route.slice(1),
      subtitle: 'Open destination',
      route,
    })),
  ];

  const unique = new Map<string, SearchResult>();
  for (const candidate of candidates) {
    const resultScore = score(query, candidate.title, candidate.subtitle);
    if (resultScore < 0) continue;
    const existing = unique.get(candidate.id);
    if (!existing || resultScore > existing.score)
      unique.set(candidate.id, { ...candidate, score: resultScore });
  }
  return [...unique.values()]
    .sort(
      (a, b) =>
        b.score - a.score || a.provider.localeCompare(b.provider) || a.title.localeCompare(b.title)
    )
    .slice(0, 40);
}
