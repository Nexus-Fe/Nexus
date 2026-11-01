# API Gateway client

`client.ts` là browser HTTP client dùng chung cho màn hình và feature service. `use-api-resource.ts` quản lý tải dữ liệu phía client. Browser gửi request tới Route Handler cùng origin `/api/gateway/...`; handler chuyển tiếp `/api/v1/*` tới `API_GATEWAY_URL` phía server.

## Cấu hình và hành vi

- Đặt `API_GATEWAY_URL` trong `.env.local`; biến này không có tiền tố `NEXT_PUBLIC_` và không vào browser bundle.
- Client gửi `Accept`, `Content-Type` và Bearer token từ phiên trình duyệt; refresh token được xoay khi Gateway trả 401.
- `ApiError` giữ status, payload, error code, field errors và trace ID.
- Route Handler từ chối mọi phản hồi nếu Gateway không xác nhận `X-Gateway-Mode: Real` và `X-Gateway-Auth: Enforce`.
- Không có fixture hay fallback dữ liệu cục bộ khi Gateway hoặc service nghiệp vụ không khả dụng.

```ts
import { api, type ApiResponse } from "@/lib/api/client";

const result = await api.get<ApiResponse<ProductList>>(
  "/api/v1/products?page=1&pageSize=10",
);
```

Route Handler chỉ chuyển tiếp `/api/v1/*`; không đưa credentials upstream vào browser. API client chạy trong Client Components, còn Route Handler chỉ chuyển tiếp request sau khi màn đã tải phía client.
