import type { ApiConfig } from '../config/env';
import { createCatalogService } from '../modules/catalog/service';
import { createAuthGuards } from '../modules/auth/guards';
import type { MerchantAccessService } from '../modules/auth/types';
import type { WechatLoginProvider } from '../modules/auth/wechat-login';
import { createWechatLoginProvider } from '../modules/auth/wechat-login';
import { createIdentityService } from '../modules/users/bootstrap-service';
import { createMerchantUserService } from '../modules/users/admin-service';
import { createOrderService } from '../modules/orders/service';
import {
  createMockPaymentProvider,
  createUnconfiguredWechatPaymentProvider,
  type PaymentProvider
} from '../modules/payments/provider';
import { createRuntimeConfigService } from '../modules/runtime-config/service';
import { createPrintingService } from '../modules/printing/service';

type AsyncResult = Promise<unknown>;

export interface ApiRouteServices {
  identityService: {
    bootstrapUser(openid: string): AsyncResult;
    bindPhone(openid: string, payload: unknown): AsyncResult;
    assertMerchantAccess(openid: string): ReturnType<MerchantAccessService['assertMerchantAccess']>;
  };
  catalogService: {
    queryCustomerCategories(): AsyncResult;
    queryCustomerProducts(filters?: { categoryId?: string }): AsyncResult;
    queryMerchantCategories(filters?: Record<string, unknown>): AsyncResult;
    upsertMerchantCategory(merchantContext: unknown, categoryId: string, payload: unknown): AsyncResult;
    queryMerchantProducts(filters?: { categoryId?: string }): AsyncResult;
    upsertMerchantProduct(merchantContext: unknown, productId: string, payload: unknown): AsyncResult;
  };
  runtimeConfigService: {
    parseSectionKeys(input?: string | string[]): string[] | undefined;
    readCustomerRuntimeConfig(query?: { sectionKeys?: string[] }): AsyncResult;
    getRuntimeConfigSections(merchantContext: unknown): AsyncResult;
    readMerchantRuntimeConfig(merchantContext: unknown, query?: { sectionKeys?: string[] }): AsyncResult;
    upsertRuntimeConfigSection(merchantContext: unknown, sectionKey: string, payload: unknown): AsyncResult;
  };
  merchantUserService: {
    searchMerchantUsers(merchantContext: unknown, query: { query?: string; searchField?: string }): AsyncResult;
    adjustUserBalance(merchantContext: unknown, openid: string, payload: unknown): AsyncResult;
  };
  orderService: {
    createCustomerOrder(openid: string, payload: unknown): AsyncResult;
    startCustomerPayment(openid: string, orderId: string, payload?: unknown): AsyncResult;
    confirmCustomerPayment(openid: string, orderId: string, payload?: unknown): AsyncResult;
    syncCustomerPayment(openid: string, orderId: string): AsyncResult;
    queryCustomerOrders(openid: string, filters?: Record<string, unknown>): AsyncResult;
    getCustomerOrderDetail(openid: string, orderId: string): AsyncResult;
    queryMerchantOrders(merchantContext: unknown, filters?: Record<string, unknown>): AsyncResult;
    getMerchantOrderDetail(merchantContext: unknown, orderId: string): AsyncResult;
    updateMerchantOrderStatus(merchantContext: unknown, orderId: string, payload: unknown): AsyncResult;
  };
  printingService: {
    prepareOrderReceiptPrint(merchantContext: unknown, orderId: string, payload?: unknown): AsyncResult;
    recordOrderReceiptPrintResult(merchantContext: unknown, orderId: string, payload: unknown): AsyncResult;
  };
}

export interface ApiRouteDependencies extends ApiRouteServices {
  config: ApiConfig;
  wechatLoginProvider: WechatLoginProvider;
  paymentProvider: PaymentProvider;
  guards: ReturnType<typeof createAuthGuards>;
}

export type ApiRouteDependencyOverrides = Partial<ApiRouteServices> & {
  wechatLoginProvider?: WechatLoginProvider;
  paymentProvider?: PaymentProvider;
  merchantAccessService?: MerchantAccessService;
};

export function createApiRouteDependencies(
  config: ApiConfig,
  overrides: ApiRouteDependencyOverrides = {}
): ApiRouteDependencies {
  const paymentProvider = overrides.paymentProvider ?? (
    config.nodeEnv === 'production' ? createUnconfiguredWechatPaymentProvider() : createMockPaymentProvider()
  );
  const identityService = overrides.identityService ?? createIdentityService();
  const merchantAccessService = overrides.merchantAccessService ?? identityService;

  return {
    config,
    wechatLoginProvider: overrides.wechatLoginProvider ?? createWechatLoginProvider({
      appId: config.wechatAppId,
      appSecret: config.wechatAppSecret
    }),
    paymentProvider,
    identityService,
    catalogService: overrides.catalogService ?? createCatalogService(),
    runtimeConfigService: overrides.runtimeConfigService ?? createRuntimeConfigService(),
    merchantUserService: overrides.merchantUserService ?? createMerchantUserService(),
    orderService: overrides.orderService ?? createOrderService(undefined, paymentProvider),
    printingService: overrides.printingService ?? createPrintingService(),
    guards: createAuthGuards({
      sessionSecret: config.sessionSecret,
      merchantAccessService
    })
  };
}
