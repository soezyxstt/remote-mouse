import React, { useState, useEffect } from 'react';
import { ConnectionState, globalRemoteClient } from '../protocol/client';
import { Wifi, X, ShieldCheck } from 'lucide-react';

interface PairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionState: ConnectionState;
}

export const PairingModal: React.FC<PairingModalProps> = ({
  isOpen,
  onClose,
  connectionState,
}) => {
  const [host, setHost] = useState<string>('');
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    const current = globalRemoteClient.getHost();
    if (current) {
      setHost(current);
    } else {
      const defaultHost = `http://${window.location.hostname || '127.0.0.1'}:8080`;
      setHost(defaultHost);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (host) {
      globalRemoteClient.connect(host, token || undefined);
      onClose();
    }
  };

  const handleDisconnect = () => {
    globalRemoteClient.disconnect();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-white/10 rounded-3xl p-5 max-w-sm w-full flex flex-col gap-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/20 text-primary rounded-xl">
              <ShieldCheck size={20} />
            </div>
            <h3 className="font-bold text-slate-100 text-sm">Device Pairing</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleConnect} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              PC Host Address (IP:Port)
            </label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="http://192.168.1.100:8080"
              required
              className="bg-surface-elevated text-slate-100 placeholder-slate-500 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary border border-white/5 font-mono"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              6-Digit Pairing PIN (from PC QR)
            </label>
            <input
              type="text"
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value.trim())}
              placeholder="123456"
              className="bg-surface-elevated text-slate-100 placeholder-slate-500 px-3 py-2 rounded-xl text-center text-base tracking-widest font-mono outline-none focus:ring-1 focus:ring-primary border border-white/5"
            />
          </div>

          <div className="flex gap-2 mt-2">
            {connectionState === 'connected' ? (
              <button
                type="button"
                onClick={handleDisconnect}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/30 transition-all active:scale-95"
              >
                Disconnect
              </button>
            ) : null}

            <button
              type="submit"
              className="flex-1 py-2.5 bg-primary hover:bg-primary-hover active:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Wifi size={14} />
              <span>Connect</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
