# NEXUS Frontend

Frontend của sàn Nexus dùng Next.js App Router, React, TypeScript và Tailwind CSS. Mã nguồn được chia theo khu vực Buyer, Seller, Staff và Admin; mức độ hoàn thiện của từng luồng phụ thuộc vào API backend tương ứng.

## Chạy trên máy local

Yêu cầu Node.js tương thích với phiên bản Next.js trong `package.json`.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). Đặt `API_GATEWAY_URL` trong `.env.local` theo địa chỉ Gateway đang chạy; `.env.example` dùng `http://localhost:8080` làm ví dụ. Browser gọi `/api/gateway/...` cùng origin, rồi Next.js chuyển tiếp đến Gateway. Quyền truy cập API nghiệp vụ do Gateway và backend thực thi.

Các màn Staff/Admin có chế độ demo FE local riêng để xem luồng khi backend chưa sẵn sàng. Cách bật, phạm vi và giới hạn được ghi tại [hướng dẫn demo Staff/Admin](docs/staff-admin-local-demo.md).

## Cấu trúc dự án

```text
Nexus/
├── .github/workflows/          # CI và workflow triển khai
├── deploy/                     # Docker Compose cho VPS
├── design-plans/               # Kế hoạch thiết kế và triển khai
├── docs/                       # Hướng dẫn chạy demo và vận hành
├── DOCUMENTS/                  # Tài liệu kiến trúc dự án
├── public/                     # Tài nguyên tĩnh
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (public)/           # Trang chủ, catalog, đấu giá công khai
│   │   ├── (auth)/             # Đăng nhập và đăng ký
│   │   ├── (dashboard)/        # Route Buyer, Seller, Staff, Admin
│   │   └── api/gateway/        # Proxy cùng origin tới API Gateway
│   ├── components/
│   │   ├── auth/               # Phiên đăng nhập và kiểm tra role ở FE
│   │   ├── client/             # Nạp các màn hình client
│   │   ├── layout/             # Shell và bố cục dùng chung
│   │   └── ui/                 # UI primitives dùng chung
│   ├── constants/              # Route và điều hướng
│   ├── features/               # Các module nghiệp vụ
│   │   ├── admin/              # Quản trị
│   │   ├── auction/            # Đấu giá
│   │   ├── audit-log/          # Nhật ký kiểm toán
│   │   ├── auth/               # Xác thực
│   │   ├── catalog/            # Danh mục và sản phẩm
│   │   ├── commerce/           # Giỏ hàng, đơn hàng, thanh toán
│   │   ├── fulfillment/        # Kho vận và giao nhận
│   │   ├── notification/       # Thông báo
│   │   ├── profile/            # Hồ sơ người dùng
│   │   ├── seller/             # Kênh người bán
│   │   ├── staff/              # Nghiệp vụ nhân viên
│   │   └── wallet/             # Ví và giao dịch
│   ├── lib/
│   │   ├── api/                # HTTP client và Gateway proxy helpers
│   │   └── demo/               # Cấu hình và dữ liệu demo local
│   ├── styles/                 # CSS toàn ứng dụng
│   └── widgets/                # UI phối hợp nhiều feature
├── .env.example                # Biến môi trường mẫu
├── next.config.ts              # Cấu hình Next.js
├── package.json                # Scripts và dependencies
└── package-lock.json           # Khóa phiên bản dependencies
```

Quy ước ranh giới module: [features](src/features/README.md), [routes](src/app/README.md), [widgets](src/widgets/README.md), [components](src/components/README.md) và [API client](src/lib/api/README.md).

## Kiểm tra

```powershell
npm run lint
npm run typecheck
npm run build
```

`build` dùng Webpack; `dev` dùng cấu hình Turbopack. CI chạy các bước kiểm tra trước khi publish image. Xem [CI và triển khai VPS](docs/frontend-ci-deploy.md) để biết workflow, cấu hình và giới hạn triển khai.

## Tài liệu kiến trúc

- [Kế hoạch codebase](DOCUMENTS/nexus-fe-codebase-plan.md)
- [Kế hoạch frontend rút gọn](DOCUMENTS/nexus_fe_simplified_plan.md)
- [Chiến lược tài liệu](DOCUMENTS/nexus_fe_readme_strategy_plan.md)

Hướng dẫn riêng của từng feature nên đặt cạnh feature hoặc trong `docs/`; README gốc chỉ giữ thông tin chạy dự án và liên kết để các nhánh ít phải sửa cùng một đoạn.
