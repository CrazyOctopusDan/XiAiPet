"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callCloudFunction = callCloudFunction;
async function callCloudFunction(name, data) {
    const response = (await wx.cloud.callFunction({
        name,
        data
    }));
    return response.result;
}
