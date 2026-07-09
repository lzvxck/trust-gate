import { expect, test } from 'vitest';
import { add } from './math.js';

test('add adds two numbers', () => {
  expect(add(1, 2)).toBe(3);
});
