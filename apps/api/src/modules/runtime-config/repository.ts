import type { Prisma } from '@prisma/client';

import { getPrismaClient } from '../../db/prisma';
import type { DbClient } from '../../db/types';

export interface RuntimeConfigSectionRecord {
  sectionId: string;
  value: unknown;
  version: number;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface RuntimeConfigRow {
  id: string;
  value: unknown;
  version: number;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function mapRuntimeConfigSection(row: RuntimeConfigRow): RuntimeConfigSectionRecord {
  return {
    sectionId: row.id,
    value: row.value,
    version: row.version,
    updatedBy: row.updatedBy ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export function createRuntimeConfigRepository(client: DbClient = getPrismaClient()) {
  return {
    async listSections(sectionIds?: string[]): Promise<RuntimeConfigSectionRecord[]> {
      const sections = await client.runtimeConfigSection.findMany({
        where: sectionIds?.length ? { id: { in: sectionIds } } : undefined,
        orderBy: { id: 'asc' }
      });
      return sections.map(mapRuntimeConfigSection);
    },

    async upsertSection(input: { sectionId: string; value: unknown; updatedBy?: string }): Promise<RuntimeConfigSectionRecord> {
      const section = await client.runtimeConfigSection.upsert({
        where: { id: input.sectionId },
        update: {
          value: input.value as Prisma.InputJsonValue,
          updatedBy: input.updatedBy,
          version: { increment: 1 }
        },
        create: {
          id: input.sectionId,
          value: input.value as Prisma.InputJsonValue,
          updatedBy: input.updatedBy
        }
      });
      return mapRuntimeConfigSection(section);
    }
  };
}
