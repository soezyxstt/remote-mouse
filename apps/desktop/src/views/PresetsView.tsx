import React, { useState } from 'react';
import { Layers, Copy, Play, Plus, Terminal } from 'lucide-react';
import { MacroDefinition } from '@remote/protocol';

export const PresetsView: React.FC = () => {
  const [macros] = useState<MacroDefinition[]>([
    {
      id: 'macro_start_work',
      name: 'Start Work Workspace',
      description: 'Launch VS Code, wait 500ms, snap left, and copy project URL',
      steps: [
        {
          type: 'action',
          intent: { type: 'apps.launch', appId: 'vscode' },
        },
        {
          type: 'delay',
          ms: 500,
        },
        {
          type: 'action',
          intent: { type: 'windows.snap', position: 'left' },
        },
      ],
    },
  ]);

  return (
    <div className="flex flex-col gap-6 max-w-4xl select-none">
      {/* Presets Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-100">Presets & Automation Macros</h2>
        <p className="text-xs text-slate-400 mt-1">
          Inspect immutable built-in presets and configure backend-driven automation sequences.
        </p>
      </div>

      {/* Built-in Presets Section */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Built-in Presets (Immutable)
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { name: 'General Remote', category: 'general', desc: 'Trackpad + Click buttons' },
            { name: 'Media Companion', category: 'media', desc: 'Playback & Scrub bar' },
            { name: 'Presentation Remote', category: 'presentation', desc: 'Slide controls & Timer' },
          ].map((preset, idx) => (
            <div
              key={idx}
              className="p-4 bg-surface rounded-2xl border border-white/5 flex flex-col justify-between gap-3 shadow-md"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-primary" />
                  <h4 className="text-xs font-bold text-slate-200">{preset.name}</h4>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{preset.desc}</p>
              </div>

              <button className="flex items-center justify-center gap-1.5 py-1.5 bg-surface-elevated hover:bg-surface-hover text-slate-300 rounded-xl text-xs font-semibold border border-white/5 transition-colors">
                <Copy size={13} />
                <span>Duplicate & Customize</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Macro Sequences Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Automation Macros ({macros.length})
          </span>
          <button className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            <Plus size={14} />
            <span>New Macro</span>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {macros.map((m) => (
            <div
              key={m.id}
              className="p-4 bg-surface rounded-2xl border border-white/5 flex items-center justify-between gap-4 shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-accent/20 text-accent rounded-xl">
                  <Terminal size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{m.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{m.description}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500 font-mono">
                    <span>{m.steps.length} sequential steps</span>
                  </div>
                </div>
              </div>

              <button className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors">
                <Play size={13} />
                <span>Test Run</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
