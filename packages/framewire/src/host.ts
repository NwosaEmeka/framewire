import { createBridge, expose } from './bridge';
import { hostNavigation, type NavigationPolicy } from './navigate';
import { normalizeOrigin } from './origin';
import { applySize, type HostResizeOptions } from './resize';
import type { AnyContract, BridgeOptions, Contract, HostBridge } from './types';

export interface HostOptions extends BridgeOptions {
  /** The iframe to talk to. One bridge per iframe. */
  iframe: HTMLIFrameElement;
  /** The exact origin of the page loaded in the iframe, e.g. "https://widget.example.com". */
  origin: string;
  /** Apply heights reported by the frame to the iframe. */
  resize?: boolean | HostResizeOptions;
  /**
   * Let the frame navigate the top window (payments, OAuth). Off by default.
   * Only http(s) URLs are ever allowed, whatever the policy says.
   */
  navigation?: NavigationPolicy;
}

/** @internal Test seams. */
export interface HostDeps {
  assign?: (href: string) => void;
}

/** @internal Exposed for tests: run a host bridge in a given window. */
export function createHostIn<C extends Contract = AnyContract>(
  win: Window,
  { iframe, origin, resize, navigation, ...options }: HostOptions,
  deps: HostDeps = {},
): HostBridge<C> {
  const peer = normalizeOrigin(origin);
  const core = createBridge(
    win,
    {
      role: 'host',
      helloTarget: peer,
      check: (event) =>
        event.source !== iframe.contentWindow
          ? 'source'
          : event.origin !== peer
            ? 'origin'
            : undefined,
      post: (message, targetOrigin) => iframe.contentWindow?.postMessage(message, targetOrigin),
      attach(sayHello) {
        // The frame may have said hello before we existed; greet it on every load.
        iframe.addEventListener('load', sayHello);
        return () => iframe.removeEventListener('load', sayHello);
      },
    },
    options,
  );
  if (resize) applySize(iframe, core, resize);
  hostNavigation(win, core, peer, navigation, deps.assign ?? ((href) => win.location.assign(href)));
  return expose(core) as unknown as HostBridge<C>;
}

/** Create the host side of a bridge for an embedded iframe. */
export function createHost<C extends Contract = AnyContract>(options: HostOptions): HostBridge<C> {
  return createHostIn<C>(window, options);
}
