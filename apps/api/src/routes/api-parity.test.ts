import path from 'node:path';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { apiParityEntries } from './api-parity';

interface CloudFunctionManifest {
  functions: Array<{ name: string }>;
}

describe('api parity inventory', () => {
  it('maps every CloudBase function manifest entry to /api/v1', () => {
    const manifestPath = path.resolve(__dirname, '../../../../apps/cloud-functions/cloudfunctions.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as CloudFunctionManifest;
    const mapped = new Map(apiParityEntries.map((entry) => [entry.functionName, entry]));

    for (const fn of manifest.functions) {
      expect(mapped.has(fn.name), `${fn.name} missing from api-parity.ts`).toBe(true);
      const entry = mapped.get(fn.name);
      expect(entry?.method).toBeTruthy();
      expect(entry?.path.startsWith('/api/v1')).toBe(true);
      expect(entry?.testGroup).toBeTruthy();
    }
  });
});
