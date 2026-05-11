import type { OrderRecord } from '../orders/repository';
import { ApiError } from '../../lib/errors';

export interface WechatPaymentContext {
  openid: string;
}

export interface WechatPaymentStartResult {
  paymentParams: {
    timeStamp: string;
    nonceStr: string;
    package: string;
    signType: string;
    paySign: string;
  };
  providerTraceId?: string;
}

export interface PaymentProvider {
  startWechatPayment(order: OrderRecord, context: WechatPaymentContext): Promise<WechatPaymentStartResult>;
}

export function createUnconfiguredWechatPaymentProvider(): PaymentProvider {
  return {
    async startWechatPayment() {
      throw new ApiError('WECHAT_PAY_NOT_CONFIGURED', 'WeChat Pay is not configured', 503);
    }
  };
}

export function createMockPaymentProvider(): PaymentProvider {
  return {
    async startWechatPayment(order: OrderRecord, context: WechatPaymentContext): Promise<WechatPaymentStartResult> {
      return {
        paymentParams: {
          timeStamp: '1700000000',
          nonceStr: `mock-${order.id}`,
          package: `prepay_id=mock_${order.id}_${context.openid}`,
          signType: 'RSA',
          paySign: 'mock-pay-sign'
        },
        providerTraceId: `mock-${order.id}`
      };
    }
  };
}
