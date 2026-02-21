# @predicatesystems/authorityd

Predicate Authority Sidecar binary distribution for Node.js.

This package provides the `predicate-authorityd` binary for your platform, automatically selecting the correct architecture during installation.

## Installation

```bash
npm install @predicatesystems/authorityd
```

The appropriate binary for your platform will be downloaded automatically via optional dependencies.

## Supported Platforms

| Platform | Architecture | Package |
|----------|--------------|---------|
| macOS | Apple Silicon (arm64) | `@predicatesystems/authorityd-darwin-arm64` |
| macOS | Intel (x64) | `@predicatesystems/authorityd-darwin-x64` |
| Linux | x64 | `@predicatesystems/authorityd-linux-x64` |
| Linux | arm64 | `@predicatesystems/authorityd-linux-arm64` |
| Windows | x64 | `@predicatesystems/authorityd-win32-x64` |

## Usage

### CLI

**IMPORTANT:** CLI arguments must be placed **before** the `run` subcommand.

```bash
# Show help
npx predicate-authorityd --help

# Start sidecar in local mode
npx predicate-authorityd \
  --host 127.0.0.1 \
  --port 8787 \
  --mode local_only \
  --policy-file policy.json \
  run

# Start with control-plane sync
npx predicate-authorityd \
  --host 127.0.0.1 \
  --port 8787 \
  --mode cloud_connected \
  --policy-file policy.json \
  --control-plane-url https://api.predicatesystems.dev \
  --tenant-id your-tenant \
  --project-id your-project \
  --predicate-api-key "$PREDICATE_API_KEY" \
  --sync-enabled \
  run

# Using environment variables
export PREDICATE_HOST=127.0.0.1
export PREDICATE_PORT=8787
export PREDICATE_MODE=local_only
export PREDICATE_POLICY_FILE=policy.json
npx predicate-authorityd run

# Generate example config file
npx predicate-authorityd init-config --output config.toml

# Run with config file
npx predicate-authorityd --config config.toml run
```

### CLI Reference

```
GLOBAL OPTIONS (use before 'run'):
  -c, --config <FILE>           Path to TOML config file [env: PREDICATE_CONFIG]
      --host <HOST>             Host to bind to [env: PREDICATE_HOST] [default: 127.0.0.1]
      --port <PORT>             Port to bind to [env: PREDICATE_PORT] [default: 8787]
      --mode <MODE>             local_only or cloud_connected [env: PREDICATE_MODE]
      --policy-file <PATH>      Path to policy JSON [env: PREDICATE_POLICY_FILE]
      --identity-file <PATH>    Path to local identity registry [env: PREDICATE_IDENTITY_FILE]
      --log-level <LEVEL>       trace, debug, info, warn, error [env: PREDICATE_LOG_LEVEL]
      --control-plane-url <URL> Control-plane URL [env: PREDICATE_CONTROL_PLANE_URL]
      --tenant-id <ID>          Tenant ID [env: PREDICATE_TENANT_ID]
      --project-id <ID>         Project ID [env: PREDICATE_PROJECT_ID]
      --predicate-api-key <KEY> API key [env: PREDICATE_API_KEY]
      --sync-enabled            Enable control-plane sync [env: PREDICATE_SYNC_ENABLED]
      --fail-open               Fail open if control-plane unreachable [env: PREDICATE_FAIL_OPEN]

COMMANDS:
  run          Start the daemon (default)
  init-config  Generate example config file
  check-config Validate config file
  version      Show version info
```

### Programmatic API

```typescript
import { spawnSidecar, getSidecarPath, isSidecarAvailable } from '@predicatesystems/authorityd';

// Check if binary is available
if (!isSidecarAvailable()) {
  console.error('Sidecar binary not found');
  process.exit(1);
}

// Spawn sidecar process
const sidecar = spawnSidecar({
  port: 8787,
  mode: 'local_only',
  policyFile: './policy.json',
  logLevel: 'info',
});

// Handle shutdown
process.on('SIGTERM', () => {
  sidecar.kill('SIGTERM');
});

sidecar.on('close', (code) => {
  console.log(`Sidecar exited with code ${code}`);
});
```

### With @predicatesystems/authority SDK

```typescript
import { AuthorityClient } from '@predicatesystems/authority';
import { spawnSidecar } from '@predicatesystems/authorityd';

// Start sidecar
const sidecar = spawnSidecar({
  port: 8787,
  policyFile: './policy.json',
});

// Wait for sidecar to be ready
await new Promise(resolve => setTimeout(resolve, 1000));

// Create client
const client = new AuthorityClient({
  baseUrl: 'http://127.0.0.1:8787',
});

// Use client
const decision = await client.authorize({
  principal: 'agent:example',
  action: 'http.get',
  resource: 'https://api.example.com/data',
  intent_hash: 'hash123',
});

console.log('Decision:', decision.allowed);
```

## API Reference

### `getSidecarPath(): string`

Returns the absolute path to the sidecar binary. Throws if not found.

### `isSidecarAvailable(): boolean`

Returns `true` if the sidecar binary is available.

### `spawnSidecar(options?: SidecarOptions): ChildProcess`

Spawns the sidecar process with the given options.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `host` | `string` | `127.0.0.1` | Host to bind to |
| `port` | `number` | `8787` | Port to bind to |
| `mode` | `'local_only' \| 'cloud_connected'` | `local_only` | Operating mode |
| `policyFile` | `string` | - | Path to policy JSON file |
| `identityFile` | `string` | - | Path to local identity registry |
| `logLevel` | `string` | `info` | Log level |
| `controlPlaneUrl` | `string` | - | Control-plane URL |
| `tenantId` | `string` | - | Tenant ID |
| `projectId` | `string` | - | Project ID |
| `apiKey` | `string` | - | API key (prefer env var) |
| `syncEnabled` | `boolean` | `false` | Enable control-plane sync |
| `failOpen` | `boolean` | `false` | Fail open if control-plane unreachable |
| `spawnOptions` | `SpawnOptions` | - | Additional Node.js spawn options |

### `getSidecarVersion(): Promise<string>`

Returns the sidecar version string.

## Manual Installation

If automatic installation fails, download the binary manually:

1. Go to [releases](https://github.com/PredicateSystems/predicate-authority-sidecar/releases)
2. Download the binary for your platform
3. Place it in your PATH or use `getSidecarPath()` to locate it

## License

MIT / Apache-2.0
