import { expect, test } from '@playwright/test';
import { HOST, iframeHeight, widget } from './helpers';

test('one script tag mounts, connects and resizes the widget', async ({ page }) => {
  await page.goto(`${HOST}/loader.html`);
  await expect(page.locator('#status')).toHaveText('ready');
  await expect(page.locator('iframe')).toHaveAttribute('title', 'Booking widget');
  expect(await page.evaluate(() => window.framewire.bridges.size)).toBe(1);

  const frame = await widget(page);
  await expect(page.frameLocator('iframe').locator('#status')).toHaveText('ready');
  await frame.evaluate(() => window.setFiller(2000));
  await expect.poll(() => iframeHeight(page)).toBe(500);
});
