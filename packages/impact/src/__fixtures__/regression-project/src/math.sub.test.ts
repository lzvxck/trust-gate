import { expect, test } from 'vitest';
import { sub } from './math.js';

test('sub subtracts two numbers', () => {
  expect(sub(5, 2)).toBe(3);
});
