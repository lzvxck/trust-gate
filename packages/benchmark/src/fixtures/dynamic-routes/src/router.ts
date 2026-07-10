/**
 * A route handler loaded by name (mirrors file-based routers -- Next.js's own
 * pages/app router, Express route auto-loaders -- that resolve a handler module from
 * a request path at runtime). Same blind spot, third realistic context.
 */
export async function route(name: string): Promise<{ status: number; body: string }> {
  const mod = await import(`./routes/${name}`);
  return mod.handle();
}
