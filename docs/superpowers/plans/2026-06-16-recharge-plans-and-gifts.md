# Recharge Plans and Gifts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build fixed recharge plans, WeChat Pay recharge settlement, bonus balance ledgers, user gift snapshots, and checkout gift selection for the REST API, customer miniapp, and merchant miniapp.

**Architecture:** Merchant recharge plans live as validated runtime configuration. Customer recharge attempts create durable `RechargeTransaction` rows, and payment settlement idempotently writes paid/bonus balance ledgers plus `UserGift` snapshots. Checkout locks available gifts during order creation, then redeems or releases them based on payment outcome.

**Tech Stack:** TypeScript, Prisma/MySQL, Fastify REST API, WeChat miniapp pages/services, Vitest, existing committed `.js` miniapp runtime mirrors.

---

## File Structure

Backend shared contracts:

- Modify `packages/shared/src/types/runtime-config.ts` to add `recharge-plans` as a runtime config section.
- Create `packages/shared/src/types/recharge.ts` for plan, transaction, gift, and API view types.
- Create `packages/shared/src/schema/recharge.ts` and `packages/shared/src/schema/recharge.test.ts` for pure validation/normalization.
- Modify `packages/shared/src/index.ts` to export recharge contracts.

API:

- Modify `apps/api/prisma/schema.prisma` and create migration `apps/api/prisma/migrations/202606160001_add_recharge_gifts/migration.sql`.
- Modify `apps/api/src/db/enums.ts` for recharge and gift enum maps.
- Create `apps/api/src/modules/recharge/repository.ts`, `service.ts`, and `service.test.ts`.
- Create `apps/api/src/modules/gifts/repository.ts`, `service.ts`, and `service.test.ts`.
- Modify `apps/api/src/modules/payments/provider.ts` to support a generic WeChat payment subject, not only orders.
- Modify `apps/api/src/modules/payments/notification-service.ts` to route order vs recharge notifications.
- Modify `apps/api/src/modules/orders/service.ts` and `repository.ts` for selected gift IDs and order snapshot gift data.
- Create `apps/api/src/routes/customer/recharge.ts` and `apps/api/src/routes/merchant/recharge.ts`.
- Modify `apps/api/src/routes/customer/account.ts`, `apps/api/src/routes/dependencies.ts`, and `apps/api/src/routes/api-v1.ts`.

Customer miniapp:

- Create `apps/customer-miniapp/src/services/recharge.ts` and `recharge.test.ts`.
- Create `apps/customer-miniapp/src/services/gifts.ts` and `gifts.test.ts`.
- Modify `apps/customer-miniapp/src/services/order-submit.ts` and `checkout.ts` for selected gifts.
- Add pages `apps/customer-miniapp/pages/recharge/*`, `my-gifts/*`, and `checkout-gifts/*`.
- Modify `apps/customer-miniapp/pages/balance/*`, `profile/*`, `checkout/*`, and `app.json`.
- Mirror generated runtime files where this repo currently keeps `.js` alongside `.ts`.

Merchant miniapp:

- Create `apps/merchant-miniapp/src/services/recharge-config.ts` and `recharge-config.test.ts`.
- Add page `apps/merchant-miniapp/pages/recharge-config/*`.
- Modify `apps/merchant-miniapp/pages/workspace/*`, `pages/runtime-config/*`, `src/services/workspace.ts/js`, and `app.json`.

## Task 1: Shared Recharge Contracts and Validation

**Files:**
- Modify: `packages/shared/src/types/runtime-config.ts`
- Create: `packages/shared/src/types/recharge.ts`
- Create: `packages/shared/src/schema/recharge.ts`
- Create: `packages/shared/src/schema/recharge.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write failing shared schema tests**

Add `packages/shared/src/schema/recharge.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  normalizeRechargePlansConfig,
  summarizeUserGiftStatus
} from './recharge';

describe('recharge schema', () => {
  it('normalizes recharge plans and gift valid days', () => {
    const result = normalizeRechargePlansConfig({
      plans: [
        {
          planId: 'plan-5000',
          enabled: true,
          paidAmount: 5000,
          bonusAmount: 500,
          description: '年度储值',
          gifts: [
            {
              giftTemplateId: 'cake-year',
              name: '周年蛋糕',
              description: '一年内可兑换',
              validDays: 365
            }
          ]
        }
      ]
    });

    expect(result.plans[0]).toMatchObject({
      planId: 'plan-5000',
      enabled: true,
      paidAmount: 5000,
      bonusAmount: 500
    });
    expect(result.plans[0]?.gifts[0]).toMatchObject({
      giftTemplateId: 'cake-year',
      validDays: 365
    });
  });

  it('rejects non-positive recharge amount and invalid gift days', () => {
    expect(() =>
      normalizeRechargePlansConfig({
        plans: [
          {
            planId: 'bad',
            enabled: true,
            paidAmount: 0,
            bonusAmount: 0,
            description: '',
            gifts: [{ giftTemplateId: 'gift-1', name: '蛋糕', description: '', validDays: 0 }]
          }
        ]
      })
    ).toThrow('INVALID_RECHARGE_PLAN');
  });

  it('summarizes expired available gifts as expired for display', () => {
    expect(
      summarizeUserGiftStatus({
        status: 'available',
        expiresAt: '2026-01-01T00:00:00.000Z'
      }, new Date('2026-06-16T00:00:00.000Z'))
    ).toBe('expired');
  });
});
```

- [ ] **Step 2: Run the failing shared test**

Run:

```bash
pnpm --filter @xiaipet/shared test -- src/schema/recharge.test.ts
```

Expected: FAIL because `./recharge` does not exist.

- [ ] **Step 3: Add shared types**

Add `packages/shared/src/types/recharge.ts`:

```ts
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
```

Modify `packages/shared/src/types/runtime-config.ts`:

```ts
import type { RechargePlansRuntimeConfigValue } from './recharge';

export const RUNTIME_CONFIG_SECTION_IDS = [
  'store-profile',
  'delivery-rules',
  'membership-tiers',
  'banner',
  'custom-notice',
  'recharge-plans'
] as const;

export interface RechargePlansRuntimeConfigSection extends RuntimeConfigSectionMeta {
  sectionId: 'recharge-plans';
  value: RechargePlansRuntimeConfigValue;
}

export type RuntimeConfigSectionDocument =
  | StoreProfileRuntimeConfigSection
  | DeliveryRulesRuntimeConfigSection
  | MembershipTiersRuntimeConfigSection
  | BannerRuntimeConfigSection
  | CustomNoticeRuntimeConfigSection
  | RechargePlansRuntimeConfigSection;
```

Modify `packages/shared/src/index.ts`:

```ts
export * from './types/recharge';
export * from './schema/recharge';
```

- [ ] **Step 4: Add normalization helpers**

Add `packages/shared/src/schema/recharge.ts`:

```ts
import type {
  RechargeGiftTemplate,
  RechargePlanConfig,
  RechargePlansRuntimeConfigValue,
  UserGiftDisplayGroup,
  UserGiftStatus
} from '../types/recharge';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asMoney(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? Math.floor(numberValue * 100) / 100 : 0;
}

function asDays(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? Math.trunc(numberValue) : 0;
}

