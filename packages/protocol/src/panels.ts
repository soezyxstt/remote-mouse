import { ActionIntent } from './macros';

export type ComponentType =
  | 'trackpad'
  | 'button'
  | 'toggle'
  | 'slider'
  | 'dpad'
  | 'media_display'
  | 'label'
  | 'spacer'
  | 'text_input';

export interface GridPlacement {
  x: number; // 0 to 11
  y: number; // Row index
  w: number; // Width span (1 to 12)
  h: number; // Height span
}

export interface PanelComponent {
  id: string;
  type: ComponentType;
  label?: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'surface';
  grid: GridPlacement;
  props?: Record<string, unknown>;
  action?: ActionIntent;
}

export interface PanelDefinition {
  id: string;
  name: string;
  category:
    | 'general'
    | 'trackpad'
    | 'media'
    | 'presentation'
    | 'browser'
    | 'development'
    | 'meeting'
    | 'design'
    | 'documents'
    | 'custom';
  icon?: string;
  version: 1;
  isBuiltIn: boolean;
  appRules?: {
    processNames: string[];
    autoSwitch: boolean;
  };
  layout: {
    columns: number; // Default 12
    rowHeight: number; // Default 56px
  };
  components: PanelComponent[];
}
