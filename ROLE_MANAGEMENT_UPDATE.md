# Báo cáo Cập nhật: Chuyển đổi màn hình "Danh sách vai trò & Gán vai trò"

> **Thời gian cập nhật**: 03/11/2026  
> **Mục tiêu**: Loại bỏ cơ chế ma trận phân quyền RBAC cũ, loại bỏ phần xem hồ sơ cá nhân trùng lặp với trang Quản lý tài khoản, và tập trung 100% vào nghiệp vụ **Xem vai trò & Trực tiếp Gán/Đổi/Gỡ vai trò cho tài khoản**.

---

## 1. Định hướng kiến trúc (Single Responsibility)

* **Trang Quản lý tài khoản (`/admin/users`)**: 
  * Chuyên biệt cho quản lý danh tính người dùng: xem hồ sơ đầy đủ (CCCD, địa chỉ, SĐT), điểm uy tín, lịch sử vi phạm, khóa Ban/mở Ban hoặc xóa mềm tài khoản.
* **Trang Danh sách vai trò (`/admin/roles`)**: 
  * Chuyên biệt cho **phân vai và quản lý quyền trực tiếp**:
    1. Xem danh sách các vai trò hệ thống (`Admin`, `Staff`, `Seller`, `Buyer`).
    2. Xem danh sách các tài khoản đang thuộc từng vai trò.
    3. **Trực tiếp Gán / Đổi / Gỡ vai trò cho tài khoản** ngay trên giao diện mà không cần xem hồ sơ cá nhân rườm rà.

---

## 2. Chi tiết các nội dung ĐÃ XÓA (Removed)

### 2.1. Xóa ma trận phân quyền RBAC cũ
* **File:** `src/features/admin/AdminScreens.tsx`
  * Xóa bỏ các lệnh gọi API tải danh sách quyền `/api/v1/admin/permissions` và lưu quyền `PUT /api/v1/admin/roles/{roleId}/permissions`.
  * Xóa bỏ bảng checkbox phân quyền ma trận và nút "Lưu quyền" lỗi thời.
  * Xóa nhãn menu `"Phân quyền RBAC"` trong thanh điều hướng sidebar.

### 2.2. Xóa popup xem chi tiết hồ sơ cá nhân (Tránh trùng lặp với `/admin/users`)
* **File:** `src/features/admin/AdminRolesScreen.tsx`
  * Xóa modal hiển thị thông tin CCCD, địa chỉ, điểm uy tín, hạng tin cậy, lý do khóa tài khoản,...
  * Xóa nút `"Chi tiết"` và hành vi click vào dòng người dùng mở popup hồ sơ.

---

## 3. Chi tiết các nội dung MỚI THÊM (Added)

### 3.1. Thêm tính năng "Đổi vai trò cho tài khoản" (Edit User Roles)
* **File:** `src/features/admin/AdminRolesScreen.tsx`
* **Cách hoạt động:**
  * Mỗi dòng tài khoản trong bảng có nút **`"Đổi vai trò"`**.
  * Khi bấm vào, hiển thị hộp thoại Modal trực quan với 4 thẻ checkbox vai trò:
    * `[ ] Admin` — Quản trị viên hệ thống
    * `[ ] SupportStaff` — Nhân viên vận hành & kiểm duyệt
    * `[ ] Seller` — Người bán hàng & quản lý đấu giá
    * `[ ] Buyer` — Người mua hàng (Khách hàng)
  * Admin có thể chọn một hoặc nhiều vai trò cùng lúc cho tài khoản.
  * Có cơ chế an toàn: luôn giữ tối thiểu 1 vai trò (mặc định `Buyer`) để tránh tài khoản bị mất hết quyền.
  * Bấm **`"Lưu vai trò"`** để cập nhật trực tiếp vào hệ thống.

