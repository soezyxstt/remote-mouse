import { useEffect, useState } from 'react';
import {
  ForegroundAppState,
  MediaSessionState,
  MessageEnvelope,
  PanelDefinition,
} from '@remote/protocol';
import { ConnectionState, globalRemoteClient } from './client';

export function useRemoteConnection() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    globalRemoteClient.getState()
  );
  const [foregroundApp, setForegroundApp] = useState<ForegroundAppState | null>(null);
  const [mediaState, setMediaState] = useState<MediaSessionState | null>(null);
  const [panels, setPanels] = useState<PanelDefinition[]>([]);

  useEffect(() => {
    const unsubState = globalRemoteClient.subscribeState((st) => {
      setConnectionState(st);
      if (st === 'connected') {
        // Request initial panels
        globalRemoteClient.send('panels.list', {});
        globalRemoteClient.send('clipboard.get', {});
      }
    });

    const unsubMsg = globalRemoteClient.subscribeMessages((env: MessageEnvelope) => {
      if (env.type === 'state.foreground_app') {
        setForegroundApp(env.data as ForegroundAppState);
      } else if (env.type === 'state.media_session') {
        setMediaState(env.data as MediaSessionState);
      } else if (env.type === 'panels.list') {
        setPanels(env.data as PanelDefinition[]);
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
    connect: (host?: string, token?: string) => globalRemoteClient.connect(host, token),
    disconnect: () => globalRemoteClient.disconnect(),
  };
}
