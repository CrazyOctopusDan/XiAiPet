---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: milestone
status: planning
stopped_at: Phase 8 context gathered
last_updated: "2026-05-11T06:19:44.851Z"
last_activity: 2026-05-11 -- Phase 08 context gathered for MySQL data layer
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 5
  completed_plans: 5
  percent: 17
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-11)

**Core value:** 让宠物家长在微信内以尽可能少的步骤完成“选品-预约-支付-履约”，同时让店主能用同一套云后台稳定管理商品、订单、会员门槛和余额。
**Current focus:** Phase 08 — mysql-data-model-and-migration-pipeline

## Current Position

Phase: 08 (mysql-data-model-and-migration-pipeline) — READY
Plan: Not planned
Status: Context gathered; ready to plan Phase 08
Last activity: 2026-05-11 -- Phase 08 context gathered for MySQL data layer

Progress: [██░░░░░░░░] 17%

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- User has decided to move backend code away from Tencent CloudBase cloud functions.
- Target infrastructure is Alibaba Cloud ECS, RDS MySQL 8, and OSS.
- Backend framework direction is Fastify + Prisma + MySQL 8 + OSS.
- Backend project will live at `apps/api` as one unified deployable service, not separate customer and merchant backend projects.
- Deployment direction is Docker Compose on ECS, not Kubernetes.
- Production API domain will be `https://api.xiaipet.vip` after ICP filing and HTTPS setup.
- During备案 waiting period, development may use local API or WeChat DevTools temporary domain checks, but production release cannot rely on IP-only requests.
- Functional scope should remain unchanged; this milestone migrates platform/runtime, not product features.

### Pending Todos

- Design MySQL schema and data migration path from CloudBase document collections.
- Replace mini program CloudBase function clients with HTTP API clients.
- Prepare OSS upload/access replacement.
- Prepare ECS Docker Compose deployment and `api.xiaipet.vip` HTTPS setup.
- Run integrated regression across customer and merchant workflows after migration.

### Blockers/Concerns

- `xiaipet.vip` ICP filing is in progress; production WeChat request domain setup is blocked until filing and HTTPS are complete.
- Current worktree has unrelated existing business changes; migration work must not revert or overwrite them.
- Real WeChat Pay parameters, certificate management, and callback verification remain sensitive integration risks.
- Existing CloudBase collections and RDS schema may not map one-to-one; migration must preserve order snapshots, ledger audit, product pricing and runtime config semantics.
- User has no operations background, so deployment docs and scripts must be explicit and low-friction.

## Session Continuity

Last session: 2026-05-11T06:19:44.848Z
Stopped at: Phase 8 context gathered
Resume file: .planning/phases/08-mysql-data-model-and-migration-pipeline/08-CONTEXT.md
