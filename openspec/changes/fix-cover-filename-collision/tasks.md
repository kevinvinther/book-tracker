## 1. Implementation

- [x] 1.1 Add `import { randomUUID } from "crypto"` to `server/src/lib/lookup.ts`
- [x] 1.2 Replace URL-derived filename logic in `downloadCover()` with `crypto.randomUUID()` — extract extension from URL as before, generate filename as `${randomUUID()}.${ext}`
- [x] 1.3 Run `server` test suite to confirm existing `downloadCover` tests pass unchanged

## 2. Verification

- [x] 2.1 Verify via `npm test` (or server-only tests) that `lookup.test.ts` passes
- [x] 2.2 Spot-check: look up two different ISBNs that both return Google Books results, confirm cover filenames differ
