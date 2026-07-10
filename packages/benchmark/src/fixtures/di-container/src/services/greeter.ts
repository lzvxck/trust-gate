export function create() {
  return {
    greet(name: string): string {
      return `Hello, ${name}!`;
    },
  };
}
