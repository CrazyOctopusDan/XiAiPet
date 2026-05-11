# Phase 7: Node API Foundation and ECS Deployment Runway - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning
**Source:** `/gsd-plan-phase 7` from approved milestone v1.1

<domain>
## Phase Boundary

Phase 7 establishes the deployable foundation for the new backend only. It must create one unified `apps/api` Node.js project, not separate customer and merchant backend projects. This phase does not migrate business APIs, MySQL schema, OSS assets, payment logic, or mini program clients; those belong to later phases.

</domain>

<decisions>
## Implementation Decisions

### Backend Shape
- The backend project lives at `apps/api`.
- `apps/api` is one deployable service used by both customer and merchant mini programs.
- Internal code should be split by technical and domain responsibility: app factory, server entry, config, plugins, routes, health, errors, logging and test helpers.
- Domain-specific customer/merchant route groups may exist later, but there must not be separate backend packages or separate deployments by endpoint type.

### Runtime Stack
- Use Fastify with TypeScript.
- Keep CommonJS compatibility aligned with `tsconfig.base.json` unless an implementation plan explicitly updates shared compiler behavior.
- Use Vitest for API tests to match existing workspace test tooling.
- Add environment validation early so later RDS, OSS and WeChat secrets have a safe place to land.

### Deployment Runway
- Docker Compose is the deployment target for ECS.
- RDS and OSS are managed Alibaba Cloud services, not local containers in the production compose file.
- Compose should only cover API runtime and supporting local/dev runtime pieces needed for the API foundation.
- ECS documentation must be written for a frontend developer with no operations background.

### Security
- No real secrets may be committed.
- `.env.example` can document variable names and safe placeholder values.
- Health and diagnostics must not expose secrets.
- Plans must include threat model blocks.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and Phase Scope
- `.planning/PROJECT.md` — current milestone decisions and platform constraints
- `.planning/REQUIREMENTS.md` — BE-01 through BE-05 requirement definitions
- `.planning/ROADMAP.md` — Phase 7 goal, success criteria and planned task list
- `.planning/research/BACKEND-MIGRATION.md` — CloudBase-to-Alibaba backend migration research

### Existing Workspace Patterns
- `package.json` — root scripts and workspace command style
- `pnpm-workspace.yaml` — package inclusion list to update with `apps/api`
- `tsconfig.base.json` — shared compiler options and path aliases
- `apps/cloud-functions/package.json` — existing backend-like package scripts
- `apps/cloud-functions/tsconfig.json` — backend TypeScript config pattern
- `apps/cloud-functions/vitest.config.ts` — backend Vitest alias pattern
- `apps/cloud-functions/src/bootstrapUser/index.ts` — existing function shape that consumes `@xiaipet/shared`

### External References
- Fastify docs: https://fastify.dev/docs/v5.7.x/Guides/Getting-Started/
- Fastify logging docs: https://fastify.dev/docs/latest/Reference/Logging/
- Prisma MySQL docs for later phase compatibility: https://docs.prisma.io/docs/v6/orm/overview/databases/mysql
- Docker Node.js guide: https://docs.docker.com/guides/nodejs/
- Alibaba Cloud ECS Docker docs: https://help.aliyun.com/zh/ecs/user-guide/install-and-use-docker

</canonical_refs>

<specifics>
## Specific Ideas

- `apps/api/src/app.ts` should export a Fastify app factory for tests.
- `apps/api/src/server.ts` should start the HTTP server and handle startup errors.
- `apps/api/src/config/env.ts` should parse environment variables into a typed config object.
- `apps/api/src/routes/health.ts` should expose `/health` with a minimal response.
- `apps/api/src/lib/errors.ts` should define a stable API error envelope.
- `apps/api/src/lib/logger.ts` should keep production logs JSON-oriented and local logs readable.
- `apps/api/.env.example` should document placeholders, never real values.
- `docker-compose.yml` can be at repo root for deployment ergonomics, with API build context pointing to the monorepo.
- `docs/release/alibaba-ecs-api.md` should be the human deployment runbook.

</specifics>

<deferred>
## Deferred Ideas

- Prisma schema and RDS migration are Phase 8.
- Customer/merchant business API routes are Phase 9.
- Mini program HTTP client migration is Phase 10.
- OSS upload and asset migration are Phase 11.
- Production cutover, Nginx HTTPS and WeChat legal domain setup are Phase 12.

</deferred>

---

*Phase: 07-node-api-foundation-and-ecs-deployment-runway*
*Context gathered: 2026-05-11 via `/gsd-plan-phase 7`*
