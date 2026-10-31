# 🧭 Nexus — Marketplace Frontend

Nexus là frontend cho sàn marketplace, xây dựng bằng **Next.js App Router**, **React**, **TypeScript** và **Tailwind CSS**. Codebase được chia theo tính năng để hỗ trợ các khu vực dành cho khách truy cập, người mua, người bán, nhân viên vận hành và quản trị viên.

> **Trạng thái hiện tại:** các route chủ yếu là scaffold giao diện. Feature, kiểu dữ liệu và REST path đang là nền tảng ban đầu; cần đối chiếu với OpenAPI/DTO của backend trước khi bật các luồng nghiệp vụ thật. Việc route xuất hiện trong ứng dụng không đồng nghĩa đã có đăng nhập hoặc phân quyền.

---

## 📂 Cấu Trúc Dự Án

```text
Nexus/
├── public/                      # Tài nguyên tĩnh
├── src/
│   ├── app/                     # Next.js App Router, route groups và pages
│   │   ├── (public)/            # Trang chủ, danh mục và chi tiết sản phẩm
│   │   ├── (auth)/              # Đăng nhập, đăng ký
│   │   └── (dashboard)/         # Khu vực buyer, seller, staff, admin
│   ├── components/
│   │   ├── layout/              # Thành phần bố cục dùng chung
│   │   └── ui/                  # Vị trí dành cho UI primitives dùng chung
│   ├── constants/               # Cấu hình API và đường dẫn ứng dụng
│   ├── features/                # Các module theo miền nghiệp vụ
│   │   ├── auth/                # Xác thực
│   │   ├── profile/             # Hồ sơ người dùng
│   │   ├── catalog/             # Danh mục và sản phẩm
│   │   ├── commerce/            # Giỏ hàng, đơn hàng, thanh toán
│   │   ├── audit-log/           # Nhật ký kiểm toán
│   │   ├── auction/             # Đấu giá
│   │   ├── fulfillment/         # Kho vận và giao nhận
│   │   ├── notification/        # Thông báo
│   │   └── wallet/              # Ví và giao dịch
│   ├── lib/api/                 # HTTP client dùng chung
│   └── widgets/                 # UI ghép từ nhiều feature
├── DOCUMENTS/                   # Kế hoạch và tài liệu kiến trúc
├── .env.example                 # Biến môi trường mẫu
├── next.config.ts               # Cấu hình Next.js
└── package.json                 # Scripts và dependencies
```

Các feature có cấu trúc `components/`, `hooks/`, `services/`, `types/` và `index.ts`. Một số thư mục thành phần còn để trống làm khung. Xem thêm hướng dẫn tại [`src/features/README.md`](src/features/README.md), [`src/app/README.md`](src/app/README.md), [`src/widgets/README.md`](src/widgets/README.md), [`src/components/README.md`](src/components/README.md) và [`src/lib/api/README.md`](src/lib/api/README.md).

---

## 🏗️ Kiến Trúc Frontend

### 1. Route và giao diện

Next.js App Router định nghĩa các khu vực theo route group. Tên nhóm trong ngoặc không xuất hiện trong URL:

| Khu vực | Một số đường dẫn |
| --- | --- |
| Public | `/`, `/catalog`, `/catalog/[id]` |
| Auth | `/login`, `/register` |
| Buyer | `/buyer/profile`, `/buyer/cart`, `/buyer/checkout`, `/buyer/orders`, `/buyer/wallet` |
| Seller | `/seller/products`, `/seller/inventory` |
| Staff | `/staff/sellers`, `/staff/orders`, `/staff/fulfillment` |
| Admin | `/admin/users`, `/admin/categories`, `/admin/audit-log` |

Page trong `src/app/` nên tập trung vào định tuyến và kết hợp giao diện; UI nghiệp vụ thuộc feature, còn phần phối hợp nhiều feature thuộc `src/widgets/`.

### 2. Feature và ranh giới nghiệp vụ

Mỗi feature quản lý types, services và UI của miền nghiệp vụ tương ứng. Thành phần bên ngoài nên dùng public exports trong `features/<feature>/index.ts`, tránh phụ thuộc trực tiếp vào file nội bộ của feature khác. Request của feature đi qua API client dùng chung.

### 3. Giao tiếp API

Frontend cấu hình một địa chỉ API Gateway qua `NEXT_PUBLIC_API_URL` (mặc định `http://localhost:8080`). API client tại `src/lib/api/client.ts` hỗ trợ các phương thức HTTP, JSON request/response, Bearer token trong `localStorage` với khóa `nexus_token`, và `ApiError` cho phản hồi lỗi. Khi nhận HTTP `401`, client xóa token và điều hướng về `/login` (trừ khi đang ở trang auth).

Backend dự kiến gồm các domain User, Catalog, Commerce, Log, Auction, Fulfillment, Notification và Wallet. Bản đồ feature/service và endpoint hiện là giả định từ tài liệu kế hoạch; repo frontend không chứa source backend hoặc OpenAPI để xác nhận hợp đồng. Frontend chỉ nên gọi Gateway, không gọi trực tiếp từng microservice.

### 4. Giới hạn bảo mật hiện tại

Các route group dashboard hiện chỉ tổ chức trang. Chưa có cơ chế session guard/RBAC hoàn chỉnh; API client gắn token nếu có, nhưng việc bảo vệ tài nguyên phải được backend thực thi. Không dùng các trang scaffold cho dữ liệu hoặc giao dịch thật cho đến khi tích hợp và xác minh các kiểm tra cần thiết.

---

## ⚡ Bắt Đầu Phát Triển

Yêu cầu: Node.js và npm tương thích với phiên bản Next.js được khai báo trong `package.json`.

### 1. Cài dependencies

```bash
npm install
```

### 2. Cấu hình biến môi trường

Tạo `.env.local` từ `.env.example` và thiết lập địa chỉ API Gateway khi backend sẵn sàng:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Nếu không khai báo biến này, frontend dùng mặc định `http://localhost:8080`.

### 3. Chạy chế độ phát triển

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

---

## 🧰 Lệnh Thường Dùng

```bash
npm run dev        # Chạy Next.js ở chế độ phát triển
npm run typecheck  # Sinh kiểu route và kiểm tra TypeScript
npm run lint       # Chạy ESLint
npm run build      # Tạo production build bằng Webpack
npm run start      # Chạy production server sau khi build
```

`build` hiện chỉ định `--webpack`; cấu hình này được chọn do Turbopack gặp lỗi khởi chạy CSS worker trong môi trường Windows được ghi nhận trong dự án. Lệnh `dev` vẫn dùng cấu hình Turbopack của Next.js.

---

## 📚 Tài Liệu Kiến Trúc

- [`DOCUMENTS/nexus-fe-codebase-plan.md`](DOCUMENTS/nexus-fe-codebase-plan.md): mô hình codebase và định hướng tích hợp backend.
- [`DOCUMENTS/nexus_fe_simplified_plan.md`](DOCUMENTS/nexus_fe_simplified_plan.md): kế hoạch frontend rút gọn.
- [`DOCUMENTS/nexus_fe_readme_strategy_plan.md`](DOCUMENTS/nexus_fe_readme_strategy_plan.md): chiến lược tài liệu theo ranh giới kiến trúc.

Chúc nhóm phát triển Nexus xây dựng sản phẩm thành công! 🚀
