import React, { useState, useEffect } from 'react';
import { globalRemoteClient } from '../../protocol/client';
import { Copy, Send, Check, Trash2, Clock } from 'lucide-react';

export const ClipboardCompanion: React.FC = () => {
  const [pcClipboard, setPcClipboard] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    // Request current PC clipboard
    globalRemoteClient.send('clipboard.get', {});

    const unsub = globalRemoteClient.subscribeMessages((env) => {
      if (env.type === 'state.clipboard') {
        const text = (env.data as { text: string }).text;
        setPcClipboard(text);
        if (text && !history.includes(text)) {
          setHistory((prev) => [text, ...prev.slice(0, 19)]);
        }
      }
    });

    return () => unsub();
  }, []);

  const handleSendToPc = () => {
    if (inputText) {
      globalRemoteClient.send('clipboard.set', { text: inputText });
      setHistory((prev) => [inputText, ...prev.filter((item) => item !== inputText)]);
      setInputText('');
    }
  };

  const handleCopyLocal = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="flex flex-col h-full w-full p-3 gap-4 overflow-y-auto select-none">
      {/* Send to PC Bar */}
      <div className="flex flex-col gap-2 bg-surface p-3 rounded-2xl border border-white/10">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Send Text to PC Clipboard
        </label>
        <div className="flex gap-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste or write text to send to PC clipboard..."
            rows={2}
            className="flex-1 bg-surface-elevated text-slate-100 placeholder-slate-500 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary border border-white/5 resize-none"
          />
          <button
            onClick={handleSendToPc}
            disabled={!inputText}
            className="px-4 bg-primary disabled:opacity-50 hover:bg-primary-hover active:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-primary/20 transition-all active:scale-95"
          >
            <Send size={14} />
            <span>Send</span>
          </button>
        </div>
      </div>

      {/* Live PC Clipboard Card */}
      <div className="flex flex-col gap-2 bg-surface p-3 rounded-2xl border border-white/10">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Current PC Clipboard
          </label>
          <button
            onClick={() => globalRemoteClient.send('clipboard.get', {})}
            className="text-xs text-primary hover:underline"
          >
            Refresh
          </button>
        </div>

        <div className="bg-surface-elevated p-3 rounded-xl border border-white/5 flex items-start justify-between gap-3">
          <p className="text-xs text-slate-200 font-mono break-all line-clamp-3">
            {pcClipboard || '(Clipboard is empty)'}
          </p>
          {pcClipboard && (
            <button
              onClick={() => handleCopyLocal(pcClipboard, -1)}
              className="p-2 bg-surface hover:bg-surface-hover text-slate-300 rounded-lg shrink-0 transition-colors"
            >
              {copiedIndex === -1 ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Clipboard History List */}
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={13} />
            History ({history.length})
          </span>
          {history.length > 0 && (
            <button
              onClick={() => setHistory([])}
              className="text-slate-500 hover:text-rose-400 transition-colors p-1"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          {history.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-surface-elevated/60 hover:bg-surface-elevated p-2.5 rounded-xl border border-white/5 gap-2 transition-colors"
            >
              <span className="text-xs text-slate-300 font-mono truncate flex-1">{item}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleCopyLocal(item, idx)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  {copiedIndex === idx ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
                <button
                  onClick={() => globalRemoteClient.send('clipboard.set', { text: item })}
                  className="p-1.5 text-slate-400 hover:text-primary rounded-lg transition-colors"
                  title="Send to PC"
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
