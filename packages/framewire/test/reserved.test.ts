import { describe, expect, it } from 'vitest';
import { FramewireError } from '../src/errors';
import { setup } from './harness';

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return (error as FramewireError).code;
  }
};

describe('reserved fw: names', () => {
  it.each(['host', 'frame'] as const)('%s rejects fw: names in all four methods', async (side) => {
    const t = setup();
    const bridge = side === 'host' ? t.host() : t.frame();
    expect(code(() => bridge.emit('fw:resize', {}))).toBe('RESERVED_NAME');
    expect(code(() => bridge.on('fw:resume', () => {}))).toBe('RESERVED_NAME');
    expect(code(() => bridge.handle('fw:navigate', () => true))).toBe('RESERVED_NAME');
    await expect(bridge.request('fw:return-url')).rejects.toMatchObject({ code: 'RESERVED_NAME' });
  });

  it('allows names that merely contain fw:', () => {
    const t = setup();
    const host = t.host();
    expect(() => host.emit('my-fw:thing', 1)).not.toThrow();
  });
});
