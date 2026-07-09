import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export async function hashFile(path: string): Promise<string> {
  const content = await readFile(path);
  return createHash('sha1').update(content).digest('hex');
}