### 3.2. Thêm tính năng "+ Gán tài khoản vào vai trò này" (Add User into Role)
* **File:** `src/features/admin/AdminRolesScreen.tsx`
* **Cách hoạt động:**
  * Tại tiêu đề danh sách tài khoản, có nút hành động chính **`"+ Gán tài khoản vào vai trò này"`**.
  * Khi mở modal:
    * Có ô tìm kiếm người dùng toàn hệ thống (theo email, họ tên hoặc username).
    * Hiển thị danh sách kết quả phù hợp kèm các vai trò hiện có của tài khoản đó.
    * Nếu tài khoản đã có vai trò này: hiển thị nhãn `✓ Đã có vai trò này`.
    * Nếu chưa có: nút **`"+ Gán vai trò"`** để thêm ngay tài khoản vào vai trò đang chọn chỉ với 1 click.
    * Sau khi gán thành công, bảng danh sách tự động làm mới và hiển thị tài khoản mới gán.

### 3.3. Thêm tính năng "Gỡ vai trò" (Revoke Role)
* **File:** `src/features/admin/AdminRolesScreen.tsx`
* **Cách hoạt động:**
  * Đối với các tài khoản có từ 2 vai trò trở lên (hoặc các vai trò đặc quyền như `Admin`, `Staff`, `Seller`), có nút **`"Gỡ vai trò"`** màu đỏ cảnh báo.
  * Admin bấm vào sẽ có hộp thoại xác nhận thu hồi vai trò đó khỏi tài khoản (hạ quyền an toàn).

### 3.4. Bổ sung hàm API Service `updateRoles` (Chuẩn API Contract)
* **File:** `src/features/admin/services/admin-users.service.ts`
* **Nội dung:**
  * Bổ sung method `updateRoles(id: string, roleCodes: string[], reason?: string): Promise<void>`.
  * Thực hiện gọi endpoint chuẩn **`PUT /api/v1/admin/users/{userId}/roles`** với payload:
    ```json
    {
      "roleCodes": ["Admin"],
      "reason": "Gán quyền quản trị viên từ giao diện Admin"
    }
    ```
  * **Lưu ý quan trọng**: Backend bắt buộc phải có trường `"reason"` (nếu thiếu sẽ bị lỗi `400 VAL_INVALID_INPUT`). Tên mảng vai trò là `"roleCodes"` (không dùng `"roles"`). Không sử dụng phương thức POST/PATCH cho endpoint gán quyền này.

### 3.5. Bổ sung giao diện và bộ CSS
* **File:** `src/styles/globals.css`
  * Bổ sung các class layout chia cột Master - Detail (`.roles-grid-layout`).
  * Bổ sung styling thẻ chọn vai trò với hiệu ứng highlight đang chọn (`.role-card-btn[aria-pressed="true"]`, `.role-card-header`, `.role-card-desc`, `.role-card-footer`).

---

## 4. Bảng tổng hợp các file thay đổi

| STT | File | Trạng thái | Chức năng chính |
|:---:|---|:---:|---|
| 1 | `ROLE_MANAGEMENT_UPDATE.md` | **Cập nhật** | Tài liệu chi tiết toàn bộ các thay đổi và hướng dẫn nghiệp vụ. |
| 2 | `src/features/admin/AdminRolesScreen.tsx` | **Cập nhật** | Bỏ modal xem hồ sơ; thêm tính năng Đổi vai trò, Thêm tài khoản vào vai trò, Gỡ vai trò. |
| 3 | `src/features/admin/services/admin-users.service.ts` | **Cập nhật** | Bổ sung hàm `updateRoles(userId, roles)` gọi API gán quyền cho người dùng. |
| 4 | `src/constants/navigation.ts` | **Đã sửa** | Đổi tên menu từ "Phân quyền RBAC" sang "Danh sách vai trò". |
| 5 | `src/features/admin/AdminScreens.tsx` | **Đã sửa** | Xóa logic phân quyền ma trận; re-export màn hình vai trò mới; cập nhật card Tổng quan. |
| 6 | `src/styles/globals.css` | **Đã sửa** | Bổ sung CSS layout 2 cột và card vai trò. |

---

## 5. Kết quả kiểm thử

* **TypeScript Compilation**: `npm run typecheck` ➔ **100% Hoàn thành sạch lỗi (0 errors)**.
* **Unit Tests**: `npm run test:session` ➔ **6/6 tests passed**.
* **Linting**: `npm run lint` ➔ **Đạt chuẩn (0 errors)**.
