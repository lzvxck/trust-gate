export function create() {
  return {
    say(name: string): string {
      return `Goodbye, ${name}.`;
    },
  };
}
