import { describe, expect, it, vi } from 'vitest';
import type { HostOptions } from '../src/host';
import { FRAME, flush, setup } from './harness';

const KEY = `framewire:resume:${FRAME}`;

async function connected(navigation?: HostOptions['navigation']) {
  const t = setup();
  const assign = vi.fn();
  const host = t.host({ navigation }, { assign });
  const frame = t.frame();
  await Promise.all([host.ready, frame.ready]);
  return { t, host, frame, assign };
}

/** Let the deferred location.assign run. */
const tick = () => new Promise((resolve) => setTimeout(resolve));

describe('navigateTop', () => {
  it('is denied by default', async () => {
    const { frame, assign } = await connected();
    await expect(frame.navigateTop('https://pay.test/checkout')).rejects.toMatchObject({
      code: 'NAVIGATION_DENIED',
    });
    await expect(frame.returnUrl()).rejects.toMatchObject({ code: 'NAVIGATION_DENIED' });
    await tick();
    expect(assign).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('navigates the top window and saves resume state when allowed', async () => {
    const { frame, assign } = await connected(true);
    await expect(
      frame.navigateTop(new URL('https://pay.test/checkout'), { state: { order: 42 } }),
    ).resolves.toBeUndefined();
    await tick();
    expect(assign).toHaveBeenCalledWith('https://pay.test/checkout');
    expect(JSON.parse(sessionStorage.getItem(KEY)!)).toMatchObject({ state: { order: 42 } });
  });

  it.each(['javascript:alert(1)', 'data:text/html,hi', 'file:///etc/passwd', 'ftp://files.test/'])(
    'always denies %s, even with navigation: true',
    async (url) => {
      const { frame, assign } = await connected(() => true);
      await expect(frame.navigateTop(url)).rejects.toMatchObject({ code: 'NAVIGATION_DENIED' });
      await tick();
      expect(assign).not.toHaveBeenCalled();
    },
  );

  it('respects a policy function', async () => {
    const { frame, assign } = await connected((url) => url.hostname === 'pay.test');
    await expect(frame.navigateTop('https://evil.test/')).rejects.toMatchObject({
      code: 'NAVIGATION_DENIED',
    });
    await frame.navigateTop('https://pay.test/ok');
    await tick();
    expect(assign.mock.calls).toEqual([['https://pay.test/ok']]);
  });

  it('gives the frame the host URL as a return URL when allowed', async () => {
    const { frame } = await connected(true);
    await expect(frame.returnUrl()).resolves.toBe(window.location.href);
  });

  it('still navigates when storage throws or the state cannot be serialized', async () => {
    const { frame, assign } = await connected(true);
    await frame.navigateTop('https://pay.test/a', { state: { big: 1n } });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    await frame.navigateTop('https://pay.test/b');
    await tick();
    expect(assign.mock.calls).toEqual([['https://pay.test/a'], ['https://pay.test/b']]);
  });
});

describe('resume', () => {
  const save = (state: unknown, age = 0) =>
    sessionStorage.setItem(KEY, JSON.stringify({ state, t: Date.now() - age }));

  it('hands the saved state to the frame after the handshake, once', async () => {
    save({ order: 42 });
    const t = setup();
    const host = t.host({ navigation: true });
    const frame = t.frame();
    const onResume = vi.fn();
    frame.onResume(onResume);
    await Promise.all([host.ready, frame.ready]);
    await flush();
    expect(onResume).toHaveBeenCalledWith({ order: 42 });
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('delivers to a listener registered after the state arrived', async () => {
    save('late');
    const t = setup();
    const host = t.host();
    const frame = t.frame();
    await Promise.all([host.ready, frame.ready]);
    await flush();
    const onResume = vi.fn();
    frame.onResume(onResume);
    expect(onResume).toHaveBeenCalledWith('late');
    const again = vi.fn();
    frame.onResume(again);
    expect(again).not.toHaveBeenCalled();
  });

  it('drops state older than 30 minutes', async () => {
    save('stale', 31 * 60 * 1000);
    const t = setup();
    const host = t.host();
    const frame = t.frame();
    const onResume = vi.fn();
    frame.onResume(onResume);
    await Promise.all([host.ready, frame.ready]);
    await flush();
    expect(onResume).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('survives unreadable storage and corrupt entries', async () => {
    sessionStorage.setItem(KEY, '{not json');
    const t = setup();
    expect(() => t.host()).not.toThrow();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    const t2 = setup();
    expect(() => t2.host()).not.toThrow();
  });
});
