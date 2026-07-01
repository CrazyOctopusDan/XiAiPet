import type { ApiConfig } from '../config/env';
import { createCatalogService } from '../modules/catalog/service';
import { createAuthGuards } from '../modules/auth/guards';
import type { WechatLoginProvider } from '../modules/auth/wechat-login';
import { createWechatLoginProvider } from '../modules/auth/wechat-login';
import { createIdentityService } from '../modules/users/bootstrap-service';
import { createMerchantUserService } from '../modules/users/admin-service';
import { createMerchantAccountService } from '../modules/merchant-accounts/service';
import type { MerchantAccountRecord } from '../modules/merchant-accounts/service';
import { createMerchantNotificationService } from '../modules/merchant-notifications/service';
import { createWechatSubscriptionMessageSender } from '../modules/merchant-notifications/wechat-sender';
import { createOrderService } from '../modules/orders/service';
import {
  createMockPaymentProvider,
  createWechatPayProvider,
  createUnconfiguredWechatPaymentProvider,
  type PaymentProvider
} from '../modules/payments/provider';
import { createPaymentNotifyService } from '../modules/payments/notification-service';
import { createRuntimeConfigService } from '../modules/runtime-config/service';
import { createPrintingService } from '../modules/printing/service';
import { createAssetService } from '../modules/assets/service';
import { createCustomerAccountService } from '../modules/customer-account/service';
import { createRechargeService } from '../modules/recharge/service';
import { createGiftService } from '../modules/gifts/service';

type AsyncResult = Promise<unknown>;

export interface ApiRouteServices {
  identityService: {
    bootstrapUser(openid: string): AsyncResult;
    getProfile(openid: string): AsyncResult;
    bindPhone(openid: string, payload: unknown): AsyncResult;
    updateProfile(openid: string, payload: unknown): AsyncResult;
  };
  customerAccountService: {
    listAddresses(openid: string, filters?: { type?: 'city' | 'express' }): AsyncResult;
    createAddress(openid: string, payload: unknown): AsyncResult;
    updateAddress(openid: string, addressId: string, payload: unknown): AsyncResult;
    setDefaultAddress(openid: string, addressId: string): AsyncResult;
    listPets(openid: string): AsyncResult;
    createPet(openid: string, payload: unknown): AsyncResult;
    updatePet(openid: string, petId: string, payload: unknown): AsyncResult;
    getBalance(openid: string, pagination?: { cursor?: string | number; limit?: string | number }): AsyncResult;
  };
  giftService: {
    listCustomerGifts(openid: string): AsyncResult;
    listCheckoutGifts(openid: string): AsyncResult;
  };
  catalogService: {
    queryCustomerCategories(filters?: { deliveryMode?: 'pickup' | 'delivery' | 'express' }): AsyncResult;
    queryCustomerProducts(filters?: { categoryId?: string }): AsyncResult;
    queryCustomerCategoryProducts(filters: {
      categoryId: string;
      deliveryMode?: 'pickup' | 'delivery' | 'express';
      availability: 'available' | 'soldOut';
      keyword?: string;
      sort?: 'latest';
      limit?: number;
      cursor?: string;
    }): AsyncResult;
    getCustomerProductDetail(productId: string): AsyncResult;
    searchCustomerProducts(filters: {
      deliveryMode?: 'pickup' | 'delivery' | 'express';
      keyword?: string;
      limit?: number;
      cursor?: string;
    }): AsyncResult;
    resolveCustomerCartLines(input: {
      lines?: Array<{
        productId?: unknown;
        specId?: unknown;
        quantity?: unknown;
      }>;
    }): AsyncResult;
    queryMerchantCategories(filters?: Record<string, unknown>): AsyncResult;
    upsertMerchantCategory(merchantContext: unknown, categoryId: string, payload: unknown): AsyncResult;
    reorderMerchantCategories(merchantContext: unknown, payload: unknown): AsyncResult;
    deleteMerchantCategory(merchantContext: unknown, categoryId: string): AsyncResult;
    queryMerchantProducts(filters?: {
      categoryId?: string;
      status?: 'draft' | 'published' | 'archived';
      keyword?: string;
      sort?: 'latest';
      limit?: number;
      cursor?: string;
    }): AsyncResult;
    getMerchantProductDetail(productId: string): AsyncResult;
    upsertMerchantProduct(merchantContext: unknown, productId: string, payload: unknown): AsyncResult;
    deleteMerchantProduct(merchantContext: unknown, productId: string): AsyncResult;
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
    getMerchantUserDetail(merchantContext: unknown, openid: string): AsyncResult;
    getMerchantUserAddresses(merchantContext: unknown, openid: string): AsyncResult;
    getMerchantUserBalanceLedgers(merchantContext: unknown, openid: string, pagination?: { cursor?: string | number; limit?: string | number }): AsyncResult;
    adjustUserBalance(merchantContext: unknown, openid: string, payload: unknown): AsyncResult;
  };
  merchantAccountService: {
    bootstrapInitialAdmin(): AsyncResult;
    login(payload: { username?: string; password?: string }): Promise<{ ok: true; account: MerchantAccountRecord }>;
    getActiveAccount(accountId: string): Promise<MerchantAccountRecord>;
    changePassword(accountId: string, payload: { currentPassword?: string; newPassword?: string }): Promise<{ ok: true; account: MerchantAccountRecord }>;
    listAccounts(actor: MerchantAccountRecord): AsyncResult;
    createStaffAccount(actor: MerchantAccountRecord, payload: { username?: string }): AsyncResult;
    disableStaffAccount(actor: MerchantAccountRecord, accountId: string): AsyncResult;
    resetStaffPassword(actor: MerchantAccountRecord, accountId: string): AsyncResult;
  };
  merchantNotificationService: {
    enableNewOrderSubscription(account: MerchantAccountRecord, payload: { code?: string; templateId?: string }): AsyncResult;
    notifyNewOrder(order: {
      id: string;
      snapshot: unknown;
      pricing: { payableTotal: number };
      createdAt: string;
      paidAt?: string;
    }): AsyncResult;
  };
  orderService: {
    createCustomerOrder(openid: string, payload: unknown): AsyncResult;
    startCustomerPayment(openid: string, orderId: string, payload?: unknown): AsyncResult;
    confirmCustomerPayment(openid: string, orderId: string, payload?: unknown): AsyncResult;
    syncCustomerPayment(openid: string, orderId: string): AsyncResult;
    cancelCustomerOrder(openid: string, orderId: string): AsyncResult;
    queryCustomerOrders(openid: string, filters?: Record<string, unknown>): AsyncResult;
    getCustomerOrderDetail(openid: string, orderId: string): AsyncResult;
    completeCustomerOrder(openid: string, orderId: string): AsyncResult;
    queryMerchantOrders(merchantContext: unknown, filters?: Record<string, unknown>): AsyncResult;
    getMerchantOrderDetail(merchantContext: unknown, orderId: string): AsyncResult;
    updateMerchantOrderStatus(merchantContext: unknown, orderId: string, payload: unknown): AsyncResult;
  };
  rechargeService: {
    listCustomerRechargePlans(): AsyncResult;
    listMerchantRechargePlans(merchantContext: unknown): AsyncResult;
    saveMerchantRechargePlans(merchantContext: unknown, payload: unknown): AsyncResult;
    createCustomerRechargeTransaction(openid: string, payload: unknown): AsyncResult;
    syncCustomerRechargeTransaction(openid: string, transactionId: string): AsyncResult;
    settleWechatRechargePayment(outTradeNo: string, payment: unknown): AsyncResult;
  };
  paymentNotifyService: {
    handleWechatPayNotification(payload: unknown): AsyncResult;
  };
  printingService: {
    prepareOrderReceiptPrint(merchantContext: unknown, orderId: string, payload?: unknown): AsyncResult;
    recordOrderReceiptPrintResult(merchantContext: unknown, orderId: string, payload: unknown): AsyncResult;
  };
  assetService: {
    createUploadPolicy(merchantContext: unknown, payload: unknown): unknown;
    confirmUpload(merchantContext: unknown, payload: unknown): unknown;
  };
}

