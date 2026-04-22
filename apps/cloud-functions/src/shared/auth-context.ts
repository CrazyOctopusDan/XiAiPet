export interface FunctionContextLike {
  OPENID?: string;
  openid?: string;
}

interface EventUserInfoLike {
  openId?: string;
  openid?: string;
}

export interface AuthContext {
  openid: string;
}

function getOpenidFromWxContext() {
  try {
    const cloud = require('wx-server-sdk') as {
      init?: (options?: Record<string, unknown>) => void;
      getWXContext?: () => { OPENID?: string };
    };

    cloud.init?.();
    const openid = cloud.getWXContext?.().OPENID;
    return typeof openid === 'string' && openid ? openid : undefined;
  } catch (error) {
    return undefined;
  }
}

export function getAuthContext(event: Record<string, unknown>, context?: FunctionContextLike): AuthContext {
  const eventUserInfo =
    typeof event.userInfo === 'object' && event.userInfo !== null ? (event.userInfo as EventUserInfoLike) : null;
  const openidFromEventUserInfo = eventUserInfo?.openId ?? eventUserInfo?.openid;
  const openidFromWxContext = getOpenidFromWxContext();
  const openidFromContext = context?.OPENID ?? context?.openid;
  const openidFromEvent = typeof event.openid === 'string' ? event.openid : undefined;
  const openid = openidFromEventUserInfo ?? openidFromWxContext ?? openidFromContext ?? openidFromEvent;

  if (!openid) {
    throw new Error('Missing openid in auth context');
  }

  return { openid };
}
