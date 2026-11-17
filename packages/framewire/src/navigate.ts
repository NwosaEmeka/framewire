import { noop, type Core } from './bridge';
import { FramewireError } from './errors';

/** `true` allows any http(s) URL; a predicate decides per URL. */
export type NavigationPolicy = boolean | ((url: URL) => boolean);

export interface NavigateOptions {
  /** Handed back to the frame via `onResume` when the user returns. Must be JSON-serializable. */
  state?: unknown;
}

const NAVIGATE = 'fw:navigate';
const RETURN_URL = 'fw:return-url';
const RESUME = 'fw:resume';
const KEY = 'framewire:resume:';
const TTL = 30 * 60 * 1000;

/**
 * Host side: answer navigation requests and replay saved resume state.
 * `assign` performs the actual top-level navigation (injectable for tests).
 */
export function hostNavigation(
  win: Window,
  core: Core,
  frameOrigin: string,
  policy: NavigationPolicy | undefined,
  assign: (href: string) => void,
) {
  const key = KEY + frameOrigin;

  const permitted = (raw: unknown): URL | undefined => {
    if (!policy) return;
    let url: URL;
    try {
      url = new URL(String(raw), win.location.href);
    } catch {
      return;
    }
    // Never let a frame run script in, or render data into, the host's top window.
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
    return policy === true || policy(url) ? url : undefined;
  };

  core.handle(NAVIGATE, (arg) => {
    const { url, state } = (arg ?? {}) as { url?: unknown; state?: unknown };
    const target = permitted(url);
    if (!target) return false;
    try {
      win.sessionStorage.setItem(key, JSON.stringify({ state, t: Date.now() }));
    } catch {
      // Storage blocked or state not serializable: navigate anyway, just without resume.
    }
    // Defer so the response reaches the frame before the page starts unloading.
    setTimeout(() => assign(target.href));
    return true;
  });

  core.handle(RETURN_URL, () => (policy ? win.location.href : null));

  let saved: { state: unknown; t: number } | undefined;
  try {
    const raw = win.sessionStorage.getItem(key);
    if (raw !== null) {
      win.sessionStorage.removeItem(key);
      const parsed = JSON.parse(raw) as { state: unknown; t: number };
      if (Date.now() - parsed.t < TTL) saved = parsed;
    }
  } catch {
    // Unreadable or corrupt entry: no resume.
  }
  if (saved) {
    const { state } = saved;
    core.ready.then(() => core.emit(RESUME, state), noop);
  }
}

/** Frame side: the extra methods on a frame bridge. */
export function frameNavigation(core: Core) {
  const listeners = new Set<(state: unknown) => void>();
  let unclaimed: { state: unknown } | undefined;

  core.on(RESUME, (state) => {
    if (listeners.size === 0) unclaimed = { state };
    listeners.forEach((listener) => listener(state));
  });

  const denied = () => new FramewireError('NAVIGATION_DENIED', 'Host denied navigation');

  return {
    async navigateTop(url: string | URL, options?: NavigateOptions): Promise<void> {
      const ok = await core.request(NAVIGATE, { url: String(url), state: options?.state });
      if (ok !== true) throw denied();
    },
    async returnUrl(): Promise<string> {
      const href = await core.request(RETURN_URL);
      if (typeof href !== 'string') throw denied();
      return href;
    },
    onResume(listener: (state: unknown) => void): () => void {
      listeners.add(listener);
      // Resume can arrive before the app registers; deliver it late rather than lose it.
      if (unclaimed) {
        const { state } = unclaimed;
        unclaimed = undefined;
        listener(state);
      }
      return () => void listeners.delete(listener);
    },
  };
}

export type FrameNavigation = ReturnType<typeof frameNavigation>;
