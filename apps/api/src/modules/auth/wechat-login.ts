import { ApiError } from '../../lib/errors';

export interface WechatLoginResult {
  openid: string;
  unionid?: string;
  sessionKey?: string;
}

export interface WechatLoginProvider {
  exchangeLoginCode(code: string): Promise<WechatLoginResult>;
}

interface WechatCodeSessionResponse {
  openid?: string;
  unionid?: string;
  session_key?: string;
  errcode?: number;
  errmsg?: string;
}

export function createWechatLoginProvider(config: {
  appId: string;
  appSecret: string;
  fetchImpl?: typeof fetch;
}): WechatLoginProvider {
  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    async exchangeLoginCode(code: string): Promise<WechatLoginResult> {
      if (!code || code.trim().length === 0) {
        throw new ApiError('INVALID_LOGIN_CODE', 'wx.login code is required', 400);
      }

      const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
      url.searchParams.set('appid', config.appId);
      url.searchParams.set('secret', config.appSecret);
      url.searchParams.set('js_code', code);
      url.searchParams.set('grant_type', 'authorization_code');

      const response = await fetchImpl(url);
      const body = (await response.json()) as WechatCodeSessionResponse;

      if (!response.ok || body.errcode || !body.openid) {
        throw new ApiError('WECHAT_LOGIN_FAILED', 'WeChat login failed', 401);
      }

      return {
        openid: body.openid,
        unionid: body.unionid,
        sessionKey: body.session_key
      };
    }
  };
}
