# Phase 10: Mini Program API Client Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-05-11T16:08:09+08:00
**Phase:** 10-mini-program-api-client-migration
**Areas discussed:** migration strategy, API base URL configuration, session/token handling, error handling, verification scope

---

## Migration Strategy

| Option | Description | Selected |
| --- | --- | --- |
| HTTP-only | Service-layer defaults use the new HTTP API; no CloudBase production fallback. | Yes |
| HTTP with dev fallback | Use HTTP first, fallback to CloudBase only in development failures. | No |
| Dual paths | Keep HTTP and CloudBase paths longer. | No |

Notes:
- User emphasized that previous CloudBase code had not been validated, had no real data, and had not completed the intended data flow.
- The implementation should be free to make bold changes and should not preserve old CloudBase behavior for its own sake.
- User later clarified that old CloudBase code should be fully removed after the independent backend is established, and that the frontend mini program interface invocation mode must be changed to the new backend API.

## API Base URL Configuration

| Option | Description | Selected |
| --- | --- | --- |
| Per-miniapp config | Each miniapp gets API config; development supports local/temporary URL, production defaults to `https://api.xiaipet.vip`. | Yes |
| Compile-time only | Only use build-time configuration, with no production default in code. | No |
| Runtime setting | Add a miniapp setting screen to manually enter API URL. | No |

## Session and Token Handling

| Option | Description | Selected |
| --- | --- | --- |
| Login token with one retry | Use `wx.login`, store API token, and retry once after 401. | Yes |
| Lazy protected login | Login only on first protected request. | No |
| Manual recovery | Do not auto-recover on 401; ask user to re-enter. | No |

## Error Handling

| Option | Description | Selected |
| --- | --- | --- |
| Central error normalization | HTTP client parses `{ ok:false, code, message }`; pages keep stable user-facing messages. | Yes |
| Per-service handling | Each domain service handles backend errors independently. | No |
| Show backend messages | Display backend `message` directly to users. | No |

## Verification Scope

| Option | Description | Selected |
| --- | --- | --- |
| Client + service + key page regression | Test HTTP client, service mappings, retry/error behavior, and existing critical page regressions. | Yes |
| Service-only tests | Only test migrated service functions; manual-check pages. | No |
| Full miniapp E2E framework | Add deeper end-to-end infrastructure now. | No |

## Deferred / Agent Discretion

- The agent may choose exact module names and implementation order.
- CloudBase compatibility is not a required constraint for migrated operations.
- Mini program service call sites must migrate away from `wx.cloud.callFunction` / `wx.cloud.Cloud` for migrated backend operations.
- OSS file upload and production HTTPS/domain work stay in later phases.
