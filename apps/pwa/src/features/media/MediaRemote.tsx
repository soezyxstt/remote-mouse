import React from 'react';
import { Action, MediaSessionState } from '@remote/protocol';
import { globalRemoteClient } from '../../protocol/client';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Volume1, Music } from 'lucide-react';
import { MiniTrackpad } from '../trackpad/MiniTrackpad';

interface MediaRemoteProps {
  mediaState: MediaSessionState | null;
}

export const MediaRemote: React.FC<MediaRemoteProps> = ({ mediaState }) => {
  const isPlaying = mediaState?.isPlaying ?? false;
  const title = mediaState?.title ?? 'No media playing';
  const artist = mediaState?.artist ?? 'Windows Media Session';
  const volume = mediaState?.volume ?? 0.8;
  const position = mediaState?.positionSec ?? 0;
  const duration = mediaState?.durationSec ?? 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCommand = (
    action: Extract<Action, { type: 'media.command' }>['action'],
    value?: number
  ) => {
    globalRemoteClient.execute({ type: 'media.command', action, value });
  };

  return (
    <div className="flex flex-col h-full w-full p-4 gap-4 justify-between overflow-y-auto select-none">
      {/* Media Artwork & Title */}
      <div className="flex flex-col items-center justify-center flex-1 gap-4">
        <div className="w-48 h-48 rounded-2xl bg-gradient-to-tr from-surface-elevated to-primary/20 border border-white/10 flex items-center justify-center shadow-xl shadow-black/40">
          <Music size={64} className="text-primary/70 animate-pulse" />
        </div>

        <div className="text-center px-4">
          <h2 className="text-lg font-bold text-slate-100 line-clamp-1">{title}</h2>
          <p className="text-sm text-slate-400 mt-0.5">{artist}</p>
        </div>
      </div>

      {/* Scrub & Progress Bar */}
      <div className="flex flex-col gap-1 px-2">
        <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden relative">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{
              width: duration > 0 ? `${(position / duration) * 100}%` : '0%',
            }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-slate-400 font-mono">
          <span>{formatTime(position)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Playback Controls */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={() => handleCommand('prev')}
          className="p-4 rounded-full bg-surface-elevated hover:bg-surface-hover active:bg-slate-700 text-slate-300 active:scale-95 transition-all border border-white/5"
        >
          <SkipBack size={24} />
        </button>

        <button
          onClick={() => handleCommand('play_pause')}
          className="p-5 rounded-full bg-primary hover:bg-primary-hover active:bg-blue-700 text-white active:scale-95 transition-all shadow-lg shadow-primary/30"
        >
          {isPlaying ? <Pause size={28} /> : <Play size={28} className="translate-x-0.5" />}
        </button>

        <button
          onClick={() => handleCommand('next')}
          className="p-4 rounded-full bg-surface-elevated hover:bg-surface-hover active:bg-slate-700 text-slate-300 active:scale-95 transition-all border border-white/5"
        >
          <SkipForward size={24} />
        </button>
      </div>

      {/* Volume Slider Card */}
      <div className="flex items-center gap-3 bg-surface p-3 rounded-2xl border border-white/10">
        <button onClick={() => handleCommand('mute')} className="text-slate-400 hover:text-white">
          {volume === 0 ? (
            <VolumeX size={18} />
          ) : volume < 0.5 ? (
            <Volume1 size={18} />
          ) : (
            <Volume2 size={18} />
          )}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => handleCommand('set_volume', parseFloat(e.target.value))}
          className="flex-1 accent-primary h-1.5 rounded-lg bg-surface-elevated"
        />
      </div>

      <MiniTrackpad sidePadMode="volume" />
    </div>
  );
};
