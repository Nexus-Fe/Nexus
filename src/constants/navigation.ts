import { ROUTES } from "./routes";
import type { IconName } from "@/components/ui/Icon";

export type NavigationItem = { label: string; href: string; icon: IconName };

export const buyerNavigation: NavigationItem[] = [
  { label: "Trang chủ", href: ROUTES.home, icon: "home" },
  { label: "Sản phẩm", href: ROUTES.catalog.index, icon: "grid" },
  { label: "Đấu giá trực tiếp", href: ROUTES.auction.index, icon: "gavel" },
  { label: "Đấu giá của tôi", href: ROUTES.buyer.auctions, icon: "gavel" },
  { label: "Ví của tôi", href: ROUTES.buyer.wallet, icon: "wallet" },
  { label: "Báo cáo", href: ROUTES.buyer.reports, icon: "flag" },
];

export const sellerNavigation: NavigationItem[] = [
  { label: "Quản lý sản phẩm", href: ROUTES.seller.products, icon: "grid" },
  { label: "Hồ sơ gian hàng", href: ROUTES.seller.shop, icon: "users" },
  { label: "Quản lý kho", href: ROUTES.seller.inventory, icon: "warehouse" },
  { label: "Đơn bán", href: ROUTES.seller.orders, icon: "orders" },
  { label: "Vận chuyển", href: ROUTES.seller.shipments, icon: "warehouse" },
  { label: "Phiên đấu giá", href: ROUTES.seller.auctions, icon: "gavel" },
  { label: "Doanh thu & ví", href: ROUTES.seller.wallet, icon: "wallet" },
];

export const staffNavigation: NavigationItem[] = [
  { label: "Vận hành đấu giá", href: ROUTES.staff.auctions, icon: "gavel" },
  { label: "Duyệt hồ sơ Seller", href: ROUTES.staff.sellers, icon: "users" },
  { label: "Báo cáo & khiếu nại", href: ROUTES.staff.reports, icon: "flag" },
  { label: "Duyệt yêu cầu rút", href: ROUTES.staff.withdrawals, icon: "wallet" },
  { label: "Kiểm duyệt sản phẩm", href: ROUTES.staff.productModeration, icon: "grid" },
  { label: "Sai lệch giao dịch", href: ROUTES.staff.discrepancies, icon: "orders" },
];

export const adminNavigation: NavigationItem[] = [
  { label: "Tổng quan", href: ROUTES.admin.overview, icon: "home" },
  { label: "Quản lý đấu giá", href: ROUTES.admin.auctions, icon: "gavel" },
  { label: "Cấu hình đấu giá", href: ROUTES.admin.auctionConfigs, icon: "shield" },
  { label: "Quản lý tài khoản", href: ROUTES.admin.users, icon: "users" },
  { label: "Phân quyền RBAC", href: ROUTES.admin.roles, icon: "shield" },
  { label: "Danh mục", href: ROUTES.admin.categories, icon: "grid" },
  { label: "Sổ giao dịch", href: ROUTES.admin.ledger, icon: "orders" },
  { label: "Audit Log", href: ROUTES.admin.auditLog, icon: "flag" },
  { label: "Cấu hình hệ thống", href: ROUTES.admin.configs, icon: "shield" },
  { label: "Mã giảm giá", href: ROUTES.admin.coupons, icon: "orders" },
  { label: "Tình trạng hệ thống", href: ROUTES.admin.systemHealth, icon: "shield" },
];
