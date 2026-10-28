# CSR screens: real backend contract audit

Audited 2026-10-28 against the current Nexus frontend and the adjacent `fsa-nexus-be` source. This is a status record, not a replacement for the approved 22-screen scope.

## Routing model

The Gateway's `HttpBackendCaller` combines each service's configured base address with the controller's downstream path. The current base addresses are plain `http://localhost:8001` through `:8009`; they do not add a path prefix. In `Real` mode, the Gateway therefore requires each downstream service to expose the exact REST path it forwards.

## Findings

| Screens / feature | Frontend-to-Gateway calls | Current downstream evidence | Result |
| --- | --- | --- | --- |
| Login, registration, OTP | `/api/v1/auth/login`, `/register`, `/otp/verify`, `/otp/resend` | `User.Api` exposes matching REST actions. | Routes align; runtime still depends on database and SMTP configuration. |
| Session refresh | `/api/v1/auth/refresh` | Gateway forwards `/api/v1/auth/refresh`; `User.Api` exposes `/api/v1/auth/refresh-token`. | Path mismatch; refresh cannot work in `Real` mode. |
| Current user | `/api/v1/me` | `User.Api` exposes `/api/v1/me`. | Route aligns. |
| Catalog, product detail, seller products, categories | Gateway exposes `/api/v1/products`, `/api/v1/product/...`, `/api/v1/categories`, and `/api/v1/product/search`, then forwards those paths to Catalog. | `Catalog.Api` declares `/api/v1/catalog/products`, `/api/v1/catalog/categories`, and `/api/v1/catalog/inventory/{productId}/adjust`. | Path mismatch; reads and product writes cannot work through the current Gateway mapping. |
| Inventory | `/api/v1/inventory/stock-in` | Catalog REST exposes `/api/v1/catalog/inventory/{productId}/adjust`; no matching batch stock-in route was found. | Path and request contract mismatch. |
| Cart, checkout, orders | `/api/v1/cart*`, `/api/v1/checkout/quote`, `/api/v1/orders`, `/api/v1/order/{id}` | `Commerce.Api` currently maps `/health`; no business HTTP controller or gRPC service registration was found. | No matching downstream business API. |
| Auctions | `/api/v1/auctions*`, `/api/v1/seller/auctions` | `Auction.Api` currently maps `/health`; no business HTTP controller or gRPC service registration was found. | No matching downstream business API. |
| Shipments | `/api/v1/seller/shipment*`, `/api/v1/shipments*` | `Fulfillment.Api` currently maps `/health`; no business HTTP controller or gRPC service registration was found. | No matching downstream business API. |
| Wallet | `/api/v1/wallets*` | `Wallet.Api` exposes `/health`, `/`, and `WalletGrpcService`; data operations are gRPC. | No matching downstream HTTP API. The wallet overview remains read-only. The Auction payment page now sends the documented `/api/v1/wallets/checkout/direct` request only after the buyer selects payment; it will show the real Gateway error until a REST adapter exists. |
| Staff seller registrations and reports | `/api/v1/admin/seller-registrations*`, `/api/v1/admin/reports*` | Gateway controllers exist and forward to `User.Api`; its current REST controllers expose auth and current-user profile only. | No matching downstream HTTP API. |
| Admin users and roles | `/api/v1/admin/users*`, `/api/v1/admin/roles`, `/permissions` | Gateway controllers exist and forward to `User.Api`; no admin REST controllers were found there. | No matching downstream HTTP API. |

## Frontend contract corrections

- Seller shipment pagination now sends `pageSize`, matching the Gateway's `PaginationRequest` contract.
- Login now consumes the Gateway token payload, stores the real tokens, then loads the authenticated profile from `/api/v1/me`; it clears the stored tokens if profile loading fails. The previous code expected a nested `data.user`, while UserService returns `userId` and `roles` and the profile is a separate API call.
- Staff report resolution is read-only in the frontend. The backend has no report REST endpoint and does not define allowed resolution action codes; the prior hardcoded `TAKE_DOWN` request was removed.
- Staff report DTO metadata uses `ResolutionNote`, not `Note`; any future action form must use the verified backend action contract before it is re-enabled.

## Runtime readiness

- Docker is available with elevated local access. The Gateway container is currently running on port `8080`; RabbitMQ, Redis, and Tempo are also running. `GET /health/ready` returned `200`. A read-only Catalog request returned `504` with `X-Gateway-Mode: Real` and `X-Gateway-Auth: Enforce`, so the Gateway is not falling back to mock data. No User, Catalog, Commerce, Auction, Fulfillment, Wallet, or Notification service container is running.
- The user confirms an authoritative shared local `.env`/secret file exists. The searched `A_CONFIDENTIAL` and `A_BACKUP_MD` locations did not identify its path; the only actual service-local files found in the backend tree are `ApiGateway/.env` and `UserService/.env`. Other services only have `.env.example` templates, so their runtime readiness remains unverified.
- `UserService` startup runs `Database.Migrate()` against its configured PostgreSQL database. It was not started because doing so writes schema to the configured database. Catalog and the other services have no actual `.env` file in the searched backend tree.
- The backend repository's root compose file points at service source paths without Dockerfiles. Each service has its own manifest, but required settings are still absent.
- The frontend BFF rejects responses unless the Gateway identifies itself as `Real` with enforced auth. No mock or local success path is configured. A read-only request through the running Next BFF to Catalog returned `504` with `X-Gateway-Mode: Real` and `X-Gateway-Auth: Enforce`, matching the direct Gateway result.
- A read-only `GET /` to the rebuilt frontend returned `200`; the initial HTML did not contain the home screen's business heading, while the App Router client bootstrap was present. The production build listed all 22 target screen routes and the same-origin BFF route.
- User approved frontend-only source changes and asked to hold UserService startup because its startup path runs `Database.Migrate()` against the configured PostgreSQL database. No backend service source was changed and UserService was not started.
- The home screen now follows the Stitch section hierarchy for auctions, live listings, and categories. All three sections use Gateway reads and show loading, empty, or error state from the real response; category links and the storefront search preserve their filters in the catalog URL. Auction status and product status no longer default to a fabricated active state.

## Required backend work before live acceptance

1. Resolve the `Catalog.Api` route-prefix and inventory contract mismatches with the Gateway.
2. Add and expose the REST contracts required by Commerce, Auction, Fulfillment, Wallet, staff, and admin screens, or provide an approved Gateway REST adapter to their real gRPC services.
3. Align refresh-token routing between Gateway and `User.Api`.
4. Supply the authoritative real runtime configuration, start the services, and verify each operation against persisted backend data.

Until these items are complete, `npm run build` proves only that the CSR frontend compiles and routes exist; it does not prove that those workflows operate against backend data.
