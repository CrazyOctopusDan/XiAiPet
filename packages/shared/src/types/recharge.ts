export type RechargeTransactionStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
export type UserGiftStatus = 'available' | 'locked' | 'redeemed';
export type UserGiftDisplayGroup = 'available' | 'locked' | 'redeemed' | 'expired';

export interface RechargeGiftTemplate {
  giftTemplateId: string;
  name: string;
  description: string;
  validDays: number;
}

export interface RechargePlanConfig {
  planId: string;
  enabled: boolean;
  paidAmount: number;
  bonusAmount: number;
  description: string;
  gifts: RechargeGiftTemplate[];
}

export interface RechargePlansRuntimeConfigValue {
  plans: RechargePlanConfig[];
}

export interface RechargePlanSnapshot extends RechargePlanConfig {
  purchasedAt: string;
}

export interface RechargeTransactionView {
  id: string;
  planId: string;
  planSnapshot: RechargePlanSnapshot;
  paidAmount: number;
  bonusAmount: number;
  status: RechargeTransactionStatus;
  paidAt?: string;
  settledAt?: string;
}

export interface UserGiftSnapshot {
  name: string;
  description: string;
  validDays: number;
}

export interface UserGiftView {
  id: string;
  status: UserGiftStatus;
  displayGroup: UserGiftDisplayGroup;
  giftSnapshot: UserGiftSnapshot;
  expiresAt: string;
  lockedOrderId?: string;
  redeemedOrderId?: string;
  lockedAt?: string;
  redeemedAt?: string;
}
