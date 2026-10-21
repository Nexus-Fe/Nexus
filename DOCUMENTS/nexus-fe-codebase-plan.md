# Kế Hoạch Thiết Kế Codebase — `nexus-fe`

> Phiên bản: 1.0 · Cập nhật: 2026-10-20  
> Dựa trên: **Nexus-BE** (8 microservices · API Gateway :8000) + tham khảo `parking-system-web`

---

## 1. Bối Cảnh & Ràng Buộc

### Backend Microservices (Nexus-BE)

| Service | Port | Domain |
|---|---|---|
| **ApiGateway** | 8000 | Điểm vào duy nhất, JWT/RBAC, Rate Limiting |
| **UserService** | 8001 | Auth, Profile, RBAC, Seller approval |
| **CatalogService** | 8002 | Danh mục, sản phẩm, inventory ảo |
| **CommerceService** | 8003 | Giỏ hàng, đơn hàng, Checkout Saga |
| **LogService** | 8004 | Centralized audit log |
| **AuctionService** | 8005 | Phiên đấu giá, bid, countdown |
| **FulfillmentService** | 8006 | Kho vật lý, vận chuyển, tracking |
| **NotificationService** | 8007 | Push/Email notification settings |
| **WalletService** | 8008 | Ví điện tử, nạp/rút/chuyển tiền |

**Kiến trúc quan trọng:** FE chỉ nói chuyện với 1 điểm duy nhất là `http://localhost:8000` (API Gateway). Gateway tự route đến service phù hợp.

---

## 2. Cấu Trúc Thư Mục Đề Xuất

```
nexus-fe/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (public)/                 # Layout không cần auth
│   │   │   └── page.tsx              # Landing / Homepage
│   │   ├── (auth)/                   # Layout auth pages
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/              # Layout cần auth – sidebar + header
│   │   │   ├── layout.tsx            # Protected layout + role guard
│   │   │   ├── dashboard/page.tsx    # Tổng quan (role-aware)
│   │   │   ├── catalog/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── commerce/
│   │   │   │   ├── cart/page.tsx
│   │   │   │   └── orders/
│   │   │   │       ├── page.tsx
│   │   │   │       └── [id]/page.tsx
│   │   │   ├── auction/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── fulfillment/
│   │   │   │   └── tracking/page.tsx
│   │   │   ├── wallet/
│   │   │   │   └── page.tsx
│   │   │   ├── notifications/
│   │   │   │   └── page.tsx
│   │   │   └── profile/
│   │   │       └── page.tsx
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   ├── layout.tsx                # Root layout (fonts, providers)
│   │   └── globals.css
│   │
│   ├── features/                     # ⭐ Feature-Based Architecture
│   │   ├── auth/                     # ← UserService (:8001)
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   ├── catalog/                  # ← CatalogService (:8002)
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   ├── commerce/                 # ← CommerceService (:8003)
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   ├── auction/                  # ← AuctionService (:8005)
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   ├── fulfillment/              # ← FulfillmentService (:8006)
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   ├── notification/             # ← NotificationService (:8007)
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   ├── wallet/                   # ← WalletService (:8008)
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   └── dashboard/               # Role-aware dashboard widgets
│   │       ├── components/
│   │       ├── hooks/
│   │       └── index.ts
│   │
│   ├── components/                   # Shared UI Components
│   │   ├── ui/                       # Primitives: Button, Input, Modal, Badge...
│   │   ├── layout/                   # Sidebar, Header, Footer, PageShell
│   │   └── shared/                   # DataTable, EmptyState, LoadingSkeleton...
│   │
│   ├── lib/                          # Infrastructure layer
│   │   ├── api/
│   │   │   ├── client.ts             # Base fetch wrapper (port từ parking-system-web)
│   │   │   └── endpoints.ts          # Tập trung tất cả API path strings
│   │   ├── auth/
│   │   │   ├── session.ts            # getToken / setToken / clearToken
│   │   │   └── guards.ts             # withAuth HOC / middleware helpers
│   │   ├── query/
│   │   │   └── provider.tsx          # TanStack Query Provider + config
│   │   └── utils/
│   │       ├── cn.ts                 # className utility (clsx + tailwind-merge)
│   │       ├── format.ts             # Formatters: currency, date, number
│   │       └── error.ts              # Error parsing utilities
│   │
│   ├── hooks/                        # Global custom hooks
│   │   ├── useAuth.ts                # Auth state (token, user, role)
│   │   ├── useToast.ts               # Toast notifications
│   │   └── useDebounce.ts
│   │
│   ├── stores/                       # Zustand global state
│   │   ├── auth.store.ts             # User session, role
│   │   ├── cart.store.ts             # Shopping cart (optimistic)
│   │   └── notification.store.ts     # Realtime notification count
│   │
│   ├── types/                        # Global TypeScript types
│   │   ├── api.types.ts              # ApiResponse<T>, PaginatedResponse<T>
│   │   ├── auth.types.ts             # User, Role, JwtPayload
│   │   └── common.types.ts           # ID, Timestamp, etc.
│   │
│   └── constants/
│       ├── config.ts                 # APP_CONFIG: apiBaseUrl, timeouts
│       ├── routes.ts                 # Route constants
│       └── roles.ts                  # RBAC role definitions
│
├── public/
├── .env.local                        # NEXT_PUBLIC_API_URL=http://localhost:8000
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 3. Nguyên Tắc Kiến Trúc Cốt Lõi

### 3.1 Feature = 1 Microservice Domain

Mỗi folder trong `src/features/` ánh xạ **1:1** với một backend service. Điều này giúp:
- Khi BE thay đổi contract → biết ngay chỉnh sửa feature nào
- Isolate API calls theo domain, không cross-feature service calls

```
features/wallet/
  └── services/wallet.service.ts   # Chỉ gọi /api/wallet/* endpoints
