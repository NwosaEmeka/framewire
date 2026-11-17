import { expect, test } from '@playwright/test';
import { HOST, connected } from './helpers';

test('navigateTop leaves the frame, and state resumes on return', async ({ page }) => {
  const frame = await connected(page);
  await Promise.all([
    page.waitForURL(`${HOST}/return.html`),
    frame
      .evaluate(() =>
        window.bridge.navigateTop('http://localhost:3000/return.html', { state: { order: 42 } }),
      )
      .catch(() => {
        // The frame may be torn down mid-evaluate as the top window navigates.
      }),
  ]);
  await expect(page.locator('h1')).toHaveText('Host (returned)');
  await expect(page.frameLocator('iframe').locator('#resume')).toHaveText('{"order":42}');
});

test('navigateTop is denied when the host has not opted in', async ({ page }) => {
  const frame = await connected(page, `${HOST}/?nav=0`);
  const result = await frame.evaluate(() =>
    window.bridge.navigateTop('http://localhost:3000/return.html').then(
      () => 'navigated',
      (error: { code: string }) => error.code,
    ),
  );
  expect(result).toBe('NAVIGATION_DENIED');
  expect(page.url()).toBe(`${HOST}/?nav=0`);
});
