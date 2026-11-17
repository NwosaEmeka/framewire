import { expect, test } from '@playwright/test';
import { FOREIGN, widget } from './helpers';

test('a host on a non-allowed origin never connects', async ({ page }) => {
  await page.goto(FOREIGN);
  const frame = await widget(page);

  const call = await page.evaluate(() =>
    window.bridge.request('echo', 'secret').then(
      () => 'resolved',
      (error: { code: string }) => error.code,
    ),
  );
  expect(['TIMEOUT', 'HANDSHAKE_TIMEOUT']).toContain(call);

  await expect(page.locator('#status')).toHaveText('failed:HANDSHAKE_TIMEOUT');
  await expect(page.frameLocator('iframe').locator('#status')).toHaveText(
    'failed:HANDSHAKE_TIMEOUT',
  );
  expect(await frame.evaluate(() => window.handledCount())).toBe(0);
});
