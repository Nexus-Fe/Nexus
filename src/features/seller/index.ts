export {
  sellerService,
  classifySellerRegistrationError,
  normalizeSellerRegistrationStatus,
  getSellerStatusMeta,
  isSensitiveIdentityKey,
  maskIdentityCard,
} from "./services/seller.service";
export type {
  SellerProfile,
  SellerRegistrationStatus,
  GhnWarehouseAddress,
  CreateSellerRegistrationPayload,
  SellerRegistrationCreatedResponse,
  VerifySellerOtpPayload,
  VerifySellerOtpResponse,
  ResendSellerOtpPayload,
  SellerRegistrationStatusRecord,
  SellerErrorCategory,
  ClassifiedSellerError,
  SellerBlockerInfo,
} from "./services/seller.service";
export { BecomeSellerScreen } from "./BecomeSellerScreen";
export { SellerProductDetailScreen } from "./SellerProductDetailScreen";
export {
  sellerCatalogService,
  evaluateProductActivationGate,
  flattenCategories,
  validateImageUploadSelection,
  loadSessionSellerProducts,
  saveSessionSellerProduct,
  loadSessionSkuStockMap,
} from "./services/seller-catalog.service";
export type {
  CategoryNode,
  FlattenedCategoryOption,
  ProductStatusCode,
  ProductInactiveReasonCode,
  VariantStatusCode,
  VariantAttributeItem,
  SellerVariantRecord,
  SellerProductImageRecord,
  SellerProductDetail,
  SellerProductListItem,
  SkuStockRecord,
  ProductActivationGateCheck,
} from "./services/seller-catalog.service";

// Seller Core Types & REST APIs
export * from "./types/seller.types";
export * from "./services/seller.api";

// Onboarding Components
export * from "./components/Onboarding";

// Profile Components
export * from "./components/Profile";

// Product Components
export * from "./components/Product";

// Inventory Components
export * from "./components/Inventory";

// Access Control Gate
export * from "./components/SellerRoleGate";







