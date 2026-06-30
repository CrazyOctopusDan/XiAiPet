import { merchantApiRequest } from './api-client';

declare const wx: any;

export const NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID = 'tTJBDAEzr5FVXraGKu75bwi5RqMD3ewsmpYqE926u8M';

type SubscriptionStatus = 'accept' | 'acceptWithAudio' | 'acceptWithAlert' | 'reject' | 'ban' | string;

function requestNewOrderSubscription(): Promise<SubscriptionStatus> {
  return new Promise((resolve, reject) => {
    wx.requestSubscribeMessage({
      tmplIds: [NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID],
      success: (result: Record<string, SubscriptionStatus>) => resolve(result[NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID]),
      fail: reject
    });
  });
}

function requestWechatLoginCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (result: { code?: string }) => {
        if (result.code) {
          resolve(result.code);
          return;
        }
        reject(new Error('WX_LOGIN_CODE_MISSING'));
      },
      fail: reject
    });
  });
}

function isAcceptedSubscription(status: SubscriptionStatus) {
  return status === 'accept' || status === 'acceptWithAudio' || status === 'acceptWithAlert';
}

export async function enableNewOrderSubscription() {
  const status = await requestNewOrderSubscription();

  if (!isAcceptedSubscription(status)) {
    return {
      ok: false as const,
      status: 'rejected' as const
    };
  }

  const code = await requestWechatLoginCode();
  await merchantApiRequest('/api/v1/merchant/notifications/new-order-subscription', {
    method: 'POST',
    body: {
      code,
      templateId: NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID
    },
    auth: 'merchant'
  });

  return {
    ok: true as const,
    status: 'enabled' as const
  };
}
