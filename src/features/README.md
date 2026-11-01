# Features

Mỗi thư mục feature giữ interface nghiệp vụ công khai, types và service gọi API. Caller bên ngoài feature chỉ import từ `index.ts`; không import sâu vào implementation của feature khác. Khi một màn hình cần ghép nhiều feature, đặt phần ghép trong `widgets/`.

## Cấu trúc

```text
features/[feature]/
├── components/   # UI thuộc riêng feature
├── hooks/        # State và hành vi thuộc riêng feature
├── services/     # Request đi qua lib/api/client.ts
├── types/        # Kiểu dữ liệu công khai
└── index.ts      # Interface công khai của feature
```

Các màn hình trong route được nạp bằng Client Components. Request đi qua cùng-origin Gateway proxy; endpoint đã được đối chiếu với controller/DTO của Gateway.

## Feature và backend dự kiến

| Feature | Backend dự kiến theo kế hoạch |
| --- | --- |
| `auth`, `profile` | User Service (:8001) |
| `catalog` | Catalog Service (:8002) |
| `commerce` | Commerce Service (:8003) |
| `audit-log` | Log Service (:8004) |
| `auction` | Auction Service (:8005) |
| `fulfillment` | Fulfillment Service (:8006) |
| `notification` | Notification Service (:8007) |
| `wallet` | Wallet Service (:8008) |

Frontend chỉ gọi API Gateway; mapping từ gateway sang microservice là trách nhiệm backend. Browser không có chế độ mock hoặc auth bypass.
