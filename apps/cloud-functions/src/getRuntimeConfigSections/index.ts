import {
  isRuntimeConfigSectionDocument
} from '../../../../packages/shared/src/schema/runtime-config';
import type { RuntimeConfigSectionDocument } from '@xiaipet/shared/types/runtime-config';

import { main as assertMerchantAccess } from '../assertMerchantAccess/index';
import { type FunctionContextLike } from '../shared/auth-context';
import { resolveRuntimeEnv } from '../shared/env';

export interface GetRuntimeConfigSectionsEvent {
  merchantUser?: unknown;
  openid?: string;
}

export interface RuntimeConfigRepository {
  listSections(): Promise<RuntimeConfigSectionDocument[]>;
  saveSection?(section: RuntimeConfigSectionDocument): Promise<RuntimeConfigSectionDocument>;
}

function createRuntimeConfigRepository(): RuntimeConfigRepository {
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
  event: GetRuntimeConfigSectionsEvent = {},
  context?: FunctionContextLike,
  repository: RuntimeConfigRepository = createRuntimeConfigRepository()
) {
  resolveRuntimeEnv(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
  const access = await assertMerchantAccess(event, context);

  if (!access.allowed) {
    throw new Error('MERCHANT_FORBIDDEN');
  }

  return {
    ok: true,
    sections: await repository.listSections()
  };
}
