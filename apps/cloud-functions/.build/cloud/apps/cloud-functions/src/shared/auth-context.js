"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthContext = getAuthContext;
function getOpenidFromWxContext() {
    try {
        const cloud = require('wx-server-sdk');
        cloud.init?.();
        const openid = cloud.getWXContext?.().OPENID;
        return typeof openid === 'string' && openid ? openid : undefined;
    }
    catch (error) {
        return undefined;
    }
}
function getAuthContext(event, context) {
    const eventUserInfo = typeof event.userInfo === 'object' && event.userInfo !== null ? event.userInfo : null;
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
