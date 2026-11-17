import { expect, type Frame, type Page } from '@playwright/test';
import type { FrameBridge, HostBridge } from 'framewire';

export const HOST = 'http://localhost:3000';
export const WIDGET = 'http://localhost:4000';
export const FOREIGN = 'http://localhost:5100';

declare global {
  interface Window {
    bridge: HostBridge & FrameBridge;
    handledCount(): number;
    setFiller(px: number): void;
    framewire: { bridges: Map<HTMLIFrameElement, HostBridge> };
  }
}

/** The widget frame inside `page`, once its document has loaded. */
export async function widget(page: Page): Promise<Frame> {
  await page.frameLocator('iframe').locator('#status').waitFor();
  const frame = page.frames().find((f) => f.url().startsWith(WIDGET));
  if (!frame) throw new Error('widget frame not found');
  return frame;
}

/** Wait until both the host page and the widget report `ready`. */
export async function connected(page: Page, url = HOST): Promise<Frame> {
  await page.goto(url);
  await expect(page.locator('#status')).toHaveText('ready');
  await expect(page.frameLocator('iframe').locator('#status')).toHaveText('ready');
  return widget(page);
}

export const iframeHeight = (page: Page) =>
  page.locator('iframe').evaluate((el) => Math.round(el.getBoundingClientRect().height));
