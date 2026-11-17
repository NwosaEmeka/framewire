import { expect, test } from '@playwright/test';
import { connected } from './helpers';

test('requests work in both directions', async ({ page }) => {
  const frame = await connected(page);
  expect(await page.evaluate(() => window.bridge.request('echo', { hello: 'frame' }))).toEqual({
    hello: 'frame',
  });
  expect(await frame.evaluate(() => window.bridge.request('add', { a: 2, b: 3 }))).toBe(5);
});

test('a throwing handler surfaces as REMOTE_ERROR', async ({ page }) => {
  await connected(page);
  const result = await page.evaluate(() =>
    window.bridge.request('fail').then(
      () => 'resolved',
      (error: { code: string; message: string }) => `${error.code}: ${error.message}`,
    ),
  );
  expect(result).toBe('REMOTE_ERROR: nope');
});
