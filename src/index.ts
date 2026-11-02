/**
 * @sudobility/consumables_client
 *
 * Cross-platform consumable credits client with RevenueCat adapter pattern.
 * Works with both React (web) and React Native.
 */

// Core
export {
  initializeConsumables,
  getConsumablesInstance,
  isConsumablesInitialized,
  resetConsumables,
  refreshConsumablesBalance,
  setConsumablesUserId,
  getConsumablesUserId,
  onConsumablesBalanceChange,
  onConsumablesUserIdChange,
  notifyBalanceChange,
  ConsumablesService,
  type ConsumablesConfig,
  type ConsumablesServiceConfig,
} from "./core";

// Network
export {
  ConsumablesApiClient,
  type ConsumablesApiClientConfig,
  type CreditCoupon,
  type CreditCouponHistoryItem,
} from "./network/ConsumablesApiClient";

// Hooks
export {
  useBalance,
  useConsumableProducts,
  usePurchaseCredits,
  usePurchaseHistory,
  useUsageHistory,
  type UseBalanceResult,
  type UseConsumableProductsResult,
  type UsePurchaseCreditsResult,
  type UsePurchaseHistoryResult,
  type UseUsageHistoryResult,
} from "./hooks";

// Types (client-only)
export type {
  ConsumablesAdapter,
  ConsumablePurchaseResult,
  ConsumablePurchaseParams,
  CreditPackage,
  CreditOffering,
  CreditBalance,
  ProductMetadata,
} from "./types";

// NOTE: Concrete RevenueCat adapters are intentionally NOT part of this package.
// consumables_client is platform-agnostic business logic and must not pull in a
// platform SDK (@revenuecat/purchases-js on web, react-native-purchases on RN).
// The agnostic seam is `initializeConsumables({ adapter })` + the
// `ConsumablesAdapter` interface above. Concrete adapters live in the platform
// UI packages and are injected through that seam:
//   - Web:          @sudobility/consumables_pages    (createConsumablesWebAdapter)
//   - React Native: @sudobility/consumables_pages_rn (createConsumablesRNAdapter)
