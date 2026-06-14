## ADDED Requirements

### Requirement: Environment variable overrides library path
The `readConfig` function SHALL check for a `BOOKTRACKER_LIBRARY_PATH` environment variable. When present, the configured `library_path` field SHALL be overridden with the environment variable's value, regardless of what is stored in `.booktracker/config.yaml`. When the environment variable is absent, the config file value SHALL be used as normal.

#### Scenario: Environment variable is set
- **WHEN** `BOOKTRACKER_LIBRARY_PATH=/data` is set in the environment and `readConfig()` is called
- **THEN** the returned config has `library_path: "/data"`, ignoring the config file value

#### Scenario: Environment variable is not set
- **WHEN** `BOOKTRACKER_LIBRARY_PATH` is not set and `readConfig()` is called
- **THEN** the returned config uses the value from `.booktracker/config.yaml`
