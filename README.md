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

## Cấu trúc

```text
src/
├── app/          # Route groups và trang định tuyến
├── components/   # UI và layout dùng chung
├── features/     # Auth, catalog, commerce, seller, staff, admin, auction, wallet...
├── widgets/      # UI phối hợp nhiều feature
├── lib/api/      # API client và Gateway proxy cùng origin
└── constants/    # Route và điều hướng
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
