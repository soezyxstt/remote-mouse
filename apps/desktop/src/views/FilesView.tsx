import React, { useState } from 'react';
import { Plus, Trash2, ShieldCheck, Folder } from 'lucide-react';
import { VirtualRoot } from '@remote/protocol';

export const FilesView: React.FC = () => {
  const [roots, setRoots] = useState<VirtualRoot[]>([
    {
      id: 'root_desktop',
      name: 'Desktop Folder',
      pathAlias: 'C:\\Users\\Adi\\Desktop',
    },
    {
      id: 'root_downloads',
      name: 'Downloads',
      pathAlias: 'C:\\Users\\Adi\\Downloads',
    },
    {
      id: 'root_projects',
      name: 'Projects Workspace',
      pathAlias: 'C:\\Projects\\Remote',
    },
  ]);

  const removeRoot = (id: string) => {
    setRoots(roots.filter((r) => r.id !== id));
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl select-none">
      <div>
        <h2 className="text-lg font-bold text-slate-100">Allowed Folders Whitelist</h2>
        <p className="text-xs text-slate-400 mt-1">
          Specify exact host directories accessible by mobile devices in File Companion.
        </p>
      </div>

      <div className="p-4 bg-surface-elevated/40 rounded-2xl border border-white/5 flex items-center gap-3 text-xs text-slate-400">
        <ShieldCheck size={20} className="text-primary shrink-0" />
        <p className="leading-relaxed">
          The desktop agent enforces strict path traversal sandboxing. Mobile devices only receive
          synthetic virtual root identifiers and can never navigate outside these configured
          folders.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Whitelisted Directories ({roots.length})
          </span>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover active:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all">
            <Plus size={14} />
            <span>Add Folder...</span>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {roots.map((root) => (
            <div
              key={root.id}
              className="p-4 bg-surface rounded-2xl border border-white/5 flex items-center justify-between shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/20 text-primary rounded-xl">
                  <Folder size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{root.name}</h4>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{root.pathAlias}</p>
                </div>
              </div>

              <button
                onClick={() => removeRoot(root.id)}
                className="p-2 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                title="Remove folder"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
