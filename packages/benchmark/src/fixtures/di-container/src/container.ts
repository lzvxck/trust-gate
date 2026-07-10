/**
 * A minimal DI container: services are resolved by string name, loaded lazily via a
 * runtime-computed import path (mirrors how real DI containers -- Angular, NestJS,
 * InversifyJS in string-token mode -- resolve providers reflectively rather than
 * through statically-visible imports). Same blind spot as the plugin-registry fixture,
 * different realistic context.
 */
type Service = Record<string, (...args: never[]) => unknown>;

const cache = new Map<string, Service>();

export async function resolve(name: string): Promise<Service> {
  if (!cache.has(name)) {
    const mod = await import(`./services/${name}`);
    cache.set(name, mod.create());
  }
  return cache.get(name) as Service;
}