function normalizeGift(value: unknown, index: number): RechargeGiftTemplate {
  if (!isRecord(value)) {
    throw new Error('INVALID_RECHARGE_GIFT');
  }
  const gift = {
    giftTemplateId: asString(value.giftTemplateId, asString(value.id, `gift-${index + 1}`)),
    name: asString(value.name),
    description: asString(value.description),
    validDays: asDays(value.validDays)
  };

  if (!gift.name || gift.validDays <= 0) {
    throw new Error('INVALID_RECHARGE_GIFT');
  }

  return gift;
}

function normalizePlan(value: unknown, index: number): RechargePlanConfig {
  if (!isRecord(value)) {
    throw new Error('INVALID_RECHARGE_PLAN');
  }
  const plan = {
    planId: asString(value.planId, asString(value.id, `plan-${index + 1}`)),
    enabled: typeof value.enabled === 'boolean' ? value.enabled : true,
    paidAmount: asMoney(value.paidAmount),
    bonusAmount: asMoney(value.bonusAmount),
    description: asString(value.description),
    gifts: Array.isArray(value.gifts) ? value.gifts.map(normalizeGift) : []
  };

  if (!plan.planId || plan.paidAmount <= 0 || plan.bonusAmount < 0) {
    throw new Error('INVALID_RECHARGE_PLAN');
  }

  return plan;
}

export function normalizeRechargePlansConfig(input: unknown): RechargePlansRuntimeConfigValue {
  if (!isRecord(input)) {
    return { plans: [] };
  }
  const plans = Array.isArray(input.plans) ? input.plans.map(normalizePlan) : [];
  return { plans };
}

export function summarizeUserGiftStatus(
  gift: { status: UserGiftStatus; expiresAt: string },
  now = new Date()
): UserGiftDisplayGroup {
  if (gift.status === 'redeemed') return 'redeemed';
  if (gift.status === 'locked') return 'locked';
  const expiresAt = new Date(gift.expiresAt);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= now.getTime() ? 'expired' : 'available';
}
```

- [ ] **Step 5: Run shared tests**

Run:

```bash
pnpm --filter @xiaipet/shared test -- src/schema/recharge.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit shared contracts**

```bash
git add packages/shared/src/types/runtime-config.ts packages/shared/src/types/recharge.ts packages/shared/src/schema/recharge.ts packages/shared/src/schema/recharge.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): add recharge and gift contracts"
```

## Task 2: Database Models and API Repositories

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/202606160001_add_recharge_gifts/migration.sql`
- Modify: `apps/api/src/db/enums.ts`
- Create: `apps/api/src/modules/recharge/repository.ts`
- Create: `apps/api/src/modules/gifts/repository.ts`
- Test: `apps/api/src/modules/recharge/service.test.ts`
- Test: `apps/api/src/modules/gifts/service.test.ts`

- [ ] **Step 1: Write repository/service-facing API tests first**

Create initial test files with repository mocks in later tasks. Start with failing imports:

```ts
// apps/api/src/modules/recharge/service.test.ts
import { describe, expect, it } from 'vitest';
import { createRechargeService } from './service';

describe('createRechargeService', () => {
  it('will create recharge transactions from enabled plans', async () => {
    expect(createRechargeService).toBeTypeOf('function');
  });
});
```

```ts
// apps/api/src/modules/gifts/service.test.ts
import { describe, expect, it } from 'vitest';
import { createGiftService } from './service';

describe('createGiftService', () => {
  it('will expose checkout eligible gifts', async () => {
    expect(createGiftService).toBeTypeOf('function');
  });
});
```

- [ ] **Step 2: Run tests to verify imports fail**

Run:

```bash
pnpm --filter @xiaipet/api test -- src/modules/recharge/service.test.ts src/modules/gifts/service.test.ts
```

Expected: FAIL because service modules do not exist.

- [ ] **Step 3: Add Prisma schema**

Modify `apps/api/prisma/schema.prisma`:

```prisma
enum RechargeTransactionStatus {
  PENDING    @map("pending")
  PROCESSING @map("processing")
  PAID       @map("paid")
  FAILED     @map("failed")
  CANCELLED  @map("cancelled")

  @@map("recharge_transaction_status")
}

enum UserGiftStatus {
  AVAILABLE @map("available")
  LOCKED    @map("locked")
  REDEEMED  @map("redeemed")

  @@map("user_gift_status")
}

model RechargeTransaction {
  id             String                    @id @db.VarChar(191)
  openid         String                    @db.VarChar(191)
  planId         String                    @db.VarChar(191)
  planSnapshot   Json
  paidAmount     Decimal                   @db.Decimal(10, 2)
  bonusAmount    Decimal                   @db.Decimal(10, 2)
  status         RechargeTransactionStatus @default(PENDING)
  outTradeNo     String                    @unique @db.VarChar(191)
  prepayId       String?                   @db.VarChar(191)
  transactionId  String?                   @unique @db.VarChar(191)
  idempotencyKey String                    @db.VarChar(191)
  paidAt         DateTime?
  settledAt      DateTime?
  createdAt      DateTime                  @default(now())
  updatedAt      DateTime                  @updatedAt

  user  User       @relation(fields: [openid], references: [openid], onDelete: Restrict)
  gifts UserGift[]

  @@unique([openid, idempotencyKey])
  @@index([openid, createdAt])
  @@index([status, createdAt])
  @@map("recharge_transactions")
}

