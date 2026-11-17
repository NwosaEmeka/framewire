import { afterEach, vi } from 'vitest';
import { createFrameIn, type FrameOptions } from '../src/frame';
import { createHostIn, type HostOptions } from '../src/host';
import { PROTOCOL_VERSION, type Message } from '../src/protocol';
import type { AnyContract, Contract } from '../src/types';

export const HOST = 'https://host.test';
export const FRAME = 'https://frame.test';
export const EVIL = 'https://evil.test';

type Win = Window & typeof globalThis;

/** Let queued microtasks (message delivery, handler promises) run. */
export const flush = async (times = 5) => {
  for (let i = 0; i < times; i++) await Promise.resolve();
};

/** Dispatch a message event on `target` as if it came from `source` at `origin`. */
export function inject(target: Window, data: unknown, origin: string, source: Window | null) {
  const MessageEventCtor = (target as Win).MessageEvent ?? MessageEvent;
  target.dispatchEvent(new MessageEventCtor('message', { data, origin, source }));
}

export const wire = (kind: Message['kind'], extra: Partial<Message> = {}): Message => ({
  framewire: PROTOCOL_VERSION,
  kind,
  ...extra,
});

/**
 * A host window (the test's global window) with an iframe, and the iframe's
 * window acting as the frame. jsdom's postMessage doesn't set origin/source, so
 * both directions are intercepted and re-dispatched with simulated origins,
 * honouring targetOrigin like a browser does.
 */
export function setup({ hostOrigin = HOST, frameOrigin = FRAME } = {}) {
  const iframe = document.createElement('iframe');
  document.body.append(iframe);
  const frameWin = iframe.contentWindow!;
  const hostSide = frameWin.parent; // jsdom's view of the parent window

  const toFrame = vi.spyOn(frameWin, 'postMessage').mockImplementation(((
    data: unknown,
    targetOrigin: string,
  ) => {
    if (targetOrigin !== '*' && targetOrigin !== frameOrigin) return;
    void Promise.resolve().then(() => inject(frameWin, data, hostOrigin, hostSide));
  }) as Window['postMessage']);

  const toHost = vi.spyOn(hostSide, 'postMessage').mockImplementation(((
    data: unknown,
    targetOrigin: string,
  ) => {
    if (targetOrigin !== '*' && targetOrigin !== hostOrigin) return;
    void Promise.resolve().then(() => inject(window, data, frameOrigin, frameWin));
  }) as Window['postMessage']);

  const bridges: { destroy(): void }[] = [];
  cleanups.push(() => {
    bridges.forEach((b) => b.destroy());
    iframe.remove();
  });

  return {
    iframe,
    frameWin,
    hostSide,
    toFrame,
    toHost,
    host<C extends Contract = AnyContract>(opts: Partial<HostOptions> = {}) {
      const b = createHostIn<C>(window, { iframe, origin: FRAME, ...opts });
      bridges.push(b);
      return b;
    },
    frame<C extends Contract = AnyContract>(opts: Partial<FrameOptions> = {}) {
      const b = createFrameIn<C>(frameWin, { allowedOrigins: [HOST], ...opts });
      bridges.push(b);
      return b;
    },
  };
}

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
  vi.restoreAllMocks();
  vi.useRealTimers();
});
