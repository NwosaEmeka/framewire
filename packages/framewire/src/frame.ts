import { createBridge, expose } from './bridge';
import { frameNavigation } from './navigate';
import { toMatcher, type AllowedOrigins } from './origin';
import { reportSize, type FrameResizeOptions } from './resize';
import type { AnyContract, BridgeOptions, Contract, FrameBridge } from './types';

export interface FrameOptions extends BridgeOptions {
  /**
   * Origins allowed to embed this page: a list of exact origins, or a
   * predicate for multi-tenant embeds. Wildcards and "null" are rejected.
   * A predicate that returns true for everything disables origin checks.
   */
  allowedOrigins: AllowedOrigins;
  /** Report this document's height to the host so it can size the iframe. */
  resize?: boolean | FrameResizeOptions;
}

/** @internal Exposed for tests: run a frame bridge in a given window. */
export function createFrameIn<C extends Contract = AnyContract>(
  win: Window,
  { allowedOrigins, resize, ...options }: FrameOptions,
): FrameBridge<C> {
  const { match, single } = toMatcher(allowedOrigins);
  const embedded = () => win.parent !== win;
  const core = createBridge(
    win,
    {
      role: 'frame',
      // The hello carries no data, so '*' leaks nothing when we can't name one origin.
      helloTarget: single ?? '*',
      check: (event) =>
        !embedded() || event.source !== win.parent
          ? 'source'
          : match(event.origin)
            ? undefined
            : 'origin',
      post: (message, targetOrigin) => {
        if (embedded()) win.parent.postMessage(message, targetOrigin);
      },
    },
    options,
  );
  if (resize) reportSize(win, core, resize);
  return expose(core, frameNavigation(core)) as unknown as FrameBridge<C>;
}

/** Create the frame side of a bridge. Call this inside the embedded page. */
export function createFrame<C extends Contract = AnyContract>(
  options: FrameOptions,
): FrameBridge<C> {
  return createFrameIn<C>(window, options);
}