model UserGift {
  id                          String         @id @default(cuid())
  openid                      String         @db.VarChar(191)
  sourceRechargeTransactionId String         @db.VarChar(191)
  sourcePlanId                String         @db.VarChar(191)
  giftTemplateId              String         @db.VarChar(191)
  giftSnapshot                Json
  status                      UserGiftStatus @default(AVAILABLE)
  expiresAt                   DateTime
  lockedOrderId               String?        @db.VarChar(191)
  redeemedOrderId             String?        @db.VarChar(191)
  lockedAt                    DateTime?
  redeemedAt                  DateTime?
  releasedAt                  DateTime?
  createdAt                   DateTime       @default(now())
  updatedAt                   DateTime       @updatedAt

  user                User                @relation(fields: [openid], references: [openid], onDelete: Restrict)
  rechargeTransaction RechargeTransaction @relation(fields: [sourceRechargeTransactionId], references: [id], onDelete: Restrict)

  @@index([openid, status, expiresAt])
  @@index([lockedOrderId])
  @@index([redeemedOrderId])
  @@map("user_gifts")
}
```

Also add relations to `User`:

```prisma
rechargeTransactions RechargeTransaction[]
gifts                UserGift[]
```

- [ ] **Step 4: Add SQL migration**

Create `apps/api/prisma/migrations/202606160001_add_recharge_gifts/migration.sql` with MySQL DDL matching the Prisma schema:

```sql
CREATE TABLE `recharge_transactions` (
  `id` VARCHAR(191) NOT NULL,
  `openid` VARCHAR(191) NOT NULL,
  `planId` VARCHAR(191) NOT NULL,
  `planSnapshot` JSON NOT NULL,
  `paidAmount` DECIMAL(10,2) NOT NULL,
  `bonusAmount` DECIMAL(10,2) NOT NULL,
  `status` ENUM('pending','processing','paid','failed','cancelled') NOT NULL DEFAULT 'pending',
  `outTradeNo` VARCHAR(191) NOT NULL,
  `prepayId` VARCHAR(191) NULL,
  `transactionId` VARCHAR(191) NULL,
  `idempotencyKey` VARCHAR(191) NOT NULL,
  `paidAt` DATETIME(3) NULL,
  `settledAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `recharge_transactions_outTradeNo_key` (`outTradeNo`),
  UNIQUE INDEX `recharge_transactions_transactionId_key` (`transactionId`),
  UNIQUE INDEX `recharge_transactions_openid_idempotencyKey_key` (`openid`, `idempotencyKey`),
  INDEX `recharge_transactions_openid_createdAt_idx` (`openid`, `createdAt`),
  INDEX `recharge_transactions_status_createdAt_idx` (`status`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `user_gifts` (
  `id` VARCHAR(191) NOT NULL,
  `openid` VARCHAR(191) NOT NULL,
  `sourceRechargeTransactionId` VARCHAR(191) NOT NULL,
  `sourcePlanId` VARCHAR(191) NOT NULL,
  `giftTemplateId` VARCHAR(191) NOT NULL,
  `giftSnapshot` JSON NOT NULL,
  `status` ENUM('available','locked','redeemed') NOT NULL DEFAULT 'available',
  `expiresAt` DATETIME(3) NOT NULL,
  `lockedOrderId` VARCHAR(191) NULL,
  `redeemedOrderId` VARCHAR(191) NULL,
  `lockedAt` DATETIME(3) NULL,
  `redeemedAt` DATETIME(3) NULL,
  `releasedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `user_gifts_openid_status_expiresAt_idx` (`openid`, `status`, `expiresAt`),
  INDEX `user_gifts_lockedOrderId_idx` (`lockedOrderId`),
  INDEX `user_gifts_redeemedOrderId_idx` (`redeemedOrderId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `recharge_transactions`
  ADD CONSTRAINT `recharge_transactions_openid_fkey`
  FOREIGN KEY (`openid`) REFERENCES `users`(`openid`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `user_gifts`
  ADD CONSTRAINT `user_gifts_openid_fkey`
  FOREIGN KEY (`openid`) REFERENCES `users`(`openid`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `user_gifts_sourceRechargeTransactionId_fkey`
  FOREIGN KEY (`sourceRechargeTransactionId`) REFERENCES `recharge_transactions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
```

- [ ] **Step 5: Add enum maps**

Modify `apps/api/src/db/enums.ts`:

```ts
export const RECHARGE_TRANSACTION_STATUS = {
  pending: 'PENDING',
  processing: 'PROCESSING',
  paid: 'PAID',
  failed: 'FAILED',
  cancelled: 'CANCELLED'
} as const;

export const USER_GIFT_STATUS = {
  available: 'AVAILABLE',
  locked: 'LOCKED',
  redeemed: 'REDEEMED'
} as const;
```

- [ ] **Step 6: Add repositories**

Create `apps/api/src/modules/recharge/repository.ts` and `apps/api/src/modules/gifts/repository.ts` with thin Prisma methods only. Keep business logic in services.

Minimum recharge repository methods:

```ts
export function createRechargeRepository(client: DbClient = getPrismaClient()) {
  return {
    findByOpenidAndIdempotencyKey(openid: string, idempotencyKey: string) {
      return client.rechargeTransaction.findUnique({
        where: { openid_idempotencyKey: { openid, idempotencyKey } }
      });
    },
    findById(transactionId: string) {
      return client.rechargeTransaction.findUnique({ where: { id: transactionId } });
    },
    findByOutTradeNo(outTradeNo: string) {
      return client.rechargeTransaction.findUnique({ where: { outTradeNo } });
    }
  };
}
```

Minimum gift repository methods:

```ts
export function createGiftRepository(client: DbClient = getPrismaClient()) {
  return {
    listByOpenid(openid: string) {
      return client.userGift.findMany({
        where: { openid },
        orderBy: [{ status: 'asc' }, { expiresAt: 'asc' }, { createdAt: 'desc' }]
      });
    },
    listCheckoutEligible(openid: string, now = new Date()) {
      return client.userGift.findMany({
        where: {
          openid,
          status: 'AVAILABLE',
          expiresAt: { gt: now }
        },
        orderBy: [{ expiresAt: 'asc' }, { createdAt: 'desc' }]
      });
    }
  };
}
```

- [ ] **Step 7: Run Prisma generation and API tests**

Run:

```bash
pnpm --filter @xiaipet/api db:generate
pnpm --filter @xiaipet/api test -- src/modules/recharge/service.test.ts src/modules/gifts/service.test.ts
```

Expected: tests still fail until services are implemented, but Prisma generation should pass.

- [ ] **Step 8: Commit database foundation**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/202606160001_add_recharge_gifts/migration.sql apps/api/src/db/enums.ts apps/api/src/modules/recharge/repository.ts apps/api/src/modules/gifts/repository.ts apps/api/src/modules/recharge/service.test.ts apps/api/src/modules/gifts/service.test.ts
git commit -m "feat(api): add recharge and gift persistence"
```

## Task 3: Recharge API Service and Routes

**Files:**
- Create: `apps/api/src/modules/recharge/service.ts`
- Modify: `apps/api/src/modules/recharge/service.test.ts`
- Create: `apps/api/src/routes/customer/recharge.ts`
- Create: `apps/api/src/routes/merchant/recharge.ts`
- Modify: `apps/api/src/routes/dependencies.ts`
- Modify: `apps/api/src/routes/api-v1.ts`
- Test: `apps/api/src/routes/customer-account.routes.test.ts` or new `apps/api/src/routes/recharge.routes.test.ts`

- [ ] **Step 1: Expand recharge service tests**

Test these cases in `apps/api/src/modules/recharge/service.test.ts` with fake repository/runtime config/payment provider:

```ts
it('creates a recharge transaction from an enabled plan and returns payment params', async () => {
  const service = createRechargeService(fakeClient as never, fakePaymentProvider);
  await expect(
    service.createCustomerRechargeTransaction('openid-1', {
      planId: 'plan-5000',
      idempotencyKey: 'recharge-1'
    })
  ).resolves.toMatchObject({
    ok: true,
    transaction: {
      planId: 'plan-5000',
      paidAmount: 5000,
      bonusAmount: 500,
      status: 'processing'
    },
    paymentParams: {
      package: 'prepay_id=mock-recharge'
    }
  });
});

it('rejects unavailable plans', async () => {
  const service = createRechargeService(fakeClientWithDisabledPlan as never, fakePaymentProvider);
  await expect(
    service.createCustomerRechargeTransaction('openid-1', {
      planId: 'plan-5000',
      idempotencyKey: 'recharge-1'
    })
  ).rejects.toMatchObject({ code: 'RECHARGE_PLAN_UNAVAILABLE' });
});
```

- [ ] **Step 2: Run failing recharge service tests**

Run:

```bash
pnpm --filter @xiaipet/api test -- src/modules/recharge/service.test.ts
```

Expected: FAIL because service methods are not implemented.

- [ ] **Step 3: Implement recharge service**

Create `apps/api/src/modules/recharge/service.ts` with these public methods:

```ts
export function createRechargeService(
  client: DbClient = getPrismaClient(),
  paymentProvider: PaymentProvider = createMockPaymentProvider()
) {
  return {
    async listCustomerRechargePlans() {
      const config = await readRechargePlans(client);
      return { ok: true as const, plans: config.plans.filter((plan) => plan.enabled) };
    },
    async listMerchantRechargePlans(_merchantContext: MerchantContext) {
      const config = await readRechargePlans(client);
      return { ok: true as const, plans: config.plans };
    },
    async saveMerchantRechargePlans(merchantContext: MerchantContext, payload: unknown) {
      const value = normalizeRechargePlansConfig(payload);
      const section = await createRuntimeConfigRepository(client).upsertSection({
        sectionId: 'recharge-plans',
        value,
        updatedBy: merchantContext.openid
      });
      return { ok: true as const, section, plans: value.plans };
    },
    async createCustomerRechargeTransaction(openid: string, payload: unknown) {
      const input = validateCreateRechargeInput(payload);
      const config = await readRechargePlans(client);
      const plan = config.plans.find((item) => item.planId === input.planId && item.enabled);
      if (!plan) throw new ApiError('RECHARGE_PLAN_UNAVAILABLE', 'Recharge plan is unavailable', 409);
      return createRechargeTransactionWithPayment(client, paymentProvider, openid, input, plan);
    },
    async syncCustomerRechargeTransaction(openid: string, transactionId: string) {
      return syncRechargeTransaction(client, paymentProvider, openid, transactionId);
    },
    async settleWechatRechargePayment(outTradeNo: string, payment: { transactionId?: string; paidAt?: Date }) {
      return settleRechargePayment(client, outTradeNo, payment);
    }
  };
}
```

The helper `readRechargePlans` should read `RuntimeConfigSection` id `recharge-plans`, pass `section.value` through `normalizeRechargePlansConfig`, and return `{ plans: [] }` if the section is missing.

- [ ] **Step 4: Add customer and merchant routes**

Create `apps/api/src/routes/customer/recharge.ts`:

```ts
export async function customerRechargeRoutes(app: FastifyInstance, options: { dependencies: ApiRouteDependencies }) {
  const { dependencies } = options;
  const customerGuard = { preHandler: dependencies.guards.requireCustomerSession };

  app.get('/recharge-plans', customerGuard, async () => {
    return dependencies.rechargeService.listCustomerRechargePlans();
  });

  app.post('/recharge-transactions', customerGuard, async (request) => {
    return dependencies.rechargeService.createCustomerRechargeTransaction(request.auth?.openid ?? '', request.body);
  });

  app.post('/recharge-transactions/:transactionId/payment-sync', customerGuard, async (request) => {
    const params = request.params as { transactionId: string };
    return dependencies.rechargeService.syncCustomerRechargeTransaction(request.auth?.openid ?? '', params.transactionId);
  });
}
```

Create `apps/api/src/routes/merchant/recharge.ts`:

```ts
export async function merchantRechargeRoutes(app: FastifyInstance, options: { dependencies: ApiRouteDependencies }) {
  const { dependencies } = options;
  const adminGuard = { preHandler: dependencies.guards.requireMerchantAdminSession };

  app.get('/recharge-plans', adminGuard, async (request) => {
    return dependencies.rechargeService.listMerchantRechargePlans(request.merchant);
  });

  app.put('/recharge-plans', adminGuard, async (request) => {
    return dependencies.rechargeService.saveMerchantRechargePlans(request.merchant, request.body);
  });
}
```

Register both in `api-v1.ts` and add `rechargeService` to `ApiRouteServices` and dependency construction.

- [ ] **Step 5: Run recharge API tests**

Run:

```bash
pnpm --filter @xiaipet/api test -- src/modules/recharge/service.test.ts src/routes/recharge.routes.test.ts
```

Expected: PASS after route tests are added.

- [ ] **Step 6: Commit recharge API surface**

```bash
git add apps/api/src/modules/recharge/service.ts apps/api/src/modules/recharge/service.test.ts apps/api/src/routes/customer/recharge.ts apps/api/src/routes/merchant/recharge.ts apps/api/src/routes/dependencies.ts apps/api/src/routes/api-v1.ts apps/api/src/routes/recharge.routes.test.ts
git commit -m "feat(api): add recharge plan routes"
```

## Task 4: Payment Settlement for Recharge

**Files:**
- Modify: `apps/api/src/modules/payments/provider.ts`
- Modify: `apps/api/src/modules/payments/provider.test.ts`
- Modify: `apps/api/src/modules/payments/notification-service.ts`
- Modify: `apps/api/src/modules/payments/notification-service.test.ts`
- Modify: `apps/api/src/modules/recharge/service.ts`
- Modify: `apps/api/src/modules/recharge/service.test.ts`

- [ ] **Step 1: Add payment provider tests for generic subject**

Update provider tests to call:

```ts
await expect(
  provider.startWechatPayment(
    {
      id: 'recharge-001',
      description: 'XiAiPet 充值 5000',
      amount: 5000
    },
    { openid: 'openid-1' }
  )
).resolves.toMatchObject({
  outTradeNo: 'recharge-001',
  paymentParams: expect.objectContaining({ package: expect.stringContaining('prepay_id=') })
});
```

- [ ] **Step 2: Run failing payment tests**

Run:

```bash
pnpm --filter @xiaipet/api test -- src/modules/payments/provider.test.ts src/modules/payments/notification-service.test.ts
```

Expected: FAIL because `startWechatPayment` still expects order-specific input.

- [ ] **Step 3: Generalize payment provider**

In `apps/api/src/modules/payments/provider.ts`, define:

```ts
export interface WechatPaymentSubject {
  id: string;
  description: string;
  amount: number;
}

export interface PaymentProvider {
  startWechatPayment(subject: WechatPaymentSubject, context: WechatPaymentContext): Promise<WechatPaymentStartResult>;
  syncWechatPayment(subject: WechatPaymentSubject, context: WechatPaymentContext): Promise<WechatPaymentSyncResult>;
}

export function createOrderPaymentSubject(order: OrderRecord): WechatPaymentSubject {
  return {
    id: order.id,
    description: `XiAiPet 订单 ${order.id}`,
    amount: order.pricing.payableTotal
  };
}
```

Use `subject.id`, `subject.description`, and `subject.amount` in mock and real providers.

Update `apps/api/src/modules/orders/service.ts` to pass `createOrderPaymentSubject(order)` for order payment start/sync.

- [ ] **Step 4: Route notification by out trade number**

Modify `createPaymentNotifyService` so successful notifications do:

```ts
if (resource.trade_state === 'SUCCESS') {
  const paidAt = resource.success_time ? new Date(resource.success_time) : new Date();
  const outTradeNo = resource.out_trade_no;

  if (outTradeNo.startsWith('recharge-')) {
    await createRechargeService(client).settleWechatRechargePayment(outTradeNo, {
      transactionId: resource.transaction_id,
      paidAt
    });
  } else {
    const paymentRepository = createPaymentRepository(client);
    await paymentRepository.upsertPayment({
      orderId: outTradeNo,
      method: 'wechat',
      status: 'paid',
      outTradeNo,
      transactionId: resource.transaction_id,
      paidAt
    });
    await paymentRepository.markOrderPaid(outTradeNo, paidAt);
  }
}
```

Use an import that avoids circular runtime problems; if needed, extract `settleRechargePayment` into `apps/api/src/modules/recharge/settlement.ts`.

- [ ] **Step 5: Implement idempotent settlement**

In recharge service, settlement must run inside `client.$transaction`:

```ts
const existing = await tx.rechargeTransaction.findUnique({ where: { outTradeNo } });
if (!existing) throw new ApiError('RECHARGE_TRANSACTION_NOT_FOUND', 'Recharge transaction not found', 404);
if (existing.settledAt) return mapRechargeTransaction(existing);

await createBalanceService(tx as never).adjustBalance({
  openid: existing.openid,
  amountDelta: existing.paidAmount.toNumber(),
  type: 'recharge',
  idempotencyKey: `recharge-paid-${existing.id}`,
  reason: '充值到账',
  metadata: { rechargeTransactionId: existing.id, amountKind: 'paid', planId: existing.planId }
});

if (existing.bonusAmount.toNumber() > 0) {
  await createBalanceService(tx as never).adjustBalance({
    openid: existing.openid,
    amountDelta: existing.bonusAmount.toNumber(),
    type: 'recharge',
    idempotencyKey: `recharge-bonus-${existing.id}`,
    reason: '充值赠送',
    metadata: { rechargeTransactionId: existing.id, amountKind: 'bonus', planId: existing.planId }
  });
}
```

Then create one `userGift` row per gift snapshot with `expiresAt = paidAt + validDays`.

- [ ] **Step 6: Run settlement tests**

Run:

```bash
pnpm --filter @xiaipet/api test -- src/modules/recharge/service.test.ts src/modules/payments/provider.test.ts src/modules/payments/notification-service.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit payment settlement**

```bash
git add apps/api/src/modules/payments/provider.ts apps/api/src/modules/payments/provider.test.ts apps/api/src/modules/payments/notification-service.ts apps/api/src/modules/payments/notification-service.test.ts apps/api/src/modules/orders/service.ts apps/api/src/modules/recharge/service.ts apps/api/src/modules/recharge/service.test.ts
git commit -m "feat(api): settle recharge payments"
```

## Task 5: Gift Service and Order Integration

**Files:**
- Create: `apps/api/src/modules/gifts/service.ts`
- Modify: `apps/api/src/modules/gifts/service.test.ts`
- Modify: `apps/api/src/modules/orders/service.ts`
- Modify: `apps/api/src/modules/orders/repository.ts`
- Modify: `apps/api/src/modules/orders/service.test.ts`
- Modify: `apps/api/src/routes/customer/account.ts`
- Modify: `apps/api/src/routes/dependencies.ts`

- [ ] **Step 1: Expand gift service tests**

Add tests:

```ts
it('groups expired available gifts as expired for my gifts', async () => {
  const service = createGiftService(fakeClientWithExpiredGift as never);
  await expect(service.listCustomerGifts('openid-1')).resolves.toMatchObject({
    ok: true,
    groups: {
      expired: [expect.objectContaining({ id: 'gift-expired' })]
    }
  });
});

it('locks selected gifts atomically for order creation', async () => {
  const service = createGiftService(fakeClientWithAvailableGift as never);
  await expect(service.lockGiftsForOrder('openid-1', 'order-1', ['gift-1'])).resolves.toEqual([
    expect.objectContaining({ id: 'gift-1', giftSnapshot: expect.objectContaining({ name: '周年蛋糕' }) })
  ]);
});
```

- [ ] **Step 2: Implement gift service**

Create `apps/api/src/modules/gifts/service.ts`:

```ts
export function createGiftService(client: DbClient = getPrismaClient()) {
  return {
    async listCustomerGifts(openid: string) {
      const gifts = await createGiftRepository(client).listByOpenid(openid);
      const mapped = gifts.map((gift) => mapUserGift(gift));
      return {
        ok: true as const,
        gifts: mapped,
        groups: groupUserGifts(mapped)
      };
    },
    async listCheckoutGifts(openid: string) {
      const gifts = await createGiftRepository(client).listCheckoutEligible(openid);
      return { ok: true as const, gifts: gifts.map((gift) => mapUserGift(gift)) };
    },
    async lockGiftsForOrder(openid: string, orderId: string, giftIds: string[], txClient: DbClient = client) {
      return lockGiftsForOrder(txClient, openid, orderId, giftIds);
    },
    async redeemGiftsForOrder(orderId: string, txClient: DbClient = client) {
      return redeemGiftsForOrder(txClient, orderId);
    },
    async releaseGiftsForOrder(orderId: string, txClient: DbClient = client) {
      return releaseGiftsForOrder(txClient, orderId);
    }
  };
}
```

`lockGiftsForOrder` must use `updateMany` guarded by `openid`, `status: AVAILABLE`, `expiresAt > now`, and exact ID count. If the updated count does not equal selected IDs, throw `GIFT_UNAVAILABLE`.

- [ ] **Step 3: Add customer gift routes**

Modify `apps/api/src/routes/customer/account.ts`:

```ts
app.get('/gifts', customerGuard, async (request) => {
  return dependencies.giftService.listCustomerGifts(request.auth?.openid ?? '');
});

app.get('/checkout-gifts', customerGuard, async (request) => {
  return dependencies.giftService.listCheckoutGifts(request.auth?.openid ?? '');
});
```

Add `giftService` to route dependencies.

- [ ] **Step 4: Extend order payload and snapshot**

In `apps/api/src/modules/orders/service.ts`, normalize `selectedGiftIds`:

```ts
function normalizeSelectedGiftIds(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim()).map((item) => item.trim()))]
    : [];
}
```

Add `selectedGiftIds` to `CreateOrderInput`, and inside `createPendingOrder` transaction:

```ts
const giftSnapshots = input.selectedGiftIds.length
  ? await createGiftService(tx as never).lockGiftsForOrder(input.openid, input.id, input.selectedGiftIds, tx as never)
  : [];

