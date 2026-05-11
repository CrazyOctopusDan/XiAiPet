import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { loadCloudBaseExport } from '../src/modules/migration/cloudbase-importer';
import {
  createAssetReferenceMigrationReport,
  renderAssetReferenceMigrationReport
} from '../src/modules/migration/asset-reference-migration';

const inputPath = process.argv[2] ?? 'tmp/cloudbase-export.json';
const outputPath = process.argv[3] ?? 'tmp/asset-migration-report.md';
const merchantId = process.env.MERCHANT_ID ?? 'merchant-imported';

async function main() {
  const exportData = await loadCloudBaseExport(inputPath);
  const report = createAssetReferenceMigrationReport(exportData, { merchantId });
  const markdown = renderAssetReferenceMigrationReport(report);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, markdown, 'utf8');
  console.log(`Wrote OSS asset migration report to ${outputPath}`);
  console.log(`Detected ${report.candidates.length} CloudBase asset reference(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
