export type Capability =
  | 'input.mouse'
  | 'input.keyboard'
  | 'media.control'
  | 'presentation.control'
  | 'clipboard.read'
  | 'clipboard.write'
  | 'files.read'
  | 'files.write'
  | 'apps.launch'
  | 'windows.control'
  | 'automation.execute'
  | 'power.lock'
  | 'power.sleep'
  | 'power.restart'
  | 'power.shutdown';

export const ALL_CAPABILITIES: Capability[] = [
  'input.mouse',
  'input.keyboard',
  'media.control',
  'presentation.control',
  'clipboard.read',
  'clipboard.write',
  'files.read',
  'files.write',
  'apps.launch',
  'windows.control',
  'automation.execute',
  'power.lock',
  'power.sleep',
  'power.restart',
  'power.shutdown',
];

export const DEFAULT_DEVICE_CAPABILITIES: Capability[] = [
  'input.mouse',
  'input.keyboard',
  'media.control',
  'presentation.control',
  'clipboard.read',
  'clipboard.write',
  'apps.launch',
  'windows.control',
  'automation.execute',
  'power.lock',
  'power.sleep',
];
