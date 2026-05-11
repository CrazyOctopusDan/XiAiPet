FROM node:22-alpine AS base

WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --filter @xiaipet/api... --prod=false --no-frozen-lockfile

FROM deps AS build
COPY apps/api apps/api
COPY packages/shared packages/shared
RUN pnpm --filter @xiaipet/api build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --filter @xiaipet/api... --prod --no-frozen-lockfile

COPY --from=build /app/apps/api/dist apps/api/dist

USER node
EXPOSE 3000
CMD ["pnpm", "--filter", "@xiaipet/api", "start"]
