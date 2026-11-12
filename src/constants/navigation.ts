import { ROUTES } from "./routes";
import type { IconName } from "@/components/ui/Icon";

export type NavigationItem = { label: string; href: string; icon: IconName };

export const buyerNavigation: NavigationItem[] = [
  { label: "Trang chủ", href: ROUTES.home, icon: "home" },
  { label: "Sản phẩm", href: ROUTES.catalog.index, icon: "grid" },
  { label: "Đấu giá trực tiếp", href: ROUTES.auction.index, icon: "gavel" },
  { label: "Đấu giá của tôi", href: ROUTES.buyer.auctions, icon: "gavel" },
  { label: "Đăng ký bán hàng", href: ROUTES.buyer.becomeSeller, icon: "warehouse" },
];

export const sellerNavigation: NavigationItem[] = [
  { label: "Quản lý sản phẩm", href: ROUTES.seller.products, icon: "grid" },
  { label: "Hồ sơ gian hàng", href: ROUTES.seller.shop, icon: "users" },
  { label: "Quản lý kho", href: ROUTES.seller.inventory, icon: "warehouse" },
  { label: "Đơn bán", href: ROUTES.seller.orders, icon: "orders" },
  { label: "Vận chuyển", href: ROUTES.seller.shipments, icon: "warehouse" },
  { label: "Phiên đấu giá", href: ROUTES.seller.auctions, icon: "gavel" },
  { label: "Đơn đấu giá", href: ROUTES.seller.auctionOrders, icon: "gavel" },
  { label: "Doanh thu & ví", href: ROUTES.seller.wallet, icon: "wallet" },
];

export const staffNavigation: NavigationItem[] = [
  { label: "Giám sát đấu giá", href: ROUTES.staff.auctions, icon: "gavel" },
  { label: "Duyệt người bán", href: ROUTES.staff.sellers, icon: "users" },
  { label: "Duyệt sản phẩm", href: ROUTES.staff.productModeration, icon: "grid" },
  { label: "Duyệt rút tiền", href: ROUTES.staff.withdrawals, icon: "wallet" },
  { label: "Khiếu nại & Vi phạm", href: ROUTES.staff.reports, icon: "flag" },
  { label: "Xử phạt vi phạm", href: ROUTES.staff.penalties, icon: "gavel" },
  { label: "Đối soát giao dịch", href: ROUTES.staff.discrepancies, icon: "orders" },
];

export const adminNavigation: NavigationItem[] = [
  { label: "Tổng quan hệ thống", href: ROUTES.admin.overview, icon: "home" },
  { label: "Tài khoản & Phân quyền", href: ROUTES.admin.users, icon: "users" },
  { label: "Danh mục sản phẩm", href: ROUTES.admin.categories, icon: "grid" },
  { label: "Xử phạt vi phạm", href: ROUTES.admin.penalties, icon: "gavel" },
  { label: "Điều chỉnh số dư ví", href: ROUTES.admin.ledger, icon: "wallet" },
  { label: "Mã giảm giá", href: ROUTES.admin.coupons, icon: "orders" },
  { label: "Cài đặt đấu giá", href: ROUTES.admin.auctionConfigs, icon: "gavel" },
  { label: "Quyết toán đấu giá", href: ROUTES.admin.auctionSettlements, icon: "orders" },
  { label: "Cài đặt hệ thống", href: ROUTES.admin.configs, icon: "shield" },
  { label: "Nhật ký & Thông báo", href: ROUTES.admin.notifications, icon: "orders" },
];
