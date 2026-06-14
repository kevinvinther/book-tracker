## Why

The project has no automated tests. Every existing capability spec — file I/O, slug generation, in-memory index, app config, health check — defines testable scenarios in WHEN/THEN format, but nothing executes them. A refactor or new feature could break existing behavior with no detection. Adding Vitest now, while the codebase is small, converts those spec scenarios into executable tests.

## What Changes

- Install **Vitest** as the test framework — native TypeScript ESM support, fast, compatible with the Vite ecosystem
- Add `test` and `test:watch` scripts to `server/package.json`
- Write test files for every existing capability, translating each spec's WHEN/THEN scenarios into Vitest assertions:
  - **config**: readConfig defaults, writeConfig persistence, atomic writes, directory creation, tilde expansion
  - **io**: readFile (valid/missing/invalid/missing frontmatter), writeFile (new/overwrite/parent creation), deleteFile, listFiles, resolveLibraryPath
  - **slug**: transliteration, normalization, truncation, fallbacks, collision disambiguation
  - **index**: load, lookup, cross-entity navigation, searchWorks, upsert, remove, malformed file skipping, note body storage
  - **API routes**: health check, config read/write with valid and invalid inputs
- Use isolated temp directories for file-system-dependent tests

## Capabilities

### New Capabilities

- `test-infrastructure`: Vitest test framework configured for ESM TypeScript, `test` and `test:watch` scripts. Tests are co-located with source files (`*.test.ts`). Temp directories isolate filesystem tests from real library data. Integration tests start the real Express server on a random port.

### Modified Capabilities

<!-- None — existing specs already define testable scenarios. This change adds the infrastructure to execute them. -->

## Impact

- New devDependency: `vitest`
- New files: `server/src/*.test.ts` (alongside each source module), `server/vitest.config.ts`
- Modified: `server/package.json` (test scripts)
- No production code changes
- No client changes
