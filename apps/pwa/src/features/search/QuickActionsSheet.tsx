import React from 'react';
import { ForegroundAppState } from '@remote/protocol';
import { Keyboard, Lock, MousePointer2, Play, Presentation, X } from 'lucide-react';
import { NavRoute } from '../../components/NavBar';
import { globalRemoteClient } from '../../protocol/client';

interface QuickActionsSheetProps {
  open: boolean;
  foregroundApp: ForegroundAppState | null;
  onClose: () => void;
  onNavigate: (route: NavRoute) => void;
}

export const QuickActionsSheet: React.FC<QuickActionsSheetProps> = ({
  open,
  foregroundApp,
  onClose,
  onNavigate,
}) => {
  if (!open) return null;
  const contextual =
    foregroundApp?.category === 'media'
      ? 'Media controls'
      : foregroundApp?.category === 'presentation'
        ? 'Slide controls'
        : 'Keyboard';
  const contextualRoute: NavRoute =
    foregroundApp?.category === 'media'
      ? 'media'
      : foregroundApp?.category === 'presentation'
        ? 'slides'
        : 'keyboard';
  const actions = [
    { id: 'control', label: 'Control', icon: MousePointer2, run: () => onNavigate('control') },
    { id: 'keyboard', label: 'Keyboard', icon: Keyboard, run: () => onNavigate('keyboard') },
    {
      id: 'context',
      label: contextual,
      icon: foregroundApp?.category === 'presentation' ? Presentation : Play,
      run: () => onNavigate(contextualRoute),
    },
    {
      id: 'lock',
      label: 'Lock PC',
      icon: Lock,
      run: () => globalRemoteClient.execute({ type: 'power.command', action: 'lock' }),
    },
  ];
  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/70 p-2 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Quick Actions"
    >
      <div className="w-full rounded-3xl border border-white/10 bg-surface p-3 shadow-2xl">
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-bold text-slate-100">Quick Actions</h2>
            <p className="text-[11px] text-slate-500">Pinned and contextual</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Quick Actions"
            className="min-h-11 min-w-11 rounded-xl bg-surface-elevated"
          >
            <X size={16} className="mx-auto" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {actions.map(({ id, label, icon: Icon, run }) => (
            <button
              key={id}
              onClick={() => {
                run();
                onClose();
              }}
              className="flex min-h-16 items-center gap-3 rounded-2xl border border-white/10 bg-surface-elevated p-3 text-left text-xs font-semibold text-slate-200"
            >
              <Icon size={18} className="text-primary" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