const order = await orderRepository.createPending({
  ...input,
  snapshot: appendGiftSnapshots(input.snapshot, giftSnapshots)
});
```

Use `appendGiftSnapshots` to add `gifts` to the existing order snapshot without dropping existing fields:

```ts
function appendGiftSnapshots(snapshot: unknown, gifts: Array<{ id: string; giftSnapshot: unknown }>) {
  return {
    ...(snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) ? snapshot : {}),
    gifts: gifts.map((gift) => ({ id: gift.id, ...gift.giftSnapshot }))
  };
}
```

- [ ] **Step 5: Redeem/release gifts from payment paths**

In `startCustomerPayment`:

- For balance payment success, redeem after marking order paid.
- For balance payment insufficient funds, release gifts for that order before returning blocked.

In `syncCustomerPayment`, when WeChat sync succeeds and order is marked paid, redeem gifts for the order.

In notification-based order settlement, also redeem gifts for successful order payment. If this causes circular imports, create `apps/api/src/modules/orders/settlement.ts` with a shared `markOrderPaidAndRedeemGifts(client, orderId, paidAt)` helper.

- [ ] **Step 6: Run order/gift tests**

Run:

```bash
pnpm --filter @xiaipet/api test -- src/modules/gifts/service.test.ts src/modules/orders/service.test.ts src/routes/customer-account.routes.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit gift order integration**

