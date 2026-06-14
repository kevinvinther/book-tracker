## Context

The server has 6 TypeScript source files across 4 modules (config, io, slug, index) plus the main Express server entry point. There are no tests, no test framework, no CI. The codebase uses ESM (`type: "module"`), TypeScript, and `tsx` for development execution. Three API routes exist: `GET /api/health`, `GET /api/config`, and `PATCH /api/config`. The data layer reads and writes markdown files in the user's library directory.

All existing modules are pure functions or classes with no framework coupling except the Express routes in `index.ts`. This makes them straightforward to unit test with isolated temp directories.

## Goals / Non-Goals

**Goals:**
- Install Vitest and configure it for ESM TypeScript
- Add `test` and `test:watch` npm scripts to `server/package.json`
- Write unit tests for every existing module using temp directories for isolation
- Write integration tests for the three API routes (spin up Express in test, tear down after)
- Tests pass in under 2 seconds total

**Non-Goals:**
- Client-side testing (frontend has no logic beyond health check display)
- Test coverage thresholds or enforcement
- GitHub Actions CI pipeline
- Property-based or fuzz testing
- Snapshot testing
- End-to-end tests across client and server

## Decisions

### Vitest over Jest or Mocha

Vitest is the fastest test runner for TypeScript projects in the Vite ecosystem. It natively understands ESM, TypeScript, and has a compatible assertion API (chai-like `expect`). It requires zero config for basic use with `tsx`-adjacent projects — drop a `vitest.config.ts` with `ts` file support and tests run. Compared to Jest, Vitest starts faster (esbuild under the hood), has better ESM support, and doesn't require `ts-jest` or `babel` transforms.

**Alternative considered**: Jest with `ts-jest`. Rejected — Jest's ESM support requires manual configuration (`NODE_OPTIONS=--experimental-vm-modules`), mocking is more verbose, and startup is slower. Mocha with `ts-node` was also rejected for similar ESM friction.

**Alternative considered**: Node.js built-in `node:test` runner. Rejected — no built-in mocking, no watch mode, no assertion library, and poor TypeScript integration.

### Test file placement: co-located `*.test.ts` alongside source

Test files live next to their source modules: `server/src/lib/io.test.ts` alongside `server/src/lib/io.ts`. This keeps tests close to the code they verify, makes imports short (`./io.js`), and follows a widely adopted convention. Vitest discovers tests via its default glob pattern `**/*.test.ts`.

**Alternative considered**: Separate `server/tests/` directory. Rejected — mirroring the `src/` hierarchy in a test directory duplicates the directory tree for no benefit.

### Temp directories for file I/O and index tests

Tests that touch the filesystem create a unique temp directory per test file (using `os.tmpdir()` + random suffix) and clean it up after all tests in the file run. This isolates tests from each other and from the user's real library. The Index class constructor accepts any `libraryPath`, making it trivially testable with a temp directory.

For config tests, the `.booktracker/config.yaml` path is hardcoded relative to the project root, so those tests need to be careful. Strategy: mock the PROJECT_ROOT constant or write config tests against a temp `.booktracker/` directory. Since the config module is a module-level singleton, the cleanest approach is to make the config path overridable or to test the internal functions (like `expandHome`) independently and rely on the Index integration tests for the startup flow.

**Alternative considered**: Mocking `fs` with `memfs`. Rejected — adds a dependency and hides real filesystem behavior. Testing against actual temp directories is more realistic and no slower.

### Integration tests: start real Express server on random port

API integration tests spin up the Express app on a random available port (port 0), make HTTP requests with `fetch`, and tear down after. This verifies the full request/response cycle including JSON parsing, validation, and error handling. The server's `app.listen()` returns a server handle that can be closed.

**Alternative considered**: `supertest` library. Rejected — adds a dependency for what `fetch` + a random port can do with 5 lines of setup.

### No mocking library needed (use Vitest's built-in `vi`)

Vitest includes `vi.fn()`, `vi.spyOn()`, and `vi.mock()` with Jest-compatible API. No additional mocking library is needed. For config tests that need to redirect the file path, `vi.mock` can replace the module-level constants.

## Risks / Trade-offs

- **Config tests can conflict with real config**: The config module hardcodes `.booktracker/config.yaml` relative to the project root. Running config tests could read/write the real config file. [Mitigation: Config tests use `vi.mock` to redirect the CONFIG_PATH constant to a temp directory, or test only `expandHome` which is pure and `readConfig`/`writeConfig` indirectly via the API integration test which already exercises them.]
- **Index integration test writes real files**: The Index.load() test with temp directory works fine, but the API integration test starts the real server which reads the real config and real library. [Mitigation: API tests check only the routes that don't depend on library content (health check, config read/write). They don't test Index-dependent routes since none exist yet.]
- **Port collision in integration tests**: Using port 0 (auto-assign) avoids this entirely.

## Open Questions

None.
