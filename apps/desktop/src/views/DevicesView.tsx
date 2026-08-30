import React, { useState } from 'react';
import { Smartphone, Check, Ban, Trash2, Clock } from 'lucide-react';
import { Capability } from '@remote/protocol';

interface DeviceItem {
  id: string;
  name: string;
  capabilities: Capability[];
  lastSeen: string;
  isBlocked: boolean;
}

export const DevicesView: React.FC = () => {
  const [devices, setDevices] = useState<DeviceItem[]>([
    {
      id: 'phone_adi_1',
      name: "Adi's iPhone 15",
      capabilities: [
        'input.mouse',
        'input.keyboard',
        'media.control',
        'presentation.control',
        'clipboard.read',
        'clipboard.write',
        'apps.launch',
        'windows.control',
        'automation.execute',
        'power.lock',
      ],
      lastSeen: 'Just now',
      isBlocked: false,
    },
  ]);

  const toggleCapability = (deviceId: string, cap: Capability) => {
    setDevices((prev) =>
      prev.map((d) => {
        if (d.id !== deviceId) return d;
        const exists = d.capabilities.includes(cap);
        const nextCaps = exists
          ? d.capabilities.filter((c) => c !== cap)
          : [...d.capabilities, cap];
        return { ...d, capabilities: nextCaps };
      })
    );
  };

  const toggleBlock = (deviceId: string) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === deviceId ? { ...d, isBlocked: !d.isBlocked } : d))
    );
  };

  const revokeDevice = (deviceId: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== deviceId));
  };

  const capabilityList: Array<{ id: Capability; label: string }> = [
    { id: 'input.mouse', label: 'Mouse Control' },
    { id: 'input.keyboard', label: 'Keyboard & Text' },
    { id: 'media.control', label: 'Media Playback' },
    { id: 'presentation.control', label: 'Presentations' },
    { id: 'clipboard.read', label: 'Read Clipboard' },
    { id: 'clipboard.write', label: 'Write Clipboard' },
    { id: 'files.read', label: 'Browse Files' },
    { id: 'files.write', label: 'Modify Files' },
    { id: 'apps.launch', label: 'App Launcher' },
    { id: 'windows.control', label: 'Window Manager' },
    { id: 'automation.execute', label: 'Macro Automation' },
    { id: 'power.shutdown', label: 'Power & Shutdown' },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-4xl select-none">
      <div>
        <h2 className="text-lg font-bold text-slate-100">Trusted Devices</h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage authorized mobile devices and their granular system permissions.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {devices.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 bg-surface rounded-3xl border border-white/5">
            No trusted devices registered. Connect a new device using the Dashboard QR.
          </div>
        ) : (
          devices.map((dev) => (
            <div
              key={dev.id}
              className="p-6 bg-surface rounded-3xl border border-white/5 flex flex-col gap-4 shadow-xl"
            >
              {/* Device Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/20 text-primary rounded-2xl">
                    <Smartphone size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{dev.name}</h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="font-mono">{dev.id}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {dev.lastSeen}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleBlock(dev.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                      dev.isBlocked
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-surface-elevated text-slate-300 border-white/5 hover:bg-surface-hover'
                    }`}
                  >
                    <Ban size={14} />
                    <span>{dev.isBlocked ? 'Unblock' : 'Block'}</span>
                  </button>

                  <button
                    onClick={() => revokeDevice(dev.id)}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 size={14} />
                    <span>Revoke</span>
                  </button>
                </div>
              </div>

              {/* Capability Checklist */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Granted Permissions & Capabilities
                </span>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {capabilityList.map((cap) => {
                    const isGranted = dev.capabilities.includes(cap.id);
                    return (
                      <button
                        key={cap.id}
                        onClick={() => toggleCapability(dev.id, cap.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all ${
                          isGranted
                            ? 'bg-primary/10 border-primary/40 text-slate-200'
                            : 'bg-surface-elevated/40 border-white/5 text-slate-500'
                        }`}
                      >
                        <span>{cap.label}</span>
                        <span
                          className={`w-4 h-4 rounded-md flex items-center justify-center ${
                            isGranted ? 'bg-primary text-white' : 'bg-surface-elevated'
                          }`}
                        >
                          {isGranted && <Check size={11} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