```bash
git add apps/api/src/modules/gifts/service.ts apps/api/src/modules/gifts/service.test.ts apps/api/src/modules/orders/service.ts apps/api/src/modules/orders/repository.ts apps/api/src/modules/orders/service.test.ts apps/api/src/routes/customer/account.ts apps/api/src/routes/dependencies.ts
git commit -m "feat(api): support checkout gifts"
```

## Task 6: Customer Miniapp Services

**Files:**
- Create: `apps/customer-miniapp/src/services/recharge.ts`
- Create: `apps/customer-miniapp/src/services/recharge.test.ts`
- Create: `apps/customer-miniapp/src/services/gifts.ts`
- Create: `apps/customer-miniapp/src/services/gifts.test.ts`
- Modify: `apps/customer-miniapp/src/services/checkout.ts`
- Modify: `apps/customer-miniapp/src/services/order-submit.ts`
- Modify JS mirrors for changed services.

- [ ] **Step 1: Write customer service tests**

Create recharge test:

```ts
it('creates a recharge transaction and requests WeChat payment', async () => {
  const request = vi.fn(async () => ({
    ok: true,
    transaction: { id: 'recharge-1', status: 'processing' },
    paymentParams: { package: 'prepay_id=mock' }
  }));

  await expect(startRecharge('plan-5000', request as never)).resolves.toMatchObject({
    transaction: { id: 'recharge-1' }
  });
});
```

