import { afterEach, describe, expect, it, vi } from 'vitest';
import { bridges, mount } from '../src/global';
import '../src/global-frame';
import { flush, inject, wire } from './harness';

const WIDGET = 'https://widget.test';

function script(data: Record<string, string>) {
  const el = document.createElement('script');
  Object.assign(el.dataset, data);
  document.body.append(el);
  return el;
}

/** Complete the handshake as if the widget page said hello. */
async function handshake(iframe: HTMLIFrameElement) {
  const sent = vi.spyOn(iframe.contentWindow!, 'postMessage').mockImplementation(() => {});
  inject(window, wire('hello'), WIDGET, iframe.contentWindow);
  await flush();
  return sent;
}

afterEach(() => {
  bridges.forEach((bridge) => bridge.destroy());
  bridges.clear();
  document.body.innerHTML = '';
});

describe('script-tag loader', () => {
  it('exposes the API on window.framewire', () => {
    const fw = (window as unknown as { framewire: Record<string, unknown> }).framewire;
    expect(typeof fw.createHost).toBe('function');
    expect(typeof fw.createFrame).toBe('function');
    expect(typeof fw.mount).toBe('function');
    expect(fw.bridges).toBe(bridges);
  });

  it('mounts an iframe right after the script tag', () => {
    const el = script({ src: `${WIDGET}/book?x=1` });
    const bridge = mount(el);
    const iframe = el.nextElementSibling as HTMLIFrameElement;
    expect(iframe.tagName).toBe('IFRAME');
    expect(iframe.src).toBe(`${WIDGET}/book?x=1`);
    expect(iframe.title).toBe('Embedded content');
    expect(iframe.style.width).toBe('100%');
    expect(bridges.get(iframe)).toBe(bridge);
  });

  it('honours data-title and data-allow', () => {
    const el = script({ src: WIDGET, title: 'Booking', allow: 'payment' });
    mount(el);
    const iframe = el.nextElementSibling as HTMLIFrameElement;
    expect(iframe.title).toBe('Booking');
    expect(iframe.getAttribute('allow')).toBe('payment');
  });

  it('mounts only once per script tag', () => {
    const el = script({ src: WIDGET });
    expect(mount(el)).toBeDefined();
    expect(mount(el)).toBeUndefined();
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
  });

  it('ignores script tags without data-src', () => {
    expect(mount(script({}))).toBeUndefined();
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('fires framewire:ready on the iframe after the handshake', async () => {
    const el = script({ src: WIDGET });
    const bridge = mount(el);
    const iframe = el.nextElementSibling as HTMLIFrameElement;
    const onReady = vi.fn();
    iframe.addEventListener('framewire:ready', onReady);
    await handshake(iframe);
    expect(onReady).toHaveBeenCalledTimes(1);
    expect((onReady.mock.calls[0]![0] as CustomEvent).detail.bridge).toBe(bridge);
  });

  it('applies data-max-height to reported heights', async () => {
    const el = script({ src: WIDGET, maxHeight: '300' });
    mount(el);
    const iframe = el.nextElementSibling as HTMLIFrameElement;
    await handshake(iframe);
    inject(
      window,
      wire('event', { name: 'fw:resize', data: { height: 900 } }),
      WIDGET,
      iframe.contentWindow,
    );
    await flush();
    expect(iframe.style.height).toBe('300px');
  });

  it.each([
    [{}, null],
    [{ navigation: 'true' }, window.location.href],
  ])('data-navigation %j controls navigation', async (data, expected) => {
    const el = script({ src: WIDGET, ...data });
    mount(el);
    const iframe = el.nextElementSibling as HTMLIFrameElement;
    const sent = await handshake(iframe);
    inject(
      window,
      wire('request', { id: '1', name: 'fw:return-url' }),
      WIDGET,
      iframe.contentWindow,
    );
    await flush();
    const response = sent.mock.calls
      .map(([m]) => m as { kind: string; data?: unknown })
      .find((m) => m.kind === 'response');
    expect(response?.data ?? null).toBe(expected);
  });
});
