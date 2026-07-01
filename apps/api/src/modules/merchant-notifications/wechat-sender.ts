import type { ApiConfig } from '../../config/env';

const ACCESS_TOKEN_TTL_SKEW_MS = 60_000;
const WECHAT_MESSAGE_TIME_ZONE = 'Asia/Shanghai';

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

  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: WECHAT_MESSAGE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = values.year;
  const month = values.month;
  const day = values.day;
  const hours = values.hour;
  const minutes = values.minute;

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function formatItemQuantity(value: number) {
  return `${Math.max(0, Math.trunc(value))}件`;
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
            thing6: { value: formatItemQuantity(message.itemQuantity) },
            amount7: { value: `￥${message.payableTotal.toFixed(2)}` },
            time21: { value: formatWechatTime(message.paidAt) }
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