Create gifts test:

```ts
it('toggles checkout gift selection and returns selected ids', () => {
  resetCheckoutGiftSelection();
  toggleCheckoutGiftSelection('gift-1');
  expect(getSelectedCheckoutGiftIds()).toEqual(['gift-1']);
  toggleCheckoutGiftSelection('gift-1');
  expect(getSelectedCheckoutGiftIds()).toEqual([]);
});
```

- [ ] **Step 2: Implement recharge service**

`apps/customer-miniapp/src/services/recharge.ts` should export:

```ts
let rechargePlans: RechargePlanConfig[] = [];
let selectedRechargePlanId = '';

export async function hydrateRechargePlans(request: CustomerApiRequester = customerApiRequest) {
  const response = await request<{ ok?: boolean; plans?: RechargePlanConfig[] }>('/api/v1/customer/recharge-plans', {
    method: 'GET',
    auth: 'customer'
  });
  rechargePlans = response.plans ?? [];
  selectedRechargePlanId = selectedRechargePlanId || rechargePlans[0]?.planId || '';
  return getRechargePlans();
}

export function getRechargePlans() {
  return rechargePlans.map((plan) => ({
    ...plan,
    gifts: plan.gifts.map((gift) => ({ ...gift }))
  }));
}

export function selectRechargePlan(planId: string) {
  selectedRechargePlanId = rechargePlans.some((plan) => plan.planId === planId) ? planId : selectedRechargePlanId;
  return getSelectedRechargePlan();
}

export function getSelectedRechargePlan() {
  return getRechargePlans().find((plan) => plan.planId === selectedRechargePlanId) ?? null;
}

export async function startRecharge(planId: string, request: CustomerApiRequester = customerApiRequest) {
  const response = await request<CreateRechargeTransactionResponse>('/api/v1/customer/recharge-transactions', {
    method: 'POST',
    auth: 'customer',
    body: {
      planId,
      idempotencyKey: `recharge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    }
  });
  await requestWechatPayment(response.paymentParams);
  return syncRechargeTransaction(response.transaction.id, request);
}

export async function syncRechargeTransaction(transactionId: string, request: CustomerApiRequester = customerApiRequest) {
  return request<{ ok?: boolean; transaction?: RechargeTransactionView }>(
    `/api/v1/customer/recharge-transactions/${transactionId}/payment-sync`,
    {
      method: 'POST',
      auth: 'customer'
    }
  );
}
```

`startRecharge` posts to `/api/v1/customer/recharge-transactions` with `{ planId, idempotencyKey: 'recharge-${Date.now()}-${random}' }`, calls `wx.requestPayment`, then calls sync.

- [ ] **Step 3: Implement gifts service**

`apps/customer-miniapp/src/services/gifts.ts` should export:

```ts
let myGiftGroups: Record<UserGiftDisplayGroup, UserGiftView[]> = {
  available: [],
  locked: [],
  redeemed: [],
  expired: []
};
let checkoutGiftOptions: UserGiftView[] = [];
let selectedCheckoutGiftIds: string[] = [];

export async function hydrateMyGifts(request = customerApiRequest) {
  const response = await request<{ ok?: boolean; groups?: Record<UserGiftDisplayGroup, UserGiftView[]> }>('/api/v1/customer/gifts', {
    method: 'GET',
    auth: 'customer'
  });
  myGiftGroups = response.groups ?? myGiftGroups;
  return getMyGiftGroups();
}

export async function hydrateCheckoutGifts(request = customerApiRequest) {
  const response = await request<{ ok?: boolean; gifts?: UserGiftView[] }>('/api/v1/customer/checkout-gifts', {
    method: 'GET',
    auth: 'customer'
  });
  checkoutGiftOptions = response.gifts ?? [];
  const validIds = new Set(checkoutGiftOptions.map((gift) => gift.id));
  selectedCheckoutGiftIds = selectedCheckoutGiftIds.filter((giftId) => validIds.has(giftId));
  return getCheckoutGiftOptions();
}

export function getMyGiftGroups() {
  return {
    available: myGiftGroups.available.map((gift) => ({ ...gift })),
    locked: myGiftGroups.locked.map((gift) => ({ ...gift })),
    redeemed: myGiftGroups.redeemed.map((gift) => ({ ...gift })),
    expired: myGiftGroups.expired.map((gift) => ({ ...gift }))
  };
}

export function getCheckoutGiftOptions() {
  const selectedIds = new Set(selectedCheckoutGiftIds);
  return checkoutGiftOptions.map((gift) => ({ ...gift, selected: selectedIds.has(gift.id) }));
}

export function toggleCheckoutGiftSelection(giftId: string) {
  const current = new Set(selectedCheckoutGiftIds);
  current.has(giftId) ? current.delete(giftId) : current.add(giftId);
  selectedCheckoutGiftIds = checkoutGiftOptions.filter((gift) => current.has(gift.id)).map((gift) => gift.id);
  return getSelectedCheckoutGiftIds();
}

export function getSelectedCheckoutGiftIds() {
  return [...selectedCheckoutGiftIds];
}

export function resetCheckoutGiftSelection() {
  selectedCheckoutGiftIds = [];
}

export function getSelectedCheckoutGiftSummary() {
  return checkoutGiftOptions.filter((gift) => selectedCheckoutGiftIds.includes(gift.id));
}
```

- [ ] **Step 4: Add selected gifts to order submit**

Modify `buildCreateOrderPayload`:

```ts
import { getSelectedCheckoutGiftIds } from './gifts';

