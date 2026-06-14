# test-infrastructure Specification

## Purpose
TBD - created by archiving change add-testing. Update Purpose after archive.
## Requirements
### Requirement: Test framework is installed and configured
The system SHALL include Vitest as the test framework for the server, with a `vitest.config.ts` that supports TypeScript ESM and discovers test files matching the `**/*.test.ts` pattern. The `server/package.json` SHALL include `test` and `test:watch` scripts.

#### Scenario: Run all tests
- **WHEN** the developer runs `npm test` from the `server/` directory
- **THEN** Vitest discovers and executes all `*.test.ts` files
- **AND** exits with code 0 if all tests pass

#### Scenario: Run tests in watch mode
- **WHEN** the developer runs `npm run test:watch` from the `server/` directory
- **THEN** Vitest starts in watch mode and re-runs affected tests on file changes

### Requirement: Tests use isolated temp directories
Tests that depend on the filesystem SHALL create unique temp directories per test file and clean them up after execution, ensuring no test touches the user's real library data or other tests' files.

#### Scenario: Temp directory isolation
- **WHEN** a test suite that writes files runs concurrently with another test suite
- **THEN** neither test suite sees or interferes with the other's files

### Requirement: Integration tests use a real server instance
API integration tests SHALL start the Express server on a randomly assigned port (port 0), make HTTP requests using `fetch`, and close the server after the test file completes.

#### Scenario: Server starts and stops for integration tests
- **WHEN** the integration test file runs
- **THEN** the server starts on a random port before the first test
- **AND** the server stops after the last test completes

