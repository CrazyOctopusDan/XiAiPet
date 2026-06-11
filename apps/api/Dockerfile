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
WORKDIR /app/apps/api

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/api/package.json package.json
COPY --from=build /app/apps/api/node_modules node_modules
COPY --from=build /app/apps/api/prisma.config.ts prisma.config.ts
COPY --from=build /app/apps/api/prisma prisma
COPY --from=build /app/apps/api/scripts scripts
COPY --from=build /app/apps/api/dist dist
COPY --from=build /app/packages/shared/package.json /app/packages/shared/package.json

RUN mkdir -p tmp && chown -R node:node tmp

USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
