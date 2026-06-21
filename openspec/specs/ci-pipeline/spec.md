# ci-pipeline Specification

## Purpose
A continuous integration workflow that runs server tests, client lint, and the production builds on push and pull request.

## Requirements

### Requirement: CI runs tests, lint, and production builds

The repository SHALL provide a GitHub Actions workflow that, on push and pull request, runs the server test suite, the client lint, and the production builds of both the client and the server. The workflow SHALL fail if any of these steps fail.

#### Scenario: Passing change

- **WHEN** a push or pull request is made and tests, lint, and both production builds succeed
- **THEN** the CI workflow reports success

#### Scenario: Failing tests block the workflow

- **WHEN** the server test suite fails for a push or pull request
- **THEN** the CI workflow reports failure

#### Scenario: Broken production build is caught

- **WHEN** the client or server production build fails to compile
- **THEN** the CI workflow reports failure
