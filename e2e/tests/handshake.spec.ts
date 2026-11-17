import { expect, test } from '@playwright/test';
import { HOST, connected } from './helpers';

test('host and frame complete the handshake across origins', async ({ page }) => {
  const frame = await connected(page);
  expect(await page.evaluate(() => window.bridge.state)).toBe('ready');
  expect(await frame.evaluate(() => window.bridge.state)).toBe('ready');
  expect(page.url()).toBe(`${HOST}/`);
});
