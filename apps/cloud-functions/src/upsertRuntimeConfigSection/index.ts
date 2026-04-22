import {
  isRuntimeConfigSectionDocument
} from '../../../../packages/shared/src/schema/runtime-config';
import type { RuntimeConfigSectionDocument } from '@xiaipet/shared/types/runtime-config';

import { main as assertMerchantAccess } from '../assertMerchantAccess/index';
import { type FunctionContextLike } from '../shared/auth-context';
import { resolveRuntimeEnv } from '../shared/env';

export interface UpsertRuntimeConfigSectionEvent {
  section?: unknown;
  merchantUser?: unknown;
  openid?: string;
}

export interface RuntimeConfigMutationRepository {
  saveSection(section: RuntimeConfigSectionDocument): Promise<RuntimeConfigSectionDocument>;
}

function createRuntimeConfigMutationRepository(): RuntimeConfigMutationRepository {
  try {
    const cloud = require('wx-server-sdk') as {
      init?: () => void;
      database?: () => {
        collection: (name: string) => {
          doc: (id: string) => {
            set: (options: { data: RuntimeConfigSectionDocument }) => Promise<unknown>;
          };
        };
      };
    };

    cloud.init?.();
    const db = cloud.database?.();

    return {
      async saveSection(section) {
        if (!db) {
          return section;
        }

        await db.collection('runtime_configs').doc(section.sectionId).set({
          data: section
        });
        return section;
      }
    };
  } catch (error) {
    return {
      async saveSection(section) {
        return section;
      }
    };
  }
}

export async function main(
  event: UpsertRuntimeConfigSectionEvent = {},
  context?: FunctionContextLike,
  repository: RuntimeConfigMutationRepository = createRuntimeConfigMutationRepository()
) {
  resolveRuntimeEnv(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
  const access = await assertMerchantAccess(event, context);

  if (!access.allowed) {
    throw new Error('MERCHANT_FORBIDDEN');
  }

  if (!isRuntimeConfigSectionDocument(event.section)) {
    throw new Error('INVALID_RUNTIME_CONFIG_SECTION');
  }

  return {
    ok: true,
    section: await repository.saveSection(event.section)
  };
}
