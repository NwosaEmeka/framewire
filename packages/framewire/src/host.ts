import { createBridge } from './bridge';
import { normalizeOrigin } from './origin';
import type { AnyContract, BridgeOptions, Contract, HostBridge } from './types';

export interface HostOptions extends BridgeOptions {
  /** The iframe to talk to. One bridge per iframe. */
  iframe: HTMLIFrameElement;
  /** The exact origin of the page loaded in the iframe, e.g. "https://widget.example.com". */
  origin: string;
}

/** @internal Exposed for tests: run a host bridge in a given window. */
export function createHostIn<C extends Contract = AnyContract>(
  win: Window,
  { iframe, origin, ...options }: HostOptions,
): HostBridge<C> {
  const peer = normalizeOrigin(origin);
  return createBridge(
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
  ) as unknown as HostBridge<C>;
}

/** Create the host side of a bridge for an embedded iframe. */
export function createHost<C extends Contract = AnyContract>(options: HostOptions): HostBridge<C> {
  return createHostIn<C>(window, options);
}
