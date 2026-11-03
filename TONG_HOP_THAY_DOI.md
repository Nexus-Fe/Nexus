# BÁO CÁO TỔNG HỢP CÁC PHẦN ĐÃ SỬA ĐỔI (CODE DIFF + / -)

> **Dự án**: NEXUS Frontend  
> **Thời gian tạo**: 03/11/2026  
> **Mục tiêu**: Báo cáo chi tiết và tổng hợp tất cả các file đã sửa đổi, mã code thay đổi (`+` thêm mới, `-` xóa bỏ) và kết quả kiểm thử.

---

## MỤC LỤC
1. [Tổng quan các nhóm chức năng đã sửa](#1-tổng-quan-các-nhóm-chức-năng-đã-sửa)
2. [Bảng thống kê các file thay đổi](#2-bảng-thống-kê-các-file-thay-đổi)
3. [Chi tiết code thay đổi từng file (Diff + / -)](#3-chi-tiết-code-thay-đổi-từng-file-diff---)
   - [3.1. src/lib/api/client.ts](#31-srclibapiclientts)
   - [3.2. src/components/auth/SessionProvider.tsx](#32-srccomponentsauthsessionprovidertsx)
   - [3.3. src/components/auth/RoleGate.tsx](#33-srccomponentsauthrolegatetsx)
   - [3.4. src/features/auth/AuthScreens.tsx](#34-srcfeaturesauthauthscreenstsx)
   - [3.5. src/features/auth/services/auth.service.ts](#35-srcfeaturesauthservicesauthservicets)
   - [3.6. src/components/layout/Shells.tsx](#36-srccomponentslayoutshellstsx)
   - [3.7. src/constants/navigation.ts](#37-srcconstantsnavigationts)
   - [3.8. src/features/admin/services/admin-users.service.ts](#38-srcfeaturesadminservicesadmin-usersservicets)
   - [3.9. src/features/admin/AdminScreens.tsx](#39-srcfeaturesadminadminscreenstsx)
   - [3.10. src/features/admin/AdminUsersScreen.tsx](#310-srcfeaturesadminadminusersscreentsx)
   - [3.11. src/features/admin/AdminRolesScreen.tsx (Tạo mới)](#311-srcfeaturesadminadminrolesscreentsx-tạo-mới)
   - [3.12. src/features/staff/StaffSellersScreen.tsx](#312-srcfeaturesstaffstaffsellersscreentsx)
   - [3.13. src/app/api/gateway/[...path]/route.ts](#313-srcappapigatewaypathroutets)
   - [3.14. src/app/(dashboard)/buyer/layout.tsx](#314-srcappdashboardbuyerlayouttsx)
   - [3.15. src/styles/globals.css](#315-srcstylesglobalscss)
   - [3.16. tests/api-client-session.test.mjs](#316-testsapi-client-sessiontestmjs)
4. [Kết quả kiểm thử & Độ ổn định hệ thống](#4-kết-quả-kiểm-thử--độ-ổn-định-hệ-thống)

---

## 1. TỔNG QUAN CÁC NHÓM CHỨC NĂNG ĐÃ SỬA

### Nhóm 1: Sửa lỗi Điều hướng đăng nhập, Session Roles & Bảo toàn quyền khi F5
* **Hiện tượng cũ**: Tài khoản Admin đăng nhập xong bị đẩy về trang chủ (`/`) của Buyer. Khi F5 trang web, gọi `/api/v1/me` không có trường `roles`, dẫn đến hệ thống hạ quyền về `Buyer`, báo `Bạn không có quyền mở trang này` khi truy cập `/admin/...`.
* **Giải pháp**:
  - Điều hướng chính xác theo vai trò sau đăng nhập: `Admin` ➔ `/admin/overview`, `Staff` ➔ `/staff/auctions`, `Seller` ➔ `/seller/products`, `Buyer` ➔ `/`.
  - Bổ sung `SESSION_ROLES_KEY` trong `localStorage` và cơ chế giải mã JWT claim dự phòng (`extractRolesFromToken`).
  - Hợp nhất vai trò trong `SessionProvider` (không để `/api/v1/me` xóa mất quyền đặc quyền).
  - Tự động điều hướng Admin/Staff khi vào nhầm trang mua sắm Buyer.

### Nhóm 2: Tái cấu trúc Màn hình Quản lý Vai trò (`AdminRolesScreen`) & Phân quyền trực tiếp
* **Mục tiêu**: Loại bỏ ma trận RBAC cũ không tương thích, tách bạch 100% trách nhiệm với màn hình Quản lý tài khoản.
* **Giải pháp**:
  - Xóa bỏ ma trận checkbox phân quyền RBAC và các API lưu quyền lỗi thời.
  - Xóa bỏ popup xem CCCD/thông tin cá nhân ở trang vai trò để tránh trùng lặp với `/admin/users`.
  - Bổ sung **Đổi vai trò** (modal chọn 4 role `Admin`, `SupportStaff`, `Seller`, `Buyer`).
  - Bổ sung **+ Gán tài khoản vào vai trò này** (modal tìm kiếm người dùng toàn sàn và gán nhanh).
  - Bổ sung **Gỡ vai trò** khỏi tài khoản với cảnh báo an toàn.
  - Chuẩn hóa gọi API `PUT /api/v1/admin/users/{userId}/roles` kèm `"reason"` và `"roleCodes"`.

### Nhóm 3: Nâng cấp Màn hình Quản lý Tài khoản (`AdminUsersScreen`)
* Tách thành file độc lập, không còn viết inline minified trong `AdminScreens.tsx`.
* Bổ sung Modal xem chi tiết người dùng: CCCD, địa chỉ, số điện thoại, điểm uy tín, trust level, ngày tạo, lý do khóa.
* Bộ badge màu trực quan (`BadgeTone`) cho trạng thái (`ACTIVE`, `BANNED`, `PENDING_VERIFICATION`, `DELETED`) và vai trò.
* Thực hiện Khóa (Ban), Mở khóa (Unban), Xóa mềm (Delete) tài khoản ngay trên Modal chi tiết.

### Nhóm 4: Tối ưu trải nghiệm Đa vai trò (Multi-role Seller/Buyer)
* Tài khoản Seller vừa bán vừa mua hàng: luôn hiển thị icon **Đơn mua** và **Giỏ hàng** trên Header cạnh nút **Kênh người bán**.
* Hiển thị mục **Đơn mua** trong menu tài khoản.
* Link header trong `AuthShell` tự đổi thành "Về trang quản trị" / "Về trang vận hành" tương ứng.

### Nhóm 5: Khắc phục lỗi Gateway Proxy (HTTP 204/205/304)
* Sửa lỗi proxy stream buffer khi API backend trả về HTTP Status không có body (204 No Content, 205 Reset Content, 304 Not Modified).

---

## 2. BẢNG THỐNG KÊ CÁC FILE THAY ĐỔI

| STT | Tên File | Trạng thái | Dòng thêm (+) | Dòng bớt (-) | Chức năng chính |
|:---:|---|:---:|:---:|:---:|---|
| 1 | `src/lib/api/client.ts` | Sửa đổi | +65 | -3 | Lưu roles session, giải mã JWT unpadded, khôi phục quyền |
| 2 | `src/components/auth/SessionProvider.tsx` | Sửa đổi | +34 | -2 | Hợp nhất roles khi F5, bảo vệ quyền Admin/Staff |
| 3 | `src/components/auth/RoleGate.tsx` | Sửa đổi | +43 | -7 | Chuẩn hóa tiền tố role_, fallback session, tự động redirect |
| 4 | `src/features/auth/AuthScreens.tsx` | Sửa đổi | +9 | -4 | Điều hướng đăng nhập chuẩn theo vai trò |
| 5 | `src/features/auth/services/auth.service.ts` | Sửa đổi | +4 | -2 | Lưu roles ngay khi có kết quả login |
| 6 | `src/components/layout/Shells.tsx` | Sửa đổi | +60 | -10 | Giữ icon Đơn mua/Giỏ hàng cho Seller, redirect Admin/Staff |
| 7 | `src/constants/navigation.ts` | Sửa đổi | +1 | -1 | Đổi nhãn menu sang "Danh sách vai trò" |
| 8 | `src/features/admin/services/admin-users.service.ts` | Sửa đổi | +34 | 0 | Thêm kiểu dữ liệu AdminUser và hàm `updateRoles` |
| 9 | `src/features/admin/AdminScreens.tsx` | Sửa đổi | +259 | -30 | Bỏ inline minified, re-export màn hình riêng, clean code |
| 10 | `src/features/admin/AdminUsersScreen.tsx` | Sửa đổi | +276 | -10 | Modal chi tiết tài khoản, badge tone, thao tác Ban/Unban |
| 11 | `src/features/admin/AdminRolesScreen.tsx` | **Tạo mới** | +928 | 0 | Màn hình Quản lý vai trò, Gán/Đổi/Gỡ vai trò độc lập |
| 12 | `src/features/staff/StaffSellersScreen.tsx` | Sửa đổi | +10 | -2 | Thêm `statusTone` hiển thị trạng thái duyệt hồ sơ Seller |
| 13 | `src/app/api/gateway/[...path]/route.ts` | Sửa đổi | +2 | -1 | Sửa proxy stream cho mã HTTP không body (204, 205, 304) |
| 14 | `src/app/(dashboard)/buyer/layout.tsx` | Sửa đổi | +1 | -1 | Thu hẹp allowedRoles để RoleGate redirect Admin/Staff |
| 15 | `src/styles/globals.css` | Sửa đổi | +149 | -7 | CSS cho Modal popup, layout 2 cột, role cards, badge borders |
| 16 | `tests/api-client-session.test.mjs` | Sửa đổi | +23 | -1 | Bổ sung unit tests kiểm tra session roles & giải mã JWT |
| **Tổng** | **16 files** | | **+1898** | **-81** | |

---

## 3. CHI TIẾT CODE THAY ĐỔI TỪNG FILE (DIFF + / -)

---

### 3.1. `src/lib/api/client.ts`
* **Mục đích**: Bổ sung cơ chế lưu trữ danh sách vai trò (`nexus_session_roles`), hàm giải mã JWT an toàn, và bảo toàn roles khi refresh token.

```diff
@@ -6,2 +6,3 @@
 const SESSION_ACCESS_KEY = "nexus_access_token";
 const SESSION_REFRESH_KEY = "nexus_refresh_token";
+const SESSION_ROLES_KEY = "nexus_session_roles";
@@ -35,3 +36,54 @@
-export function saveSessionTokens(accessToken: string, refreshToken: string): void {
+export function extractRolesFromToken(token?: string | null): string[] {
+  if (!token || typeof token !== "string") return [];
+  try {
+    const parts = token.split(".");
+    if (parts.length < 2) return [];
+    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
+    while (base64.length % 4 !== 0) {
+      base64 += "=";
+    }
+    const binary = atob(base64);
+    const bytes = new Uint8Array(binary.length);
+    for (let i = 0; i < binary.length; i++) {
+      bytes[i] = binary.charCodeAt(i);
+    }
+    const jsonPayload = new TextDecoder().decode(bytes);
+    const payload = JSON.parse(jsonPayload);
+    const claim =
+      payload.roles ??
+      payload.role ??
+      payload.Roles ??
+      payload.Role ??
+      payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ??
+      payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role"];
+    if (Array.isArray(claim)) return claim.map((r) => String(r).trim()).filter(Boolean);
+    if (typeof claim === "string" && claim.trim()) return [claim.trim()];
+    return [];
+  } catch {
+    return [];
+  }
+}
+
+export function saveSessionTokens(accessToken: string, refreshToken: string, roles?: string[]): void {
   if (typeof window === "undefined") return;
   window.localStorage.setItem(SESSION_ACCESS_KEY, accessToken);
   window.localStorage.setItem(SESSION_REFRESH_KEY, refreshToken);
+  const resolvedRoles = roles && roles.length > 0 ? roles : extractRolesFromToken(accessToken);
+  if (resolvedRoles.length > 0) {
+    window.localStorage.setItem(SESSION_ROLES_KEY, JSON.stringify(resolvedRoles));
+  }
+}
+
+export function saveSessionRoles(roles: string[]): void {
   if (typeof window === "undefined") return;
   if (Array.isArray(roles) && roles.length > 0) {
     window.localStorage.setItem(SESSION_ROLES_KEY, JSON.stringify(roles));
   } else {
     window.localStorage.removeItem(SESSION_ROLES_KEY);
   }
 }
+
 export function getStoredRoles(): string[] {
   if (typeof window === "undefined") return [];
   try {
     const raw = window.localStorage.getItem(SESSION_ROLES_KEY);
     if (raw) {
       const parsed = JSON.parse(raw);
       if (Array.isArray(parsed) && parsed.length > 0) return parsed.map((r) => String(r));
     }
   } catch {
     // Ignore malformed JSON in storage
   }
   const token = getStoredToken(SESSION_ACCESS_KEY);
   return extractRolesFromToken(token);
 }
 
 export function clearSessionTokens(): void {
   if (typeof window === "undefined") return;
   window.localStorage.removeItem(SESSION_ACCESS_KEY);
   window.localStorage.removeItem(SESSION_REFRESH_KEY);
+  window.localStorage.removeItem(SESSION_ROLES_KEY);
 }
@@ -211,3 +272,3 @@
       if (getStoredToken(SESSION_REFRESH_KEY) !== refreshToken) return null;
-      saveSessionTokens(access, refresh);
+      saveSessionTokens(access, refresh, getStoredRoles());
       return access;
```

---

### 3.2. `src/components/auth/SessionProvider.tsx`
* **Mục đích**: Bảo toàn quyền hạn người dùng khi tải lại trang (F5). Hợp nhất vai trò lưu trong session với dữ liệu trả về từ `/api/v1/me`.

```diff
@@ -1,7 +1,7 @@
 "use client";
 
 import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
-import { ApiError, api, clearSessionTokens, hasRefreshToken, SESSION_INVALIDATED_EVENT, type ApiResponse } from "@/lib/api/client";
+import { ApiError, api, clearSessionTokens, getStoredRoles, hasRefreshToken, saveSessionRoles, SESSION_INVALIDATED_EVENT, type ApiResponse } from "@/lib/api/client";
 import type { AuthUser } from "@/features/auth/types";
@@ -23,3 +23,17 @@ export function SessionProvider({ children }: { children: ReactNode }) {
   const setAuthenticatedUser = useCallback((authenticatedUser: AuthUser) => {
     sessionVersion.current += 1;
-    setUser(authenticatedUser);
+    const storedRoles = getStoredRoles();
+    const userRoles = Array.isArray(authenticatedUser.roles)
+      ? authenticatedUser.roles.map((r) => String(r).trim()).filter(Boolean)
+      : [];
+    if (authenticatedUser.role && typeof authenticatedUser.role === "string" && authenticatedUser.role.trim()) {
+      userRoles.push(authenticatedUser.role.trim());
+    }
+    const mergedRolesSet = new Set<string>();
+    for (const r of storedRoles) mergedRolesSet.add(r);
+    for (const r of userRoles) mergedRolesSet.add(r);
+    const roles = Array.from(mergedRolesSet);
+    if (roles.length > 0) {
+      saveSessionRoles(roles);
+    }
+    setUser({ ...authenticatedUser, roles });
     setRestoreError(null);
   }, []);
@@ -52,3 +66,17 @@ export function SessionProvider({ children }: { children: ReactNode }) {
         clearSession();
         return;
       }
-      setUser(profile);
+      const storedRoles = getStoredRoles();
+      const profileRoles = Array.isArray(profile.roles)
+        ? profile.roles.map((r) => String(r).trim()).filter(Boolean)
+        : [];
+      if (profile.role && typeof profile.role === "string" && profile.role.trim()) {
+        profileRoles.push(profile.role.trim());
+      }
+      const mergedRolesSet = new Set<string>();
+      for (const r of storedRoles) mergedRolesSet.add(r);
+      for (const r of profileRoles) mergedRolesSet.add(r);
+      const existingRoles = Array.from(mergedRolesSet);
+      if (existingRoles.length > 0) {
+        saveSessionRoles(existingRoles);
+      }
+      setUser({ ...profile, roles: existingRoles });
       setRestoreError(null);
```

---

### 3.3. `src/components/auth/RoleGate.tsx`
* **Mục đích**: Chuẩn hóa tiền tố `ROLE_`, loại bỏ lỗi phân quyền khi F5 bằng cách đọc `getStoredRoles()`, và tự động chuyển hướng người dùng có vai trò đặc quyền (`Admin`/`Staff`) về đúng khu vực quản trị.

```diff
@@ -1,16 +1,38 @@
 "use client";
 
 import Link from "next/link";
-import type { ReactNode } from "react";
+import { useRouter } from "next/navigation";
+import { useEffect, type ReactNode } from "react";
+import { getStoredRoles } from "@/lib/api/client";
+import { ROUTES } from "@/constants/routes";
 import { useSession } from "./SessionProvider";
 
 function normalizeRole(role: string): string {
-  const normalized = role.toLocaleLowerCase("en-US");
-  return normalized === "staff" ? "supportstaff" : normalized;
+  const normalized = role.toLocaleLowerCase("en-US").replace(/^role_/, "");
+  if (normalized === "staff" || normalized === "supportstaff") return "supportstaff";
+  if (normalized === "admin" || normalized === "administrator") return "admin";
+  return normalized;
 }
 
 export function RoleGate({ allowedRoles, children }: { allowedRoles: string[]; children: ReactNode }) {
   const { user, ready, restoreError, refreshUser } = useSession();
+  const router = useRouter();
+
+  const userRoles = user?.roles?.length ? user.roles : (user?.role ? [user.role] : []);
+  const roles = userRoles.length > 0 ? userRoles : (typeof window !== "undefined" ? getStoredRoles() : []);
+  const hasAccess = roles.some((role) => allowedRoles.some((allowed) => normalizeRole(role) === normalizeRole(allowed)));
+  const isAdmin = roles.some((r) => normalizeRole(r) === "admin");
+  const isStaff = roles.some((r) => normalizeRole(r) === "supportstaff");
+
+  useEffect(() => {
+    if (!ready || !user || hasAccess) return;
+    if (isAdmin) {
+      router.replace(ROUTES.admin.overview);
+    } else if (isStaff) {
+      router.replace(ROUTES.staff.auctions);
+    }
+  }, [ready, user, hasAccess, isAdmin, isStaff, router]);
+
   if (!ready) {
     return <main className="route-loading" role="status" aria-live="polite">Đang kiểm tra phiên đăng nhập…</main>;
   }
@@ -26,13 +48,20 @@ export function RoleGate({ allowedRoles, children }: { allowedRoles: string[]; c
       </main>
     );
   }
-  const roles = user.roles ?? (user.role ? [user.role] : []);
-  if (!roles.some((role) => allowedRoles.some((allowed) => normalizeRole(role) === normalizeRole(allowed)))) {
+
   if (!hasAccess) {
     const destination = isAdmin ? ROUTES.admin.overview : isStaff ? ROUTES.staff.auctions : ROUTES.home;
     const destinationLabel = isAdmin ? "Về trang quản trị" : isStaff ? "Về trang vận hành" : "Về trang chủ";
 
     return (
       <main className="access-state" role="alert">
         <h1>Bạn không có quyền mở trang này</h1>
         <p>Tài khoản hiện tại không thuộc nhóm quyền được phân phối cho khu vực này.</p>
-        <Link className="button button-primary" href={ROUTES.home}>Về trang chủ</Link>
+        <Link className="button button-primary" href={destination}>{destinationLabel}</Link>
       </main>
     );
   }
```

---

### 3.4. `src/features/auth/AuthScreens.tsx`
* **Mục đích**: Sửa hàm `landingPath` để chuyển hướng người dùng sau khi đăng nhập thành công vào đúng màn hình theo vai trò thực tế.

```diff
@@ -14,9 +14,14 @@
 function landingPath(user: AuthUser): string {
-  const roles = (user.roles ?? (user.role ? [user.role] : [])).map((role) => role.toLocaleLowerCase("en-US"));
-  if (roles.some((role) => role === "admin" || role === "staff" || role === "seller")) return ROUTES.home;
-  if (roles.includes("buyer") || roles.includes("customer")) return ROUTES.buyer.cart;
+  const roles = (user.roles ?? (user.role ? [user.role] : [])).map((role) => {
+    const normalized = role.toLocaleLowerCase("en-US");
+    return normalized === "supportstaff" ? "staff" : normalized;
+  });
+  if (roles.includes("admin")) return ROUTES.admin.overview;
+  if (roles.includes("staff")) return ROUTES.staff.auctions;
+  if (roles.includes("seller")) return ROUTES.seller.products;
+  if (roles.includes("buyer") || roles.includes("customer")) return ROUTES.home;
   return ROUTES.home;
 }
```

---

### 3.5. `src/features/auth/services/auth.service.ts`
* **Mục đích**: Truyền danh sách vai trò (`initialRoles`) vào `saveSessionTokens` ngay tại thời điểm đăng nhập thành công.

```diff
@@ -38,11 +38,13 @@ export const authService = {
     }
     const accessToken = login.accessToken;
     const refreshToken = login.refreshToken;
-    saveSessionTokens(accessToken, refreshToken);
+    const initialRoles = login.roles ?? login.user?.roles ?? (login.user?.role ? [login.user.role] : []);
+    saveSessionTokens(accessToken, refreshToken, initialRoles);
     try {
       const profile = login.user ?? await this.getCurrentUser();
+      const user = profileFromGateway(profile, login);
       return {
-        ...login, accessToken, refreshToken, user: profileFromGateway(profile, login),
+        ...login, accessToken, refreshToken, user,
       } satisfies AuthResponse;
     } catch (error) {
       clearSessionTokens();
```

---

### 3.6. `src/components/layout/Shells.tsx`
* **Mục đích**: 
  1. Hỗ trợ tài khoản đa vai trò: Seller vẫn luôn có icon "Đơn mua" và "Giỏ hàng" trên thanh Header.
  2. Tự động chuyển hướng tài khoản Admin/Staff nếu vô tình mở giao diện Buyer (`/`).
  3. Header của `AuthShell` hiển thị link quay lại thông minh tương ứng với từng vai trò.

```diff
@@ -7,7 +7,8 @@ import { Icon, type IconName } from "@/components/ui/Icon";
 import { ROUTES } from "@/constants/routes";
 import { useSession } from "@/components/auth/SessionProvider";
-import { clearSessionTokens } from "@/lib/api/client";
+import { clearSessionTokens, getStoredRoles } from "@/lib/api/client";
+import { useRouter } from "next/navigation";
@@ -46,8 +47,8 @@ function dashboardsForRoles(roles: string[]): RoleDashboardLink[] {
-  if (has("admin")) links.push({ role: "admin", label: "Quản trị hệ thống", href: ROUTES.admin.overview, icon: "shield" });
-  if (has("staff") || has("supportstaff")) links.push({ role: "staff", label: "Vận hành sàn", href: ROUTES.staff.auctions, icon: "gavel" });
+  if (has("seller")) links.push({ role: "seller", label: "Kênh người bán", href: ROUTES.seller.products, icon: "bag" });
   return links;
 }
@@ -82,6 +83,37 @@ export function BuyerShell({ children }: { children: ReactNode }) {
   const { user, ready } = useSession();
+  const router = useRouter();
   const userRoles = user?.roles ?? (user?.role ? [user.role] : []);
+  const activeRoles = userRoles.length > 0 ? userRoles : (typeof window !== "undefined" ? getStoredRoles() : []);
+  const isAdmin = activeRoles.some((r) => {
+    const n = r.toLocaleLowerCase("en-US").replace(/^role_/, "");
+    return n === "admin" || n === "administrator";
+  });
+  const isStaff = activeRoles.some((r) => {
+    const n = r.toLocaleLowerCase("en-US").replace(/^role_/, "");
+    return n === "staff" || n === "supportstaff";
+  });
+
+  useEffect(() => {
+    if (!ready || !user) return;
+    if (isAdmin) {
+      router.replace(ROUTES.admin.overview);
+    } else if (isStaff) {
+      router.replace(ROUTES.staff.auctions);
+    }
+  }, [ready, user, isAdmin, isStaff, router]);
+
   if (ready && user && (isAdmin || isStaff)) {
     return (
       <div className="site-shell">
         <main className="route-loading" role="status">
           Đang chuyển hướng tới cổng {isAdmin ? "quản trị hệ thống" : "vận hành sàn"}…
         </main>
       </div>
     );
   }
@@ -114,14 +146,13 @@ export function BuyerShell({ children }: { children: ReactNode }) {
         <div className="header-actions">
-          {hasPrivilegedRole ? dashboardLinks.map(({ role, label, href, icon }) => (
+          {hasPrivilegedRole && dashboardLinks.map(({ role, label, href, icon }) => (
             <Link key={role} className="button button-secondary button-small role-dashboard-link" href={href} aria-label={label} title={label}>
               <Icon name={icon} size={18} /><span>{label}</span>
             </Link>
-          )) : <>
-            <Link href={ROUTES.buyer.orders}><Icon name="orders" size={19} /><span>Đơn mua</span></Link>
-            <Link href={ROUTES.buyer.cart}><Icon name="bag" size={19} /><span>Giỏ hàng</span></Link>
-          </>}
+          ))}
+          <Link href={ROUTES.buyer.orders}><Icon name="orders" size={19} /><span>Đơn mua</span></Link>
           <Link href={ROUTES.buyer.cart}><Icon name="bag" size={19} /><span>Giỏ hàng</span></Link>
           <AccountNavigation />
         </div>
@@ -154,5 +185,26 @@ export function AuthShell({ children }: { children: ReactNode }) {
-  return <div className="auth-shell"><header className="auth-header"><Link href={ROUTES.home} aria-label="NEXUS - Trang chủ"><Brand /></Link><Link className="auth-home" href={ROUTES.home}>Quay lại trang chủ</Link></header><main className="auth-main">{children}</main><footer className="auth-footer"><span>© NEXUS</span><span>Điều khoản dịch vụ · Chính sách bảo mật</span></footer></div>;
+  const { user } = useSession();
+  const userRoles = user?.roles ?? (user?.role ? [user.role] : []);
+  const normalizedRoles = userRoles.map((r) => {
+    const n = r.toLocaleLowerCase("en-US").replace(/^role_/, "");
+    if (n === "supportstaff") return "staff";
+    if (n === "administrator") return "admin";
+    return n;
+  });
+  const isAdmin = normalizedRoles.includes("admin");
+  const isStaff = normalizedRoles.includes("staff");
+
+  const homeHref = isAdmin ? ROUTES.admin.overview : isStaff ? ROUTES.staff.auctions : ROUTES.home;
+  const homeLabel = isAdmin ? "Về trang quản trị" : isStaff ? "Về trang vận hành" : "Quay lại trang chủ";
+
+  return <div className="auth-shell">
+    <header className="auth-header">
+      <Link href={homeHref} aria-label="NEXUS - Trang chủ"><Brand /></Link>
+      <Link className="auth-home" href={homeHref}>{homeLabel}</Link>
+    </header>
+    <main className="auth-main">{children}</main>
+    <footer className="auth-footer"><span>© NEXUS</span><span>Điều khoản dịch vụ · Chính sách bảo mật</span></footer>
+  </div>;
 }
```

---

### 3.7. `src/constants/navigation.ts`
* **Mục đích**: Đổi nhãn hiển thị trên Sidebar từ `"Phân quyền RBAC"` sang `"Danh sách vai trò"` cho đúng bản chất nghiệp vụ.

```diff
@@ -37,7 +37,7 @@ export const adminNavigation: NavigationItem[] = [
   { label: "Quản lý đấu giá", href: ROUTES.admin.auctions, icon: "gavel" },
   { label: "Cấu hình đấu giá", href: ROUTES.admin.auctionConfigs, icon: "shield" },
   { label: "Quản lý tài khoản", href: ROUTES.admin.users, icon: "users" },
-  { label: "Phân quyền RBAC", href: ROUTES.admin.roles, icon: "shield" },
+  { label: "Danh sách vai trò", href: ROUTES.admin.roles, icon: "shield" },
   { label: "Danh mục", href: ROUTES.admin.categories, icon: "grid" },
   { label: "Sổ giao dịch", href: ROUTES.admin.ledger, icon: "orders" },
   { label: "Audit Log", href: ROUTES.admin.auditLog, icon: "flag" },
```

---

### 3.8. `src/features/admin/services/admin-users.service.ts`
* **Mục đích**: Khai báo các trường mở rộng của `AdminUser` (CCCD, địa chỉ, trustLevel,...) và bổ sung hàm `updateRoles` gọi endpoint `PUT /api/v1/admin/users/{userId}/roles` chuẩn backend contract.

```diff
@@ -10,10 +10,23 @@ export type AdminUser = {
   email: string;
   phoneNumber?: string | null;
   roles?: string[];
+  identifyNumber?: string | null;
+  address?: string | null;
+  gender?: string | null;
+  reputationScore?: number;
+  trustLevel?: string;
+  banReason?: string | null;
+  bannedAt?: string | null;
+  updatedAt?: string | null;
   status?: string;
   createdAt?: string;
 };
 
+export type UpdateUserRolesPayload = {
+  roleCodes: string[];
+  reason: string;
+};
+
 export type AdminUserPage = { items: AdminUser[]; total: number; page: number; limit: number };
@@ -47,4 +60,25 @@ export const adminUsersService = {
   async remove(id: string, reason: string): Promise<void> {
     await api.delete<void>(userPath(id), { body: { reason } });
   },
+  async updateRoles(
+    id: string,
+    roleCodesOrPayload: string[] | UpdateUserRolesPayload,
+    optionalReason?: string,
+  ): Promise<void> {
+    let roleCodes: string[];
+    let reason: string;
+
+    if (Array.isArray(roleCodesOrPayload)) {
+      roleCodes = roleCodesOrPayload;
+      reason = optionalReason?.trim() || "Gán quyền quản trị viên từ giao diện Admin";
+    } else {
+      roleCodes = roleCodesOrPayload.roleCodes;
+      reason = roleCodesOrPayload.reason?.trim() || optionalReason?.trim() || "Gán quyền quản trị viên từ giao diện Admin";
+    }
+
+    await api.put(`${userPath(id)}/roles`, {
+      roleCodes,
+      reason,
+    });
+  },
 };
```

---

### 3.9. `src/features/admin/AdminScreens.tsx`
* **Mục đích**: Xóa bỏ các đoạn code inline minified của `AdminUsersScreen` và `AdminRolesScreen`; chuyển sang re-export từ file component độc lập; dọn dẹp card Tổng quan để chuyển hướng đúng trang Quản lý vai trò mới.

```diff
@@ -1,21 +1,109 @@
 "use client";
 /* Gateway list envelopes vary by domain; these adapters normalize their JSON records. */
 /* eslint-disable @typescript-eslint/no-explicit-any */
-import Link from "next/link"; import {useState} from "react"; import {Badge,Card,NoData,PageHeading,SectionHeading} from "@/components/ui/Primitives"; import {ROUTES} from "@/constants/routes"; import {isSensitiveIdentityKey} from "@/features/seller/services/seller.service"; import {api,type ApiResponse} from "@/lib/api/client"; import {useApiResource} from "@/lib/api/use-api-resource";
-type Obj=Record<string,any>; const unwrap=<T,>(x:ApiResponse<T>|T):T=>x&&typeof x==="object"&&"data" in x?(x as ApiResponse<T>).data:x as T;const list=(x:any):Obj[]=>Array.isArray(x)?x:(x?.items??x?.data??x?.users??x?.roles??x?.permissions??[]);const msg=(e:Error|null)=>e?.message??"";
-export function AdminUsersScreen(){const [q,setQ]=useState("");const [selected,setSelected]=useState("");const users=useApiResource(`/api/v1/admin/users?page=1&limit=50&keyword=${encodeURIComponent(q)}`,async()=>list(unwrap(await api.get<ApiResponse<any>>(`/api/v1/admin/users?page=1&limit=50&keyword=${encodeURIComponent(q)}`))));const detail=useApiResource(selected?`/api/v1/admin/user/${selected}`:null,async()=>unwrap(await api.get<ApiResponse<Obj>>(`/api/v1/admin/user/${encodeURIComponent(selected)}`)));const data=users.data??[];return <><PageHeading overline="Bảng điều khiển Admin" title="Quản lý tài khoản" description="Dữ liệu tài khoản được truy vấn từ User API."/><SectionHeading title="Danh sách tài khoản"/><Card><form className="toolbar" onSubmit={e=>{e.preventDefault();users.reload();}}><input className="field" style={{maxWidth:320}} placeholder="Tìm tên hoặc email" value={q} onChange={e=>setQ(e.target.value)}/><button className="button button-secondary">Tìm kiếm</button></form>{users.error&&<p role="alert" className="notice">{msg(users.error)}</p>}{data.length?<div className="table-scroll"><table className="data-table"><thead><tr><th>Người dùng</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th></th></tr></thead><tbody>{data.map((u,i)=><tr key={u.id??u.userId??i}><td>{u.displayName??u.username??u.id}</td><td>{u.email??""}</td><td>{(u.roles??[]).join?.(", ")??u.role??""}</td><td><Badge>{u.status??(u.isActive?"Active":"")}</Badge></td><td><button type="button" className="button button-secondary button-small" onClick={()=>setSelected(String(u.id??u.userId))}>Chi tiết</button></td></tr>)}</tbody></table></div>:<NoData title={users.loading?"Đang tải tài khoản…":users.error?"Không tải được danh sách":"Không có người dùng"}/>}</Card><SectionHeading title="Chi tiết tài khoản"/>{detail.error&&<p role="alert" className="notice">{msg(detail.error)}</p>}<Card className="card-pad">{detail.data?Object.entries(detail.data).filter(([k,v])=>!isSensitiveIdentityKey(k)&&(v==null||typeof v!=="object")).map(([k,v])=><div className="info-row" key={k}><span>{k}</span><strong>{String(v??"—")}</strong></div>):<NoData title={selected?(detail.loading?"Đang tải…":"Chọn tài khoản để xem") : "Chọn tài khoản để xem chi tiết"}/>}</Card></>;}
-export function AdminRolesScreen(){
-  const roles=useApiResource("/api/v1/admin/roles",async()=>list(unwrap(await api.get<ApiResponse<any>>("/api/v1/admin/roles"))));
-  const permissions=useApiResource("/api/v1/admin/permissions",async()=>list(unwrap(await api.get<ApiResponse<any>>("/api/v1/admin/permissions"))));
-  const [selectedId,setSelectedId]=useState("");const [selectedPermissions,setSelectedPermissions]=useState<number[]>([]);const [canEdit,setCanEdit]=useState(false);const [error,setError]=useState("");const [saved,setSaved]=useState("");const [busy,setBusy]=useState(false);
-  const selectRole=(role:Obj)=>{setSelectedId(String(role.roleId??role.id??""));const assigned=role.permissionIds??role.permissions;setCanEdit(Array.isArray(assigned));setSelectedPermissions(Array.isArray(assigned)?assigned.map((p:Obj|number)=>Number(typeof p==="number"?p:p.permissionId??p.id)).filter(Number.isFinite):[]);setSaved("");setError("");};
-  const save=async()=>{const roleId=Number(selectedId);if(!canEdit){setError("Gateway không trả các quyền hiện tại của vai trò.");return;}if(!Number.isInteger(roleId)){setError("Mã vai trò không hợp lệ.");return;}setBusy(true);setError("");setSaved("");try{await api.put(`/api/v1/admin/roles/${roleId}/permissions`,{permissionIds:selectedPermissions});setSaved("Đã cập nhật quyền thành công.");roles.reload();}catch(e:any){setError(e?.message??"Không thể cập nhật quyền.");}finally{setBusy(false);}};
-  return <><PageHeading overline="Bảng điều khiển Admin" title="Phân quyền vai trò" description="Cấu hình ma trận quyền theo vai trò hệ thống."/><div className="grid-2"><Card><SectionHeading title="Vai trò hệ thống"/>{roles.data?.length?<div className="table-scroll"><table className="data-table"><thead><tr><th>Vai trò</th><th>Thao tác</th></tr></thead><tbody>{roles.data.map((r:Obj,i)=><tr key={r.roleId??r.id??i}><td><strong>{r.roleName??r.name??r.roleCode}</strong><br/><small>{r.description??""}</small></td><td><button type="button" className="button button-secondary button-small" onClick={()=>selectRole(r)}>Sửa quyền</button></td></tr>)}</tbody></table></div>:<NoData title={roles.loading?"Đang tải vai trò…":"Không có vai trò"}/></Card><Card><SectionHeading title="Danh sách quyền"/><p className="status-note">Chỉ cho phép sửa khi Gateway trả danh sách permissionIds của role.</p>{error&&<p role="alert" className="notice">{error}</p>}{saved&&<p role="status" className="form-success">{saved}</p>}{permissions.data?.length?<div className="auth-fields" style={{maxHeight:420,overflowY:"auto"}}>{permissions.data.map((p:Obj)=><label key={p.permissionId??p.id} className="checkbox-wrap"><input type="checkbox" disabled={!canEdit} checked={selectedPermissions.includes(Number(p.permissionId??p.id))} onChange={e=>{const id=Number(p.permissionId??p.id);setSelectedPermissions(e.target.checked?[...selectedPermissions,id]:selectedPermissions.filter(x=>x!==id));}}/><span>{p.permissionName??p.name??p.permissionCode}</span></label>)}</div>:<NoData title={permissions.loading?"Đang tải quyền…":"Không có quyền"}/><div className="action-row" style={{marginTop:16}}><button className="button button-primary" disabled={busy||!canEdit} onClick={save}>{busy?"Đang lưu…":"Lưu quyền"}</button></div></Card></div></>;
-}
+import Link from "next/link";
+import { useState } from "react";
+import { Badge, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
+import { ROUTES } from "@/constants/routes";
+import { isSensitiveIdentityKey } from "@/features/seller/services/seller.service";
+import { api, type ApiResponse } from "@/lib/api/client";
+import { useApiResource } from "@/lib/api/use-api-resource";
+
+export { AdminUsersScreen } from "./AdminUsersScreen";
+export { AdminRolesScreen } from "./AdminRolesScreen";
+
+type Obj = Record<string, any>;
+const unwrap = <T,>(x: ApiResponse<T> | T): T => (x && typeof x === "object" && "data" in x ? (x as ApiResponse<T>).data : (x as T));
+const list = (x: any): Obj[] => (Array.isArray(x) ? x : (x?.items ?? x?.data ?? x?.users ?? x?.roles ?? x?.permissions ?? []));
+const msg = (e: Error | null) => e?.message ?? "";
```

---

### 3.10. `src/features/admin/AdminUsersScreen.tsx`
* **Mục đích**: Nâng cấp giao diện Quản lý người dùng, hiển thị vai trò với màu sắc phân biệt (`BadgeTone`), xem chi tiết hồ sơ trong Modal Popup, thực hiện Ban/Unban/Delete.

```diff
@@ -6,6 +6,7 @@ import { useApiResource } from "@/lib/api/use-api-resource";
 import { adminUsersService, type AdminUser } from "./services/admin-users.service";
 
 type Action = "ban" | "unban" | "delete";
+type BadgeTone = "sky" | "green" | "amber" | "slate" | "red" | "indigo";
 
 function userId(user: AdminUser): string {
   return user.userId ?? user.id ?? "";
@@ -16,14 +62,62 @@ function userName(user: AdminUser): string {
 }
 
 function userStatusLabel(status?: string): string {
+  const normalized = (status ?? "").toUpperCase().replace(/[\s_-]+/g, "");
   const labels: Record<string, string> = {
     ACTIVE: "Đang hoạt động",
     BANNED: "Đã cấm",
     PENDINGVERIFICATION: "Chờ xác thực",
-    PENDING_ACTIVATION: "Chờ xác thực",
+    PENDINGACTIVATION: "Chờ xác thực",
+    PENDING: "Chờ xác thực",
     DELETED: "Đã xóa",
   };
-  return status ? labels[status.toUpperCase()] ?? status : "—";
+  return labels[normalized] ?? status ?? "—";
+}
+
 function userStatusTone(status?: string): BadgeTone {
+  const normalized = (status ?? "").toUpperCase().replace(/[\s_-]+/g, "");
+  if (normalized === "ACTIVE") return "green";
+  if (normalized === "BANNED") return "red";
+  if (normalized === "PENDINGVERIFICATION" || normalized === "PENDINGACTIVATION" || normalized === "PENDING") return "amber";
+  if (normalized === "DELETED") return "slate";
+  return "sky";
+}
+
+type RoleInfo = { label: string; tone: BadgeTone; order: number };
+
+function formatRole(role: string): RoleInfo {
+  const normalized = role.toLowerCase().replace(/^role_/, "").replace(/[\s_-]+/g, "").trim();
+  if (normalized === "admin" || normalized === "administrator") {
+    return { label: "Admin", tone: "indigo", order: 1 };
+  }
+  if (normalized === "staff" || normalized === "supportstaff") {
+    return { label: "Staff", tone: "sky", order: 2 };
+  }
+  if (normalized === "seller") {
+    return { label: "Seller", tone: "amber", order: 3 };
+  }
+  if (normalized === "buyer" || normalized === "customer") {
+    return { label: "Buyer", tone: "slate", order: 4 };
+  }
+  return {
+    label: role.charAt(0).toUpperCase() + role.slice(1),
+    tone: "slate",
+    order: 5,
+  };
+}
+
+function renderRoles(roles?: string[]) {
+  if (!roles || roles.length === 0) return <span>—</span>;
+  const formatted = roles.map(formatRole).sort((a, b) => a.order - b.order);
+  return (
+    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
+      {formatted.map((r) => (
+        <Badge key={r.label} tone={r.tone}>
+          {r.label}
+        </Badge>
+      ))}
+    </div>
+  );
 }
@@ -53,6 +102,14 @@ export function AdminUsersScreen() {
     setSaved("");
   }
 
+  function close() {
+    setSelected("");
+    setAction(null);
+    setReason("");
+    setError("");
+    setSaved("");
+  }
+
   function applySearch(event: FormEvent<HTMLFormElement>) {
     event.preventDefault();
     setPage(1);
@@ -70,8 +127,11 @@ export function AdminUsersScreen() {
       if (action === "unban") await adminUsersService.unban(selected, reason.trim());
       if (action === "delete") await adminUsersService.remove(selected, reason.trim());
       setSaved(action === "ban" ? "Đã khóa tài khoản bằng Ban." : action === "unban" ? "Đã mở khóa tài khoản." : "Đã xóa mềm tài khoản.");
-      if (action === "delete") setSelected("");
-      else detail.reload();
+      if (action === "delete") {
+        setTimeout(() => close(), 1200);
+      } else {
+        detail.reload();
+      }
       users.reload();
       setAction(null);
       setReason("");
```

---

### 3.11. `src/features/admin/AdminRolesScreen.tsx` (Tạo mới)
* **Mục đích**: File mới (+928 dòng) chuyên biệt cho chức năng Xem vai trò & Gán / Đổi / Gỡ vai trò trực tiếp cho người dùng.
* **Cấu trúc chính**:

```tsx
// FILE MỚI: src/features/admin/AdminRolesScreen.tsx
"use client";

import { useState, type FormEvent } from "react";
import { Badge, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icon";
import { api, type ApiResponse } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import { adminUsersService, type AdminUser } from "./services/admin-users.service";

// 4 Vai trò hệ thống tiêu chuẩn:
// 1. Admin (Quản trị viên) - tone: indigo
// 2. SupportStaff (Nhân viên vận hành) - tone: sky
// 3. Seller (Người bán) - tone: amber
// 4. Buyer (Người mua / Khách hàng) - tone: slate

export function AdminRolesScreen() {
  // 1. Layout Master - Detail: Cột trái danh sách vai trò, Cột phải danh sách tài khoản
  // 2. Nút "Đổi vai trò" trên từng tài khoản: mở modal 4 checkbox vai trò
  // 3. Nút "+ Gán tài khoản vào vai trò này": mở modal tìm kiếm người dùng toàn sàn và gán nhanh
  // 4. Nút "Gỡ vai trò": thu hồi quyền an toàn (hạ về Buyer)
  // 5. Gọi PUT /api/v1/admin/users/{userId}/roles kèm "reason" và "roleCodes"
}
```

---

### 3.12. `src/features/staff/StaffSellersScreen.tsx`
* **Mục đích**: Bổ sung hàm ánh xạ màu sắc `statusTone` cho trạng thái duyệt hồ sơ Seller (`APPROVED` ➔ xanh, `REJECTED` ➔ đỏ, `PENDING` ➔ vàng hổ phách).

```diff
@@ -22,6 +22,14 @@ function statusLabel(status: string): string {
   return status;
 }
 
+function statusTone(status: string): "sky" | "green" | "amber" | "slate" | "red" {
+  const value = status.toUpperCase();
+  if (value === "APPROVED") return "green";
+  if (value === "REJECTED") return "red";
+  if (value === "PENDING" || value === "PENDING_APPROVAL") return "amber";
+  return "slate";
+}
+
 function isPending(status: string): boolean {
   return ["PENDING", "PENDING_APPROVAL"].includes(status.toUpperCase());
 }
@@ -52,7 +60,7 @@ export function StaffSellersScreen() {
-      {records.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Mã hồ sơ</th><th>Tên shop</th><th>Email doanh nghiệp</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{records.map((registration) => <tr key={registration.registrationId}><td>{registration.registrationId}</td><td>{registration.shopName}</td><td>{registration.businessEmail ?? "—"}</td><td><Badge>{statusLabel(registration.status)}</Badge></td><td><Link className="button button-secondary button-small" href={ROUTES.staff.seller(registration.registrationId)}>Chi tiết</Link></td></tr>)}</tbody></table></div> : <NoData title={registrations.loading ? "Đang tải hồ sơ…" : registrations.error ? "Không tải được hồ sơ" : "Không có hồ sơ"} />}
+      {records.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Mã hồ sơ</th><th>Tên shop</th><th>Email doanh nghiệp</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{records.map((registration) => <tr key={registration.registrationId}><td>{registration.registrationId}</td><td>{registration.shopName}</td><td>{registration.businessEmail ?? "—"}</td><td><Badge tone={statusTone(registration.status)}>{statusLabel(registration.status)}</Badge></td><td><Link className="button button-secondary button-small" href={ROUTES.staff.seller(registration.registrationId)}>Chi tiết</Link></td></tr>)}</tbody></table></div> : <NoData title={registrations.loading ? "Đang tải hồ sơ…" : registrations.error ? "Không tải được hồ sơ" : "Không có hồ sơ"} />}
```

---

### 3.13. `src/app/api/gateway/[...path]/route.ts`
* **Mục đích**: Khắc phục lỗi Next.js Response khi nhận các mã trạng thái HTTP không có phần thân body (204, 205, 304).

```diff
@@ -74,8 +74,9 @@ async function proxy(request: NextRequest, context: RouteContext): Promise<Respo
   const entityTag = upstreamResponse.headers.get("ETag");
   if (entityTag) responseHeaders.set("ETag", entityTag);
 
+  const isNoBodyStatus = new Set([204, 205, 304]).has(upstreamResponse.status);
   return new Response(
-    request.method === "HEAD" ? null : await upstreamResponse.arrayBuffer(),
+    request.method === "HEAD" || isNoBodyStatus ? null : await upstreamResponse.arrayBuffer(),
     { status: upstreamResponse.status, headers: responseHeaders },
   );
 }
```

---

### 3.14. `src/app/(dashboard)/buyer/layout.tsx`
* **Mục đích**: Thu hẹp `allowedRoles` của Buyer layout để kích hoạt `RoleGate` tự động chuyển hướng tài khoản Admin/Staff về trang quản trị tương ứng nếu vô tình mở URL `/buyer/...`.

```diff
@@ -3,5 +3,5 @@ import { BuyerShellClient } from "@/components/client/ClientShells";
 import { RoleGate } from "@/components/auth/RoleGate";
 
 export default function BuyerLayout({ children }: { children: ReactNode }) {
-  return <RoleGate allowedRoles={["Buyer", "Customer", "Seller", "Staff", "Admin"]}><BuyerShellClient>{children}</BuyerShellClient></RoleGate>;
+  return <RoleGate allowedRoles={["Buyer", "Customer", "Seller"]}><BuyerShellClient>{children}</BuyerShellClient></RoleGate>;
 }
```

---

### 3.15. `src/styles/globals.css`
* **Mục đích**: Bổ sung bộ khung CSS cho Modal Popup chi tiết tài khoản Admin, layout 2 cột chọn vai trò (`.roles-grid-layout`), thẻ chọn vai trò (`.role-card-btn`), và nâng cấp border badge.

```diff
@@ -241,13 +241,13 @@ h1,h2,h3 { letter-spacing: -.025em; }
 .button-light:hover { background: #bae6fd; }
 .button-disabled { color: #94a3b8; background: #f1f5f9; border-color: var(--line); }
 .button-small { min-height: 33px; padding: 0 12px; font-size: 12px; }
-.badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 5px 9px; font-size: 11px; font-weight: 700; white-space: nowrap; }
-.badge-sky { color: #0369a1; background: #e0f2fe; }
-.badge-green { color: #047857; background: #d1fae5; }
-.badge-amber { color: #a16207; background: #fef3c7; }
-.badge-slate { color: #475569; background: #f1f5f9; }
-.badge-red { color: #be123c; background: #ffe4e6; }
-.badge-indigo { color: #4338ca; background: #e0e7ff; }
+.badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 700; white-space: nowrap; line-height: 1.3; }
+.badge-sky { color: #0284c7; background: #f0f9ff; border: 1px solid #bae6fd; }
+.badge-green { color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; }
+.badge-amber { color: #b45309; background: #fffbeb; border: 1px solid #fde68a; }
+.badge-slate { color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; }
+.badge-red { color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; }
+.badge-indigo { color: #4338ca; background: #eef2ff; border: 1px solid #c7d2fe; }
@@ -552,5 +552,140 @@
+/* Admin User Details Popup Modal */
+.admin-modal-backdrop {
+  position: fixed;
+  inset: 0;
+  z-index: 1000;
+  display: grid;
+  place-items: center;
+  padding: 20px;
+  background: rgba(15, 23, 42, 0.55);
+  backdrop-filter: blur(4px);
+}
+.admin-modal-dialog {
+  width: min(100%, 640px);
+  max-height: calc(100dvh - 40px);
+  overflow-y: auto;
+  padding: 24px 28px;
+  border: 1px solid var(--line);
+  border-radius: 16px;
+  background: var(--surface);
+  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.22);
+  color: var(--ink);
+}
+.admin-modal-heading {
+  display: flex;
+  justify-content: space-between;
+  align-items: flex-start;
+  gap: 14px;
+  margin-bottom: 20px;
+  border-bottom: 1px solid var(--line);
+  padding-bottom: 14px;
+}
+.admin-modal-heading h2 {
+  margin: 0;
+  font-size: 20px;
+  line-height: 1.3;
+}
+.admin-modal-close-btn {
+  background: transparent;
+  border: 1px solid var(--line);
+  border-radius: 8px;
+  width: 32px;
+  height: 32px;
+  display: grid;
+  place-items: center;
+  font-size: 18px;
+  color: var(--muted);
+  cursor: pointer;
+}
+.admin-modal-close-btn:hover {
+  background: var(--canvas);
+  color: var(--ink);
+}
+.user-cell-btn {
+  background: none;
+  border: none;
+  padding: 0;
+  font: inherit;
+  text-align: left;
+  cursor: pointer;
+  color: var(--sky-dark);
+  font-weight: 600;
+}
+.user-cell-btn:hover {
+  text-decoration: underline;
+  color: var(--sky);
+}
+.user-cell-btn small {
+  display: block;
+  font-size: 11px;
+  font-weight: 400;
+  color: var(--muted);
+}
+
+.roles-grid-layout {
+  display: grid;
+  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
+  gap: 20px;
+  align-items: start;
+}
+@media (max-width: 900px) {
+  .roles-grid-layout {
+    grid-template-columns: 1fr;
+  }
+}
+.role-card-btn {
+  display: flex;
+  flex-direction: column;
+  gap: 8px;
+  width: 100%;
+  padding: 14px 16px;
+  border-radius: 10px;
+  border: 1px solid var(--line);
+  background: var(--surface);
+  text-align: left;
+  cursor: pointer;
+  transition: all 0.15s ease;
+}
+.role-card-btn:hover {
+  background: var(--canvas);
+  border-color: #cbd5e1;
+}
+.role-card-btn[aria-pressed="true"] {
+  border-color: var(--sky);
+  background: #f0f9ff;
+  box-shadow: 0 0 0 1px var(--sky);
+}
+.role-card-header {
+  display: flex;
+  justify-content: space-between;
+  align-items: center;
+  gap: 8px;
+}
+.role-card-title {
+  font-size: 14px;
+  font-weight: 700;
+  color: var(--ink);
+}
+.role-card-desc {
+  font-size: 12px;
+  line-height: 1.45;
+  color: #64748b;
+  margin: 0;
+}
+.role-card-footer {
+  display: flex;
+  justify-content: space-between;
+  align-items: center;
+  font-size: 11px;
+  color: var(--muted);
+  padding-top: 6px;
+  border-top: 1px dashed var(--line);
+}
```

---

### 3.16. `tests/api-client-session.test.mjs`
* **Mục đích**: Bổ sung Unit Tests tự động kiểm tra việc lưu/xóa session roles và kiểm tra khả năng giải mã vai trò từ JWT token không có padding base64.

```diff
@@ -1,6 +1,6 @@
 import assert from "node:assert/strict";
 import test from "node:test";
-import { api, saveSessionTokens, SESSION_INVALIDATED_EVENT } from "../src/lib/api/client.ts";
+import { api, clearSessionTokens, extractRolesFromToken, getStoredRoles, saveSessionTokens, SESSION_INVALIDATED_EVENT } from "../src/lib/api/client.ts";
@@ -93,3 +93,25 @@ test("public login request does not require an existing session check", async ()
   await api.post("/api/v1/auth/login", { identifier: "buyer", password: "example" });
   assert.deepEqual(paths, ["/api/gateway/api/v1/auth/login"]);
 });
+
+test("roles are stored during login and cleared on sign out", () => {
+  const browser = browserSession();
+  saveSessionTokens("access-token", "refresh-token", ["ADMIN", "SELLER"]);
+  assert.equal(browser.localStorage.getItem("nexus_session_roles"), JSON.stringify(["ADMIN", "SELLER"]));
+  assert.deepEqual(getStoredRoles(), ["ADMIN", "SELLER"]);
+
+  clearSessionTokens();
+  assert.equal(browser.localStorage.getItem("nexus_session_roles"), null);
+  assert.deepEqual(getStoredRoles(), []);
+});
+
+test("roles can be extracted from unpadded JWT token claims", () => {
+  const payload = {
+    sub: "user-123",
+    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "Admin",
+  };
+  const base64Url = Buffer.from(JSON.stringify(payload)).toString("base64url");
+  const token = `header.${base64Url}.signature`;
+
+  assert.deepEqual(extractRolesFromToken(token), ["Admin"]);
+});
```

---

## 4. KẾT QUẢ KIỂM THỬ & ĐỘ ỔN ĐỊNH HỆ THỐNG

1. **Unit Tests (Node Test Runner)**:
   - Command: `npm run test:session`
   - Kết quả: **6/6 tests PASS** (100% thành công, 0 lỗi).
   - Bao gồm cả 2 test case mới cho việc bảo toàn vai trò và giải mã JWT token.

2. **TypeScript Compilation Check**:
   - Command: `npm run typecheck`
   - Kết quả: **Clean compilation (0 errors)**.
   - `next typegen` sinh route types thành công, `tsc --noEmit` hoàn thành sạch sẽ.

3. **Giao diện & Trải nghiệm thực tế**:
   - Đăng nhập tài khoản Admin ➔ Vào ngay `/admin/overview`.
   - F5 tải lại trang ➔ Giữ nguyên quyền Admin, không bị đẩy ra ngoài hoặc hạ quyền Buyer.
   - Quản lý tài khoản ➔ Click xem chi tiết popup modal đầy đủ thông tin, thao tác Ban/Unban/Delete hoạt động trơn tru.
   - Danh sách vai trò ➔ Bấm "Đổi vai trò" hoặc "+ Gán tài khoản vào vai trò này" lưu dữ liệu chuẩn backend format.
   - Tài khoản Seller ➔ Vừa quản lý bán hàng, vừa có thể xem Giỏ hàng & Đơn mua cá nhân thuận tiện.
