# Kế Hoạch Thiết Kế Codebase `nexus-fe` (Đơn Giản Hóa — Theo Chuẩn `parking-system-web`)

> **Định hướng**: Loại bỏ hoàn toàn hệ thống mock/seam phức tạp. Xây dựng codebase theo mô hình **Feature-Based thực dụng** giống hệt `parking-system-web`, kết nối trực tiếp đến **API Gateway (`http://localhost:8000`)**.

> **Trạng thái thực hiện (21/10/2026)**: Đã dựng bộ khung theo kế hoạch. Ứng dụng chuyển sang `src/`; alias `@/*` trỏ vào `src/*`; có cấu hình/client API chung; 9 feature có `services/`, `types/`, `index.ts`; route public, auth và 4 portal đã có trang khung. Các trang chưa thực hiện nghiệp vụ thật.

> **Kết quả kiểm tra**: `npx next typegen`, `npm run typecheck`, `npm run lint`, `npm run build` đều đạt. Build script dùng Webpack vì Turbopack báo lỗi nội bộ khi khởi chạy worker Tailwind CSS trên môi trường Windows này.

> **Giới hạn cần biết**: Repo không có backend/OpenAPI để xác nhận DTO, endpoint hay ánh xạ service; khai báo hiện là hợp đồng khởi đầu theo kế hoạch. Route groups chưa chặn người chưa đăng nhập và chưa kiểm tra role. Checkout mới là vị trí ghép widget, chưa tạo đơn hoặc theo dõi Saga.

> Các sơ đồ luồng nghiệp vụ ở phần sau mô tả đích thiết kế; chúng chưa chạy trong bộ khung hiện tại.

---

## 1. Giải Thích Dễ Hiểu Về Kiến Trúc

### A. Tại sao Backend lại chia 7 Services + 1 Audit Log?
Hãy tưởng tượng hệ thống sàn thương mại điện tử Nexus như một **Tòa nhà thương mại**:
- **UserService (:8001)**: *Quầy tiếp tân & bảo vệ* — Cấp thẻ ra vào (JWT token), lưu hồ sơ cá nhân của khách.
- **CatalogService (:8002)**: *Gian hàng trưng bày* — Quản lý kệ hàng, danh mục, thông tin sản phẩm và số lượng tồn kho ảo.
- **CommerceService (:8003)**: *Bộ phận thu ngân & đơn hàng* — Quản lý giỏ hàng và tạo đơn hàng.
- **AuctionService (:8005)**: *Phòng đấu giá* — Nơi diễn ra các phiên trả giá, đếm ngược thời gian.
- **FulfillmentService (:8006)**: *Kho vận & giao hàng* — Đóng gói hàng từ kho vật lý, tính tiền ship và gửi shipper.
- **NotificationService (:8007)**: *Hệ thống loa phát thanh* — Bắn thông báo về email/app khi có sự kiện.
- **WalletService (:8008)**: *Ngân hàng nội bộ* — Quản lý tiền trong ví điện tử của từng user, nạp/rút tiền.
- **LogService (:8004)**: *Camera an ninh* — Ghi lại lịch sử hoạt động hệ thống (chỉ Quản trị viên/Admin mới cần xem).
- **ApiGateway (:8000)**: *Cổng chính của tòa nhà* — Frontend **chỉ cần bước qua cổng này**, bảo vệ tại cổng sẽ tự điều hướng khách tới đúng phòng ban.

---

### B. Tại sao chia 4 Cổng Dashboard (Buyer, Seller, Staff, Admin)?
Mỗi đối tượng vào hệ thống với một mục đích hoàn toàn khác nhau (Khớp với ma trận phân quyền RBAC 5 cấp độ của Nexus-BE):
1. **Cổng Người mua (Buyer)**: Vào để mua sắm, theo dõi giỏ hàng, nạp tiền ví cá nhân, xem tình trạng giao hàng.
2. **Cổng Người bán (Seller)**: Vào để đăng bán sản phẩm mới, cập nhật giá, quản lý kho ảo, xem đơn hàng của shop.
3. **Cổng Nhân viên vận hành (Staff)**: Vào để xét duyệt hồ sơ người bán mới (`/admin/sellers/{id}/approve`), giám sát toàn bộ đơn hàng sàn, theo dõi vận đơn kho bãi và xử lý khiếu nại.
4. **Cổng Quản trị viên (Admin)**: Quản lý tối cao — phân quyền tài khoản admin/staff, cấu hình danh mục sản phẩm, quản trị hệ thống và xem camera an ninh (Audit Log).

