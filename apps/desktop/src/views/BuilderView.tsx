import React, { useState } from 'react';
import {
  ComponentType,
  PanelComponent,
} from '@remote/protocol';
import {
  Trash2,
  Save,
  MousePointer,
  Square,
  Music,
  Grid,
} from 'lucide-react';

export const BuilderView: React.FC = () => {
  const [panelName, setPanelName] = useState<string>('Custom Developer Panel');
  const [components, setComponents] = useState<PanelComponent[]>([
    {
      id: 'comp_1',
      type: 'button',
      label: 'Open Terminal',
      variant: 'primary',
      grid: { x: 0, y: 0, w: 6, h: 2 },
      action: { type: 'keyboard.shortcut', keys: ['Ctrl', '`'] },
    },
    {
      id: 'comp_2',
      type: 'button',
      label: 'Format Code',
      variant: 'secondary',
      grid: { x: 6, y: 0, w: 6, h: 2 },
      action: { type: 'keyboard.shortcut', keys: ['Shift', 'Alt', 'F'] },
    },
    {
      id: 'comp_3',
      type: 'trackpad',
      label: 'Touchpad',
      grid: { x: 0, y: 2, w: 12, h: 4 },
    },
  ]);

  const [selectedId, setSelectedId] = useState<string | null>('comp_1');

  const selectedComponent = components.find((c) => c.id === selectedId) || null;

  const addComponent = (type: ComponentType) => {
    const newComp: PanelComponent = {
      id: 'comp_' + Math.random().toString(36).substring(2, 7),
      type,
      label: type === 'trackpad' ? 'Trackpad Area' : 'New Button',
      variant: 'secondary',
      grid: { x: 0, y: components.length * 2, w: 12, h: type === 'trackpad' ? 4 : 2 },
      action:
        type === 'button'
          ? { type: 'keyboard.key', key: 'Space', modifiers: [] }
          : undefined,
    };
    setComponents([...components, newComp]);
    setSelectedId(newComp.id);
  };

  const removeSelectedComponent = () => {
    if (selectedId) {
      setComponents(components.filter((c) => c.id !== selectedId));
      setSelectedId(null);
    }
  };

  const updateSelectedProps = (updates: Partial<PanelComponent>) => {
    if (selectedId) {
      setComponents(
        components.map((c) => (c.id === selectedId ? { ...c, ...updates } : c))
      );
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full select-none">
      {/* Top Header & Save Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Custom Remote Builder</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Design customizable mobile control surfaces with abstract action bindings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={panelName}
            onChange={(e) => setPanelName(e.target.value)}
            className="bg-surface-elevated text-slate-200 text-xs px-3 py-2 rounded-xl border border-white/10 outline-none focus:ring-1 focus:ring-primary font-semibold"
          />
          <button className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover active:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary/20 transition-all">
            <Save size={14} />
            <span>Save Panel</span>
          </button>
        </div>
      </div>

      {/* 3-Column Studio Workspace */}
      <div className="grid grid-cols-12 gap-4 flex-1 overflow-hidden">
        {/* Left Palette */}
        <div className="col-span-3 bg-surface p-4 rounded-3xl border border-white/5 flex flex-col gap-3 overflow-y-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Component Library
          </span>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => addComponent('button')}
              className="flex items-center gap-3 p-3 bg-surface-elevated hover:bg-surface-hover rounded-2xl border border-white/5 text-xs font-semibold text-slate-200 transition-all text-left"
            >
              <Square size={16} className="text-primary" />
              <span>Action Button</span>
            </button>

            <button
              onClick={() => addComponent('trackpad')}
              className="flex items-center gap-3 p-3 bg-surface-elevated hover:bg-surface-hover rounded-2xl border border-white/5 text-xs font-semibold text-slate-200 transition-all text-left"
            >
              <MousePointer size={16} className="text-accent" />
              <span>Trackpad Widget</span>
            </button>

            <button
              onClick={() => addComponent('media_display')}
              className="flex items-center gap-3 p-3 bg-surface-elevated hover:bg-surface-hover rounded-2xl border border-white/5 text-xs font-semibold text-slate-200 transition-all text-left"
            >
              <Music size={16} className="text-emerald-400" />
              <span>Media Display</span>
            </button>
          </div>
        </div>

        {/* Center Canvas (12-Column Responsive Grid Simulator) */}
        <div className="col-span-6 bg-surface p-4 rounded-3xl border border-white/5 flex flex-col gap-2 overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Grid size={14} /> 12-Column Canvas
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              {components.length} components
            </span>
          </div>

          <div className="grid grid-cols-12 gap-2 auto-rows-[48px] bg-background/50 p-4 rounded-2xl border border-white/5 min-h-[360px]">
            {components.map((comp) => {
              const isSelected = comp.id === selectedId;
              const gridStyle: React.CSSProperties = {
                gridColumnStart: comp.grid.x + 1,
                gridColumnEnd: comp.grid.x + 1 + comp.grid.w,
                gridRowStart: comp.grid.y + 1,
                gridRowEnd: comp.grid.y + 1 + comp.grid.h,
              };

              return (
                <div
                  key={comp.id}
                  style={gridStyle}
                  onClick={() => setSelectedId(comp.id)}
                  className={`rounded-xl border p-2 flex items-center justify-center text-xs font-medium cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/40 bg-primary/20 text-white font-bold'
                      : 'border-white/10 bg-surface-elevated hover:bg-surface-hover text-slate-300'
                  }`}
                >
                  <span className="truncate">{comp.label || comp.type}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Property Inspector */}
        <div className="col-span-3 bg-surface p-4 rounded-3xl border border-white/5 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Properties
            </span>
            {selectedComponent && (
              <button
                onClick={removeSelectedComponent}
                className="text-slate-500 hover:text-rose-400 transition-colors p-1"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {selectedComponent ? (
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium">Label</label>
                <input
                  type="text"
                  value={selectedComponent.label || ''}
                  onChange={(e) => updateSelectedProps({ label: e.target.value })}
                  className="bg-surface-elevated text-slate-200 p-2 rounded-lg border border-white/10 outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-medium">Width Span</label>
                  <select
                    value={selectedComponent.grid.w}
                    onChange={(e) =>
                      updateSelectedProps({
                        grid: { ...selectedComponent.grid, w: parseInt(e.target.value) },
                      })
                    }
                    className="bg-surface-elevated text-slate-200 p-2 rounded-lg border border-white/10 outline-none"
                  >
                    {[3, 4, 6, 8, 12].map((w) => (
                      <option key={w} value={w}>
                        {w} cols
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-medium">Height Span</label>
                  <select
                    value={selectedComponent.grid.h}
                    onChange={(e) =>
                      updateSelectedProps({
                        grid: { ...selectedComponent.grid, h: parseInt(e.target.value) },
                      })
                    }
                    className="bg-surface-elevated text-slate-200 p-2 rounded-lg border border-white/10 outline-none"
                  >
                    {[1, 2, 3, 4, 6].map((h) => (
                      <option key={h} value={h}>
                        {h} rows
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Binding Config */}
              {selectedComponent.type === 'button' && (
                <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-white/5">
                  <label className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    Bound Action Intent
                  </label>
                  <div className="flex flex-col gap-2 bg-surface-elevated p-2.5 rounded-xl border border-white/5">
                    <span className="text-[11px] font-mono text-primary font-bold">
                      {selectedComponent.action?.type || 'No action'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">
              Select a component on the canvas to edit its properties.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
