# API Parity

Phase 09 maps the current CloudBase function catalog to `/api/v1` HTTP routes.
Successful payloads intentionally stay close to CloudBase functions for Phase 10 mini program migration. HTTP failures use `{ ok: false, code, message }`.

| CloudBase function | Method | Path | Auth | Plan | Test group |
| --- | --- | --- | --- | --- | --- |
| bootstrapUser | POST | /api/v1/customer/bootstrap | customer-session | 09-01 | auth.routes |
| bindPhone | POST | /api/v1/customer/profile/phone | customer-session | 09-01 | auth.routes |
| assertMerchantAccess | GET | /api/v1/merchant/access | customer-session | 09-01 | auth.routes |
| queryCategories | GET | /api/v1/customer/catalog/categories | customer-public | 09-02 | customer-catalog.routes |
| queryProducts | GET | /api/v1/customer/catalog/products | customer-public | 09-02 | customer-catalog.routes |
| readRuntimeConfig | GET | /api/v1/customer/runtime-config | customer-public | 09-02 | customer-catalog.routes |
| createOrder | POST | /api/v1/customer/orders | customer-session | 09-03 | customer-orders.routes |
| createPayment | POST | /api/v1/customer/orders/:orderId/payment | customer-session | 09-03 | customer-orders.routes |
| payOrder | POST | /api/v1/customer/orders/:orderId/payment | customer-session | 09-03 | customer-orders.routes |
| confirmPayment | POST | /api/v1/customer/orders/:orderId/payment-confirmation | customer-session | 09-03 | customer-orders.routes |
| syncOrderPayment | POST | /api/v1/customer/orders/:orderId/payment-sync | customer-session | 09-03 | customer-orders.routes |
| queryMyOrders | GET | /api/v1/customer/orders | customer-session | 09-03 | customer-orders.routes |
| getMyOrderDetail | GET | /api/v1/customer/orders/:orderId | customer-session | 09-03 | customer-orders.routes |
| queryMerchantOrders | GET | /api/v1/merchant/orders | merchant-session | 09-04 | merchant-orders.routes |
| getMerchantOrderDetail | GET | /api/v1/merchant/orders/:orderId | merchant-session | 09-04 | merchant-orders.routes |
| updateMerchantOrderStatus | PATCH | /api/v1/merchant/orders/:orderId/status | merchant-session | 09-04 | merchant-orders.routes |
| upsertCategory | PUT | /api/v1/merchant/categories/:categoryId | merchant-session | 09-05 | merchant-admin.routes |
| upsertProduct | PUT | /api/v1/merchant/products/:productId | merchant-session | 09-05 | merchant-admin.routes |
| searchMerchantUsers | GET | /api/v1/merchant/users | merchant-session | 09-05 | merchant-admin.routes |
| adjustUserBalance | POST | /api/v1/merchant/users/:openid/balance-adjustments | merchant-session | 09-05 | merchant-admin.routes |
| getRuntimeConfigSections | GET | /api/v1/merchant/runtime-config/sections | merchant-session | 09-05 | merchant-admin.routes |
| upsertRuntimeConfigSection | PUT | /api/v1/merchant/runtime-config/sections/:sectionKey | merchant-session | 09-05 | merchant-admin.routes |
| prepareOrderReceiptPrint | POST | /api/v1/merchant/orders/:orderId/receipt-print/prepare | merchant-session | 09-06 | merchant-printing.routes |
| recordOrderReceiptPrintResult | POST | /api/v1/merchant/orders/:orderId/receipt-print/result | merchant-session | 09-06 | merchant-printing.routes |

## Known Deferrals

- Phase 10 migrates the customer and merchant mini program clients from CloudBase calls to these HTTP APIs.
- Phase 12 adds real WeChat Pay callback, certificate verification, production HTTPS and cutover hardening.

## OSS 资产迁移报告

Phase 11 adds a read-only asset reference report for the CloudBase-to-OSS transition.
Run `pnpm --filter @xiaipet/api assets:migrate -- tmp/cloudbase-export.json tmp/asset-migration-report.md` from the repo root after placing a CloudBase export JSON under `apps/api/tmp/`.

The report scans product cover, product introduction images, product detail images, and runtime banner image references.
It lists old `cloud://` file IDs with recommended OSS object keys for each role/variant, but it does not upload files or mutate the database.

## Response Contract

- Success: keep domain payloads close to existing CloudBase function shapes.
- Failure: return `{ ok: false, code, message }` through the shared Fastify error handler.
