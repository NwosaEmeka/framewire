import { describe, expect, it, vi } from 'vitest';
import { createFrameIn } from '../src/frame';
import { FRAME, HOST, flush, inject, setup, wire } from './harness';

describe('handshake', () => {
  it('connects when the host starts first', async () => {
    const t = setup();
    const host = t.host();
    const frame = t.frame();
    await Promise.all([host.ready, frame.ready]);
    expect([host.state, frame.state]).toEqual(['ready', 'ready']);
  });

  it('connects when the frame starts first (its hello is lost)', async () => {
    const t = setup();
    const frame = t.frame();
    await flush(); // frame hello arrives before any host listens
    const host = t.host();
    await Promise.all([host.ready, frame.ready]);
    expect([host.state, frame.state]).toEqual(['ready', 'ready']);
  });

  it('re-greets the frame when the iframe fires load', () => {
    const t = setup();
    t.host();
    t.toFrame.mockClear();
    t.iframe.dispatchEvent(new Event('load'));
    expect(t.toFrame).toHaveBeenCalledWith(wire('hello'), FRAME);
  });

  it('host rejects a hello with another protocol version', async () => {
    const t = setup();
    const host = t.host();
    t.toFrame.mockClear();
    inject(window, { framewire: 2, kind: 'hello' }, FRAME, t.frameWin);
    await expect(host.ready).rejects.toMatchObject({ code: 'VERSION_MISMATCH' });
    expect(host.state).toBe('failed');
    expect(t.toFrame).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'reject',
        error: expect.objectContaining({ code: 'VERSION_MISMATCH' }),
      }),
      FRAME,
    );
  });

  it('frame fails on reject, whatever version the host speaks', async () => {
    const t = setup();
    const frame = t.frame();
    inject(
      t.frameWin,
      { framewire: 2, kind: 'reject', error: { code: 'VERSION_MISMATCH', message: 'v2 vs v1' } },
      HOST,
      t.hostSide,
    );
    await expect(frame.ready).rejects.toMatchObject({
      code: 'VERSION_MISMATCH',
      message: 'v2 vs v1',
    });
    expect(frame.state).toBe('failed');
  });

  it('frame ignores an ack with another protocol version', async () => {
    const t = setup();
    const onDrop = vi.fn();
    const frame = t.frame({ onDrop });
    inject(t.frameWin, { framewire: 2, kind: 'ack' }, HOST, t.hostSide);
    await flush();
    expect(onDrop).toHaveBeenCalledWith(expect.anything(), 'version');
    expect(frame.state).toBe('connecting');
  });

  it('times out when nobody answers', async () => {
    vi.useFakeTimers();
    const t = setup();
    const frame = t.frame({ handshakeTimeout: 300 });
    vi.advanceTimersByTime(299);
    expect(frame.state).toBe('connecting');
    vi.advanceTimersByTime(1);
    await expect(frame.ready).rejects.toMatchObject({ code: 'HANDSHAKE_TIMEOUT' });
    expect(frame.state).toBe('failed');
  });

  it('defaults the handshake timeout to 10s', async () => {
    vi.useFakeTimers();
    const t = setup();
    const host = t.host();
    vi.advanceTimersByTime(9999);
    expect(host.state).toBe('connecting');
    vi.advanceTimersByTime(1);
    await expect(host.ready).rejects.toMatchObject({ code: 'HANDSHAKE_TIMEOUT' });
  });

  it('a host that timed out does not ack a late frame', async () => {
    const t = setup();
    const host = t.host({ handshakeTimeout: 20 });
    await expect(host.ready).rejects.toMatchObject({ code: 'HANDSHAKE_TIMEOUT' });
    t.toFrame.mockClear();
    const frame = t.frame({ handshakeTimeout: 50 });
    await expect(frame.ready).rejects.toMatchObject({ code: 'HANDSHAKE_TIMEOUT' });
    expect(t.toFrame.mock.calls.map(([data]) => (data as { kind: string }).kind)).not.toContain(
      'ack',
    );
  });

  it('a host that rejected a version does not ack a later hello', async () => {
    const t = setup();
    const host = t.host();
    inject(window, { framewire: 2, kind: 'hello' }, FRAME, t.frameWin);
    await expect(host.ready).rejects.toMatchObject({ code: 'VERSION_MISMATCH' });
    t.toFrame.mockClear();
    inject(window, wire('hello'), FRAME, t.frameWin);
    await flush();
    expect(t.toFrame).not.toHaveBeenCalled();
    expect(host.state).toBe('failed');
  });

  it('does nothing when the page is not embedded', () => {
    expect(window.parent).toBe(window);
    const post = vi.spyOn(window, 'postMessage');
    const frame = createFrameIn(window, { allowedOrigins: [HOST] });
    expect(post).not.toHaveBeenCalled();
    expect(frame.state).toBe('connecting');
    frame.destroy();
  });

  it('destroy before ready rejects ready with DESTROYED', async () => {
    const t = setup();
    const frame = t.frame();
    frame.destroy();
    frame.destroy(); // idempotent
    await expect(frame.ready).rejects.toMatchObject({ code: 'DESTROYED' });
    expect(frame.state).toBe('destroyed');
  });
});
