import { describe, expectTypeOf, it } from 'vitest';
import { createFrame, createHost, type FrameBridge, type HostBridge } from '../src';

type App = {
  host: {
    events: { theme: 'light' | 'dark'; refresh: undefined };
    methods: { getUser: () => { id: string }; double: (n: number) => Promise<number> };
  };
  frame: {
    events: { booked: { slot: string } };
    methods: { ping: () => 'pong' };
  };
};

declare const iframe: HTMLIFrameElement;

describe('contract typing', () => {
  it('creates correctly typed bridges', () => {
    expectTypeOf(createHost<App>({ iframe, origin: 'https://f.test' })).toEqualTypeOf<
      HostBridge<App>
    >();
    expectTypeOf(createFrame<App>({ allowedOrigins: ['https://h.test'] })).toEqualTypeOf<
      FrameBridge<App>
    >();
  });

  it('types events', () => {
    const host = {} as HostBridge<App>;
    const frame = {} as FrameBridge<App>;

    host.emit('theme', 'dark');
    host.emit('refresh');
    frame.emit('booked', { slot: 'a' });
    // @ts-expect-error unknown event name
    host.emit('nope', 1);
    // @ts-expect-error wrong payload
    host.emit('theme', 'blue');
    // @ts-expect-error missing required payload
    frame.emit('booked');
    // @ts-expect-error host cannot emit a frame event
    host.emit('booked', { slot: 'a' });

    frame.on('theme', (mode) => expectTypeOf(mode).toEqualTypeOf<'light' | 'dark'>());
    host.on('booked', (data) => expectTypeOf(data).toEqualTypeOf<{ slot: string }>());
    // @ts-expect-error frame does not receive its own events
    frame.on('booked', () => {});
  });

  it('types requests and handlers', () => {
    const host = {} as HostBridge<App>;
    const frame = {} as FrameBridge<App>;

    expectTypeOf(frame.request('getUser')).toEqualTypeOf<Promise<{ id: string }>>();
    expectTypeOf(frame.request('double', 2)).toEqualTypeOf<Promise<number>>();
    expectTypeOf(frame.request('double', 2, { timeout: 100 })).toEqualTypeOf<Promise<number>>();
    expectTypeOf(host.request('ping')).toEqualTypeOf<Promise<'pong'>>();

    // @ts-expect-error unknown method
    void frame.request('nope');
    // @ts-expect-error wrong argument type
    void frame.request('double', 'two');
    // @ts-expect-error missing required argument
    void frame.request('double');
    // @ts-expect-error frame cannot request its own method
    void frame.request('ping');

    host.handle('double', async (n) => {
      expectTypeOf(n).toEqualTypeOf<number>();
      return n * 2;
    });
    host.handle('double', (n) => n * 2);
    // @ts-expect-error wrong result type
    host.handle('double', () => 'x');
    // @ts-expect-error frame cannot handle host methods
    frame.handle('getUser', () => ({ id: '1' }));
  });
});
