# Phase 7 Pattern Map

**Phase:** 7 - Node API Foundation and ECS Deployment Runway
**Created:** 2026-05-11

## Existing Patterns to Reuse

| New File/Area | Role | Closest Existing Analog | Pattern to Preserve |
|---------------|------|-------------------------|---------------------|
| `apps/api/package.json` | App package manifest | `apps/cloud-functions/package.json` | Private package, scoped name, scripts for build/typecheck/test/dev |
| `apps/api/tsconfig.json` | Backend TS config | `apps/cloud-functions/tsconfig.json` | Extends root config, Node types, app-local include/exclude |
| `apps/api/vitest.config.ts` | Node test config | `apps/cloud-functions/vitest.config.ts` | Alias `@xiaipet/shared` to `packages/shared/src/index.ts`, node environment |
| `apps/api/src/app.ts` | App composition | Fastify docs + repo service modules | Export factory for tests; no direct listen in app factory |
| `apps/api/src/server.ts` | Runtime entry | `apps/cloud-functions/scripts/build.mjs` error style | Explicit failure handling and process exit on startup error |
| `apps/api/src/config/env.ts` | Runtime config | `apps/cloud-functions/src/shared/env.ts` | Convert raw env to typed config and fail early on invalid values |
| `apps/api/src/routes/health.ts` | Route plugin | Fastify plugin docs | Encapsulated route registration |
| `apps/api/src/**/*.test.ts` | Tests | `apps/cloud-functions/src/**/*.test.ts` | Vitest unit tests close to source |
| `docker-compose.yml` | Deployment command surface | `scripts/release-dev.sh`, `scripts/release-prod.sh` | Command-oriented release ergonomics; no committed secrets |
| `docs/release/alibaba-ecs-api.md` | Runbook | `docs/release/cloudbase-and-miniapp.md` | Step-by-step operational docs |

## Concrete Existing Excerpts

### Package Script Shape

`apps/cloud-functions/package.json` uses:

```json
{
  "scripts": {
    "build": "node ./scripts/build.mjs",
    "dev": "pnpm build && pnpm render:dev && echo 'Run: cd apps/cloud-functions/dist && tcb functions:deploy'",
    "lint": "echo 'cloud-functions lint: not configured'",
    "typecheck": "tsc --project tsconfig.json --noEmit",
    "test": "vitest run --config vitest.config.ts"
  }
}
```

For `apps/api`, preserve the same command names while replacing CloudBase-specific commands with API-specific build/dev/start commands.

### TypeScript Config Shape

`apps/cloud-functions/tsconfig.json` uses:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2021"],
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.test.ts"]
}
```

`apps/api` should use the same base, plus an `outDir` if the build emits JS into `dist`.

### Vitest Alias Shape

`apps/cloud-functions/vitest.config.ts` resolves `@xiaipet/shared` explicitly:

```ts
resolve: {
  alias: {
    '@xiaipet/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts')
  }
}
```

Reuse this in `apps/api/vitest.config.ts`.

### Env Resolution Shape

`apps/cloud-functions/src/shared/env.ts` turns raw environment values into a typed object and throws on unsupported env names. For `apps/api`, use the same fail-fast idea but do not keep CloudBase-specific variables as required.

## File Ownership Guidance

- `apps/api/src/app.ts` owns registration only.
- `apps/api/src/server.ts` owns listening and process lifecycle only.
- `apps/api/src/config/env.ts` owns parsing and validation only.
- `apps/api/src/lib/errors.ts` owns stable API error shape only.
- `apps/api/src/lib/logger.ts` owns Fastify logger options only.
- `apps/api/src/routes/health.ts` owns health/readiness route only.
- `docs/release/alibaba-ecs-api.md` owns human deployment steps only.

## Risks to Avoid

- Do not create `apps/customer-api` or `apps/merchant-api`.
- Do not introduce Prisma schema in Phase 7.
- Do not require real RDS, OSS or WeChat secrets to run the health check.
- Do not put real secrets in `.env.example`, `docker-compose.yml` or docs.
- Do not overwrite existing dirty work in miniapp or cloud-functions files.
