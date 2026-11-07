import { readFileSync } from 'node:fs';
import path from 'node:path';

const FIXTURES_DIR = path.join(__dirname, '..', '..', 'fixtures');

/** Lê um arquivo de `backend/fixtures/` (ver o README de lá). */
export function readFixture(name: string): Buffer {
  return readFileSync(path.join(FIXTURES_DIR, name));
}