return {
  ...existingPayload,
  selectedGiftIds: getSelectedCheckoutGiftIds()
};
```

Extend shared `CreateOrderPayload` type in Task 1 if not already done.

- [ ] **Step 5: Run customer service tests**

Run:

```bash
pnpm --filter @xiaipet/customer-miniapp test -- src/services/recharge.test.ts src/services/gifts.test.ts src/services/order-submit.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit customer services**

```bash
git add apps/customer-miniapp/src/services/recharge.ts apps/customer-miniapp/src/services/recharge.js apps/customer-miniapp/src/services/recharge.test.ts apps/customer-miniapp/src/services/gifts.ts apps/customer-miniapp/src/services/gifts.js apps/customer-miniapp/src/services/gifts.test.ts apps/customer-miniapp/src/services/checkout.ts apps/customer-miniapp/src/services/checkout.js apps/customer-miniapp/src/services/order-submit.ts apps/customer-miniapp/src/services/order-submit.js apps/customer-miniapp/src/services/order-submit.test.ts
git commit -m "feat(customer): add recharge and gift services"
```

## Task 7: Customer Miniapp Pages

**Files:**
- Create: `apps/customer-miniapp/pages/recharge/index.{json,ts,js,wxml,wxss}`
- Create: `apps/customer-miniapp/pages/my-gifts/index.{json,ts,js,wxml,wxss}`
- Create: `apps/customer-miniapp/pages/checkout-gifts/index.{json,ts,js,wxml,wxss}`
- Modify: `apps/customer-miniapp/pages/balance/index.{ts,js,wxml,wxss}`
- Modify: `apps/customer-miniapp/pages/profile/index.{ts,js,wxml,wxss}`
- Modify: `apps/customer-miniapp/pages/checkout/index.{ts,js,wxml,wxss}`
- Modify: `apps/customer-miniapp/app.json`
- Tests: existing page tests plus new `apps/customer-miniapp/pages/recharge-flow.test.ts`

- [ ] **Step 1: Write page flow tests**

Create `apps/customer-miniapp/pages/recharge-flow.test.ts` to assert:

```ts
it('navigates from balance page to recharge page', async () => {
  const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/balance/index.ts');
  const instance = page.getInstance();
  instance.handleRechargeTap();
  expect(wx.navigateTo).toHaveBeenCalledWith({ url: '/pages/recharge/index' });
});

it('navigates from checkout to checkout gift picker', async () => {
  const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/checkout/index.ts');
  const instance = page.getInstance();
  instance.handleGiftTap();
  expect(wx.navigateTo).toHaveBeenCalledWith({ url: '/pages/checkout-gifts/index' });
});
```

- [ ] **Step 2: Register pages**

Modify `apps/customer-miniapp/app.json` pages list:

```json
"pages/recharge/index",
"pages/my-gifts/index",
"pages/checkout-gifts/index"
```

- [ ] **Step 3: Add recharge page**

Implement page data:

```ts
interface RechargePageData {
  plans: RechargePlanConfig[];
  selectedPlanId: string;
  selectedPlan: RechargePlanConfig | null;
  loading: boolean;
  submitting: boolean;
}
```

Primary handlers:

```ts
async refreshPlans() {
  await hydrateRechargePlans();
  const plans = getRechargePlans();
  this.setData({ plans, selectedPlanId: plans[0]?.planId ?? '', selectedPlan: plans[0] ?? null });
}

async handleSubmitRecharge() {
  if (!this.data.selectedPlanId || this.data.submitting) return;
  this.setData({ submitting: true });
  try {
    await startRecharge(this.data.selectedPlanId);
    wx.showToast({ title: '充值成功', icon: 'success' });
    wx.navigateBack();
  } catch {
    wx.showToast({ title: '充值未完成', icon: 'none' });
  } finally {
    this.setData({ submitting: false });
  }
}
```

- [ ] **Step 4: Add my gifts page**

Use `hydrateMyGifts()` in `onShow`, then render `available`, `locked`, `redeemed`, and `expired` groups. Expired rows use disabled styling and remain visible.

- [ ] **Step 5: Add checkout gifts page**

Use `hydrateCheckoutGifts()` in `onShow`, render selectable gifts, and call `toggleCheckoutGiftSelection(giftId)` on tap. Confirm navigates back.

- [ ] **Step 6: Add entries to existing pages**

Balance page:

```ts
handleRechargeTap() {
  wx.navigateTo({ url: '/pages/recharge/index' });
}
```

Profile page:

```ts
handleGiftsTap() {
  wx.navigateTo({ url: '/pages/my-gifts/index' });
}
```

Checkout page:

```ts
handleGiftTap() {
  wx.navigateTo({ url: '/pages/checkout-gifts/index' });
}
```

- [ ] **Step 7: Run customer page tests**

Run:

```bash
pnpm --filter @xiaipet/customer-miniapp test -- pages/recharge-flow.test.ts pages/cart-checkout.test.ts pages/profile/index.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit customer pages**

```bash
git add apps/customer-miniapp/app.json apps/customer-miniapp/pages/recharge apps/customer-miniapp/pages/my-gifts apps/customer-miniapp/pages/checkout-gifts apps/customer-miniapp/pages/balance apps/customer-miniapp/pages/profile apps/customer-miniapp/pages/checkout apps/customer-miniapp/pages/recharge-flow.test.ts
git commit -m "feat(customer): add recharge and gift pages"
```

## Task 8: Merchant Recharge Configuration UI

**Files:**
- Create: `apps/merchant-miniapp/src/services/recharge-config.ts`
- Create: `apps/merchant-miniapp/src/services/recharge-config.test.ts`
- Create: `apps/merchant-miniapp/pages/recharge-config/index.{json,ts,js,wxml,wxss}`
- Modify: `apps/merchant-miniapp/src/services/workspace.ts/js`
- Modify: `apps/merchant-miniapp/pages/workspace/index.*`
- Modify: `apps/merchant-miniapp/pages/runtime-config/index.*`
- Modify: `apps/merchant-miniapp/app.json`

- [ ] **Step 1: Write merchant recharge config tests**

```ts
it('builds a new recharge plan draft with one editable gift', () => {
  const draft = buildRechargePlanDraft();
  expect(draft).toMatchObject({
    paidAmount: 0,
    bonusAmount: 0,
    gifts: []
  });
});

it('saves recharge plans through merchant API', async () => {
  const request = vi.fn(async () => ({ ok: true, plans: [] }));
  await saveRechargePlans({ plans: [] }, request as never);
  expect(request).toHaveBeenCalledWith('/api/v1/merchant/recharge-plans', expect.objectContaining({ method: 'PUT' }));
});
```

- [ ] **Step 2: Implement merchant recharge service**

Create exports:

```ts
export async function queryRechargePlans(request = merchantApiRequest) {
  const response = await request<{ ok?: boolean; plans?: RechargePlanConfig[] }>('/api/v1/merchant/recharge-plans', {
    method: 'GET',
    auth: 'merchant'
  });
  return response.plans ?? [];
}

