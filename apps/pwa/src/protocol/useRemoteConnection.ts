import { useEffect, useState } from 'react';
import {
  ForegroundAppState,
  MediaSessionState,
  MessageEnvelope,
  PanelDefinition,
  AppInfo,
  DisplayInfo,
  WindowInfo,
} from '@remote/protocol';
import { ConnectionState, globalRemoteClient } from './client';

export function useRemoteConnection() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    globalRemoteClient.getState()
  );
  const [foregroundApp, setForegroundApp] = useState<ForegroundAppState | null>(null);
  const [mediaState, setMediaState] = useState<MediaSessionState | null>(null);
  const [panels, setPanels] = useState<PanelDefinition[]>([]);
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);

  useEffect(() => {
    const unsubState = globalRemoteClient.subscribeState((st) => {
      setConnectionState(st);
      if (st === 'connected') {
        // Request initial panels
        globalRemoteClient.send('panels.list', {});
        globalRemoteClient.send('clipboard.get', {});
        globalRemoteClient.send('apps.list', {});
        globalRemoteClient.send('windows.list', {});
        globalRemoteClient.send('displays.list', {});
      }
    });

    const unsubMsg = globalRemoteClient.subscribeMessages((env: MessageEnvelope) => {
      if (env.type === 'state.foreground_app') {
        setForegroundApp(env.data as ForegroundAppState);
      } else if (env.type === 'state.media_session') {
        setMediaState(env.data as MediaSessionState);
      } else if (env.type === 'panels.list') {
        setPanels(env.data as PanelDefinition[]);
      } else if (env.type === 'apps.items') {
        setApps(env.data as AppInfo[]);
      } else if (env.type === 'windows.items') {
        setWindows(env.data as WindowInfo[]);
      } else if (env.type === 'state.displays') {
        setDisplays(env.data as DisplayInfo[]);
      }
    });

    return () => {
      unsubState();
      unsubMsg();
    };
  }, []);

  return {
    connectionState,
    client: globalRemoteClient,
    foregroundApp,
    mediaState,
    panels,
    apps,
    windows,
    displays,
    connect: (host?: string, token?: string) => globalRemoteClient.connect(host, token),
    disconnect: () => globalRemoteClient.disconnect(),
  };
}
