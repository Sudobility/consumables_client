# @sudobility/consumables_client

Cross-platform, platform-agnostic client for a consumable "credits" system. It provides the
business logic — a service, a module-level singleton, an HTTP API client, and React hooks — for
buying credits, tracking balances, recording usage, and redeeming coupons. It works with both
React (web) and React Native.

The package deliberately contains **no payment SDK**. Store integration (RevenueCat, StoreKit,
Google Play, etc.) is supplied by the host through an injected `ConsumablesAdapter`. Concrete
adapters live in the platform UI packages (`@sudobility/consumables_pages` for web,
`@sudobility/consumables_pages_rn` for React Native).

- **npm name**: `@sudobility/consumables_client` (public, scoped)
- **License**: BUSL-1.1

## Installation

The `@sudobility` scope resolves to GitHub Packages (see `.npmrc`:
`@sudobility:registry=https://npm.pkg.github.com`), so an authenticated GitHub token with
`read:packages` is required to install.

```bash
bun add @sudobility/consumables_client
```

Peer dependencies you must provide in the host app:

- `@sudobility/types` `^1.9.78` — shared types (`NetworkClient`, `ConsumablePurchaseRecord`, `ConsumableUsageRecord`)
- `react` `^18 || ^19` — the hooks use React

## Usage

```typescript
import {
  initializeConsumables,
  setConsumablesUserId,
  ConsumablesApiClient,
  useBalance,
  usePurchaseCredits,
} from '@sudobility/consumables_client';

// 1. Build the API client (wraps your app's NetworkClient).
const apiClient = new ConsumablesApiClient({
  baseUrl: 'https://api.example.com',
  networkClient,                 // from @sudobility/types
  // Optional entity scoping / auth — see ConsumablesApiClientConfig:
  // getEntityId, entityQueryParam, entityHeaderName, getAuthToken,
  // creditProductsPath, purchaseTargetPath
});

// 2. Initialize the singleton once at app startup with a platform adapter.
//    `adapter` implements ConsumablesAdapter and is provided by the UI package
//    (e.g. createConsumablesWebAdapter from @sudobility/consumables_pages).
initializeConsumables({ adapter, apiClient });

// 3. Set the user on auth-state changes (async; clears the per-user balance cache).
await setConsumablesUserId(userId, email);

// 4. Use the React hooks inside components.
function Store() {
  const { balance, isLoading } = useBalance();
  const { purchase, isPurchasing } = usePurchaseCredits();
  // purchase(packageId, offeringId) -> Promise<boolean>
}
```

> **Note:** This package does not export concrete payment adapters. It exports the
> `ConsumablesAdapter` *interface*; you inject an implementation via `initializeConsumables`.

## API

### Singleton (module-level, no React Context)

| Export | Description |
|--------|-------------|
| `initializeConsumables(config)` | Initialize the singleton with `{ adapter, apiClient }`. Call once at startup. |
| `getConsumablesInstance()` | Get the `ConsumablesService`; throws if not initialized. |
| `isConsumablesInitialized()` | Whether the singleton has been initialized. |
| `resetConsumables()` | Reset the singleton (mainly for tests). |
| `refreshConsumablesBalance()` | Force-refresh the balance from the server and notify listeners. |
| `setConsumablesUserId(userId, email?)` | **async** — set the user on auth changes; clears balance cache and calls `adapter.setUserId`. |
| `getConsumablesUserId()` | Get the current user id. |
| `onConsumablesBalanceChange(listener)` | Subscribe to balance changes; returns an unsubscribe fn. |
| `onConsumablesUserIdChange(listener)` | Subscribe to user changes; returns an unsubscribe fn. |
| `notifyBalanceChange()` | Manually fire balance-change listeners (after a purchase/usage). |

### Core

| Export | Description |
|--------|-------------|
| `ConsumablesService` | Orchestration class. Manages the offerings cache (global) and balance cache (per-entity), the purchase flow, usage, and history. |

### Network

| Export | Description |
|--------|-------------|
| `ConsumablesApiClient` | HTTP client over a `NetworkClient` for the `/api/v1/consumables/*` endpoints. Maps snake_case API ↔ camelCase client types, supports entity scoping, coupons, and a public offerings catalog. |

### Hooks

| Hook | Description |
|------|-------------|
| `useBalance()` | Current balance; subscribes to balance and userId changes. Returns `{ balance, initialCredits, isLoading, error, refetch }`. |
| `useConsumableProducts(offeringId?)` | Packages from an offering (or all offerings if omitted). Returns `{ packages, isLoading, error, refetch }`. |
| `usePurchaseCredits()` | `{ purchase(packageId, offeringId) => Promise<boolean>, isPurchasing, error }`. |
| `usePurchaseHistory(limit?)` | Paginated purchase records with `loadMore` (default limit 50). |
| `useUsageHistory(limit?)` | Paginated usage records with `loadMore` (default limit 50). |

### Types

`ConsumablesAdapter`, `ConsumablePurchaseResult`, `ConsumablePurchaseParams`, `CreditPackage`,
`CreditOffering`, `CreditBalance`, `ProductMetadata`, `ConsumablesConfig`,
`ConsumablesServiceConfig`, `ConsumablesApiClientConfig`, `CreditCoupon`,
`CreditCouponHistoryItem`, plus the `Use*Result` hook result types.

## Development

```bash
bun install            # Install dependencies
bun run build          # tsc (tsconfig.build.json) -> dist/, then fix-esm-imports.mjs
bun run dev            # tsc --watch
bun run clean          # Remove dist/
bun run typecheck      # bunx tsc --noEmit
bun run lint           # bunx eslint src
bun run lint:fix       # eslint --fix
bun run format         # prettier --write
bun run test:unit      # vitest run  (NOTE: use this, not `bun test`)
bun run test:watch     # vitest (watch)
bun run verify         # typecheck + lint + test:unit + build
```

> Tests run under **Vitest**, so run them with `bun run test:unit` / `bun run test:watch`.
> `bun test` would invoke Bun's own test runner, which is not used here.

The build emits ESM only. Because `tsc` runs under `moduleResolution: "bundler"` it leaves
extensionless relative specifiers (e.g. `./core`) in the output; `scripts/fix-esm-imports.mjs`
rewrites them to fully-qualified paths (`./core/index.js`) so Node's native ESM loader can
resolve them.

## Related projects

Dependency direction: `consumables_pages` → `consumables_client` → `consumables_service` (HTTP)

- **`@sudobility/consumables_pages`** / **`@sudobility/consumables_pages_rn`** — UI for the
  credits store and history. They provide the concrete `ConsumablesAdapter` implementations
  injected into `initializeConsumables`.
- **`@sudobility/consumables_service`** — backend that owns balances, purchases, usage, and the
  approved product catalog. This client calls its API over HTTP.

## License

BUSL-1.1
