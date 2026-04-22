import { buildBootstrapDecision, isUserRecord, type UserRecord } from '@xiaipet/shared';

import { getAuthContext, type FunctionContextLike } from '../shared/auth-context';
import { resolveRuntimeEnv } from '../shared/env';

export interface BootstrapUserEvent {
  now?: string;
  existingUser?: unknown;
  openid?: string;
}

export async function main(event: BootstrapUserEvent = {}, context?: FunctionContextLike) {
  resolveRuntimeEnv();
  const auth = getAuthContext(event as Record<string, unknown>, context);
  const existingUser = isUserRecord(event.existingUser) ? (event.existingUser as UserRecord) : null;
  const now = event.now ?? new Date().toISOString();
  const decision = buildBootstrapDecision({
    openid: auth.openid,
    now,
    existingUser
  });

  return {
    ok: true,
    operation: decision.operation,
    user: decision.record,
    skippedCollections: decision.lazyCollections
  };
}