```

### 3.2 Barrel Export (Public API Pattern)

Học từ `parking-system-web`. Mọi feature phải có `index.ts`:

```typescript
// features/auction/index.ts
export { AuctionList } from './components/AuctionList';
export { AuctionDetail } from './components/AuctionDetail';
export { useBidding } from './hooks/useBidding';
export type { Auction, BidRequest } from './types';

// ✅ Import từ ngoài:
import { AuctionList } from '@/features/auction';

// ❌ KHÔNG import sâu:
import { AuctionList } from '@/features/auction/components/AuctionList';
```

### 3.3 API Client Strategy — Chỉ 1 Gateway

```typescript
// constants/config.ts
export const APP_CONFIG = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000',
  requestTimeout: 10_000,
};
```

> **Không bao giờ** hardcode port của individual service trong FE. FE chỉ biết `:8000`.

### 3.4 API Endpoints Tập Trung

```typescript
// lib/api/endpoints.ts
export const ENDPOINTS = {
  // Auth (→ UserService)
  auth: {
    login: '/api/users/auth/login',
    register: '/api/users/auth/register',
    me: '/api/users/auth/me',
  },
  // Catalog (→ CatalogService)
  catalog: {
    products: '/api/catalog/products',
    product: (id: string) => `/api/catalog/products/${id}`,
    categories: '/api/catalog/categories',
  },
  // Commerce (→ CommerceService)
  commerce: {
    cart: '/api/commerce/cart',
    orders: '/api/commerce/orders',
    checkout: '/api/commerce/checkout',
  },
  // Auction (→ AuctionService)
  auction: {
    sessions: '/api/auction/sessions',
    bid: (sessionId: string) => `/api/auction/sessions/${sessionId}/bid`,
  },
  // Wallet (→ WalletService)
  wallet: {
    balance: '/api/wallet/balance',
    topup: '/api/wallet/topup',
    withdraw: '/api/wallet/withdraw',
    transactions: '/api/wallet/transactions',
  },
  // Fulfillment (→ FulfillmentService)
  fulfillment: {
    shipments: '/api/fulfillment/shipments',
    track: (id: string) => `/api/fulfillment/shipments/${id}/track`,
  },
  // Notification (→ NotificationService)
  notification: {
    list: '/api/notifications',
    settings: '/api/notifications/settings',
    markRead: (id: string) => `/api/notifications/${id}/read`,
  },
} as const;
```

### 3.5 TanStack Query cho Server State

```typescript
// features/catalog/hooks/useProducts.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';

export function useProducts(params?: ProductQueryParams) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => api.get<PaginatedResponse<Product>>(ENDPOINTS.catalog.products),
    staleTime: 5 * 60 * 1000, // 5 phút
  });
}
```

### 3.6 Zustand cho Client State

Chỉ dùng Zustand cho state client-side thực sự (cart optimistic, session user, notification count). Không dùng Zustand thay thế server state.

---

## 4. Phân Tích Từ parking-system-web — Giữ Lại Gì

| Pattern | Đánh giá | Quyết định nexus-fe |
|---|---|---|
| Feature-Based Architecture | ✅ Rất tốt | **Giữ nguyên** |
| `index.ts` barrel exports | ✅ Rất tốt | **Giữ nguyên** |
| `src/lib/api/client.ts` (fetch wrapper) | ✅ Tốt | **Port lại, thêm refresh token** |
| `src/constants/config.ts` | ✅ Tốt | **Giữ nguyên pattern** |
| `src/constants/routes.ts` | ✅ Tốt | **Giữ nguyên** |
| localStorage lưu token trực tiếp | ⚠️ Chấp nhận được | **Giữ tạm, roadmap: httpOnly cookie** |
| Thiếu TanStack Query | ❌ Thiếu | **Thêm vào ngay từ đầu** |
| Thiếu global state (Zustand) | ❌ Thiếu | **Thêm Zustand** |
| Thiếu `endpoints.ts` tập trung | ❌ Endpoints rải rác | **Tập trung vào `lib/api/endpoints.ts`** |

---

## 5. Dependencies Cần Cài

```bash
# Server state management
npm install @tanstack/react-query @tanstack/react-query-devtools

