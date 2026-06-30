import type { ApiConfig } from '../../config/env';

const ACCESS_TOKEN_TTL_SKEW_MS = 60_000;

export interface NewOrderSubscriptionMessage {
  touser: string;
  orderId: string;
  customerName: string;
  itemQuantity: number;
  payableTotal: number;
  paidAt: string;
}

export interface NewOrderSubscriptionMessageSender {
  sendNewOrderMessage(message: NewOrderSubscriptionMessage): Promise<{ ok: true }>;
}

interface WechatAccessTokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

interface WechatSendResponse {
  errcode?: number;
  errmsg?: string;
}

function formatWechatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

export function createWechatSubscriptionMessageSender(
  config?: Pick<ApiConfig, 'merchantWechatAppId' | 'merchantWechatAppSecret'>,
  fetchImpl: typeof fetch = fetch
): NewOrderSubscriptionMessageSender {
  let accessToken: { value: string; expiresAt: number } | null = null;

  async function getAccessToken() {
    if (accessToken && accessToken.expiresAt > Date.now() + ACCESS_TOKEN_TTL_SKEW_MS) {
      return accessToken.value;
    }

    if (!config?.merchantWechatAppId || !config.merchantWechatAppSecret) {
      throw new Error('MERCHANT_WECHAT_NOT_CONFIGURED');
    }

    const url = new URL('https://api.weixin.qq.com/cgi-bin/token');
    url.searchParams.set('grant_type', 'client_credential');
    url.searchParams.set('appid', config.merchantWechatAppId);
    url.searchParams.set('secret', config.merchantWechatAppSecret);

    const response = await fetchImpl(url);
    const body = (await response.json()) as WechatAccessTokenResponse;

    if (!response.ok || body.errcode || !body.access_token) {
      throw new Error('WECHAT_ACCESS_TOKEN_FAILED');
    }

    accessToken = {
      value: body.access_token,
      expiresAt: Date.now() + (body.expires_in ?? 7200) * 1000
    };
    return accessToken.value;
  }

  return {
    async sendNewOrderMessage(message) {
      const token = await getAccessToken();
      const response = await fetchImpl(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          touser: message.touser,
          template_id: 'tTJBDAEzr5FVXraGKu75bwi5RqMD3ewsmpYqE926u8M',
          page: `/pages/order-detail/index?orderId=${encodeURIComponent(message.orderId)}`,
          miniprogram_state: 'formal',
          data: {
            character_string1: { value: truncate(message.orderId, 32) },
            thing2: { value: truncate(message.customerName, 20) },
            number3: { value: String(message.itemQuantity) },
            amount4: { value: `￥${message.payableTotal.toFixed(2)}` },
            time5: { value: formatWechatTime(message.paidAt) }
          }
        })
      });
      const body = (await response.json()) as WechatSendResponse;

      if (!response.ok || body.errcode) {
        throw new Error('WECHAT_SUBSCRIBE_MESSAGE_FAILED');
      }

      return { ok: true as const };
    }
  };
}
