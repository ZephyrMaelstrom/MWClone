# Single deployable: builds the web client and serves it from the API server.
FROM node:22-slim

ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY . .

# Install all workspace deps (hoisted node-linker per .npmrc).
RUN pnpm install --frozen-lockfile

# Export the web app and place it where the server serves it from (packages/server/public).
RUN pnpm build:web

ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_OPTIONS=--experimental-sqlite
EXPOSE 3000

# Serves both the web app (/) and the API (/players, /catalog, ...) on one port.
CMD ["pnpm", "-C", "packages/server", "start"]
