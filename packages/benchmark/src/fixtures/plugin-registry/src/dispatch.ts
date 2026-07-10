/**
 * Plugin dispatch by string key -- a realistic pattern (CLI subcommands, transform
 * pipelines, format converters). The import target is only known at runtime, so
 * neither a static import-graph analyzer nor Vite's own dynamic-import-vars plugin
 * (which *can* statically resolve `import(`./x/${y}.js`)` when the extension is part
 * of the literal) can see this edge -- the extension is deliberately omitted from the
 * static part of the template literal to keep it a genuine runtime-only import.
 */
export async function dispatch(key: string, input: string): Promise<string> {
  const mod = await import(`./plugins/${key}`);
  return mod.run(input);
}
