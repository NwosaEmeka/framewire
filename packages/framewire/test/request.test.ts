import { describe, expect, it } from 'vitest';
import { flush, setup } from './harness';

type App = {
  host: {
    events: Record<string, never>;
    methods: {
      getUser: () => { id: string };
      double: (n: number) => number;
      slow: () => void;
      boom: () => void;
      asyncBoom: () => Promise<void>;
    };
  };
  frame: { events: Record<string, never>; methods: { ping: () => 'pong' } };
};

async function connected() {
  const t = setup();
  const host = t.host<App>();
  const frame = t.frame<App>();
  await Promise.all([host.ready, frame.ready]);
  return { t, host, frame };
}

const kinds = (calls: unknown[][]) => calls.map(([data]) => (data as { kind: string }).kind);

describe('request / response', () => {
  it('resolves with the handler result, in both directions', async () => {
    const { host, frame } = await connected();
    host.handle('getUser', () => ({ id: 'u1' }));
    host.handle('double', (n) => n * 2);
    frame.handle('ping', () => 'pong');
    await expect(frame.request('getUser')).resolves.toEqual({ id: 'u1' });
    await expect(frame.request('double', 21)).resolves.toBe(42);
    await expect(host.request('ping')).resolves.toBe('pong');
  });

  it('supports async handlers', async () => {
    const { host, frame } = await connected();
    host.handle('double', async (n) => {
      await flush();
      return n * 2;
    });
    await expect(frame.request('double', 4)).resolves.toBe(8);
  });

  it('rejects with NO_HANDLER when the peer has no handler', async () => {
    const { frame } = await connected();
    await expect(frame.request('getUser')).rejects.toMatchObject({ code: 'NO_HANDLER' });
  });

  it('rejects with NO_HANDLER after a handler is unregistered', async () => {
    const { host, frame } = await connected();
    const off = host.handle('getUser', () => ({ id: 'u1' }));
    off();
    await expect(frame.request('getUser')).rejects.toMatchObject({ code: 'NO_HANDLER' });
  });

  it('rejects with REMOTE_ERROR when the handler throws', async () => {
    const { host, frame } = await connected();
    host.handle('boom', () => {
      throw new Error('kaboom');
    });
    await expect(frame.request('boom')).rejects.toMatchObject({
      name: 'FramewireError',
      code: 'REMOTE_ERROR',
      message: 'kaboom',
    });
  });

  it('rejects with REMOTE_ERROR when an async handler rejects', async () => {
    const { host, frame } = await connected();
    host.handle('asyncBoom', async () => {
      throw new Error('later');
    });
    await expect(frame.request('asyncBoom')).rejects.toMatchObject({
      code: 'REMOTE_ERROR',
      message: 'later',
    });
  });

  it('rejects with TIMEOUT using the default timeout', async () => {
    const t = setup();
    const host = t.host<App>();
    const frame = t.frame<App>({ timeout: 30 });
    await Promise.all([host.ready, frame.ready]);
    host.handle('slow', () => new Promise<void>(() => {}));
    await expect(frame.request('slow')).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('lets a per-call timeout override the default', async () => {
    const { host, frame } = await connected(); // default 5000
    host.handle('slow', () => new Promise<void>(() => {}));
    const started = Date.now();
    await expect(frame.request('slow', undefined, { timeout: 20 })).rejects.toMatchObject({
      code: 'TIMEOUT',
    });
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('queues requests made before the handshake and sends them once ready', async () => {
    const t = setup();
    const frame = t.frame<App>();
    const result = frame.request('double', 5);
    const host = t.host<App>();
    host.handle('double', (n) => n * 2);
    await expect(result).resolves.toBe(10);
  });

  it('counts handshake time against the timeout and never sends an expired request', async () => {
    const t = setup();
    const frame = t.frame<App>();
    await expect(frame.request('double', 1, { timeout: 20 })).rejects.toMatchObject({
      code: 'TIMEOUT',
    });
    const host = t.host<App>();
    await Promise.all([host.ready, frame.ready]);
    await flush();
    expect(kinds(t.toHost.mock.calls)).not.toContain('request');
  });

  it('rejects pending requests with DESTROYED', async () => {
    const { host, frame } = await connected();
    host.handle('slow', () => new Promise<void>(() => {}));
    const pending = frame.request('slow');
    await flush();
    frame.destroy();
    await expect(pending).rejects.toMatchObject({ code: 'DESTROYED' });
    await expect(frame.request('slow')).rejects.toMatchObject({ code: 'DESTROYED' });
  });

  it('rejects queued requests when the handshake fails', async () => {
    const t = setup();
    const frame = t.frame<App>({ handshakeTimeout: 20 });
    await expect(frame.request('getUser')).rejects.toMatchObject({ code: 'HANDSHAKE_TIMEOUT' });
    await expect(frame.request('getUser')).rejects.toMatchObject({ code: 'HANDSHAKE_TIMEOUT' });
  });

  it('reports a result that cannot be cloned as REMOTE_ERROR', async () => {
    const { t, host, frame } = await connected();
    // jsdom's mocked postMessage doesn't clone, so simulate the browser's DataCloneError.
    const real = t.toHost.getMockImplementation() as unknown as (
      data: unknown,
      target: string,
    ) => void;
    t.toHost.mockImplementation(((data: { data?: unknown }, target: string) => {
      if (typeof data.data === 'function')
        throw new DOMException('could not clone', 'DataCloneError');
      real(data, target);
    }) as Window['postMessage']);
    frame.handle('ping', () => (() => 'pong') as unknown as 'pong');
    await expect(host.request('ping')).rejects.toMatchObject({ code: 'REMOTE_ERROR' });
  });
});
