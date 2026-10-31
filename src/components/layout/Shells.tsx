"use client";

import Link from "next/link";
import { Suspense, useState, type ReactNode } from "react";
import type { NavigationItem } from "@/constants/navigation";
import { buyerNavigation } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { Icon } from "@/components/ui/Icon";
import { useSession } from "@/components/auth/SessionProvider";
import { authService } from "@/features/auth";
import { NavLinks } from "./NavLinks";
import { useRouter } from "next/navigation";

const roleDashboardLinks = [
  { role: "admin", label: "Quản trị hệ thống", href: ROUTES.admin.overview, icon: "shield" },
  { role: "staff", label: "Vận hành sàn", href: ROUTES.staff.auctions, icon: "gavel" },
  { role: "seller", label: "Kênh người bán", href: ROUTES.seller.products, icon: "grid" },
] as const;

function dashboardsForRoles(roles: string[]) {
  const normalizedRoles = new Set(roles.map((role) => {
    const normalized = role.toLocaleLowerCase("en-US");
    return normalized === "supportstaff" ? "staff" : normalized;
  }));
  return roleDashboardLinks.filter((entry) => normalizedRoles.has(entry.role));
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return <span className={"brand" + (compact ? " brand-compact" : "")}>NEXUS<span className="brand-mark">●</span></span>;
}

function AccountNavigation() {
  const { user, clearSession } = useSession();
  const router = useRouter();
  const displayName = user?.displayName || user?.firstName || user?.username || user?.email || "tài khoản";
  const userRoles = user?.roles ?? (user?.role ? [user.role] : []);
  const hasPrivilegedRole = dashboardsForRoles(userRoles).length > 0;
  const logout = async () => {
    try { await authService.logout(); } catch { /* Clear the local session even when the Gateway is unavailable. */ } finally { clearSession(); router.replace(ROUTES.auth.login); }
  };
  return <div className="account-nav">
    {user ? (
      <details className="account-menu">
        <summary><Icon name="user" size={26} /><span>Tài khoản {displayName}</span><Icon name="chevronDown" size={18} /></summary>
        <div className="account-menu-panel">
          {!hasPrivilegedRole && <Link href={ROUTES.buyer.orders}>Đơn mua</Link>}
          <Link href={ROUTES.buyer.wallet}>Ví của tôi</Link>
          <Link href={ROUTES.auth.profile}>Hồ sơ cá nhân</Link>
          <Link href={ROUTES.auth.changePassword}>Đổi mật khẩu</Link>
          <button type="button" onClick={() => void logout()}>Đăng xuất</button>
        </div>
      </details>
    ) : (
      <Link className="account-login" href={ROUTES.auth.login}>Đăng nhập</Link>
    )}
  </div>;
}

function PortalAccountControls() {
  const { user, clearSession } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try { await authService.logout(); } catch { /* Keep the local session closed if the Gateway is unavailable. */ }
    clearSession(); router.replace(ROUTES.auth.login);
  }
  return <div className="header-actions"><Link href={ROUTES.auth.profile}>Hồ sơ</Link><Link href={ROUTES.auth.changePassword}>Đổi mật khẩu</Link>{user ? <button type="button" className="button button-secondary button-small" disabled={busy} onClick={() => void logout()}>{busy ? "Đang đăng xuất…" : "Đăng xuất"}</button> : <Link href={ROUTES.auth.login}>Đăng nhập</Link>}</div>;
}

export function BuyerShell({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const userRoles = user?.roles ?? (user?.role ? [user.role] : []);
  const dashboardLinks = dashboardsForRoles(userRoles);
  const hasPrivilegedRole = dashboardLinks.length > 0;

  return <div className="site-shell">
    <header className="buyer-header">
      <div className="buyer-header-inner">
        <Link href={ROUTES.home} aria-label="NEXUS - Trang chủ"><Brand /></Link>
        <form action={ROUTES.catalog.index} method="get" className="header-search">
          <Icon name="search" size={18} />
          <label className="sr-only" htmlFor="site-search">Tìm sản phẩm</label>
          <input id="site-search" type="search" name="keyword" placeholder="Tìm sản phẩm, danh mục…" />
          <button type="submit" aria-label="Tìm kiếm"><Icon name="arrow" size={17} /></button>
        </form>
        <div className="header-actions">
          {hasPrivilegedRole ? dashboardLinks.map(({ role, label, href, icon }) => (
            <Link key={role} className="button button-secondary button-small role-dashboard-link" href={href} aria-label={label} title={label}>
              <Icon name={icon} size={18} /><span>{label}</span>
            </Link>
          )) : <>
            <Link href={ROUTES.buyer.orders}><Icon name="orders" size={19} /><span>Đơn mua</span></Link>
            <Link href={ROUTES.buyer.cart}><Icon name="bag" size={19} /><span>Giỏ hàng</span></Link>
          </>}
          <AccountNavigation />
        </div>
      </div>
      <div className="buyer-nav-wrap"><Suspense fallback={null}><NavLinks items={buyerNavigation} variant="top" /></Suspense></div>
    </header>
    <main id="main-content" className="buyer-main">{children}</main>
    <footer className="site-footer"><div><Brand compact /><p>Copyright 2026</p></div><p>© NEXUS</p></footer>
  </div>;
}

export function PortalShell({ children, role, subtitle, items }: { children: ReactNode; role: string; subtitle: string; items: NavigationItem[] }) {
  return <div className="portal-shell"><aside className="portal-sidebar"><div className="sidebar-brand"><Brand /><span className="role-pill">{role}</span></div><p className="sidebar-label">{subtitle}</p><Suspense fallback={null}><NavLinks items={items} /></Suspense><div className="sidebar-bottom"><div className="avatar">{role.slice(0, 1)}</div><div><strong>Không gian {role}</strong><span>{subtitle}</span></div></div></aside><div className="portal-column"><header className="portal-header"><div><span className="mobile-brand"><Brand compact /></span><span className="portal-breadcrumb">{subtitle} <Icon name="chevron" size={14} /> {role}</span></div><PortalAccountControls /></header><details className="mobile-menu"><summary>Menu {role}</summary><Suspense fallback={null}><NavLinks items={items} /></Suspense></details><main id="main-content" className="portal-main">{children}</main></div></div>;
}

export function AuthShell({ children }: { children: ReactNode }) {
  return <div className="auth-shell"><header className="auth-header"><Link href={ROUTES.home} aria-label="NEXUS - Trang chủ"><Brand /></Link><Link className="auth-home" href={ROUTES.home}>Quay lại trang chủ</Link></header><main className="auth-main">{children}</main><footer className="auth-footer"><span>© NEXUS</span><span>Điều khoản dịch vụ　·　Chính sách bảo mật</span></footer></div>;
}
