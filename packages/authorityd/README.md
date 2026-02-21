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

```bash
# Start sidecar in local mode
npx predicate-authorityd run --port 8787 --policy-file policy.json

# Start with control-plane sync
npx predicate-authorityd run \
  --mode cloud_connected \
  --control-plane-url https://api.predicatesystems.dev \
  --tenant-id your-tenant \
  --project-id your-project \
  --predicate-api-key $PREDICATE_API_KEY \
  --sync-enabled

# Show help
npx predicate-authorityd --help
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
