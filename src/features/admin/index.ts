// Public Feature Interface for Admin
export { AdminCategoriesScreen } from "./AdminCategoriesScreen";
export { AdminConfigsScreen } from "./AdminConfigsScreen";
export { AdminCouponsScreen } from "./AdminCouponsScreen";
export { AdminLedgerScreen } from "./AdminLedgerScreen";
export { AdminRolesScreen } from "./AdminRolesScreen";
export { AdminUsersScreen } from "./AdminUsersScreen";
export { AdminOverviewScreen, AdminContractScreen } from "./AdminScreens";

// Services
export {
  adminUsersService,
  type AdminUser,
  type AdminUserPage,
  type AdminUserReputationLog,
} from "./services/admin-users.service";
export {
  adminCategoriesService,
  type AdminCategory,
  type CategoryInput,
} from "./services/admin-categories.service";
export {
  adminConfigsService,
  type SystemConfigItem,
  type UpdateConfigPayload,
} from "./services/admin-configs.service";
export {
  adminLedgerService,
  type ProcessWithdrawalPayload,
  type ProcessWithdrawalResponse,
  type BalanceAdjustmentPayload,
  type BalanceAdjustmentResponse,
} from "./services/admin-ledger.service";

// Domain Helpers
export {
  userId,
  userName,
  userStatusLabel,
  userStatusTone,
  maskIdentifyNumber,
  normalizeRoleCode,
  canonicalRoleCode,
  roleTone,
  getUserRoles,
  getPrimaryRole,
} from "./services/admin-helpers";
