# TD-018: containerized deployment path (M-87).
# Multi-stage: install → build all workspaces → prune dev deps → slim runtime.
# Credentials: mount the service-account JSON and set GOOGLE_APPLICATION_CREDENTIALS,
# or rely on the environment's default ADC (e.g. Cloud Run service account).

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
ENV NODE_ENV=production
ENV HUSKY=0
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
# Scoped install: only the two runtime workspaces + their prod deps
# (npm prune is unreliable with hoisted workspace trees).
RUN npm ci --omit=dev --ignore-scripts --workspace=@level-up/shared --workspace=@level-up/server
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/server/dist packages/server/dist
COPY --from=build /app/packages/client/dist packages/client/dist
USER node
EXPOSE 4001
CMD ["npm", "start"]
