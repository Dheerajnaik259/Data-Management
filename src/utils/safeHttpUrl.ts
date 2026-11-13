export function safeHttpUrl(input: string): string | null {
  try {
    const url = new URL(input);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
