import { createUserRecord } from '../schema/user-record';
import type { UserRecord } from '../types/user';

export interface BootstrapDecisionInput {
  openid: string;
  now: string;
  existingUser: UserRecord | null;
}

export interface BootstrapDecision {
  operation: 'create' | 'restore';
  record: UserRecord;
  lazyCollections: string[];
}

export function buildBootstrapDecision(input: BootstrapDecisionInput): BootstrapDecision {
  if (!input.existingUser) {
    return {
      operation: 'create',
      record: createUserRecord({
        openid: input.openid,
        now: input.now,
        status: 'active'
      }),
      lazyCollections: []
    };
  }

  return {
    operation: 'restore',
    record: {
      ...input.existingUser,
      updatedAt: input.now,
      lastLoginAt: input.now
    },
    lazyCollections: []
  };
}