Chia folder route thành `(dashboard)/buyer`, `(dashboard)/seller`, `(dashboard)/staff`, `(dashboard)/admin` giúp phân quyền sạch sẽ, giao diện tối ưu hóa riêng biệt cho từng vai trò.

---

### C. Tầng `widgets/` là gì và tại sao lại cần?
**Quy tắc bất di bất dịch của Feature-Based**: Thư mục của tính năng này **không được import trộm** file của tính năng khác (để tránh code bị dính chùm như mạng nhện).

*Vấn đề thực tế*: Màn hình **Thanh toán (Checkout)** cần dữ liệu từ 3 phòng ban khác nhau:
- Lấy danh sách món đồ muốn mua (từ `features/commerce`)
- Lấy số dư ví xem có đủ tiền trả không (từ `features/wallet`)
- Lấy địa chỉ giao hàng và phí ship (từ `features/fulfillment`)

👉 **Tầng `widgets/` ra đời làm "Nhạc trưởng"**: 
Thay vì để `commerce` tự ý chui vào `wallet`, ta tạo một khối giao diện `widgets/checkout/CheckoutSummary.tsx`. File này đứng ở giữa, gom dữ liệu từ cả 3 feature lại rồi đưa lên trang `app/(dashboard)/buyer/checkout/page.tsx`. Nhờ đó, các feature vẫn hoàn toàn độc lập, sạch sẽ.

---

## 2. Cây Thư Mục Chuẩn (`nexus-fe`)

