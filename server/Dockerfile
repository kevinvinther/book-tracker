# Production stages (built from the repository root context, e.g. via
# docker-compose.prod.yml with `target: runtime`). The development stage is kept
# last so the dev `docker-compose.yml` (`build: ./server`, no target, context
# ./server) continues to build it unchanged.

# --- Production: compile the server with tsc ---
FROM node:22-alpine AS server-build
WORKDIR /app
COPY server/package.json server/package-lock.json* ./
RUN npm ci
COPY server/ ./
RUN npm run build

# --- Production: build the client with vite ---
FROM node:22-alpine AS client-build
WORKDIR /app
COPY client/package.json client/package-lock.json* ./
RUN npm ci
COPY client/ ./
RUN npm run build

# --- Production: runtime with production dependencies only ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=server-build /app/dist ./dist
COPY --from=client-build /app/dist ./public
RUN mkdir -p /app/data
CMD ["node", "dist/index.js"]

# --- Development (default stage for docker-compose.yml) ---
FROM node:22-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
# Ensure the data directory exists and is writable
RUN mkdir -p /app/data && chmod 777 /app/data
CMD ["npm", "run", "dev"]
