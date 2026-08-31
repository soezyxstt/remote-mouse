import {
  DisplayInfo,
  FileItem,
  ForegroundAppState,
  MediaSessionState,
  SessionReadyData,
  VirtualRoot,
} from './messages';
import { PanelDefinition } from './panels';

export const FIXTURE_SESSION_READY: SessionReadyData = {
  serverName: 'Workstation-Win11',
  serverVersion: '0.1.0',
  capabilities: [
    'input.mouse',
    'input.keyboard',
    'media.control',
    'presentation.control',
    'apps.launch',
    'windows.control',
    'clipboard.read',
    'clipboard.write',
    'files.read',
    'files.write',
    'automation.execute',
    'power.lock',
    'power.sleep',
  ],
  activeDisplayCount: 2,
  serverEcdhPublicKey: 'fixture-only',
  sessionSalt: 'fixture-only',
};

export const FIXTURE_FOREGROUND_BROWSER: ForegroundAppState = {
  processName: 'chrome.exe',
  windowTitle: 'Google Docs — Research Proposal',
  category: 'browser',
};

export const FIXTURE_FOREGROUND_MEDIA: ForegroundAppState = {
  processName: 'spotify.exe',
  windowTitle: 'Spotify Premium',
  category: 'media',
};

export const FIXTURE_MEDIA_SESSION: MediaSessionState = {
  title: 'Midnight City',
  artist: 'M83',
  album: "Hurry Up, We're Dreaming",
  isPlaying: true,
  positionSec: 142,
  durationSec: 243,
  volume: 75,
  sourceApp: 'Spotify',
};

export const FIXTURE_DISPLAYS: DisplayInfo[] = [
  {
    index: 0,
    name: 'Primary Display (Built-in)',
    width: 2560,
    height: 1440,
    isPrimary: true,
    x: 0,
    y: 0,
    scaleFactor: 1.5,
  },
  {
    index: 1,
    name: 'External 4K Monitor',
    width: 3840,
    height: 2160,
    isPrimary: false,
    x: 2560,
    y: 0,
    scaleFactor: 1,
  },
];

export const FIXTURE_VIRTUAL_ROOTS: VirtualRoot[] = [
  {
    id: 'root-docs',
    name: 'Documents',
    pathAlias: 'C:\\Users\\User\\Documents',
  },
  {
    id: 'root-downloads',
    name: 'Downloads',
    pathAlias: 'C:\\Users\\User\\Downloads',
  },
];

export const FIXTURE_FILE_ITEMS: FileItem[] = [
  {
    id: 'root-docs:report.pdf',
    name: 'Q3_Project_Report.pdf',
    isDir: false,
    sizeBytes: 1048576,
    modifiedAt: 1725000000,
    extension: 'pdf',
  },
  {
    id: 'root-docs:notes.txt',
    name: 'meeting_notes.txt',
    isDir: false,
    sizeBytes: 4096,
    modifiedAt: 1725001000,
    extension: 'txt',
  },
  {
    id: 'root-docs:Photos',
    name: 'Photos',
    isDir: true,
  },
];

export const FIXTURE_PANELS: PanelDefinition[] = [
  {
    id: 'panel-dev',
    name: 'Dev Shortcuts',
    category: 'development',
    version: 1,
    isBuiltIn: true,
    layout: {
      columns: 12,
      rowHeight: 56,
    },
    components: [
      {
        id: 'el-terminal',
        type: 'button',
        label: 'Terminal',
        variant: 'primary',
        grid: { x: 0, y: 0, w: 6, h: 1 },
        action: {
          type: 'apps.launch',
          appId: 'wt.exe',
        },
      },
      {
        id: 'el-format',
        type: 'button',
        label: 'Format Code',
        variant: 'secondary',
        grid: { x: 6, y: 0, w: 6, h: 1 },
        action: {
          type: 'keyboard.shortcut',
          keys: ['Shift', 'Alt', 'F'],
        },
      },
    ],
  },
];
