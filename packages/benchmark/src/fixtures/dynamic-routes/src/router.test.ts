import { expect, test } from 'vitest';
import { route } from './router';

test('home', async () => {
  const res = await route('home');
  expect(res.body).toBe('home');
});

test('about', async () => {
  const res = await route('about');
  expect(res.body).toBe('about-page');
});
