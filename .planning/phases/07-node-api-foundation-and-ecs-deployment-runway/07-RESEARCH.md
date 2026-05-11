# Phase 7 Research: Node API Foundation and ECS Deployment Runway

## RESEARCH COMPLETE

**Phase:** 7 - Node API Foundation and ECS Deployment Runway
**Researched:** 2026-05-11
**Purpose:** Determine what is needed to plan the unified `apps/api` backend foundation well.

## Findings

### Fastify App Shape

Fastify's own getting started docs show a small app that creates a Fastify instance, registers routes/plugins, and listens on a port. The same docs emphasize plugin registration as the normal extension mechanism. For this repo, the plan should split app construction from server startup so tests can call `buildApp()` without binding a real port.

Recommended files:

- `apps/api/src/app.ts` — app factory and route/plugin registration
- `apps/api/src/server.ts` — process entrypoint, `listen`, shutdown/startup error handling
- `apps/api/src/routes/health.ts` — health route plugin
- `apps/api/src/config/env.ts` — typed environment parsing
- `apps/api/src/lib/errors.ts` — error shape and app error class
- `apps/api/src/lib/logger.ts` — logger options derived from env

### TypeScript and Workspace Fit

The existing repo uses `tsconfig.base.json`, `pnpm-workspace.yaml`, per-app `package.json`, and Vitest configs. `apps/api` should follow the same shape as `apps/cloud-functions` rather than introduce a separate build system.

Planning implications:

- Add `apps/api` to `pnpm-workspace.yaml`.
- Add root scripts such as `dev:api`.
- Use `@xiaipet/shared` through the existing TypeScript path alias.
- Keep tests under `apps/api/src/**/*.test.ts` with `environment: 'node'`.

### Config and Secret Handling

Phase 7 should establish the config surface before secrets exist. It should validate required env variables in a typed module, but only require the minimum values needed to boot: `NODE_ENV`, `API_HOST`, `API_PORT`, `LOG_LEVEL`, `API_PUBLIC_BASE_URL` or equivalent. Later phases can add RDS, OSS and WeChat-specific env vars to the same module.

No real secrets belong in `.env.example`, Docker Compose, docs or tests.

### Docker Compose Runway

Docker's Node.js guide supports containerizing Node apps. For this monorepo, the Dockerfile should build from repo root so `packages/shared` is available, but the runtime command should target `@xiaipet/api`. Production Compose should not define MySQL or OSS containers because RDS and OSS are managed Alibaba services.

Recommended deployment artifacts:

- `apps/api/Dockerfile`
- `apps/api/.dockerignore`
- root `docker-compose.yml`
- `docs/release/alibaba-ecs-api.md`

### ECS Documentation

Because the operator is a frontend developer without operations experience, docs must be command-oriented and explain:

- prerequisites
- Docker / Compose installation reference
- where `.env.production` lives
- how to start, stop, restart and view logs
- what a successful health check looks like
- how to roll back to the previous image or git revision

## Validation Architecture

Phase 7 can be validated without external cloud credentials.

Automated checks:

- API unit tests with `pnpm --filter @xiaipet/api test`
- API typecheck with `pnpm --filter @xiaipet/api typecheck`
- API build with `pnpm --filter @xiaipet/api build`
- Root workspace scripts include the API package through `pnpm -r`
- Docker Compose config can be parsed with `docker compose config` when Docker is available

Manual checks:

- Read `docs/release/alibaba-ecs-api.md` for command completeness.
- Confirm no real secrets exist in `.env.example`, docs or compose files.
- Confirm `apps/api` is a single project, with no `apps/customer-api` or `apps/merchant-api`.

## Sources

- Fastify getting started: https://fastify.dev/docs/v5.7.x/Guides/Getting-Started/
- Fastify logging: https://fastify.dev/docs/latest/Reference/Logging/
- Fastify TypeScript reference: https://fastify.dev/docs/latest/Reference/TypeScript/
- Docker Node.js guide: https://docs.docker.com/guides/nodejs/
- Node Docker official image overview: https://hub.docker.com/_/node
- Alibaba Cloud ECS Docker documentation: https://help.aliyun.com/zh/ecs/user-guide/install-and-use-docker
- Prisma MySQL documentation for later compatibility: https://docs.prisma.io/docs/v6/orm/overview/databases/mysql

## Planning Guidance

Plan order should be:

1. Scaffold API package and health route.
2. Add config, errors and logging.
3. Add Docker build/compose path.
4. Add ECS deployment runbook.
5. Integrate tests/typecheck/build into root workspace scripts.

Avoid adding RDS, Prisma schema, OSS SDK or business routes in Phase 7. Those belong to later phases.