```
nexus-fe/
├── README.md                       # Hướng dẫn chạy và trạng thái bộ khung
├── public/                           # Ảnh, icons tĩnh
├── src/
│   ├── app/                          # Next.js App Router + README.md
│   │   ├── (public)/                 # Trang công khai không cần login
│   │   │   ├── page.tsx              # Landing page
│   │   │   └── catalog/              # Khách vãng lai xem sản phẩm
│   │   │       ├── page.tsx          # Danh sách sản phẩm
│   │   │       └── [id]/page.tsx     # Chi tiết sản phẩm
│   │   ├── (auth)/                   # Trang xác thực
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/              # Khu vực quản trị sau login
│   │   │   ├── buyer/                # Cổng Người Mua
│   │   │   │   ├── profile/page.tsx  # Thông tin cá nhân
│   │   │   │   ├── cart/page.tsx     # Giỏ hàng
│   │   │   │   ├── checkout/page.tsx # Trang thanh toán
│   │   │   │   ├── orders/page.tsx   # Lịch sử đơn hàng
│   │   │   │   ├── orders/[id]/page.tsx # Theo dõi trạng thái đơn hàng
│   │   │   │   └── wallet/page.tsx   # Ví cá nhân
│   │   │   ├── seller/               # Cổng Người Bán
│   │   │   │   ├── products/page.tsx # Quản lý sản phẩm đăng bán
│   │   │   │   └── inventory/page.tsx# Quản lý kho ảo
│   │   │   ├── staff/                # Cổng Nhân Viên Vận Hành
│   │   │   │   ├── sellers/page.tsx  # Xét duyệt hồ sơ người bán
│   │   │   │   ├── orders/page.tsx   # Giám sát toàn bộ đơn hàng sàn
│   │   │   │   └── fulfillment/page.tsx # Điều phối & xử lý vận đơn
│   │   │   └── admin/                # Cổng Quản Trị Viên
│   │   │       ├── users/page.tsx    # Quản lý & phân quyền tài khoản
│   │   │       ├── categories/page.tsx # Cấu hình danh mục sản phẩm
│   │   │       └── audit-log/page.tsx# Xem log hệ thống
│   │   ├── layout.tsx                # Root layout
│   │   └── globals.css               # Tailwind CSS v4 styling
│   │
│   ├── components/                   # UI dùng chung + README.md
│   │   ├── ui/                       # Primitives: button, input, modal, table, badge...
│   │   └── layout/                   # Header, Sidebar, Footer, UserMenu...
│   │
│   ├── widgets/                      # Tầng ghép nối đa feature + README.md
│   │   ├── checkout/                 # Ghép Cart + Wallet + Shipping
│   │   │   └── CheckoutSection.tsx
│   │   └── dashboard-stats/          # Thẻ thống kê tổng hợp nhiều nguồn
│   │
│   ├── features/                     # ⭐ Feature nghiệp vụ + README.md
│   │   ├── auth/                     # ← UserService (:8001)
│   │   │   ├── components/           # LoginForm, RegisterForm...
│   │   │   ├── hooks/                # useAuth...
│   │   │   ├── services/             # auth.service.ts (gọi API login, register)
│   │   │   ├── types/                # User, LoginRequest, AuthResponse...
│   │   │   └── index.ts              # Export ra ngoài
│   │   ├── profile/                  # ← UserService (:8001)
│   │   │   ├── components/           # ProfileCard, EditProfileModal...
│   │   │   ├── services/             # profile.service.ts (GET /api/users/profile)
│   │   │   ├── types/                # ProfileDto
│   │   │   └── index.ts
│   │   ├── catalog/                  # ← CatalogService (:8002)
│   │   │   ├── components/           # ProductCard, ProductGrid, ProductFilter...
│   │   │   ├── services/             # catalog.service.ts (GET /api/catalog/products)
│   │   │   ├── types/                # Product, Category...
│   │   │   └── index.ts
│   │   ├── commerce/                 # ← CommerceService (:8003)
│   │   │   ├── components/           # CartList, CartItemRow, OrderHistoryTable...
│   │   │   ├── services/             # commerce.service.ts (Cart & Order APIs)
│   │   │   ├── types/                # Cart, CartItem, Order, CreateOrderDto...
│   │   │   └── index.ts
│   │   ├── wallet/                   # ← WalletService (:8008)
│   │   │   ├── components/           # BalanceCard, TransactionHistory...
│   │   │   ├── services/             # wallet.service.ts (GET balance, deposit...)
│   │   │   ├── types/                # Wallet, Transaction...
│   │   │   └── index.ts
│   │   ├── auction/                  # ← AuctionService (:8005)
│   │   │   ├── components/           # AuctionCard, BidBox, CountdownTimer...
│   │   │   ├── services/             # auction.service.ts
│   │   │   ├── types/                # AuctionSession, BidDto...
│   │   │   └── index.ts
│   │   ├── fulfillment/              # ← FulfillmentService (:8006)
│   │   │   ├── components/           # TrackingTimeline, ShippingFeeCalculator...
│   │   │   ├── services/             # fulfillment.service.ts
│   │   │   ├── types/                # Shipment, TrackingStep...
│   │   │   └── index.ts
│   │   ├── notification/             # ← NotificationService (:8007)
│   │   │   ├── components/           # NotificationBell, NotificationList...
│   │   │   ├── services/             # notification.service.ts
│   │   │   ├── types/                # NotificationItem...
│   │   │   └── index.ts
│   │   └── audit-log/                # ← LogService (:8004 - Admin)
│   │       ├── components/           # AuditLogTable...
│   │       ├── services/             # audit-log.service.ts
│   │       ├── types/                # LogItem...
│   │       └── index.ts
│   │
│   ├── lib/
│   │   └── api/
│   │       ├── client.ts             # Fetch wrapper dùng token, headers và xử lý lỗi
│   │       └── README.md             # Hướng dẫn giao tiếp API Gateway
│   │
│   └── constants/
│       ├── config.ts                 # APP_CONFIG.apiBaseUrl = 'http://localhost:8000'
│       └── routes.ts                 # Đường dẫn cố định (/login, /buyer/cart...)
│
├── .env.example                      # NEXT_PUBLIC_API_URL=http://localhost:8000
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## 3. Chi Tiết 4 Luồng Nghiệp Vụ Chạy Qua Từng File

### Luồng 1: User Xem Thông Tin Cá Nhân (Profile)

```
[Browser màn hình]
       │
       ▼ (1) Truy cập URL: /buyer/profile
src/app/(dashboard)/buyer/profile/page.tsx
       │
       ▼ (2) Gọi Hook lấy thông tin
src/features/profile/hooks/useProfile.ts
       │
       ▼ (3) Hook gọi hàm Service
src/features/profile/services/profile.service.ts
       │  Hàm: profileService.getProfile()
       │
       ▼ (4) Chạy qua API Client trung tâm
src/lib/api/client.ts
       │  - Tự động lấy JWT token từ localStorage ('nexus_token')
       │  - Gắn Header: Authorization: Bearer <token>
       │  - Gửi HTTP Request: GET http://localhost:8000/api/users/profile
       │
       ▼ (5) Đến API Gateway Backend (:8000)
API Gateway giải mã token ra UserId → Gọi gRPC UserService (:8001) lấy dữ liệu profile
       │
       ▼ (6) Response JSON trả về:
       │  { "id": "u1", "email": "user@nexus.vn", "fullName": "Nguyễn Văn A", "role": "Buyer" }
       │