export interface ApiRouteDependencies extends ApiRouteServices {
  config: ApiConfig;
  customerWechatLoginProvider: WechatLoginProvider;
  merchantWechatLoginProvider: WechatLoginProvider;
  paymentProvider: PaymentProvider;
  guards: ReturnType<typeof createAuthGuards>;
}

export type ApiRouteDependencyOverrides = Partial<ApiRouteServices> & {
  customerWechatLoginProvider?: WechatLoginProvider;
  merchantWechatLoginProvider?: WechatLoginProvider;
  paymentProvider?: PaymentProvider;
};

export function createApiRouteDependencies(
  config: ApiConfig,
  overrides: ApiRouteDependencyOverrides = {}
): ApiRouteDependencies {
  const paymentProvider = overrides.paymentProvider ?? (
    config.wechatPay
      ? createWechatPayProvider({
        appId: config.customerWechatAppId,
        ...config.wechatPay
      })
      : config.nodeEnv === 'production'
        ? createUnconfiguredWechatPaymentProvider()
        : createMockPaymentProvider()
  );
  const identityService = overrides.identityService ?? createIdentityService();
  const merchantAccountService = overrides.merchantAccountService ?? createMerchantAccountService();
  const merchantWechatLoginProvider = overrides.merchantWechatLoginProvider ?? createWechatLoginProvider({
    appId: config.merchantWechatAppId,
    appSecret: config.merchantWechatAppSecret
  });
  const merchantNotificationService = overrides.merchantNotificationService ?? createMerchantNotificationService({
    merchantWechatLoginProvider,
    sender: createWechatSubscriptionMessageSender(config)
  });

  return {
    config,
    customerWechatLoginProvider: overrides.customerWechatLoginProvider ?? createWechatLoginProvider({
      appId: config.customerWechatAppId,
      appSecret: config.customerWechatAppSecret
    }),
    merchantWechatLoginProvider,
    paymentProvider,
    identityService,
    customerAccountService: overrides.customerAccountService ?? createCustomerAccountService(),
    giftService: overrides.giftService ?? createGiftService(),
    catalogService: overrides.catalogService ?? createCatalogService(),
    runtimeConfigService: overrides.runtimeConfigService ?? createRuntimeConfigService(),
    merchantUserService: overrides.merchantUserService ?? createMerchantUserService(),
    merchantAccountService,
    merchantNotificationService,
    orderService: overrides.orderService ?? createOrderService(undefined, paymentProvider, merchantNotificationService),
    rechargeService: overrides.rechargeService ?? createRechargeService(undefined, paymentProvider),
    paymentNotifyService: overrides.paymentNotifyService ?? createPaymentNotifyService(config.wechatPay),
    printingService: overrides.printingService ?? createPrintingService(),
    assetService: overrides.assetService ?? createAssetService(config),
    guards: createAuthGuards({
      sessionSecret: config.sessionSecret,
      merchantAccountService
    })
  };
}
