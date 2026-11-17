import { describe, expect, it, vi } from 'vitest';
import { FramewireError } from '../src/errors';
import { normalizeOrigin, toMatcher } from '../src/origin';
import { EVIL, FRAME, HOST, flush, inject, setup, wire } from './harness';

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return error instanceof FramewireError ? error.code : String(error);
  }
  return 'no error';
};

describe('origin config', () => {
  it('normalizes to scheme://host:port', () => {
    expect(normalizeOrigin('https://a.test/some/path?q=1')).toBe('https://a.test');
    expect(normalizeOrigin('http://localhost:4000/')).toBe('http://localhost:4000');
  });

  it.each(['*', 'null', 'not a url', 'data:text/html,hi', ''])('rejects %j', (value) => {
    expect(code(() => normalizeOrigin(value))).toBe('INVALID_ORIGIN');
  });

  it('rejects an empty allow-list', () => {
    expect(code(() => toMatcher([]))).toBe('INVALID_ORIGIN');
  });

  it('never lets a predicate accept the opaque "null" origin', () => {
    const { match } = toMatcher(() => true);
    expect(match('null')).toBe(false);
    expect(match(HOST)).toBe(true);
  });

  it('throws from createHost / createFrame on bad config', () => {
    const t = setup();
    expect(code(() => t.host({ origin: '*' }))).toBe('INVALID_ORIGIN');
    expect(code(() => t.frame({ allowedOrigins: [] }))).toBe('INVALID_ORIGIN');
    expect(code(() => t.frame({ allowedOrigins: ['null'] }))).toBe('INVALID_ORIGIN');
  });
});

describe('host drops untrusted messages', () => {
  it('drops a hello from the wrong origin', async () => {
    const t = setup();
    const onDrop = vi.fn();
    const host = t.host({ onDrop });
    t.toFrame.mockClear();
    inject(window, wire('hello'), EVIL, t.frameWin);
    await flush();
    expect(onDrop).toHaveBeenCalledWith(expect.anything(), 'origin');
    expect(t.toFrame).not.toHaveBeenCalled();
    expect(host.state).toBe('connecting');
  });

  it('drops a hello with the right origin but the wrong source window', async () => {
    const t = setup();
    const onDrop = vi.fn();
    const host = t.host({ onDrop });
    inject(window, wire('hello'), FRAME, null);
    await flush();
    expect(onDrop).toHaveBeenCalledWith(expect.anything(), 'source');
    expect(host.state).toBe('connecting');
  });

  it('ignores messages that are not framewire messages', async () => {
    const t = setup();
    const onDrop = vi.fn();
    t.host({ onDrop });
    inject(window, { type: 'hello' }, EVIL, null);
    inject(window, 'framewire', FRAME, t.frameWin);
    await flush();
    expect(onDrop).not.toHaveBeenCalled();
  });
});

describe('frame drops untrusted messages', () => {
  it('drops an ack from an origin not on the allow-list', async () => {
    const t = setup();
    const onDrop = vi.fn();
    const frame = t.frame({ onDrop });
    inject(t.frameWin, wire('ack'), EVIL, t.hostSide);
    await flush();
    expect(onDrop).toHaveBeenCalledWith(expect.anything(), 'origin');
    expect(frame.state).toBe('connecting');
  });

  it('drops an ack that does not come from window.parent', async () => {
    const t = setup();
    const onDrop = vi.fn();
    const frame = t.frame({ onDrop });
    inject(t.frameWin, wire('ack'), HOST, null);
    await flush();
    expect(onDrop).toHaveBeenCalledWith(expect.anything(), 'source');
    expect(frame.state).toBe('connecting');
  });

  it('accepts origins through a predicate', async () => {
    const t = setup();
    const host = t.host();
    const frame = t.frame({ allowedOrigins: (o) => o.endsWith('host.test') });
    await Promise.all([host.ready, frame.ready]);
    expect(frame.state).toBe('ready');
  });

  it('rejects origins the predicate refuses', async () => {
    const t = setup();
    const onDrop = vi.fn();
    t.host();
    const frame = t.frame({ allowedOrigins: () => false, onDrop });
    await flush(10);
    expect(onDrop).toHaveBeenCalledWith(expect.anything(), 'origin');
    expect(frame.state).toBe('connecting');
  });
});

describe('targetOrigin', () => {
  it('uses "*" only for the frame hello, then locks to the peer origin', async () => {
    const t = setup();
    const host = t.host();
    const frame = t.frame({ allowedOrigins: [HOST, 'https://other.test'] });
    await Promise.all([host.ready, frame.ready]);
    frame.emit('ping', 1);
    host.emit('pong', 2);
    await flush();

    const frameSends = t.toHost.mock.calls.map(([data, target]) => [
      (data as { kind: string }).kind,
      target,
    ]);
    expect(frameSends[0]).toEqual(['hello', '*']);
    expect(frameSends.slice(1).every(([, target]) => target === HOST)).toBe(true);
    expect(frameSends).toContainEqual(['event', HOST]);
    expect(t.toFrame.mock.calls.every(([, target]) => (target as unknown) === FRAME)).toBe(true);
  });

  it('uses the exact origin for the frame hello when only one is allowed', () => {
    const t = setup();
    t.frame();
    expect(t.toHost).toHaveBeenCalledWith(wire('hello'), HOST);
  });

  it('after the handshake, drops messages from another allowed origin', async () => {
    const t = setup();
    const onDrop = vi.fn();
    const host = t.host();
    const frame = t.frame({ allowedOrigins: [HOST, 'https://other.test'], onDrop });
    await Promise.all([host.ready, frame.ready]);
    const listener = vi.fn();
    frame.on('x', listener);
    inject(t.frameWin, wire('event', { name: 'x' }), 'https://other.test', t.hostSide);
    await flush();
    expect(listener).not.toHaveBeenCalled();
    expect(onDrop).toHaveBeenCalledWith(expect.anything(), 'origin');
  });
});
