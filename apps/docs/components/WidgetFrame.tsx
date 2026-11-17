'use client';

import { createHost, type HostBridge } from 'framewire';
import { useEffect, useRef } from 'react';
import type { DemoContract } from '@/lib/contract';

export interface WidgetFrameProps {
  theme: 'light' | 'dark';
  user: string;
  onBooked(slot: string): void;
  log(line: string): void;
}

/** The widget inside an iframe, wired to the page with a framewire host bridge. */
export function WidgetFrame({ theme, user, onBooked, log }: WidgetFrameProps) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const bridge = useRef<HostBridge<DemoContract>>(null);
  const latest = useRef({ user, onBooked, log });
  latest.current = { user, onBooked, log };

  useEffect(() => {
    const host = createHost<DemoContract>({
      iframe: iframe.current!,
      origin: window.location.origin,
      resize: { maxHeight: 900, onResize: (h) => latest.current.log(`← fw:resize ${h}px`) },
    });
    bridge.current = host;
    host.ready.then(
      () => latest.current.log('✓ handshake complete (protocol v1)'),
      (error: Error) => latest.current.log(`✗ ${error.message}`),
    );
    host.handle('getUser', () => {
      latest.current.log('← request getUser → reply');
      return { name: latest.current.user };
    });
    host.on('booked', ({ slot }) => {
      latest.current.log(`← event booked ${slot}`);
      latest.current.onBooked(slot);
    });
    return () => {
      host.destroy();
      bridge.current = null;
    };
  }, []);

  useEffect(() => {
    bridge.current?.emit('theme', theme);
    log(`→ event theme ${theme}`);
  }, [theme, log]);

  return (
    <iframe
      ref={iframe}
      src="/demo/widget"
      title="Booking widget (isolated)"
      style={{ width: '100%', maxWidth: 360, border: 0, display: 'block', height: 160 }}
    />
  );
}
