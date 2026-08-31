import React, { useState, useRef } from 'react';
import { globalRemoteClient } from '../../protocol/client';
import {
  CornerDownLeft,
  Delete,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Send,
} from 'lucide-react';
import { MiniTrackpad } from '../trackpad/MiniTrackpad';

type KeyboardModifier = 'ctrl' | 'alt' | 'shift' | 'win';

export const HybridKeyboard: React.FC = () => {
  const [textBuffer, setTextBuffer] = useState<string>('');
  const [activeModifiers, setActiveModifiers] = useState<Set<KeyboardModifier>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleModifier = (mod: KeyboardModifier) => {
    setActiveModifiers((prev) => {
      const next = new Set(prev);
      if (next.has(mod)) {
        next.delete(mod);
      } else {
        next.add(mod);
      }
      return next;
    });
  };

  const sendKey = (key: string) => {
    const mods = Array.from(activeModifiers);
    globalRemoteClient.execute({
      type: 'keyboard.key',
      key,
      state: 'tap',
      modifiers: mods,
    });
    if (mods.length > 0) {
      setActiveModifiers(new Set());
    }
  };

  const handleSendText = () => {
    if (textBuffer.length > 0) {
      globalRemoteClient.execute({
        type: 'keyboard.text',
        text: textBuffer,
      });
      setTextBuffer('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendText();
      globalRemoteClient.execute({
        type: 'keyboard.key',
        key: 'Enter',
        state: 'tap',
      });
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-2 gap-2 overflow-y-auto">
      {/* Text Stream Input Bar */}
      <div className="flex items-center gap-2 bg-surface p-2 rounded-xl border border-white/10">
        <input
          ref={inputRef}
          type="text"
          value={textBuffer}
          onChange={(e) => setTextBuffer(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type to send to PC..."
          className="flex-1 bg-surface-elevated text-slate-100 placeholder-slate-500 px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary border border-white/5"
        />
        <button
          onClick={handleSendText}
          className="p-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors flex items-center justify-center shadow-md shadow-primary/20"
        >
          <Send size={16} />
        </button>
      </div>

      <MiniTrackpad />

      {/* Modifier Latch Bar */}
      <div className="grid grid-cols-4 gap-1.5">
        {(['ctrl', 'alt', 'shift', 'win'] as KeyboardModifier[]).map((mod) => {
          const isActive = activeModifiers.has(mod);
          return (
            <button
              key={mod}
              onClick={() => toggleModifier(mod)}
              className={`py-2 rounded-lg text-xs font-bold uppercase transition-all border ${
                isActive
                  ? 'bg-primary text-white border-primary shadow-md shadow-primary/30'
                  : 'bg-surface-elevated text-slate-400 border-white/5 hover:bg-surface-hover'
              }`}
            >
              {mod}
            </button>
          );
        })}
      </div>

      {/* Primary Key Pad Grid */}
      <div className="grid grid-cols-4 gap-1.5 flex-1">
        <button
          onClick={() => sendKey('Escape')}
          className="bg-surface-elevated hover:bg-surface-hover active:bg-slate-700 border border-white/5 rounded-lg py-2.5 text-xs font-medium text-slate-300 active:scale-95 transition-all"
        >
          Esc
        </button>
        <button
          onClick={() => sendKey('Tab')}
          className="bg-surface-elevated hover:bg-surface-hover active:bg-slate-700 border border-white/5 rounded-lg py-2.5 text-xs font-medium text-slate-300 active:scale-95 transition-all"
        >
          Tab
        </button>
        <button
          onClick={() => sendKey('Backspace')}
          className="bg-surface-elevated hover:bg-surface-hover active:bg-slate-700 border border-white/5 rounded-lg py-2.5 text-xs font-medium text-slate-300 active:scale-95 transition-all flex items-center justify-center"
        >
          <Delete size={16} />
        </button>
        <button
          onClick={() => sendKey('Enter')}
          className="bg-primary hover:bg-primary-hover active:bg-blue-700 border border-primary/50 rounded-lg py-2.5 text-xs font-medium text-white active:scale-95 transition-all flex items-center justify-center"
        >
          <CornerDownLeft size={16} />
        </button>

        <button
          onClick={() => sendKey('Home')}
          className="bg-surface-elevated hover:bg-surface-hover active:bg-slate-700 border border-white/5 rounded-lg py-2.5 text-xs font-medium text-slate-300 active:scale-95 transition-all"
        >
          Home
        </button>
        <button
          onClick={() => sendKey('End')}
          className="bg-surface-elevated hover:bg-surface-hover active:bg-slate-700 border border-white/5 rounded-lg py-2.5 text-xs font-medium text-slate-300 active:scale-95 transition-all"
        >
          End
        </button>
        <button
          onClick={() => sendKey('PageUp')}
          className="bg-surface-elevated hover:bg-surface-hover active:bg-slate-700 border border-white/5 rounded-lg py-2.5 text-xs font-medium text-slate-300 active:scale-95 transition-all"
        >
          PgUp
        </button>
        <button
          onClick={() => sendKey('PageDown')}
          className="bg-surface-elevated hover:bg-surface-hover active:bg-slate-700 border border-white/5 rounded-lg py-2.5 text-xs font-medium text-slate-300 active:scale-95 transition-all"
        >
          PgDn
        </button>
      </div>

      {/* D-Pad Navigation Cluster */}
      <div className="flex flex-col items-center justify-center p-2 bg-surface rounded-xl border border-white/5">
        <button
          onClick={() => sendKey('ArrowUp')}
          className="p-3 bg-surface-elevated active:bg-primary text-slate-200 active:text-white rounded-lg border border-white/10 active:scale-95 transition-all mb-1"
        >
          <ArrowUp size={18} />
        </button>
        <div className="flex gap-1">
          <button
            onClick={() => sendKey('ArrowLeft')}
            className="p-3 bg-surface-elevated active:bg-primary text-slate-200 active:text-white rounded-lg border border-white/10 active:scale-95 transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            onClick={() => sendKey('Space')}
            className="px-6 py-3 bg-surface-elevated active:bg-slate-700 text-slate-300 rounded-lg border border-white/10 text-xs font-medium active:scale-95 transition-all"
          >
            Space
          </button>
          <button
            onClick={() => sendKey('ArrowRight')}
            className="p-3 bg-surface-elevated active:bg-primary text-slate-200 active:text-white rounded-lg border border-white/10 active:scale-95 transition-all"
          >
            <ArrowRight size={18} />
          </button>
        </div>
        <button
          onClick={() => sendKey('ArrowDown')}
          className="p-3 bg-surface-elevated active:bg-primary text-slate-200 active:text-white rounded-lg border border-white/10 active:scale-95 transition-all mt-1"
        >
          <ArrowDown size={18} />
        </button>
      </div>
    </div>
  );
};