src/features/profile/components/ProfileCard.tsx  ← Render thông tin lên giao diện
```

---

### Luồng 2: User Xem Giỏ Hàng (Cart)

```
[Browser màn hình]
       │
       ▼ (1) Truy cập URL: /buyer/cart
src/app/(dashboard)/buyer/cart/page.tsx
       │
       ▼ (2) Render component hiển thị giỏ hàng
src/features/commerce/components/CartList.tsx
       │
       ▼ (3) Gọi Service lấy giỏ hàng
src/features/commerce/services/commerce.service.ts
       │  Hàm: commerceService.getCart()
       │
       ▼ (4) API Client trung tâm
src/lib/api/client.ts
       │  - Gắn Bearer Token
       │  - Gửi HTTP Request: GET http://localhost:8000/api/commerce/cart
       │
       ▼ (5) Đến API Gateway Backend (:8000)
API Gateway dịch route → Gọi gRPC sang CommerceService (:8003)
       │
       ▼ (6) Response JSON trả về:
       │  {
       │    "cartId": "cart_123",
       │    "items": [
       │      { "productId": "p1", "name": "Bàn Phím Cơ Nexus", "price": 1200000, "quantity": 1 }
       │    ],
       │    "totalAmount": 1200000
       │  }
       │
src/features/commerce/components/CartItemRow.tsx  ← Vẽ từng món hàng & nút Tăng/Giảm số lượng
```

---

### Luồng 3: User Xem Sản Phẩm (Catalog / Products)

```
[Khách vãng lai hoặc User]
       │
       ▼ (1) Truy cập URL công khai: /catalog hoặc /catalog/p100
src/app/(public)/catalog/page.tsx  hoặc  src/app/(public)/catalog/[id]/page.tsx
       │
       ▼ (2) Render danh sách hoặc chi tiết sản phẩm
src/features/catalog/components/ProductGrid.tsx / ProductDetail.tsx
       │
       ▼ (3) Gọi Service Catalog
src/features/catalog/services/catalog.service.ts
       │  Hàm: catalogService.getProducts({ page: 1, limit: 10 })
       │  Hàm: catalogService.getProductById('p100')
       │
       ▼ (4) API Client trung tâm
src/lib/api/client.ts
       │  - Request công khai (Không bắt buộc phải có Token)
       │  - Gửi HTTP Request: GET http://localhost:8000/api/catalog/products
       │
       ▼ (5) Đến API Gateway Backend (:8000)
API Gateway chuyển tiếp gRPC sang CatalogService (:8002)
       │
       ▼ (6) Response JSON trả về:
       │  {
       │    "items": [
       │      { "id": "p100", "name": "Màn Hình 4K", "price": 8500000, "stock": 25, "imageUrl": "..." }
       │    ],
       │    "total": 1
       │  }
       │
Hiển thị danh sách card sản phẩm với ảnh, giá, nút "Thêm vào giỏ"
```

---

### Luồng 4: User Thanh Toán (Checkout) & Cơ Chế Phản Hồi Từ Saga

Đây là luồng quan trọng nhất vì nó liên quan tới **Giao dịch phân tán (Saga)** giữa Commerce, Catalog, Wallet và Fulfillment:

```
[User bấm nút "Xác Nhận Đặt Hàng" trên giao diện]
       │
       ▼ (1) Trang Checkout
src/app/(dashboard)/buyer/checkout/page.tsx
       │
       ▼ (2) Tầng ghép nối (Nhạc trưởng)
src/widgets/checkout/CheckoutSection.tsx
       │  - Gom: CartItems (từ commerce) + Địa chỉ (từ fulfillment) + Phương thức thanh toán (Wallet)
       │
       ▼ (3) Gọi Service tạo đơn hàng
src/features/commerce/services/commerce.service.ts
       │  Hàm: commerceService.createOrder({ items: [...], shippingAddress: "...", paymentMethod: "WALLET" })
       │
       ▼ (4) API Client
src/lib/api/client.ts
       │  - Gửi HTTP POST: http://localhost:8000/api/commerce/orders
       │
       ▼ (5) Đến API Gateway Backend (:8000)
