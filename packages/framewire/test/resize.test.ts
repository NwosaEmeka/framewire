import { describe, expect, it, vi } from 'vitest';
import { FRAME, flush, inject, setup, wire } from './harness';

class FakeResizeObserver {
  static last: FakeResizeObserver | undefined;
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(public callback: () => void) {
    FakeResizeObserver.last = this;
  }
  fire() {
    this.callback();
  }
}

const resizeSends = (calls: unknown[][]) =>
  calls
    .map(([data]) => data as { kind: string; name?: string; data?: { height: number } })
    .filter((m) => m.kind === 'event' && m.name === 'fw:resize')
    .map((m) => m.data!.height);

function resizable(hostResize: Parameters<ReturnType<typeof setup>['host']>[0] = {}) {
  const t = setup();
  Object.assign(t.frameWin, { ResizeObserver: FakeResizeObserver });
  let height = 120;
  const host = t.host({ resize: true, ...hostResize });
  const frame = t.frame({ resize: { measure: () => height } });
  return {
    t,
    host,
    frame,
    setHeight: (h: number) => (height = h),
    observer: () => FakeResizeObserver.last!,
  };
}

describe('auto-resize', () => {
  it('reports the height once ready and the host applies it', async () => {
    const { t, host, frame } = resizable();
    await Promise.all([host.ready, frame.ready]);
    await flush();
    expect(t.iframe.style.height).toBe('120px');
  });

  it('debounces bursts of changes into one send', async () => {
    const { t, host, frame, setHeight, observer } = resizable();
    await Promise.all([host.ready, frame.ready]);
    await flush();
    vi.useFakeTimers();
    t.toHost.mockClear();
    setHeight(300);
    observer().fire();
    observer().fire();
    vi.advanceTimersByTime(30);
    observer().fire();
    vi.advanceTimersByTime(49);
    expect(resizeSends(t.toHost.mock.calls)).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(resizeSends(t.toHost.mock.calls)).toEqual([300]);
    await flush();
    expect(t.iframe.style.height).toBe('300px');
  });

  it('does not send when the height has not changed', async () => {
    const { t, host, frame, observer } = resizable();
    await Promise.all([host.ready, frame.ready]);
    await flush();
    vi.useFakeTimers();
    t.toHost.mockClear();
    observer().fire();
    vi.advanceTimersByTime(100);
    expect(resizeSends(t.toHost.mock.calls)).toEqual([]);
  });

  it('clamps to minHeight / maxHeight and reports the applied value', async () => {
    const onResize = vi.fn();
    const { t, host, frame, setHeight, observer } = resizable({
      resize: { minHeight: 150, maxHeight: 400, onResize },
    });
    await Promise.all([host.ready, frame.ready]);
    await flush();
    expect(t.iframe.style.height).toBe('150px');
    vi.useFakeTimers();
    setHeight(5000);
    observer().fire();
    vi.advanceTimersByTime(50);
    await flush();
    expect(t.iframe.style.height).toBe('400px');
    expect(onResize.mock.calls).toEqual([[150], [400]]);
  });

  it('measures <html> by default, rounding up', async () => {
    const t = setup();
    Object.assign(t.frameWin, { ResizeObserver: FakeResizeObserver });
    vi.spyOn(t.frameWin.document.documentElement, 'getBoundingClientRect').mockReturnValue({
      height: 87.2,
    } as DOMRect);
    const host = t.host({ resize: true });
    const frame = t.frame({ resize: true });
    await Promise.all([host.ready, frame.ready]);
    await flush();
    expect(FakeResizeObserver.last!.observe).toHaveBeenCalledWith(
      t.frameWin.document.documentElement,
    );
    expect(t.iframe.style.height).toBe('88px');
  });

  it('ignores malformed heights', async () => {
    const t = setup();
    const host = t.host({ resize: true });
    const frame = t.frame();
    await Promise.all([host.ready, frame.ready]);
    for (const data of [{ height: -1 }, { height: 'tall' }, null, { height: Infinity }]) {
      inject(window, wire('event', { name: 'fw:resize', data }), FRAME, t.frameWin);
    }
    await flush();
    expect(t.iframe.style.height).toBe('');
  });

  it('leaves the iframe alone when the host did not opt in', async () => {
    const { t, host, frame } = resizable({ resize: false });
    await Promise.all([host.ready, frame.ready]);
    await flush();
    expect(t.iframe.style.height).toBe('');
  });

  it('disconnects the observer on destroy', async () => {
    const { frame, observer } = resizable();
    frame.destroy();
    expect(observer().disconnect).toHaveBeenCalled();
  });
});
