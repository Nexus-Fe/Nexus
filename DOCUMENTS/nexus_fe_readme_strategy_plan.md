# Kế Hoạch Bổ Sung Hệ Thống `README.md` Hướng Dẫn Tại Từng Thư Mục (`nexus-fe`)

> **Mục tiêu**: Thiết lập hệ thống "tài liệu chốt chặn kiến trúc" (Checkpoint Documentation) ngay bên trong từng thư mục trọng yếu của codebase. Giúp mọi thành viên trong team khi mở bất kỳ thư mục nào cũng hiểu ngay: **Thư mục này làm gì? Được phép làm gì? Cấm làm những gì? Và quy trình thêm code mới ra sao?**

> **Trạng thái thực hiện (21/10/2026)**: Đã dựng khung trong `src/`: 5 README kiến trúc, 9 feature, các route public/auth và 4 portal. API client Gateway đã được tạo; route hiện là trang khung, session/RBAC và nghiệp vụ giao dịch chưa được tích hợp.

> Mapping feature-to-microservice và REST paths là giả định từ kế hoạch vì repo này không chứa source backend/OpenAPI. README của `features/` ghi rõ giới hạn này để tránh nhầm mô hình dự kiến với hợp đồng đã xác nhận.

> Xác minh: `npx next typegen`, `npm run typecheck`, `npm run lint` và `npm run build` đều đạt. Build script dùng Webpack do Turbopack gặp lỗi nội bộ khi khởi chạy worker CSS trong môi trường Windows hiện tại.

---

## 1. Đánh Giá: Có Nên Đặt `README.md` Ở Từng Folder Không?