Gateway gọi gRPC sang CommerceService (:8003)
```

#### Phía Backend Xử Lý (Diễn ra ngầm qua RabbitMQ):
1. **CommerceService** tạo ngay bản ghi đơn hàng với trạng thái ban đầu: `PENDING` (Chờ xử lý).
2. **CommerceService** bắn sự kiện `OrderSubmittedEvent` lên RabbitMQ.
3. **CatalogService** nghe sự kiện $\rightarrow$ Giữ hàng trong kho ảo (`StockReserved`).
4. **WalletService** nghe sự kiện $\rightarrow$ Trừ tiền trong ví người mua (`PaymentCompleted`).
5. Nếu ví không đủ tiền $\rightarrow$ Bắn `PaymentFailed` $\rightarrow$ Đơn hàng đổi thành `CANCELLED` và Catalog nhả lại kho.

#### Frontend Nhận Response Gì Ngay Lập Tức?
Backend **không để Frontend phải đợi toàn bộ quy trình Saga** (vì có thể mất vài giây). Backend trả về ngay lập tức mã **HTTP 201 Created** hoặc **HTTP 202 Accepted**:
```json
{
  "orderId": "ord_8899",
  "status": "PENDING",
  "totalAmount": 1200000,
  "createdAt": "2026-10-20T15:30:00Z",
  "message": "Đơn hàng đã được tiếp nhận và đang xử lý thanh toán."
}
```

#### Frontend Xử Lý Tiếp Thế Nào Trên Màn Hình?
```
Frontend nhận response có orderId: "ord_8899"
       │
       ▼ Chuyển hướng người dùng sang trang theo dõi đơn:
URL: /buyer/orders/ord_8899
       │
       ▼ Gọi API kiểm tra trạng thái đơn: GET /api/commerce/orders/ord_8899
Khi Saga chạy xong (chỉ sau 1-2 giây):
       ├── Nếu thành công: Status chuyển thành "CONFIRMED" (hoặc "PAID")
       │   ==> Màn hình hiện thông báo xanh: "Thanh toán thành công! Đang đóng gói hàng."
       │
       └── Nếu thất bại (hết tiền/hết hàng): Status chuyển thành "CANCELLED"
           ==> Màn hình hiện thông báo đỏ: "Thanh toán thất bại: Số dư ví không đủ."
```

---

## 4. Kế Hoạch Triển Khai Thực Tế

### Bước 1: Setup Nền Tảng (Base Library)
- Cập nhật `nexus-fe/tsconfig.json` alias `@/*` trỏ vào `./src/*`.
- Tạo `src/constants/config.ts` (Khai báo `apiBaseUrl: 'http://localhost:8000'`).
- Tạo `src/constants/routes.ts` (Tập trung toàn bộ routes).
- Tạo `src/lib/api/client.ts` (Fetch wrapper gọn nhẹ giống `parking-system-web`: tự động gắn Bearer Token, bắt lỗi 401 tự logout).

### Bước 2: Setup Cấu Trúc Các Feature (7 Services + 1 Audit-Log)
Tạo đầy đủ cấu trúc rỗng cho từng feature:
- `auth/`, `profile/`, `catalog/`, `commerce/`, `wallet/`, `auction/`, `fulfillment/`, `notification/`, `audit-log/`.
- Mỗi feature có:
  - `services/[feature].service.ts` (Khai báo sẵn các hàm gọi API REST).
  - `types/index.ts` (Khai báo TypeScript interface cho dữ liệu truyền/nhận).
  - `index.ts` (Public export sạch sẽ).

### Bước 3: Setup Routing Phân Quyền App Router
- `src/app/(public)/` (Landing page & Catalog).
- `src/app/(auth)/` (Login & Register).
- `src/app/(dashboard)/buyer/` (Profile, Cart, Checkout, Orders, Wallet).
- `src/app/(dashboard)/seller/` (Products, Inventory).
- `src/app/(dashboard)/staff/` (Sellers Approval, All Orders, Fulfillment Operations).
- `src/app/(dashboard)/admin/` (User Management, Categories Config, Audit Log).

---

## 5. Kế Hoạch Xác Minh (Verification Plan)

1. **Kiểm tra biên dịch Type**:
   ```bash
   npx tsc --noEmit
   ```
   *Yêu cầu*: Hoàn toàn không có lỗi kiểu dữ liệu.
2. **Kiểm tra Lint**:
   ```bash
   npm run lint
   ```
   *Yêu cầu*: Code sạch sẽ, tuân thủ đúng quy chuẩn Next.js.
3. **Kiểm tra Build Production**:
   ```bash
   npm run build
   ```
   *Yêu cầu*: Next.js build thành công toàn bộ cây thư mục trang tĩnh và động.
