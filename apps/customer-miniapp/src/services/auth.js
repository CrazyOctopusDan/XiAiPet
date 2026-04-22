"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCustomerBootstrap = startCustomerBootstrap;
async function startCustomerBootstrap() {
    const loginResult = await wx.login();
    const response = (await wx.cloud.callFunction({
        name: 'bootstrapUser',
        data: {
            code: loginResult.code
        }
    }));
    return response.result;
}
