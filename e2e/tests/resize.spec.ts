import { expect, test } from '@playwright/test';
import { connected, iframeHeight } from './helpers';

test('the iframe follows its content, capped at maxHeight', async ({ page }) => {
  const frame = await connected(page);
  const initial = await iframeHeight(page);
  expect(initial).toBeLessThan(150);

  await frame.evaluate(() => window.setFiller(300));
  await expect.poll(() => iframeHeight(page)).toBeGreaterThan(300);
  expect(await iframeHeight(page)).toBeLessThan(600);

  await frame.evaluate(() => window.setFiller(2000));
  await expect.poll(() => iframeHeight(page)).toBe(600);

  await frame.evaluate(() => window.setFiller(0));
  await expect.poll(() => iframeHeight(page)).toBe(initial);
});
