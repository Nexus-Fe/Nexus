// Public Feature Interface for Admin
export { AdminAuctionConfigsScreen } from "./AdminAuctionConfigsScreen";
export { AdminCategoriesScreen } from "./AdminCategoriesScreen";
export { AdminConfigsScreen } from "./AdminConfigsScreen";
export { AdminCouponsScreen } from "./AdminCouponsScreen";
export { AdminLedgerScreen } from "./AdminLedgerScreen";
export { AdminNotificationsScreen } from "./AdminNotificationsScreen";
export { AdminPenaltiesScreen } from "./AdminPenaltiesScreen";
export { AdminRolesScreen } from "./AdminRolesScreen";
export { AdminUsersScreen } from "./AdminUsersScreen";
export { AdminOverviewScreen, AdminContractScreen } from "./AdminScreens";

// Services
export {
  adminAuctionConfigsService,
  type AuctionConfigDto,
  type AuctionConfigHistoryItemDto,
  type UpdateAuctionConfigRequest,
} from "./services/admin-auction-configs.service";
export {
  adminNotificationsService,
  type InAppNotificationItemResponse,
  type EventLogSummaryResponse,
  type EventLogDetailResponse,
  type SearchNotificationQuery,
  type ListEventLogsQuery,
} from "./services/admin-notifications.service";

// Services
export {
  adminUsersService,
  type AdminUser,
  type AdminUserPage,
  type AdminUserReputationLog,
  type AdminSellerProfileDetail,
  type BanUserPayload,
  type SuspendSellerPayload,
  type ReactivateSellerPayload,
} from "./services/admin-users.service";
export {
  adminPenaltiesService,
  penaltyStatusLabel,
  penaltyStatusTone,
  penaltyTypeLabel,
  penaltyViolationTypeLabel,
  targetRoleTone,
  type AdminPenaltyItem,
  type AdminPenaltyDetail,
  type AdminPenaltiesQuery,
  type AdminPenaltiesPage,
} from "./services/admin-penalties.service";
export {
  adminReportsService,
  reportStatusLabel,
  reportStatusTone,
  reportViolationTypeLabel,
  type AdminReportItem,
  type ResolveReportPayload,
  type DismissReportPayload,
  type AdminReportsQuery,
  type AdminReportsPage,
} from "./services/admin-reports.service";
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
