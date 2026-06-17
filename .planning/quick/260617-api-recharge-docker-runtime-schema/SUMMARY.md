# Summary: API Recharge Docker Runtime Schema

Fixed API Docker startup failure caused by the recharge service requiring monorepo shared source from compiled `dist`.

Changed:
- Added `apps/api/src/modules/recharge/recharge-schema.ts`.
- Added `apps/api/src/modules/recharge/recharge-schema.test.ts`.
- Updated `apps/api/src/modules/recharge/service.ts` to import `./recharge-schema`.

Result:
- The API build emits `require("./recharge-schema")` from `dist/modules/recharge/service.js`.
- The compiled recharge service can load from a temporary runtime directory without a `packages/` source tree.