export async function saveRechargePlans(value: RechargePlansRuntimeConfigValue, request = merchantApiRequest) {
  const normalized = normalizeRechargePlansConfig(value);
  const response = await request<{ ok?: boolean; plans?: RechargePlanConfig[] }>('/api/v1/merchant/recharge-plans', {
    method: 'PUT',
    auth: 'merchant',
    body: normalized
  });
  return response.plans ?? normalized.plans;
}

export function buildRechargePlanDraft(): RechargePlanConfig {
  const timestamp = Date.now();
  return {
    planId: `plan-${timestamp}`,
    enabled: true,
    paidAmount: 0,
    bonusAmount: 0,
    description: '',
    gifts: []
  };
}

export function buildRechargeGiftDraft(): RechargeGiftTemplate {
  return {
    giftTemplateId: `gift-${Date.now()}`,
    name: '',
    description: '',
    validDays: 365
  };
}

export function getRechargeConfigViewModel(plans: RechargePlanConfig[]) {
  return {
    enabledCount: plans.filter((plan) => plan.enabled).length,
    totalGiftCount: plans.reduce((sum, plan) => sum + plan.gifts.length, 0),
    rows: plans.map((plan) => ({
      ...plan,
      summaryLabel: `充 ${plan.paidAmount} 送 ${plan.bonusAmount} + ${plan.gifts.length} 个赠品`
    }))
  };
}
```

- [ ] **Step 3: Add merchant page**

Page data:

```ts
interface RechargeConfigPageData {
  loading: boolean;
  saving: boolean;
  plans: RechargePlanConfig[];
  expandedPlanId: string;
}
```

Handlers:

- `handleAddPlan`
- `handleDeletePlan`
- `handlePlanInput`
- `handleAddGift`
- `handleDeleteGift`
- `handleGiftInput`
- `handleSave`

Use `normalizeRechargePlansConfig({ plans })` before saving so frontend and backend validation match.

- [ ] **Step 4: Add workspace and runtime config entry**

Add `recharge-config` to `MerchantWorkspaceCard['id']`, admin allowed IDs, and `WORKSPACE_CARDS`:

```ts
{
  id: 'recharge-config',
  title: '充值',
  subtitle: '档位赠品',
  description: '维护充值金额、赠送余额、赠品有效期',
  badge: '权益',
  accent: '#F2C46F',
  iconToken: '充',
  actions: [{ label: '充值配置', url: '/pages/recharge-config/index', tone: 'primary' }]
}
```

Add a summary entry on runtime config page that navigates to `/pages/recharge-config/index`.

- [ ] **Step 5: Register page and run merchant tests**

Run:

```bash
pnpm --filter @xiaipet/merchant-miniapp test -- src/services/recharge-config.test.ts src/services/workspace.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit merchant UI**

```bash
git add apps/merchant-miniapp/app.json apps/merchant-miniapp/src/services/recharge-config.ts apps/merchant-miniapp/src/services/recharge-config.js apps/merchant-miniapp/src/services/recharge-config.test.ts apps/merchant-miniapp/pages/recharge-config apps/merchant-miniapp/src/services/workspace.ts apps/merchant-miniapp/src/services/workspace.js apps/merchant-miniapp/pages/workspace apps/merchant-miniapp/pages/runtime-config
git commit -m "feat(merchant): add recharge config"
```

## Task 9: Final Verification and Integration Cleanup

**Files:**
- Modify only files needed to resolve integration failures.
- Do not touch existing unrelated dirty catalog/assets work unless a test failure points directly at it and the user approves.

- [ ] **Step 1: Run targeted package tests**

Run:

```bash
pnpm --filter @xiaipet/shared test -- src/schema/recharge.test.ts
pnpm --filter @xiaipet/api test -- src/modules/recharge/service.test.ts src/modules/gifts/service.test.ts src/modules/orders/service.test.ts src/modules/payments/notification-service.test.ts
pnpm --filter @xiaipet/customer-miniapp test -- src/services/recharge.test.ts src/services/gifts.test.ts pages/recharge-flow.test.ts pages/cart-checkout.test.ts
pnpm --filter @xiaipet/merchant-miniapp test -- src/services/recharge-config.test.ts src/services/workspace.test.ts
```

Expected: all targeted tests PASS.

- [ ] **Step 2: Run typechecks**

Run:

```bash
pnpm --filter @xiaipet/shared typecheck
pnpm --filter @xiaipet/api typecheck
pnpm --filter @xiaipet/customer-miniapp typecheck
pnpm --filter @xiaipet/merchant-miniapp typecheck
```

Expected: all typechecks PASS.

- [ ] **Step 3: Run Prisma validation/generation**

Run:

```bash
pnpm --filter @xiaipet/api db:generate
pnpm --filter @xiaipet/api build
```

Expected: Prisma client generation and API build PASS.

- [ ] **Step 4: Inspect final diff**

Run:

```bash
git status --short
git diff --stat
```

Expected: only recharge/gift feature files are modified by this implementation, plus any pre-existing unrelated dirty files remain clearly separate and unstaged.

- [ ] **Step 5: Commit integration fixes**

If Step 1-4 required cleanup changes, commit them:

```bash
git add packages/shared/src/types/runtime-config.ts packages/shared/src/types/recharge.ts packages/shared/src/schema/recharge.ts packages/shared/src/schema/recharge.test.ts packages/shared/src/index.ts apps/api/prisma/schema.prisma apps/api/prisma/migrations/202606160001_add_recharge_gifts/migration.sql apps/api/src/db/enums.ts apps/api/src/modules/recharge apps/api/src/modules/gifts apps/api/src/modules/payments apps/api/src/modules/orders apps/api/src/routes/customer apps/api/src/routes/merchant apps/api/src/routes/dependencies.ts apps/api/src/routes/api-v1.ts apps/customer-miniapp/src/services/recharge.ts apps/customer-miniapp/src/services/recharge.js apps/customer-miniapp/src/services/recharge.test.ts apps/customer-miniapp/src/services/gifts.ts apps/customer-miniapp/src/services/gifts.js apps/customer-miniapp/src/services/gifts.test.ts apps/customer-miniapp/pages/recharge apps/customer-miniapp/pages/my-gifts apps/customer-miniapp/pages/checkout-gifts apps/merchant-miniapp/src/services/recharge-config.ts apps/merchant-miniapp/src/services/recharge-config.js apps/merchant-miniapp/src/services/recharge-config.test.ts apps/merchant-miniapp/pages/recharge-config
git commit -m "test: verify recharge gift flow"
```

If no cleanup changes were needed, skip this commit.

## Plan Self-Review

- Spec coverage: merchant recharge config, customer recharge, fixed tiers, two balance ledgers, gift snapshots, expiration, checkout lock/redeem/release, REST-only backend, and page/API tests are each covered by at least one task.
- Placeholder scan: no `TBD`, `TODO`, or deferred implementation placeholders are used in task steps.
- Type consistency: `RechargePlanConfig`, `RechargePlansRuntimeConfigValue`, `RechargeTransactionView`, `UserGiftStatus`, and `UserGiftView` originate in Task 1 and are reused consistently in later tasks.
- Scope check: Cloud Functions, custom recharge amount, inventory-linked gifts, and refund automation remain out of scope.
