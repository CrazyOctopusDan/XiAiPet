export type ApiAuthMode = 'customer-public' | 'customer-session' | 'merchant-session';

export interface ApiParityEntry {
  functionName: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  path: string;
  authMode: ApiAuthMode;
  planId: string;
  testGroup: string;
}

export const apiParityEntries: ApiParityEntry[] = [
  { functionName: 'bootstrapUser', method: 'POST', path: '/api/v1/customer/bootstrap', authMode: 'customer-session', planId: '09-01', testGroup: 'auth.routes' },
  { functionName: 'bindPhone', method: 'POST', path: '/api/v1/customer/profile/phone', authMode: 'customer-session', planId: '09-01', testGroup: 'auth.routes' },
  { functionName: 'queryCategories', method: 'GET', path: '/api/v1/customer/catalog/categories', authMode: 'customer-public', planId: '09-02', testGroup: 'customer-catalog.routes' },
  { functionName: 'queryProducts', method: 'GET', path: '/api/v1/customer/catalog/products', authMode: 'customer-public', planId: '09-02', testGroup: 'customer-catalog.routes' },
  { functionName: 'readRuntimeConfig', method: 'GET', path: '/api/v1/customer/runtime-config', authMode: 'customer-public', planId: '09-02', testGroup: 'customer-catalog.routes' },
  { functionName: 'createOrder', method: 'POST', path: '/api/v1/customer/orders', authMode: 'customer-session', planId: '09-03', testGroup: 'customer-orders.routes' },
  { functionName: 'createPayment', method: 'POST', path: '/api/v1/customer/orders/:orderId/payment', authMode: 'customer-session', planId: '09-03', testGroup: 'customer-orders.routes' },
  { functionName: 'payOrder', method: 'POST', path: '/api/v1/customer/orders/:orderId/payment', authMode: 'customer-session', planId: '09-03', testGroup: 'customer-orders.routes' },
  { functionName: 'confirmPayment', method: 'POST', path: '/api/v1/customer/orders/:orderId/payment-confirmation', authMode: 'customer-session', planId: '09-03', testGroup: 'customer-orders.routes' },
  { functionName: 'syncOrderPayment', method: 'POST', path: '/api/v1/customer/orders/:orderId/payment-sync', authMode: 'customer-session', planId: '09-03', testGroup: 'customer-orders.routes' },
  { functionName: 'queryMyOrders', method: 'GET', path: '/api/v1/customer/orders', authMode: 'customer-session', planId: '09-03', testGroup: 'customer-orders.routes' },
  { functionName: 'getMyOrderDetail', method: 'GET', path: '/api/v1/customer/orders/:orderId', authMode: 'customer-session', planId: '09-03', testGroup: 'customer-orders.routes' },
  { functionName: 'queryMerchantOrders', method: 'GET', path: '/api/v1/merchant/orders', authMode: 'merchant-session', planId: '09-04', testGroup: 'merchant-orders.routes' },
  { functionName: 'getMerchantOrderDetail', method: 'GET', path: '/api/v1/merchant/orders/:orderId', authMode: 'merchant-session', planId: '09-04', testGroup: 'merchant-orders.routes' },
  { functionName: 'updateMerchantOrderStatus', method: 'PATCH', path: '/api/v1/merchant/orders/:orderId/status', authMode: 'merchant-session', planId: '09-04', testGroup: 'merchant-orders.routes' },
  { functionName: 'upsertCategory', method: 'PUT', path: '/api/v1/merchant/categories/:categoryId', authMode: 'merchant-session', planId: '09-05', testGroup: 'merchant-admin.routes' },
  { functionName: 'upsertProduct', method: 'PUT', path: '/api/v1/merchant/products/:productId', authMode: 'merchant-session', planId: '09-05', testGroup: 'merchant-admin.routes' },
  { functionName: 'searchMerchantUsers', method: 'GET', path: '/api/v1/merchant/users', authMode: 'merchant-session', planId: '09-05', testGroup: 'merchant-admin.routes' },
  { functionName: 'adjustUserBalance', method: 'POST', path: '/api/v1/merchant/users/:openid/balance-adjustments', authMode: 'merchant-session', planId: '09-05', testGroup: 'merchant-admin.routes' },
  { functionName: 'getRuntimeConfigSections', method: 'GET', path: '/api/v1/merchant/runtime-config/sections', authMode: 'merchant-session', planId: '09-05', testGroup: 'merchant-admin.routes' },
  { functionName: 'upsertRuntimeConfigSection', method: 'PUT', path: '/api/v1/merchant/runtime-config/sections/:sectionKey', authMode: 'merchant-session', planId: '09-05', testGroup: 'merchant-admin.routes' },
  { functionName: 'prepareOrderReceiptPrint', method: 'POST', path: '/api/v1/merchant/orders/:orderId/receipt-print/prepare', authMode: 'merchant-session', planId: '09-06', testGroup: 'merchant-printing.routes' },
  { functionName: 'recordOrderReceiptPrintResult', method: 'POST', path: '/api/v1/merchant/orders/:orderId/receipt-print/result', authMode: 'merchant-session', planId: '09-06', testGroup: 'merchant-printing.routes' }
];
