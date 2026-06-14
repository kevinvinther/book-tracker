## Context

This is a greenfield project with no existing codebase. The first step must establish the development foundation before any feature work can begin. The project is a personal book diary — a Node.js monorepo with an Express backend serving a Vite/React frontend.

Constraints from the project intent: build incrementally over evenings/weekends, data lives as plain markdown files on disk, single-user, no rigid schema.

## Goals / Non-Goals

**Goals:**
- A single `npm run dev` command that starts the full stack in development mode
- Docker Compose setup so both services run in containers with live reload
- Server: Express + TypeScript with `tsx` for watch/restart
- Client: Vite + React + TypeScript with Tailwind CSS and shadcn/ui
- Client-to-server communication verified via a health check roundtrip
- Vite proxy so the client can call `/api/*` without CORS

**Non-Goals:**
- Production build or deployment configuration
- Multi-stage Docker builds optimized for production
- Database setup (the app uses markdown files on disk, no DB needed)
- Authentication, routing beyond the health check, or any feature work
- Testing infrastructure (this step just gets the stack running)
- Hot module replacement configuration beyond Vite defaults

## Decisions

### Monorepo layout: root `package.json` + `server/` + `client/`
Using a root `package.json` with `concurrently` — no npm workspaces. Root `package.json` has a `dev` script that runs `concurrently` with the server and client dev commands. Each subdirectory has its own `package.json` with its own dependencies, keeping dependency boundaries clear without the overhead of workspace hoisting.

**Alternative considered**: npm workspaces. Rejected because the server and client have no shared dependencies at this stage, and workspaces add complexity for dependency hoisting that isn't needed.

### Express over Fastify or plain Node HTTP
Express is the most widely used Node.js HTTP framework, has the largest ecosystem, and requires zero learning curve. The app's API surface is straightforward CRUD — no extreme performance requirements that would justify Fastify.

**Alternative considered**: Fastify. Rejected because Express is simpler for this use case.

### Vite over Create React App or Next.js
Vite offers instant HMR, native TypeScript support, and a simple proxy configuration (the `server.proxy` option). The app is a client-side SPA with no SSR needs, making Next.js overkill.

**Alternative considered**: Create React App. Rejected — CRA is deprecated and slow in development compared to Vite.

### `tsx` over `ts-node` or `nodemon + tsc`
`tsx` (via `tsx watch`) provides fast TypeScript execution with file watching, no separate compile step needed during development. It uses esbuild under the hood, making it significantly faster than `ts-node`.

**Alternative considered**: `ts-node-dev`. Rejected because `tsx` has simpler configuration and faster startup.

### shadcn/ui over raw Radix or MUI
shadcn/ui provides copy-pasted components built on Radix primitives and Tailwind CSS. It gives full control over component code (no black-box npm package), follows accessibility best practices by default, and integrates naturally with Tailwind's utility-first approach.

**Alternative considered**: MUI (Material UI). Rejected because it imposes a design system that's harder to customize, and the component source isn't owned.

### Tailwind CSS v4 over v3 or plain CSS
Tailwind CSS v4 is the latest stable release as of this project's start. It simplifies configuration with CSS-first setup (no `tailwind.config.js` required by default), uses the `@import "tailwindcss"` approach, and integrates cleanly with Vite's PostCSS pipeline.

**Alternative considered**: Tailwind v3. Rejected because v4 removes config boilerplate and the project is starting fresh — no migration burden.

### Independent TypeScript configs per package
Server and client each get their own `tsconfig.json`. The server targets Node.js (ESM modules), while the client targets the browser (DOM APIs, JSX). No shared root `tsconfig.json` — the two environments have fundamentally different compilation targets and their configs are small enough to maintain independently.

**Alternative considered**: Shared root `tsconfig.json`. Rejected because server and client need different `lib`, `module`, and `target` settings, and a shared base config would add indirection without real benefit.

### Docker Compose for containerized development
Both `server/` and `client/` get a `Dockerfile` (development-focused, single stage), and a root `docker-compose.yml` orchestrates them. The server container runs `tsx watch`, the client container runs `vite --host`, and source directories are bind-mounted for live reload. This lets anyone clone the repo and run `docker compose up` without installing Node.js locally.

**Alternative considered**: Dev containers (`.devcontainer.json`). Rejected — Docker Compose is simpler, doesn't require VS Code, and is more familiar to most developers.

## Risks / Trade-offs

- **concurrently output interleaving**: [Risk: server and client logs mix in terminal, making errors hard to spot] → [Mitigation: use `concurrently` with `prefix-colors` to distinguish output streams]
- **tsx watch may not restart on all file changes**: [Risk: rare edge cases where tsx misses a file change] → [Mitigation: `tsx watch` covers `.ts` and `.tsx` files by default; document manual restart as fallback]
- **Docker bind-mount performance**: [Risk: bind-mounted `node_modules/` can be slow on macOS/Windows] → [Mitigation: use a named volume for `node_modules/` in each service to keep deps inside the container; only source files are bind-mounted]
