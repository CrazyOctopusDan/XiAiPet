import type { RuntimeConfigSectionDocument } from '@xiaipet/shared/types/runtime-config';
import { isRuntimeConfigSectionDocument } from '../../../../packages/shared/src/schema/runtime-config';

import { type FunctionContextLike } from '../shared/auth-context';
import { resolveRuntimeEnv } from '../shared/env';

export interface ReadRuntimeConfigEvent {
  openid?: string;
}

export interface ReadRuntimeConfigRepository {
  listSections(): Promise<RuntimeConfigSectionDocument[]>;
}

function createReadRuntimeConfigRepository(): ReadRuntimeConfigRepository {
  try {
    const cloud = require('wx-server-sdk') as {
      init?: () => void;
      database?: () => {
        collection: (name: string) => {
          get: () => Promise<{ data: RuntimeConfigSectionDocument[] }>;
        };
      };
    };

    cloud.init?.();
    const db = cloud.database?.();

    return {
      async listSections() {
        if (!db) {
          return [];
        }

        const result = await db.collection('runtime_configs').get();
        return (result.data ?? []).filter((section) => isRuntimeConfigSectionDocument(section));
      }
    };
  } catch (error) {
    return {
      async listSections() {
        return [];
      }
    };
  }
}

export async function main(
  event: ReadRuntimeConfigEvent = {},
  _context?: FunctionContextLike,
  repository: ReadRuntimeConfigRepository = createReadRuntimeConfigRepository()
) {
  resolveRuntimeEnv(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
  const sections = await repository.listSections();
  const byId = Object.fromEntries(sections.map((section) => [section.sectionId, section])) as Partial<
    Record<RuntimeConfigSectionDocument['sectionId'], RuntimeConfigSectionDocument>
  >;

  return {
    ok: true,
    banner: byId['banner']?.value ?? null,
    store: byId['store-profile']?.value ?? null,
    customNotice: byId['custom-notice']?.value ?? null,
    deliveryRules: byId['delivery-rules']?.value ?? null
  };
}