# Client state
npm install zustand

# Form management
npm install react-hook-form zod @hookform/resolvers

# UI utilities
npm install clsx tailwind-merge

# Date formatting
npm install date-fns

# Icons
npm install lucide-react

# (Optional) Realtime - nếu Auction cần WebSocket
npm install @stomp/stompjs sockjs-client
```

---

## 6. Routing & RBAC Strategy

### Route Groups (Next.js App Router)

```
app/
├── (public)/         # Không cần auth: landing, product listing
├── (auth)/           # Redirect nếu đã login: /login, /register  
└── (dashboard)/      # Protected: redirect /login nếu chưa auth
    └── layout.tsx    # Server Component check session
```

### Role-Based Rendering

```typescript
// constants/roles.ts
export const ROLES = {
  ADMIN: 'admin',
  SELLER: 'seller',
  BUYER: 'buyer',
} as const;

// Dashboard layout render menu theo role từ JWT claims
```

---

## 7. Thứ Tự Triển Khai (Roadmap)

### Phase 1 — Foundation (Tuần 1)
- [ ] Thiết lập cấu trúc thư mục theo spec trên
- [ ] Cài dependencies (TanStack Query, Zustand, zod, etc.)
- [ ] Tạo `lib/api/client.ts` (port từ parking-system-web + cải tiến)
- [ ] Tạo `lib/api/endpoints.ts`
- [ ] Tạo `constants/config.ts`, `constants/routes.ts`, `constants/roles.ts`
- [ ] Setup TanStack Query Provider trong root layout
- [ ] Setup `globals.css` và design tokens (màu sắc, font)

### Phase 2 — Auth Feature (Tuần 1-2)
- [ ] `features/auth/` — Login, Register, JWT decode, session management
- [ ] `stores/auth.store.ts` — Zustand auth store
- [ ] Route protection middleware (`middleware.ts`)
- [ ] App Router route groups `(auth)`, `(dashboard)`

### Phase 3 — Core Features (Tuần 2-4)
- [ ] `features/catalog/` — Product listing, search, detail
- [ ] `features/commerce/` — Cart, Checkout, Orders
- [ ] `features/wallet/` — Balance, Top-up, Transactions
- [ ] `features/auction/` — Listing, detail, bidding (+ WebSocket nếu cần)

### Phase 4 — Supporting Features (Tuần 4-5)
- [ ] `features/fulfillment/` — Order tracking
- [ ] `features/notification/` — Notification center
- [ ] `features/dashboard/` — Role-aware overview widgets

---

## 8. Skills Gợi Ý Áp Dụng

| Giai đoạn | Skill | Mục đích |
|---|---|---|
| Lập kế hoạch ban đầu | `codebase-design` | Thiết kế module interface, naming convention |
| Feature phức tạp (Auction) | `domain-modeling` | Mô hình hóa domain Auction (Entity, Aggregate) |
| Review trước khi commit | `code-review` | Phát hiện code smells, vi phạm SOLID |
| Tối ưu Next.js | `nextjs-app-router-patterns` | Server vs Client Component, streaming |
| React performance | `vercel-react-best-practices` | useMemo, Suspense, parallel data fetching |

> **Tip:** Sau Phase 2, chạy `code-review` skill để đảm bảo auth implementation không có lỗ hổng bảo mật.

---

## 9. Quy Ước Bắt Buộc

1. **Chỉ 1 điểm API:** `NEXT_PUBLIC_API_URL=http://localhost:8000`
2. **Feature = Domain:** Không tạo feature cross-domain (ví dụ: feature "checkout" không lấy data từ `features/catalog/services/`)
3. **Barrel export qua `index.ts`:** Không import sâu vào `components/` hay `hooks/` của feature khác
4. **Types chia hai tầng:**
   - `src/types/` → Global types (ApiResponse, User, Role)
   - `src/features/[x]/types/` → Domain-specific types
5. **Server vs Client Component:** Mặc định là Server Component; chỉ thêm `'use client'` khi cần interactivity hoặc browser API
6. **Environment Variables:** `NEXT_PUBLIC_*` chỉ cho giá trị an toàn đưa ra client