### ✅ CỰC KỲ NÊN — Đây Là Best-Practice Của Các Codebase Chuyên Nghiệp
Dự án tham khảo `parking-system-web` đã áp dụng rất thành công điều này với file [`parking-system-web/src/features/README.md`](file:///c:/Users/wuann_/Documents/A_CONFIDENTIAL/parking-system-web/src/features/README.md). Nó hoạt động như một "luật giao thông" cục bộ cho lập trình viên.

### ⚠️ Nhưng Cần Lưu Ý "Nguyên Tắc Điểm Chốt Chặn" (Tránh Lạm Phát README)
- **❌ KHÔNG NÊN**: Đặt `README.md` ở mọi ngóc ngách quá sâu (ví dụ: `components/ui/button/README.md`, `features/wallet/types/README.md`...). Điều này gây loãng thông tin, khó bảo trì và dễ bị lỗi thời.
- **✅ NÊN**: Chỉ đặt tại **5 thư mục ranh giới kiến trúc cấp 1** (`app/`, `features/`, `widgets/`, `components/`, `lib/api/`).

---

## 2. Bản Đồ 5 File `README.md` Cốt Lõi Cần Thiết Lập

```
src/
├── app/
│   └── README.md             # 📌 (1) Quy chuẩn Routing, Skinny Pages & 4 Portals
├── widgets/
│   └── README.md             # 📌 (2) Quy chuẩn Lắp ráp Đa-Feature (Composition Layer)
├── features/
│   └── README.md             # 📌 (3) Cẩm nang Feature-Based & Bản đồ ánh xạ Microservices
├── components/
│   └── README.md             # 📌 (4) Quy chuẩn UI Primitives & Layout dùng chung
└── lib/api/
    └── README.md             # 📌 (5) Hướng dẫn gọi API Gateway, Header & Xử lý lỗi
```

---

## 3. Nội Dung Chi Tiết Của Từng `README.md`

### 📌 (1) `src/features/README.md` (Quan Trọng Nhất)
Kế thừa tinh hoa từ `parking-system-web` và nâng cấp theo 8 Microservices của Nexus:
- **Nguyên tắc "Hộp kín" (Encapsulation)**: Feature tuyệt đối không import chéo implementation của nhau.
- **Quy tắc Cổng kết nối (`index.ts`)**: Mọi export ra ngoài bắt buộc qua `index.ts`. Cấm import sâu kiểu `@/features/wallet/components/BalanceCard`.
- **Cấu trúc chuẩn bên trong một Feature**:
  ```
  features/[feature-name]/
  ├── components/    # UI nội bộ
  ├── hooks/         # Custom hooks lấy/xử lý state
  ├── services/      # Hàm gọi API qua client.ts
  ├── types/         # TypeScript interface
  └── index.ts       # Public API export
  ```
- **Bản đồ 8 Microservices**: Bảng tra cứu rõ ràng Feature nào nói chuyện với Service nào của Backend (:8001 đến :8008).

---

### 📌 (2) `src/widgets/README.md` (Tránh Nhầm Lẫn Giữa Widget & Feature)
File này giải quyết trực tiếp câu hỏi: *"Khi nào tôi được phép tạo Widget?"*:
- **Định nghĩa**: Widget là tầng lắp ráp kết hợp dữ liệu từ 2 feature trở lên (ví dụ: `CheckoutWidget` kết hợp `commerce` + `wallet` + `fulfillment`).
- **Checklist 3 câu hỏi trước khi tạo Widget**:
  1. *Component này có dùng dữ liệu từ 2 feature trở lên không?* $\rightarrow$ Nếu CÓ, làm trong `widgets/`. Nếu KHÔNG (chỉ dùng 1 feature), làm thẳng trong `features/[tên-feature]/components/`.
  2. *Widget có được chứa logic gọi API trực tiếp không?* $\rightarrow$ **CẤM**. Widget chỉ gom các hook/component đã có từ các feature.
  3. *Page có được viết logic dài hàng trăm dòng không?* $\rightarrow$ Không, hãy đưa logic ghép đó vào Widget để giữ `page.tsx` luôn ngắn gọn.

---

### 📌 (3) `src/app/README.md` (Quy Chuẩn Định Tuyến Next.js App Router)
- **Quy tắc "Trang mỏng" (Skinny Pages)**: File `page.tsx` chỉ làm 2 việc: Lấy params/metadata và render Widget/Feature. Không viết logic tính toán hay CSS phức tạp trực tiếp trong `page.tsx`.
- **Bản đồ 4 Phân Vùng Portals (Route Groups)**:
  - `(public)`: Khách vãng lai xem sản phẩm, landing page.
  - `(auth)`: Đăng nhập, đăng ký.
  - `(dashboard)/buyer`: Cổng Người mua (Đơn hàng, giỏ hàng, nạp tiền ví).
  - `(dashboard)/seller`: Cổng Người bán (Đăng sản phẩm, quản lý kho ảo).
  - `(dashboard)/staff`: Cổng Nhân viên vận hành sàn (Duyệt người bán, giám sát đơn hàng toàn sàn, xử lý vận đơn).
  - `(dashboard)/admin`: Cổng Quản trị tối cao (Phân quyền tài khoản, cấu hình danh mục, audit log).

---

### 📌 (4) `src/components/README.md` (Quy Chuẩn UI Dùng Chung)
- **`components/ui/` (UI Primitives)**:
  - Chứa Button, Input, Modal, Table, Badge...
  - **Quy tắc**: Là "Dumb / Pure Components" — Tuyệt đối không chứa logic nghiệp vụ mua bán/tiền nong, không import từ `features/` hay `lib/api/`. Nhận props và render UI thuần túy.
- **`components/layout/`**:
  - Chứa Header, Sidebar, Footer, PageShell cho các layout dashboard.

---

### 📌 (5) `src/lib/api/README.md` (Quy Chuẩn Giao Tiếp Backend)
- **Điểm vào duy nhất**: Giải thích rõ mọi request đều đi qua API Gateway tại `http://localhost:8000`.
- **Cách dùng `api` wrapper**:
  ```typescript
  import { api } from '@/lib/api/client';
  
  // Tự động gắn token, tự động gắn Content-Type, tự động parse JSON
  const data = await api.get<ApiResponse<Product>>('/api/catalog/products/p1');
  ```
- **Cơ chế tự động**:
  - Tự động lấy token từ `localStorage('nexus_token')`.
  - Tự động xử lý lỗi 401: Xóa session và chuyển hướng về `/login`.
  - Định dạng chuẩn của Response: `{ success, statusCode, data, traceId }`.

---

## 4. Kế Hoạch Cập Nhật Tài Liệu Kế Hoạch (`nexus_fe_simplified_plan.md`)

Khi triển khai khởi tạo bộ khung, ta sẽ cập nhật cây thư mục trong file [`nexus_fe_simplified_plan.md`](file:///c:/Users/wuann_/Documents/A_CONFIDENTIAL/nexus-fe/DOCUMENTS/nexus_fe_simplified_plan.md) để thể hiện rõ vị trí của 5 file `README.md` này.

```
nexus-fe/src/
├── app/
│   ├── README.md             # [NEW]
│   └── ...
├── widgets/
│   ├── README.md             # [NEW]
│   └── ...
├── features/
│   ├── README.md             # [NEW]
│   └── ...
├── components/
│   ├── README.md             # [NEW]
│   └── ...
└── lib/api/
    └── README.md             # [NEW]
```

---

## 5. Các Bước Đã Triển Khai

1. Đã chuyển `app/` vào `src/app/` và đổi alias `@/*` sang `./src/*`.
2. Đã tạo 5 README tại các vị trí kiến trúc đã chọn.
3. Đã dựng khung 9 feature với `services/`, `types/`, `index.ts` và thư mục nội bộ dự kiến.
4. Đã tạo route cho buyer, seller, staff, admin, public và auth; các route đang hiển thị trang khung.
5. Đã chạy type generation, typecheck, lint và production build. Build dùng Webpack trong môi trường hiện tại vì Turbopack gặp lỗi worker CSS.
