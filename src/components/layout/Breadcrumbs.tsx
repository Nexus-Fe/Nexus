"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/constants/routes";

const labels: Record<string, string> = {
  "/catalog": "Sản phẩm", "/auctions": "Đấu giá trực tiếp",
  "/buyer/cart": "Giỏ hàng", "/buyer/checkout": "Thông tin giao hàng",
  "/buyer/orders": "Đơn mua", "/buyer/auctions": "Đấu giá của tôi", "/buyer/wallet": "Ví của tôi",
  "/buyer/wallet/top-up": "Nạp tiền", "/buyer/reports": "Báo cáo", "/buyer/become-seller": "Đăng ký bán hàng",
  "/buyer/payment": "Thanh toán", "/buyer/payment/result": "Kết quả thanh toán",
  "/seller": "Kênh người bán", "/seller/products": "Quản lý sản phẩm", "/seller/products/new": "Tạo sản phẩm",
  "/seller/shop": "Hồ sơ gian hàng", "/seller/inventory": "Quản lý kho", "/seller/orders": "Đơn bán",
  "/seller/shipments": "Vận chuyển", "/seller/auctions": "Phiên đấu giá", "/seller/auctions/new": "Tạo phiên đấu giá",
  "/seller/wallet": "Doanh thu & ví", "/seller/withdrawals": "Yêu cầu rút tiền",
  "/staff": "Vận hành sàn", "/staff/auctions": "Giám sát đấu giá", "/staff/sellers": "Duyệt người bán",
  "/staff/product-moderation": "Duyệt sản phẩm", "/staff/withdrawals": "Duyệt rút tiền",
  "/staff/reports": "Khiếu nại & Vi phạm", "/staff/penalties": "Xử phạt vi phạm",
  "/staff/transactions/discrepancies": "Đối soát giao dịch",
  "/admin": "Quản trị hệ thống", "/admin/overview": "Tổng quan hệ thống", "/admin/auctions": "Giám sát đấu giá",
  "/admin/auction-configs": "Cài đặt đấu giá", "/admin/users": "Tài khoản & Phân quyền", "/admin/roles": "Phân quyền & vai trò",
  "/admin/penalties": "Xử phạt vi phạm", "/admin/reports": "Khiếu nại & Vi phạm",
  "/admin/categories": "Danh mục sản phẩm", "/admin/ledger": "Điều chỉnh số dư ví",
  "/admin/configs": "Cài đặt hệ thống", "/admin/coupons": "Mã giảm giá",
  "/admin/notifications": "Nhật ký & Thông báo",
  "/account/profile": "Hồ sơ cá nhân", "/account/change-password": "Đổi mật khẩu",
};

const terminalLabels: Record<string, string> = {
  edit: "Chỉnh sửa", recreate: "Tạo lại", result: "Kết quả", payment: "Thanh toán", review: "Đánh giá",
};

export function Breadcrumbs({ portal = false }: { portal?: boolean }) {
  const pathname = usePathname();
  if (!pathname || pathname === "/" || pathname.startsWith("/catalog/") || pathname === ROUTES.buyer.cart || pathname === ROUTES.buyer.checkout) return null;

  const pieces = pathname.split("/").filter(Boolean);
  const root = portal ? `/${pieces[0]}` : ROUTES.home;
  const rootLabel = portal ? labels[root] : "Trang chủ";
  if (!rootLabel) return null;

  const crumbs: { href: string; label: string }[] = [{ href: portal ? ({ seller: ROUTES.seller.products, staff: ROUTES.staff.auctions, admin: ROUTES.admin.overview }[pieces[0]] ?? root) : root, label: rootLabel }];
  const start = portal ? 2 : 1;
  for (let index = start; index <= pieces.length; index++) {
    const href = `/${pieces.slice(0, index).join("/")}`;
    const label = labels[href] ?? (index === pieces.length ? terminalLabels[pieces[index - 1]] ?? "Chi tiết" : undefined);
    if (label) crumbs.push({ href, label });
  }
  if (crumbs.length < 2) return null;

  return <nav className="site-breadcrumb" aria-label="Đường dẫn">
    <ol>{crumbs.map((crumb, index) => <li key={`${index}-${crumb.href}`}>
      {index > 0 && <span className="site-breadcrumb-separator" aria-hidden="true">›</span>}
      {index === crumbs.length - 1 ? <span aria-current="page">{crumb.label}</span> : <Link href={crumb.href}>{crumb.label}</Link>}
    </li>)}</ol>
  </nav>;
}
