"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCustomerBootstrap = startCustomerBootstrap;
const api_client_1 = require("./api-client");
async function startCustomerBootstrap(request = api_client_1.customerApiRequest) {
    return request('/api/v1/customer/bootstrap', {
        method: 'POST',
        auth: 'customer'
    });
}
