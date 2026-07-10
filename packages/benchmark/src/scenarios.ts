import type { Scenario } from './types.js';

export const scenarios: Scenario[] = [
  {
    name: 'plugin-registry',
    description:
      'CLI-style plugin dispatch: registry[key]() loaded via a runtime-computed import path',
    fixture: 'plugin-registry',
    mutation: {
      file: 'src/plugins/upper.ts',
      content: `export function run(s: string): string {\n  return s.toLowerCase();\n}\n`,
    },
    expectedFailure: 'src/dispatch.test.ts :: upper',
    kind: 'dynamic',
  },
  {
    name: 'di-container',
    description: 'Dependency-injection container resolving services by string token',
    fixture: 'di-container',
    mutation: {
      file: 'src/services/greeter.ts',
      content: `export function create() {\n  return {\n    greet(name: string): string {\n      return \`Hi, \${name}!\`;\n    },\n  };\n}\n`,
    },
    expectedFailure: 'src/container.test.ts :: greeter',
    kind: 'dynamic',
  },
  {
    name: 'dynamic-routes',
    description: 'File-based route handler resolved from a request path at runtime',
    fixture: 'dynamic-routes',
    mutation: {
      file: 'src/routes/about.ts',
      content: `export function handle(): { status: number; body: string } {\n  return { status: 200, body: 'about' };\n}\n`,
    },
    expectedFailure: 'src/router.test.ts :: about',
    kind: 'dynamic',
  },
  {
    name: 'static-control',
    description: 'Plain, directly-imported source file -- both tools are expected to catch this',
    fixture: 'static-control',
    mutation: {
      file: 'src/math.ts',
      content: `export function add(a: number, b: number): number {\n  return a - b;\n}\n`,
    },
    expectedFailure: 'src/math.test.ts :: add',
    kind: 'static-control',
  },
];
