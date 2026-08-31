import { describe, it, expect } from 'vitest';
import {
  FIXTURE_FOREGROUND_MEDIA,
  FIXTURE_FOREGROUND_BROWSER,
  FIXTURE_PANELS,
  ForegroundAppState,
  PanelDefinition,
  AppInfo,
  WindowInfo,
} from '@remote/protocol';
import { searchCapabilities } from '../../apps/pwa/src/features/search/searchEngine';

describe('Context Engine and Quick Search Suite', () => {
  it('determines correct contextual recommendation for media apps', () => {
    const app = FIXTURE_FOREGROUND_MEDIA;
    expect(app.category).toBe('media');
    expect(app.processName.toLowerCase()).toContain('spotify');
  });

  it('determines correct contextual recommendation for browser apps', () => {
    const app = FIXTURE_FOREGROUND_BROWSER;
    expect(app.category).toBe('browser');
    expect(app.processName.toLowerCase()).toContain('chrome');
  });

  it('determines correct contextual recommendation for presentation apps', () => {
    const app: ForegroundAppState = {
      processName: 'powerpnt.exe',
      windowTitle: 'Quarterly_Review.pptx - PowerPoint',
      category: 'presentation',
    };
    expect(app.category).toBe('presentation');
    expect(app.processName.toLowerCase()).toContain('powerpnt');
  });

  it('searches production providers with deterministic ranking', () => {
    const panels: PanelDefinition[] = [
      ...FIXTURE_PANELS,
      {
        id: 'panel-media-quick',
        name: 'Music Controller',
        category: 'media',
        version: 1,
        isBuiltIn: true,
        layout: { columns: 12, rowHeight: 56 },
        components: [],
      },
    ];

    const apps: AppInfo[] = [{ id: 'spotify', name: 'Spotify', executablePath: 'spotify.lnk' }];
    const windows: WindowInfo[] = [
      {
        id: 'window-1',
        title: 'Spotify Premium',
        processName: 'spotify.exe',
        displayIndex: 0,
        isMaximized: false,
        isMinimized: false,
      },
    ];
    const first = searchCapabilities('spotify', { apps, windows, panels });
    const second = searchCapabilities('spotify', { apps, windows, panels });
    expect(first).toEqual(second);
    expect(first.map((result) => result.provider)).toEqual(['apps', 'windows']);
    expect(first[0].action).toEqual({ type: 'apps.launch', appId: 'spotify' });

    const panelResults = searchCapabilities('music', { apps, windows, panels });
    expect(panelResults[0].id).toBe('panel:panel-media-quick');

    const emptyResults = searchCapabilities('', { apps, windows, panels });
    expect(emptyResults.some((result) => result.provider === 'actions')).toBe(true);
    expect(emptyResults.some((result) => result.provider === 'navigation')).toBe(true);
  });
});
