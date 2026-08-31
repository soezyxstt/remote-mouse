import React, { useState, useEffect } from 'react';
import { globalRemoteClient } from '../../protocol/client';
import { Copy, Send, Check, Trash2, Clock, RefreshCw, CheckCircle2 } from 'lucide-react';

export const ClipboardCompanion: React.FC = () => {
  const [pcClipboard, setPcClipboard] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isSent, setIsSent] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    // Request current PC clipboard on mount
    globalRemoteClient.send('clipboard.get', {});

    const unsub = globalRemoteClient.subscribeMessages((env) => {
      if (env.type === 'state.clipboard') {
        const text = (env.data as { text: string }).text;
        setPcClipboard(text);
        setIsRefreshing(false);
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
      setIsSent(true);
      setTimeout(() => setIsSent(false), 2000);
    }
  };

  const handleCopyLocal = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    globalRemoteClient.send('clipboard.get', {});
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="flex flex-col h-full w-full p-3 gap-4 overflow-y-auto select-none">
      {/* Send to PC Bar */}
      <div className="flex flex-col gap-2 bg-surface p-3 rounded-2xl border border-white/10">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Send Text to PC Clipboard</span>
          {isSent && (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold normal-case">
              <CheckCircle2 size={13} />
              Sent to PC!
            </span>
          )}
        </label>
        <div className="flex gap-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste or write text to send to PC clipboard..."
            rows={2}
            className="flex-1 bg-surface-elevated text-slate-100 placeholder-slate-500 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary border border-white/5 resize-none font-mono"
          />
          <button
            onClick={handleSendToPc}
            disabled={!inputText}
            className="px-4 bg-primary disabled:opacity-50 hover:bg-primary-hover active:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-primary/20 transition-all active:scale-95 shrink-0"
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
            onClick={handleRefresh}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
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
              title="Copy to mobile device"
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
              title="Clear History"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          {history.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">No clipboard history yet</div>
          ) : (
            history.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-surface-elevated/60 hover:bg-surface-elevated p-2.5 rounded-xl border border-white/5 gap-2 transition-colors"
              >
                <span className="text-xs text-slate-300 font-mono truncate flex-1">{item}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleCopyLocal(item, idx)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
                    title="Copy to phone"
                  >
                    {copiedIndex === idx ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                  <button
                    onClick={() => {
                      globalRemoteClient.send('clipboard.set', { text: item });
                      setIsSent(true);
                      setTimeout(() => setIsSent(false), 2000);
                    }}
                    className="p-1.5 text-slate-400 hover:text-primary rounded-lg transition-colors"
                    title="Send to PC clipboard"
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
