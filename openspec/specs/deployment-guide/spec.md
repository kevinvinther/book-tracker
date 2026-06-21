# deployment-guide Specification

## Purpose
Operator documentation for deploying the production instance, backing up the data directory, and serving it over HTTPS with Tailscale.

## Requirements

### Requirement: Production deployment instructions

The documentation SHALL describe how to deploy the production instance, including building and starting the production Compose stack and pointing the data mount at the operator's library directory.

#### Scenario: Operator follows the deploy guide

- **WHEN** an operator follows the production deployment documentation
- **THEN** they can build and start the production stack and have it serve their existing library data

### Requirement: Data backup guidance

The documentation SHALL state that the entire library is the mounted data directory of plain markdown files and images, and that backing it up means backing up that directory with standard tools (e.g. git, rsync, or filesystem backup).

#### Scenario: Operator backs up the library

- **WHEN** an operator follows the backup guidance
- **THEN** they back up the data directory and capture the complete library

### Requirement: HTTPS via Tailscale Serve

The documentation SHALL explain that the app serves plain HTTP and that HTTPS is provided by `tailscale serve` in front of the container, and SHALL note that this secure context is required for the phone's camera-based barcode scanner to work.

#### Scenario: Operator exposes the app over HTTPS

- **WHEN** an operator follows the Tailscale HTTPS instructions
- **THEN** the app is reachable over HTTPS and the phone barcode scanner works in the resulting secure context
