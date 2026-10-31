# API Gateway client

`client.ts` là client HTTP dùng trong trình duyệt. Feature service gọi module này để có cùng URL gốc, header, cách parse response và xử lý lỗi. Không gọi `fetch` trực tiếp từ widget/page cho các API nghiệp vụ.

## Cấu hình và hành vi

- URL gốc đọc từ `NEXT_PUBLIC_API_URL`, mặc định `http://localhost:8080`; sao chép `.env.example` thành `.env.local` để cấu hình môi trường.
- Client tự gửi `Accept: application/json`, thêm `Content-Type` khi body là object và thêm `Authorization: Bearer ...` nếu `localStorage` có `nexus_token`.
- Đăng nhập/đăng ký lưu token trả về; lỗi HTTP được ném thành `ApiError` với `status`, `payload` và `traceId` nếu có.
- Với HTTP 401, client xóa token và chuyển về `/login` (không chuyển hướng lại khi đang ở `/login` hoặc `/register`).
- Client trả nguyên response body theo kiểu generic; nó không tự bóc `data` để tránh làm sai hợp đồng response của caller.

```ts
import { api, type ApiResponse } from "@/lib/api/client";

const result = await api.get<ApiResponse<ProductList>>(
  "/api/catalog/products?page=1&limit=10",
);
```

`NEXT_PUBLIC_API_URL` được đưa vào bundle trình duyệt, nên chỉ chứa địa chỉ gateway công khai. Gateway cần cho phép origin của frontend qua CORS. Module này phụ thuộc browser API và không dùng trực tiếp trong Server Component.
