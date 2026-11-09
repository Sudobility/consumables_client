# Consumables Client

> **Git policy — never auto-commit or auto-push.** Leave work in the working tree.
> Run `git commit`, `git push`, `gh pr create`, or `scripts/push_all.sh` **only when the user
> explicitly asks in that turn**. Approval for an earlier change does not carry forward, and
> finishing a task is not permission to commit it. Stay on the current branch — do not create
> feature branches for code changes.

Platform-agnostic business logic for a consumable "credits" system (buy credits, track balance,
record usage, redeem coupons). Ships a service + singleton + HTTP client + React hooks. Consumed
by `consumables_pages` (web) and `consumables_pages_rn` (RN); talks to `consumables_service`
over HTTP.

- npm: `@sudobility/consumables_client` (public). Version lives in `package.json` (currently 0.0.40).
- License: BUSL-1.1

## Stack

- TypeScript ~6.0 (very strict: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, etc.)
- Bun runtime **and** package manager (never npm/yarn/pnpm).
- ESM-only output. Build = `tsc -p tsconfig.build.json` then `scripts/fix-esm-imports.mjs`.
- Vitest ~4 for tests. ESLint ~10 + Prettier. JSX: `react-jsx` (React 18/19 peer).
- Scope `@sudobility` resolves to GitHub Packages (`.npmrc`), not public npm — install needs a
  GitHub token with `read:packages`.

## Commands (verified in package.json)

```bash
bun run build        # tsc build + fix-esm-imports.mjs
bun run clean        # rm -rf dist
bun run dev          # tsc --watch
bun run typecheck    # bunx tsc --noEmit
bun run lint         # bunx eslint src   (lint:fix for autofix)
bun run format       # prettier --write
bun run test:unit    # vitest run   <-- run tests THIS way
bun run test:watch   # vitest watch
bun run verify       # typecheck + lint + test:unit + build
```

**Do not run `bun test`** — that triggers Bun's own runner, not Vitest. Use `bun run test:unit`.

## Architecture

```
src/index.ts                      # barrel: core, network, hooks, types
src/types/{index,adapter}.ts      # client types + ConsumablesAdapter interface
src/core/service.ts               # ConsumablesService (caching, purchase/usage flow)
src/core/singleton.ts             # module-level singleton + event listeners
src/network/ConsumablesApiClient.ts  # HTTP client for /api/v1/consumables/*
src/hooks/*.ts                    # useBalance, useConsumableProducts, usePurchaseCredits,
                                  #   usePurchaseHistory, useUsageHistory
src/_node_globals.d.ts            # ambient node globals for the build script
scripts/fix-esm-imports.mjs       # post-build ESM specifier rewriter
tests/*.test.ts                   # singleton, ConsumablesService, ConsumablesApiClient
```

- **No React Context** — a module-level singleton (`initializeConsumables({ adapter, apiClient })`)
  holds the `ConsumablesService`; all hooks read from it. Never add a Context provider.
- **No payment SDK in this package.** Only the `ConsumablesAdapter` *interface* is exported
  (`getOfferings`, `purchase`, optional `setUserId`). Concrete adapters (RevenueCat, etc.) are
  injected by the UI packages via `initializeConsumables`. To support a platform, add an adapter
  in the UI package — not here.
- **Event-driven balance** — balance updates broadcast via `onConsumablesBalanceChange`; hooks
  subscribe. Emit `notifyBalanceChange()` after any balance mutation.
- **Entity scoping** — `ConsumablesApiClient` optionally scopes requests to a selected entity via
  a query param (`entityQueryParam`) and/or header (`entityHeaderName`), with the id from
  `getEntityId()`. Balance cache is keyed by entity id.

## Key conventions / gotchas

- **Server owns credits, not the store.** `loadOfferings()` fetches the store catalog via the
  adapter AND the approved product→credits map via `apiClient.getCreditProducts()`. Packages
  whose `productId` is not in the server allowlist are filtered out; the credit amount always
  comes from the API, never from store/RevenueCat metadata (that metadata is display-only).
- **packageId is composite.** Cached packages get `packageId = "<offeringId>::<storePackageId>"`;
  the original store id is kept in `storePackageId` and is what the adapter receives for purchase.
- **Purchase flow** (`ConsumablesService.purchase`): resolve package → `prepareCreditPurchase()`
  (optional entity-target POST) → `adapter.purchase()` → verify returned `productId` matches →
  `apiClient.recordPurchase()` → update balance cache. Mismatched product throws.
- **Cache lifetimes.** Offerings cache is global and preserved across user switches (products are
  not user-specific). Balance cache is per-entity and cleared on `setConsumablesUserId`. In-flight
  balance loads use a sequence guard so a stale response can't overwrite a newer entity's balance.
- **Singleton must be initialized first.** Hooks called before `initializeConsumables()` return
  empty/early (they check `isConsumablesInitialized()`), not throw. `useBalance` also returns null
  when there is no current user id.
- **API snake_case ↔ client camelCase.** `ConsumablesApiClient` maps both directions and tolerates
  either casing on responses. Endpoints under `/api/v1/consumables`: `/balance`, `/purchase`,
  `/use`, `/purchases`, `/usages`, `/redeem-coupon`, `/coupons`, `/coupons/history`,
  `/purchase-target`. The public catalog path defaults to `/api/v1/public/consumables/offerings`
  (override via `creditProductsPath`).
- **`removeComments: true`** in tsconfig strips JSDoc from `dist/` (intentional, for size).
- **ESM import fixer is required.** Do not drop `fix-esm-imports.mjs` from the build; without it
  the emitted extensionless specifiers are unresolvable by Node's ESM loader. The script is
  idempotent and never fails the build on unresolved (dynamic/doc-comment) specifiers.

## Publishing

- `prepublishOnly` runs `bun run build` (emits ESM to `dist/`). `files` ships `dist` + `CLAUDE.md`.
- Bump `version` in `package.json`, then publish. Test downstream consumers
  (`consumables_pages`) against the new version before publishing them.
