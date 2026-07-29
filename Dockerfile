# syntax=docker/dockerfile:1

FROM node:24-alpine AS deps
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=botato-pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS build
COPY tsconfig.json tsconfig.build.json drizzle.config.ts ./
COPY src ./src
COPY drizzle ./drizzle
RUN pnpm build

FROM node:24-alpine AS prod-deps
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=botato-pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile --prod --ignore-scripts

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S botato && adduser -S botato -G botato
COPY --from=prod-deps --chown=botato:botato /app/node_modules ./node_modules
COPY --from=build --chown=botato:botato /app/dist ./dist
COPY --from=build --chown=botato:botato /app/drizzle ./drizzle
COPY --chown=botato:botato package.json ./
USER botato
CMD ["node", "dist/index.js"]
