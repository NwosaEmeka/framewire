import { noop, type Core } from './bridge';

export interface FrameResizeOptions {
  /** Trailing debounce in ms before a new height is sent. Default 50. */
  debounce?: number;
  /** Custom height measurement. Default: the rounded-up height of <html>. */
  measure?: () => number;
}

export interface HostResizeOptions {
  minHeight?: number;
  maxHeight?: number;
  /** Called with the height actually applied (after clamping). */
  onResize?: (height: number) => void;
}

const RESIZE = 'fw:resize';

/** Frame side: watch the document and report its height to the host. */
export function reportSize(win: Window, core: Core, options: true | FrameResizeOptions) {
  const { debounce = 50, measure } = options === true ? {} : options;
  const root = win.document.documentElement;
  const height = measure ?? (() => Math.ceil(root.getBoundingClientRect().height));
  let last = -1;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const send = () => {
    const next = height();
    if (next === last) return;
    last = next;
    core.emit(RESIZE, { height: next });
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(send, debounce);
  };

  const Observer = (win as Window & typeof globalThis).ResizeObserver;
  const observer = Observer ? new Observer(schedule) : undefined;
  observer?.observe(root);
  core.ready.then(send, noop);
  core.onDestroy(() => {
    observer?.disconnect();
    clearTimeout(timer);
  });
}

/** Host side: apply reported heights to the iframe, clamped to min/max. */
export function applySize(
  iframe: HTMLIFrameElement,
  core: Core,
  options: true | HostResizeOptions,
) {
  const { minHeight = 0, maxHeight = Infinity, onResize } = options === true ? {} : options;
  core.on(RESIZE, (data) => {
    const reported = Number((data as { height?: unknown } | undefined)?.height);
    if (!Number.isFinite(reported) || reported < 0) return;
    const height = Math.min(Math.max(reported, minHeight), maxHeight);
    iframe.style.height = `${height}px`;
    onResize?.(height);
  });
}
