'use client';

import { createFrame } from 'framewire';
import { useEffect, useState } from 'react';
import { BookingCard } from '@/components/BookingCard';
import type { DemoContract } from '@/lib/contract';

/** The embedded page. In real life this lives on the widget vendor's domain. */
export default function WidgetPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [user, setUser] = useState<string>();
  const [bridge, setBridge] = useState<ReturnType<typeof createFrame<DemoContract>>>();

  useEffect(() => {
    const frame = createFrame<DemoContract>({
      allowedOrigins: [window.location.origin],
      resize: true,
    });
    frame.on('theme', setTheme);
    frame.ready
      .then(() => frame.request('getUser'))
      .then(
        (u) => setUser(u.name),
        () => {},
      );
    setBridge(frame);
    return () => frame.destroy();
  }, []);

  return (
    <BookingCard user={user} theme={theme} onBook={(slot) => bridge?.emit('booked', { slot })} />
  );
}
