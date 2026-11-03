# Báo cáo sửa lỗi: Điều hướng vai trò Admin & Bảo toàn quyền khi tải lại trang (F5)

## 1. Vấn đề phát hiện
1. **Đăng nhập Admin bị điều hướng về trang chủ (`/`)**:
   - Khi tài khoản có role `admin` đăng nhập thành công, hệ thống chuyển hướng về trang chủ (`/`) hiển thị danh sách sản phẩm mua sắm thay vì đưa vào trang quản trị (`/admin/overview`).
2. **Tải lại trang (F5) bị mất quyền Admin, trở thành Buyer**:
   - Khi F5, toàn bộ role Admin bị mất; giao diện hiển thị các menu người mua (`Đơn mua`, `Giỏ hàng`, `Đăng ký bán hàng`,...).
   - Khi truy cập thủ công vào `/admin/...`, hệ thống báo `Bạn không có quyền mở trang này` và đẩy về trang chủ.

---

## 2. Nguyên nhân cốt lõi
* **Nguyên nhân 1 (Điều hướng sai)**:
  - Trong hàm `landingPath()` tại `src/features/auth/AuthScreens.tsx`, logic trước đó gán tất cả role (`admin`, `staff`, `seller`) trả về `ROUTES.home` (`/`).
* **Nguyên nhân 2 (Mất roles khi F5)**:
  - Khi login (`/api/v1/auth/login`), API trả về `roles: ["ADMIN"]`. Hàm `saveSessionTokens()` chỉ lưu `accessToken` và `refreshToken` vào `localStorage`, không lưu `roles`.
  - Khi F5 trang, `SessionProvider.tsx` gọi `GET /api/v1/me` để khôi phục phiên. Tuy nhiên, endpoint `/api/v1/me` của `UserService` chỉ trả về thông tin cá nhân cơ bản mà **không kèm danh sách `roles`**.
  - `SessionProvider` gán `setUser(profile)` khiến `user.roles` bị `undefined`/rỗng. Do không có vai trò đặc quyền, hệ thống tự động fallback về vai trò mặc định `buyer`.

---

## 3. Các thay đổi đã thực hiện

### 3.1. Sửa hàm điều hướng đăng nhập `landingPath`
* **File:** `src/features/auth/AuthScreens.tsx`
* **Nội dung:**
  - Chuyển hướng người dùng có vai trò `admin` về đúng trang tổng quan quản trị `ROUTES.admin.overview` (`/admin/overview`).
  - Chuyển hướng `staff` / `supportstaff` về `ROUTES.staff.auctions` (`/staff/auctions`).
  - Chuyển hướng `seller` về `ROUTES.seller.products` (`/seller/products`).
  - Chuyển hướng `buyer` / `customer` về `ROUTES.home` (`/`).

### 3.2. Lưu trữ và khôi phục vai trò (Roles) trong Session Client
* **File:** `src/lib/api/client.ts`
* **Nội dung:**
  - Thêm key `SESSION_ROLES_KEY = "nexus_session_roles"` trong `localStorage`.
  - Thêm hàm `extractRolesFromToken()` để giải mã roles từ payload JWT `accessToken` khi cần.
  - Cập nhật `saveSessionTokens(accessToken, refreshToken, roles?)` để lưu trữ đồng thời danh sách roles vào `localStorage`.
  - Thêm hàm `saveSessionRoles()` và `getStoredRoles()` để đọc/ghi danh sách vai trò dự phòng.
  - Cập nhật `clearSessionTokens()` để xóa sạch `nexus_session_roles` khi đăng xuất hoặc hết hạn phiên.
  - Cập nhật `refreshAccessToken()` để bảo toàn roles sau mỗi lần refresh token.

### 3.3. Tích hợp roles vào luồng Auth Service
* **File:** `src/features/auth/services/auth.service.ts`
* **Nội dung:**
  - Trong hàm `login()`, lấy danh sách `initialRoles` từ kết quả đăng nhập và chuyển vào `saveSessionTokens()` để đảm bảo roles được ghi nhận vào `localStorage` ngay tại thời điểm đăng nhập thành công.

### 3.4. Bảo toàn roles trong `SessionProvider`
* **File:** `src/components/auth/SessionProvider.tsx`
* **Nội dung:**
  - Hợp nhất (merge) các vai trò từ `getStoredRoles()`, `profile.roles` và `profile.role` thay vì ghi đè bằng `profile.role`. Do đó, nếu `/api/v1/me` trả về `role: "buyer"`, quyền `ADMIN` đã cấp ở phiên đăng nhập vẫn được bảo toàn nguyên vẹn.
  - Tự động đồng bộ `saveSessionRoles()` với danh sách quyền đã hợp nhất.

### 3.5. Bổ sung cơ chế tự phục hồi trong `RoleGate` và `extractRolesFromToken`
* **File:** `src/lib/api/client.ts` & `src/components/auth/RoleGate.tsx`
* **Nội dung:**
  - Thêm padding chuẩn base64 (`=`) và dùng `TextDecoder` trong `extractRolesFromToken()` để giải mã an toàn các JWT không có padding trong trình duyệt (Chrome).
  - Hỗ trợ các claim phổ biến của ASP.NET Core (`http://schemas.microsoft.com/ws/2008/06/identity/claims/role`).
  - Trong `RoleGate.tsx`: Chuẩn hóa `normalizeRole` xử lý cả prefix `ROLE_`, đồng thời fallback đọc `getStoredRoles()` nếu React state chưa kịp nạp roles, loại bỏ hoàn toàn hiện tượng hiển thị nhầm thông báo chặn quyền khi F5.

### 3.6. Bổ sung Unit Test xác thực
* **File:** `tests/api-client-session.test.mjs`
* **Nội dung:**
  - Thêm test case `roles are stored during login and cleared on sign out`.
  - Thêm test case `roles can be extracted from unpadded JWT token claims`.

---

### 3.7. Tối ưu giao diện cho tài khoản đa vai trò (Seller vừa mua vừa bán)
* **File:** `src/components/layout/Shells.tsx`
* **Nội dung:**
  - Giữ icon "Đơn mua" và "Giỏ hàng" luôn hiển thị trên thanh Header cạnh nút "Kênh người bán", cho phép Seller khi mua sắm vẫn quản lý giỏ hàng và đơn hàng đã mua một cách tiện lợi.
  - Luôn hiển thị mục "Đơn mua" trong Account Menu của mọi người dùng có tài khoản.

---

## 4. Kết quả kiểm thử
- `npm run test:session`: **6/6 tests passed** (100%).
- `npm run typecheck`: **Hoàn toàn sạch lỗi TypeScript** (`Types generated successfully`).
