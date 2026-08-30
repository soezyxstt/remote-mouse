import React, { useState, useEffect } from 'react';
import { FileItem, VirtualRoot } from '@remote/protocol';
import { globalRemoteClient } from '../../protocol/client';
import { Folder, FileText, Download, ChevronRight, HardDrive, ArrowLeft } from 'lucide-react';

export const FileCompanion: React.FC = () => {
  const [roots, setRoots] = useState<VirtualRoot[]>([]);
  const [activeRoot, setActiveRoot] = useState<VirtualRoot | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [items, setItems] = useState<FileItem[]>([]);

  useEffect(() => {
    // Request virtual folder roots
    globalRemoteClient.send('files.list_roots', {});

    const unsub = globalRemoteClient.subscribeMessages((env) => {
      if (env.type === 'files.roots') {
        setRoots(env.data as VirtualRoot[]);
      } else if (env.type === 'files.items') {
        setItems(env.data as FileItem[]);
      }
    });

    return () => unsub();
  }, []);

  const openRoot = (root: VirtualRoot) => {
    setActiveRoot(root);
    setCurrentPath('');
    globalRemoteClient.send('files.browse', { rootId: root.id, subpath: '' });
  };

  const openFolder = (folderName: string) => {
    const nextPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    setCurrentPath(nextPath);
    if (activeRoot) {
      globalRemoteClient.send('files.browse', { rootId: activeRoot.id, subpath: nextPath });
    }
  };

  const goBack = () => {
    if (!currentPath) {
      setActiveRoot(null);
      setItems([]);
    } else {
      const parts = currentPath.split('/');
      parts.pop();
      const parentPath = parts.join('/');
      setCurrentPath(parentPath);
      if (activeRoot) {
        globalRemoteClient.send('files.browse', { rootId: activeRoot.id, subpath: parentPath });
      }
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full w-full p-3 gap-3 overflow-y-auto select-none">
      {/* Header & Breadcrumbs */}
      <div className="flex items-center gap-2 bg-surface p-2.5 rounded-2xl border border-white/10">
        {activeRoot ? (
          <>
            <button
              onClick={goBack}
              className="p-1.5 bg-surface-elevated hover:bg-surface-hover text-slate-300 rounded-lg transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 truncate">
              <span className="font-semibold">{activeRoot.name}</span>
              {currentPath && (
                <>
                  <ChevronRight size={12} className="text-slate-500" />
                  <span className="text-slate-400 font-mono truncate">{currentPath}</span>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <HardDrive size={16} className="text-primary" />
            <span>Allowed Folders</span>
          </div>
        )}
      </div>

      {/* Root Selector or File List */}
      {!activeRoot ? (
        <div className="flex flex-col gap-2">
          {roots.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No allowed folders found on PC.
            </div>
          ) : (
            roots.map((root) => (
              <button
                key={root.id}
                onClick={() => openRoot(root)}
                className="flex items-center justify-between bg-surface hover:bg-surface-elevated p-3.5 rounded-2xl border border-white/10 active:scale-[0.99] transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/20 text-primary rounded-xl">
                    <Folder size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{root.name}</h4>
                    <p className="text-[11px] text-slate-400 font-mono">{root.pathAlias}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-500" />
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 flex-1">
          {items.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">Folder is empty</div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                onClick={() => (item.isDir ? openFolder(item.name) : null)}
                className={`flex items-center justify-between p-3 rounded-xl border border-white/5 transition-all ${
                  item.isDir
                    ? 'bg-surface hover:bg-surface-elevated cursor-pointer active:scale-[0.99]'
                    : 'bg-surface-elevated/40'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <div
                    className={`p-2 rounded-lg ${
                      item.isDir ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    {item.isDir ? <Folder size={16} /> : <FileText size={16} />}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-medium text-slate-200 truncate">{item.name}</p>
                    {!item.isDir && (
                      <p className="text-[10px] text-slate-400 font-mono">
                        {formatFileSize(item.sizeBytes)}
                      </p>
                    )}
                  </div>
                </div>

                {item.isDir ? (
                  <ChevronRight size={14} className="text-slate-500" />
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="p-1.5 text-slate-400 hover:text-primary rounded-lg transition-colors"
                  >
                    <Download size={14} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
