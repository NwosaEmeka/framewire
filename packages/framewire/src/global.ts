/**
 * Host script-tag build (dist/framewire.global.js), exposed on `window.framewire`.
 * The frame side has its own build (framewire.frame.global.js) to stay under budget.
 *
 *   <script src=".../framewire.global.js" data-src="https://widget.example.com/"></script>
 *
 * mounts an iframe right after the tag and wires a host bridge to it.
 * Options: data-max-height, data-navigation="true", data-allow, data-title.
 */
import { noop } from './bridge';
import { FramewireError } from './errors';
import { createHost } from './host';
import { PROTOCOL_VERSION } from './protocol';
import type { HostBridge } from './types';

type Namespace = Record<string, unknown> & { bridges?: Map<HTMLIFrameElement, HostBridge> };
const fw: Namespace = ((window as { framewire?: Namespace }).framewire ??= {});

/** Every bridge the loader created, keyed by iframe. Shared if the script runs twice. */
export const bridges: Map<HTMLIFrameElement, HostBridge> = (fw.bridges ??= new Map());

/** Mount the iframe described by a `<script data-src>` tag. Safe to call twice. */
export function mount(script: HTMLScriptElement): HostBridge | undefined {
  const { dataset } = script;
  if (!dataset.src || 'framewireMounted' in dataset) return;
  dataset.framewireMounted = '';

  const src = new URL(dataset.src, location.href);
  const iframe = document.createElement('iframe');
  iframe.src = src.href;
  iframe.title = dataset.title || 'Embedded content';
  iframe.style.cssText = 'width:100%;border:0;display:block';
  if (dataset.allow) iframe.setAttribute('allow', dataset.allow);
  script.after(iframe);

  const maxHeight = Number(dataset.maxHeight);
  const bridge = createHost({
    iframe,
    origin: src.origin,
    resize: maxHeight > 0 ? { maxHeight } : true,
    navigation: dataset.navigation === 'true',
  });
  bridges.set(iframe, bridge);
  bridge.ready.then(
    () => iframe.dispatchEvent(new CustomEvent('framewire:ready', { detail: { bridge } })),
    noop,
  );
  return bridge;
}

Object.assign(fw, { createHost, mount, FramewireError, PROTOCOL_VERSION });

const current = document.currentScript;
if (current instanceof HTMLScriptElement) mount(current);
