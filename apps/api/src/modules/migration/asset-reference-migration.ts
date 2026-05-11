import { createOssObjectKey, type OssAssetRole, type OssAssetVariantName } from '../assets/policy';

interface CloudBaseExport {
  products?: Array<Record<string, unknown>>;
  runtimeConfigs?: Array<Record<string, unknown>>;
}

export interface AssetMigrationTarget {
  variantName: OssAssetVariantName;
  objectKey: string;
}

export interface AssetMigrationCandidate {
  sourceCollection: 'products' | 'runtimeConfigs';
  sourceRecordId: string;
  fieldPath: string;
  legacyFileId: string;
  role: OssAssetRole;
  targets: AssetMigrationTarget[];
}

export interface AssetReferenceMigrationReport {
  generatedAt: string;
  candidates: AssetMigrationCandidate[];
  skippedAlreadyOss: number;
  skippedEmpty: number;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toStringArray(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item === 'string') {
      return [item];
    }

    if (item && typeof item === 'object' && 'fileId' in item && typeof item.fileId === 'string') {
      return [item.fileId];
    }

    return [];
  });
}

function isCloudBaseFileId(value: string): boolean {
  return value.startsWith('cloud://');
}

function isOssFileId(value: string): boolean {
  return value.startsWith('oss://');
}

function extensionFromFileId(fileId: string): string {
  const clean = fileId.split('?')[0] ?? fileId;
  const extension = clean.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  return extension && extension.length <= 5 ? extension : 'jpg';
}

function roleVariants(role: OssAssetRole): OssAssetVariantName[] {
  if (role === 'product-cover') {
    return ['thumbnail', 'display'];
  }

  if (role === 'product-detail') {
    return ['detail'];
  }

  if (role === 'runtime-banner') {
    return ['banner'];
  }

  return ['display'];
}

function getRecordId(record: Record<string, unknown>, fallback: string): string {
  return asString(record.id) || asString(record._id) || fallback;
}

function pushCandidate(input: {
  candidates: AssetMigrationCandidate[];
  merchantId: string;
  sourceCollection: AssetMigrationCandidate['sourceCollection'];
  sourceRecordId: string;
  fieldPath: string;
  fileId: string;
  role: OssAssetRole;
  generatedAt: Date;
}) {
  const extension = extensionFromFileId(input.fileId);
  input.candidates.push({
    sourceCollection: input.sourceCollection,
    sourceRecordId: input.sourceRecordId,
    fieldPath: input.fieldPath,
    legacyFileId: input.fileId,
    role: input.role,
    targets: roleVariants(input.role).map((variantName) => ({
      variantName,
      objectKey: createOssObjectKey({
        merchantId: input.merchantId,
        role: input.role,
        variantName,
        extension,
        now: input.generatedAt,
        assetId: input.sourceRecordId.replace(/[^a-zA-Z0-9_-]/g, '-')
      })
    }))
  });
}

export function createAssetReferenceMigrationReport(
  exportData: CloudBaseExport,
  options: { merchantId?: string; generatedAt?: Date } = {}
): AssetReferenceMigrationReport {
  const merchantId = options.merchantId ?? 'merchant-imported';
  const generatedAt = options.generatedAt ?? new Date();
  const candidates: AssetMigrationCandidate[] = [];
  let skippedAlreadyOss = 0;
  let skippedEmpty = 0;

  function inspectFiles(input: {
    sourceCollection: AssetMigrationCandidate['sourceCollection'];
    sourceRecordId: string;
    fieldPath: string;
    role: OssAssetRole;
    fileIds: string[];
  }) {
    if (!input.fileIds.length) {
      skippedEmpty += 1;
      return;
    }

    input.fileIds.forEach((fileId, index) => {
      if (!fileId) {
        skippedEmpty += 1;
        return;
      }

      if (isOssFileId(fileId)) {
        skippedAlreadyOss += 1;
        return;
      }

      if (!isCloudBaseFileId(fileId)) {
        return;
      }

      pushCandidate({
        candidates,
        merchantId,
        sourceCollection: input.sourceCollection,
        sourceRecordId: input.sourceRecordId,
        fieldPath: input.fileIds.length > 1 ? `${input.fieldPath}[${index}]` : input.fieldPath,
        fileId,
        role: input.role,
        generatedAt
      });
    });
  }

  (exportData.products ?? []).forEach((product, index) => {
    const sourceRecordId = getRecordId(product, `product-${index + 1}`);
    inspectFiles({
      sourceCollection: 'products',
      sourceRecordId,
      fieldPath: 'imageFileId',
      role: 'product-cover',
      fileIds: toStringArray(product.imageFileId)
    });
    inspectFiles({
      sourceCollection: 'products',
      sourceRecordId,
      fieldPath: 'introductionImages',
      role: 'product-introduction',
      fileIds: [
        ...toStringArray(product.introductionImageFileIds),
        ...toStringArray(product.introductionImages)
      ]
    });
    inspectFiles({
      sourceCollection: 'products',
      sourceRecordId,
      fieldPath: 'detailImages',
      role: 'product-detail',
      fileIds: [
        ...toStringArray(product.detailImageFileIds),
        ...toStringArray(product.detailImages)
      ]
    });
  });

  (exportData.runtimeConfigs ?? []).forEach((section, index) => {
    const sourceRecordId = getRecordId(section, `runtime-config-${index + 1}`);
    const value = asObject(section.value);
    if (sourceRecordId === 'banner' || section.sectionId === 'banner' || section.id === 'banner') {
      inspectFiles({
        sourceCollection: 'runtimeConfigs',
        sourceRecordId,
        fieldPath: 'value.fileId',
        role: 'runtime-banner',
        fileIds: toStringArray(value.fileId ?? section.fileId)
      });
    }
  });

  return {
    generatedAt: generatedAt.toISOString(),
    candidates,
    skippedAlreadyOss,
    skippedEmpty
  };
}

export function renderAssetReferenceMigrationReport(report: AssetReferenceMigrationReport): string {
  const lines = [
    '# OSS 资产迁移报告',
    '',
    `生成时间：${report.generatedAt}`,
    '',
    '## 汇总',
    '',
    `- 待迁移 CloudBase 文件：${report.candidates.length}`,
    `- 已是 OSS 引用并跳过：${report.skippedAlreadyOss}`,
    `- 空字段并跳过：${report.skippedEmpty}`,
    '',
    '## 明细',
    '',
    '| 来源 | 记录 | 字段 | 角色 | CloudBase fileId | 目标 OSS key |',
    '| --- | --- | --- | --- | --- | --- |'
  ];

  report.candidates.forEach((candidate) => {
    lines.push(
      `| ${candidate.sourceCollection} | ${candidate.sourceRecordId} | ${candidate.fieldPath} | ${candidate.role} | ${candidate.legacyFileId} | ${candidate.targets.map((target) => `${target.variantName}: ${target.objectKey}`).join('<br>')} |`
    );
  });

  if (!report.candidates.length) {
    lines.push('| - | - | - | - | 没有发现需要迁移的 CloudBase 图片引用 | - |');
  }

  lines.push(
    '',
    '## 使用说明',
    '',
    '- 本报告只负责发现旧 `cloud://` 图片引用和建议 OSS 目标 key，不会上传文件，也不会修改数据库。',
    '- 实际迁移时先按明细下载 CloudBase 文件，按目标 key 上传到 OSS，再把商品或运行配置写入新的 `imageAsset` / `detailImageAssets` / `banner.asset` 字段。',
    '- 如果旧数据本身没有真实图片，本报告为空是正常结果。'
  );

  return `${lines.join('\n')}\n`;
}
