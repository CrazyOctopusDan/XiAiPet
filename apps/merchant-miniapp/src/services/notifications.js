"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID = void 0;
exports.enableNewOrderSubscription = enableNewOrderSubscription;
const api_client_1 = require("./api-client");
exports.NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID = 'tTJBDAEzr5FVXraGKu75bwi5RqMD3ewsmpYqE926u8M';
function requestNewOrderSubscription() {
    return new Promise((resolve, reject) => {
        wx.requestSubscribeMessage({
            tmplIds: [exports.NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID],
            success: (result) => resolve(result[exports.NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID]),
            fail: reject
        });
    });
}
function requestWechatLoginCode() {
    return new Promise((resolve, reject) => {
        wx.login({
            success: (result) => {
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
function isAcceptedSubscription(status) {
    return status === 'accept' || status === 'acceptWithAudio' || status === 'acceptWithAlert';
}
async function enableNewOrderSubscription() {
    const status = await requestNewOrderSubscription();
    if (!isAcceptedSubscription(status)) {
        return {
            ok: false,
            status: 'rejected'
        };
    }
    const code = await requestWechatLoginCode();
    await (0, api_client_1.merchantApiRequest)('/api/v1/merchant/notifications/new-order-subscription', {
        method: 'POST',
        body: {
            code,
            templateId: exports.NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID
        },
        auth: 'merchant'
    });
    return {
        ok: true,
        status: 'enabled'
    };
}
