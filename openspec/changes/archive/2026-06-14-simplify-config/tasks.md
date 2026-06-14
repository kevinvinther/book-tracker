## 1. Simplify Config Module

- [x] 1.1 Rewrite `readConfig()` to env var only: `{ library_path: process.env.BOOKTRACKER_LIBRARY_PATH || "~/book-tracker-data/" }`
- [x] 1.2 Remove `writeConfig()` function
- [x] 1.3 Remove config file path constants (`CONFIG_PATH`, `CONFIG_DIR`, `PROJECT_ROOT`)
- [x] 1.4 Remove unused imports (`readFileSync`, `writeFileSync`, `renameSync`, `unlinkSync`, `load`, `dump`)

## 2. Update API Routes

- [x] 2.1 Remove `PATCH /api/config` endpoint entirely from `server/src/index.ts`
- [x] 2.2 Keep `GET /api/config` as-is (returns read-only config from env var)

## 3. Cleanup

- [x] 3.1 Delete `.booktracker/config.yaml` if it exists
- [x] 3.2 Add `.booktracker/` to `.gitignore`
- [x] 3.3 Update `api.test.ts` to remove PATCH config tests

## 4. Verification

- [x] 4.1 Run `npm test` — all tests pass
- [x] 4.2 Verify `GET /api/config` returns default when no env var set
- [x] 4.3 Verify `GET /api/config` returns env var value when set
