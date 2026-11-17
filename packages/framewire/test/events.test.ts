import { describe, expect, it, vi } from 'vitest';
import { FRAME, flush, inject, setup, wire } from './harness';

type App = {
  host: { events: { theme: 'light' | 'dark'; refresh: undefined }; methods: Record<string, never> };
  frame: { events: { booked: { slot: string } }; methods: Record<string, never> };
};

async function connected() {
  const t = setup();
  const host = t.host<App>();
  const frame = t.frame<App>();
  await Promise.all([host.ready, frame.ready]);
  return { t, host, frame };
}

describe('events', () => {
  it('delivers events in both directions', async () => {
    const { host, frame } = await connected();
    const onTheme = vi.fn();
    const onBooked = vi.fn();
    frame.on('theme', onTheme);
    host.on('booked', onBooked);
    host.emit('theme', 'dark');
    frame.emit('booked', { slot: 'a1' });
    await flush();
    expect(onTheme).toHaveBeenCalledWith('dark');
    expect(onBooked).toHaveBeenCalledWith({ slot: 'a1' });
  });

  it('allows emitting events without a payload', async () => {
    const { host, frame } = await connected();
    const onRefresh = vi.fn();
    frame.on('refresh', onRefresh);
    host.emit('refresh');
    await flush();
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('stops delivering after unsubscribe', async () => {
    const { host, frame } = await connected();
    const listener = vi.fn();
    const off = frame.on('theme', listener);
    off();
    host.emit('theme', 'light');
    await flush();
    expect(listener).not.toHaveBeenCalled();
  });

  it('queues events emitted before the handshake', async () => {
    const t = setup();
    const frame = t.frame<App>();
    frame.emit('booked', { slot: 'early' });
    const host = t.host<App>();
    const listener = vi.fn();
    host.on('booked', listener);
    await host.ready;
    await flush();
    expect(listener).toHaveBeenCalledWith({ slot: 'early' });
  });

  it('drops events that arrive before the handshake', async () => {
    const t = setup();
    const onDrop = vi.fn();
    const host = t.host<App>({ onDrop });
    const listener = vi.fn();
    host.on('booked', listener);
    inject(window, wire('event', { name: 'booked', data: { slot: 'x' } }), FRAME, t.frameWin);
    await flush();
    expect(listener).not.toHaveBeenCalled();
    expect(onDrop).toHaveBeenCalledWith(expect.anything(), 'not-ready');
  });

  it('drops events with another protocol version after the handshake', async () => {
    const t = setup();
    const onDrop = vi.fn();
    const host = t.host<App>({ onDrop });
    const frame = t.frame<App>();
    await Promise.all([host.ready, frame.ready]);
    const listener = vi.fn();
    host.on('booked', listener);
    inject(window, { framewire: 2, kind: 'event', name: 'booked' }, FRAME, t.frameWin);
    await flush();
    expect(listener).not.toHaveBeenCalled();
    expect(onDrop).toHaveBeenCalledWith(expect.anything(), 'version');
  });

  it('keeps calling other listeners when one throws, and rethrows asynchronously', async () => {
    const { host, frame } = await connected();
    vi.useFakeTimers();
    const good = vi.fn();
    frame.on('theme', () => {
      throw new Error('bad listener');
    });
    frame.on('theme', good);
    host.emit('theme', 'dark');
    await flush();
    expect(good).toHaveBeenCalledWith('dark');
    expect(() => vi.runOnlyPendingTimers()).toThrow('bad listener');
  });

  it('stops delivering after destroy', async () => {
    const { host, frame } = await connected();
    const listener = vi.fn();
    frame.on('theme', listener);
    frame.destroy();
    host.emit('theme', 'dark');
    await flush();
    expect(listener).not.toHaveBeenCalled();
  });
});
