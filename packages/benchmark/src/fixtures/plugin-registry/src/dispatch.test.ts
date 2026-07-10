import { expect, test } from 'vitest';
import { dispatch } from './dispatch';

test('upper', async () => {
  expect(await dispatch('upper', 'abc')).toBe('ABC');
});

test('reverse', async () => {
  expect(await dispatch('reverse', 'abc')).toBe('cba');
});
