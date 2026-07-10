import { expect, test } from 'vitest';
import { resolve } from './container';

test('greeter', async () => {
  const svc = await resolve('greeter');
  expect((svc.greet as (name: string) => string)('World')).toBe('Hello, World!');
});

test('farewell', async () => {
  const svc = await resolve('farewell');
  expect((svc.say as (name: string) => string)('World')).toBe('Goodbye, World.');
});
