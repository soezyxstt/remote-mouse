import React, { useState } from 'react';
import { QrCode, Wifi, RefreshCw, Copy, Check, Shield } from 'lucide-react';

export const DashboardView: React.FC = () => {
  const [pairingToken, setPairingToken] = useState<string>('849201');
  const [copied, setCopied] = useState<boolean>(false);
  const serverPort = 8080;
  const localIp = '192.168.1.100';
  const serverUrl = `http://${localIp}:${serverPort}`;

  const regenerateToken = () => {
    const next = Math.floor(100000 + Math.random() * 900000).toString();
    setPairingToken(next);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(`${serverUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Top Banner Status */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-surface to-surface-elevated rounded-3xl border border-white/5 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
            <Wifi size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100">Local Agent Ready</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Listening for local PWA connections on {serverUrl}
            </p>
          </div>
        </div>

        <button
          onClick={copyUrl}
          className="flex items-center gap-2 px-4 py-2.5 bg-surface-elevated hover:bg-surface-hover text-slate-200 rounded-xl text-xs font-semibold border border-white/10 transition-colors"
        >
          {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
          <span>Copy Server URL</span>
        </button>
      </div>

      {/* Pairing Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* QR Code Block */}
        <div className="flex flex-col items-center justify-center p-6 bg-surface rounded-3xl border border-white/5 gap-4 text-center">
          <div className="p-4 bg-white rounded-2xl shadow-lg flex items-center justify-center">
            <div className="w-44 h-44 bg-slate-900 rounded-xl flex flex-col items-center justify-center p-2 text-white relative">
              <QrCode size={140} className="text-white" />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-100">Scan with Phone Camera</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Open mobile browser and connect directly over local Wi-Fi
            </p>
          </div>
        </div>

        {/* 6-Digit PIN Pairing Box */}
        <div className="flex flex-col justify-between p-6 bg-surface rounded-3xl border border-white/5 gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Pairing Security PIN
              </span>
              <button
                onClick={regenerateToken}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <RefreshCw size={12} />
                <span>Generate New</span>
              </button>
            </div>

            <div className="p-4 bg-surface-elevated rounded-2xl border border-white/5 text-center">
              <span className="text-3xl font-mono font-bold tracking-widest text-primary">
                {pairingToken}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                Single-use ephemeral code · Expires in 1 hour
              </p>
            </div>
          </div>

          <div className="p-4 bg-surface-elevated/40 rounded-2xl border border-white/5 text-xs text-slate-400 flex flex-col gap-2">
            <div className="flex items-center gap-2 font-semibold text-slate-300">
              <Shield size={16} className="text-primary" />
              <span>Zero-Cloud Security Model</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              No cloud accounts or external relay servers. All mouse pointer deltas, keystrokes, and
              clipboard operations stay strictly inside your local home or hotspot network.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
