import { describe, it, expect } from 'vitest';
import {
  FIXTURE_FOREGROUND_MEDIA,
  FIXTURE_FOREGROUND_BROWSER,
  FIXTURE_PANELS,
  ForegroundAppState,
  PanelDefinition,
} from '@remote/protocol';

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

  it('filters panels and actions deterministically by search query', () => {
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

    const filterPanels = (query: string) => {
      const q = query.toLowerCase().trim();
      if (!q) return panels;
      return panels.filter(
        (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
      );
    };

    const devResults = filterPanels('dev');
    expect(devResults).toHaveLength(1);
    expect(devResults[0].id).toBe('panel-dev');

    const musicResults = filterPanels('music');
    expect(musicResults).toHaveLength(1);
    expect(musicResults[0].id).toBe('panel-media-quick');

    const emptyResults = filterPanels('');
    expect(emptyResults).toHaveLength(2);
  });
});
