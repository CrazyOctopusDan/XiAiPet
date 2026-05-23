import { ApiError } from '../../lib/errors';
import type { MerchantContext } from '../auth/types';
import { createBalanceService } from './balance-service';
import { createUserRepository } from './repository';

interface MerchantUserBalanceAdjustmentPayload {
  userOpenid: string;
  reasonType: string;
  note: string;
  operatedAt: string;
  delta: number;
}

function formatMoney(value: number) {
  return `￥${Math.abs(value).toFixed(2)}`;
}

function getBalanceAdjustmentShortNote(delta: number) {
  if (delta > 0) {
    return `增加 ${formatMoney(delta)}`;
  }
  if (delta < 0) {
    return `扣减 ${formatMoney(delta)}`;
  }
  return '余额未变化';
}

function isMerchantUserBalanceAdjustmentPayload(value: unknown): value is MerchantUserBalanceAdjustmentPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.userOpenid === 'string' &&
    typeof candidate.reasonType === 'string' &&
    typeof candidate.note === 'string' &&
    typeof candidate.operatedAt === 'string' &&
    typeof candidate.delta === 'number' &&
    Number.isFinite(candidate.delta)
  );
}

export function createMerchantUserService(
  userRepository = createUserRepository(),
  balanceService = createBalanceService()
) {
  return {
    async getMerchantUserDetail(_merchantContext: MerchantContext, openid: string) {
      return userRepository.getMerchantUserDetail(openid);
    },

    async getMerchantUserAddresses(_merchantContext: MerchantContext, openid: string) {
      return userRepository.getMerchantUserAddresses(openid);
    },

    async getMerchantUserBalanceLedgers(
      _merchantContext: MerchantContext,
      openid: string,
      pagination: { cursor?: string | number; limit?: string | number } = {}
    ) {
      return userRepository.getMerchantUserBalanceLedgers(openid, pagination);
    },

    async searchMerchantUsers(_merchantContext: MerchantContext, query: { query?: string; searchField?: string }) {
      const users = await userRepository.searchUsers(query.query ?? '', 20);
      return { ok: true as const, users };
    },

    async adjustUserBalance(merchantContext: MerchantContext, targetOpenid: string, payload: unknown) {
      if (!isMerchantUserBalanceAdjustmentPayload(payload)) {
        throw new ApiError('INVALID_BALANCE_ADJUSTMENT', 'Invalid balance adjustment payload', 400);
      }
      if (payload.userOpenid !== targetOpenid) {
        throw new ApiError('INVALID_BALANCE_ADJUSTMENT', 'Balance adjustment target mismatch', 400);
      }
      const ledger = await balanceService.adjustBalance({
        openid: targetOpenid,
        amountDelta: payload.delta,
        type: 'manual_adjustment',
        operatorId: merchantContext.openid,
        operatorName: merchantContext.storeName,
        reason: `${payload.reasonType}: ${payload.note}`,
        idempotencyKey: `merchant-adjust-${targetOpenid}-${payload.operatedAt}`,
        metadata: payload
      });
      return {
        ok: true as const,
        balanceAfter: ledger.balanceAfter,
        ledger: {
          ...ledger,
          normalizedTitle: payload.reasonType || '余额调整',
          shortNote: getBalanceAdjustmentShortNote(payload.delta)
        }
      };
    }
  };
}
