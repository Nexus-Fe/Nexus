# Nexus role UI gaps and implementation plan

Written against: `022afd43499ac30117ee9bd50dd4d1c711dda3af` (working tree contains uncommitted UI changes)

## Evidence chain

- Surface: Nexus App Router screens for Buyer, Seller, Staff, Admin, and shared authentication; current route inventory under `src/app/` and role navigation under `src/constants/`.
- Problem: current application routes cover the core catalog, purchase, auction, seller product/order, staff review, and admin user/RBAC flows, but do not cover several flows in `all_the_screen_for_all_roles.md`. Some screens exist in Stitch without a Nexus route; some required states and actions are not proven by a route alone.
- Design evidence: `all_the_screen_for_all_roles.md` (flows F1–F16); `FRONTEND_GATEWAY_MOCK_GUIDE.md`; `FRONTEND_ENUM_SPECIFICATION.md`; `flow_mock_excel.xlsx` (API rows and Response Standards); `DOCUMENTS/report26102026/{trien-khai-UI-26102026.md,nexus-implemented-pages-api26102026.md,nexus-frontend-comparison-report-2026-10-28.md,stitch-screen-gap-audit-2026-10-26.md,nexus-csr-implementation-plan.md}`; Stitch project `6106604581197312568` (MCP project title `NEXUS ALL ROLE PAGES`).
- Owner: route owners are `src/app/`; screen owners are `src/features/{auth,catalog,commerce,auction,wallet,seller,staff,admin}/`; shell/navigation owners are `src/components/layout/` and `src/constants/navigation.ts`; API transport is `src/lib/api/`.
- Scope and affected surfaces: gap inventory and implementation plan for all role screens; this plan does not change product source or the Stitch project.
- Uncertainty: Stitch MCP confirms screen records and titles, not visual/content correctness. Current backend audit says most downstream operations are unavailable in Real mode. The enum specification provided is a summary pointing to a separate canonical catalog; use the canonical 78-enum catalog before implementing enum mappings. Endpoint rows in the workbook are planned contracts and must not be treated as proof that a Gateway or downstream endpoint is live.

## Design decision

Keep the existing Nexus route and feature structure, add only screens and states needed to cover the specified flows, and reuse current Stitch frames before requesting new designs. Treat absence of a route as an implementation gap even when a matching Stitch frame exists. Treat a route as only a screen shell until its required states, data, permissions, and actions are confirmed. Keep backend availability and mock-mode configuration as explicit release gates; do not imply payment, refund, moderation, or financial success from illustrative data.

## Reuse

- Reuse role layouts in `src/components/layout/Shells.tsx`, role menus in `src/constants/navigation.ts`, and route builders in `src/constants/routes.ts`.
- Reuse feature screen ownership under `src/features/`; compose shared checkout/payment or order detail UI in `src/widgets/` only where the same flow is genuinely shared.
- Reuse `src/lib/api/client.ts` and `src/lib/api/use-api-resource.ts` for Gateway calls and visible loading/empty/error states.
- Reuse the current Stitch project and its matching screen records listed below; record a canonical screen ID per implemented route before building. Do not count duplicate frames as extra functionality.
- Reuse an enum mapping module owned by the relevant feature or a shared presentation adapter only after checking the canonical enum catalog; preserve PascalCase API values and translate labels at the display boundary.

## Missing UI inventory

Status means `Nexus` route/screen coverage. “Stitch present” means a matching titled screen record was found through the connected MCP project; it does not certify the contents of that screen.

| Role / flow | Missing or partial UI in Nexus | Stitch evidence | Status / note |
| --- | --- | --- | --- |
| Shared account (F5) | OTP verification; forgot password; OTP-based reset; change password; logout confirmation/result; session/device management; temporary lockout and unverified/banned account states; profile route if the shared profile frame is in scope | Shared OTP, forgot/reset password, change password and account/profile frames are present | Missing routes/states; login/register routes exist. Resolve profile route ownership across roles before adding it. |
| Buyer purchase (F1, F7) | Dedicated bank transfer/QR payment state; payment pending/success/failure/expiry variants; refund status; review product and seller after delivery; optional receipt/invoice only if confirmed by product requirements | QR transfer, payment result, processing/success/failure modal, order detail and address frames exist | Checkout and order routes exist; payment route/state, refunds and verified review submission UI are incomplete. Invoice is explicitly unresolved in the prior plan; do not add as required scope without confirmation. |
| Buyer auctions (F2) | Explicit post-auction won/lost/outbid outcomes and deadline/expired outcome details; show the specified 24-hour winner payment rule and consequences | Public auction listing, live room, My Auctions, auction result and payment screens exist | Auction routes exist; verify each outcome and deadline state rather than adding duplicate pages. Public list/room/result/payment were added after the 26 Oct audit. |
| Buyer wallet/support (F8, F10, F14–F16) | Separate top-up flow/result and max-per-transaction state; buyer cannot withdraw; trust score/history distinct from reviews; complaint/dispute submission with evidence; product report; transaction discrepancy report | Buyer wallet/top-up frame exists; no confirmed buyer complaint/report frames in the current screen inventory | Wallet route exists, but verify deposit states. Complaint/report and trust history are missing. |
| Seller orders/shipping (F1, F3, F11) | Order detail with accept/refuse, 24-hour deadline, refusal refund state; create GHN shipment and tracking detail; delivery failure/return only after SRS resolution; completed-order review | Seller order management and GHN create/tracking frames exist | `/seller/orders` exists but current screen is a shipment list, not the specified order decision workflow. Add shipment/detail routes and reconcile the screen with the order task. |
| Seller shop and revenue (F3, F8, F10) | Shop onboarding/status if still in scope; seller wallet/revenue history and withdrawal request/detail/result; seller review of buyer; coupon management; sales/revenue reports; complaint/discrepancy submission | Seller shop registration, revenue wallet/withdrawal, and shop/order screens are present in Stitch | No corresponding Nexus routes for seller wallet, withdrawal, or onboarding; coupons, reports, reviews, and support are not evidenced in the current Stitch title list. Current product/create, inventory and auction routes exist. |
| Staff operations (F6, F13–F16) | Product moderation queue/detail/reason/outcome; transaction discrepancy queue, read-only evidence, separate audited adjustment and result; withdrawal approval/transfer evidence and result; dispute escalation decision/result states | Staff seller review, report handling, auction operations, and shared withdrawal approval frames exist | Seller/report/auction routes exist; withdrawal route absent. Product moderation and discrepancy handling are missing in both route inventory and the prior Stitch audit. Keep refund, account ban, Event Log and System Health conditional on the approved responsibility matrix. |
| Admin overview and governance (F6, F9, F12–F13) | Admin dashboard; category management; general system configuration; platform coupon management; transaction ledger and period reconciliation; Admin audit log; Event Log/System Health; complete withdrawal fallback UI | Admin auction operations/configuration, user management, RBAC, ledger/reconciliation, and shared withdrawal frames exist | Admin users, roles, auction monitoring and auction config routes exist. Overview, categories, general config, coupons, ledger, audit log, event log and health have no current route. Ledger and withdrawal designs should be reused and verified before creating anything new. |

### Current routes that should not be counted as missing screens

- Buyer catalog/home, cart, checkout, orders, order detail, wallet, public auction list/room, My Auctions, auction result and auction payment routes exist.
- Seller products, product creation, inventory, order list, auction list/create/detail/edit/recreate/result routes exist.
- Staff seller queue/detail, reports and auction list/detail routes exist.
- Admin user list, roles/RBAC, auction list/detail and auction configuration routes exist.
- The Stitch project contains several duplicate-purpose frames. Reconcile these to one canonical frame per route/state before adding design work.

## Changes

1. `src/constants/routes.ts`, `src/constants/navigation.ts`, `src/app/`
   - Change: add shared account routes and the missing role routes from the inventory, grouped by feature and deep-linked by stable IDs. Route proposals: `/account/otp`, `/account/forgot-password`, `/account/reset-password`, `/account/change-password`, `/account/sessions`; `/buyer/payment/[orderId]`, `/buyer/complaints`, `/buyer/reports/products`, `/buyer/reports/transactions`, `/buyer/reviews`; `/seller/shop`, `/seller/orders/[id]`, `/seller/shipments`, `/seller/shipments/[id]`, `/seller/wallet`, `/seller/withdrawals`, `/seller/coupons`, `/seller/reports`, `/seller/reviews`; `/staff/withdrawals`, `/staff/product-moderation`, `/staff/transactions/discrepancies`; `/admin/overview`, `/admin/categories`, `/admin/configs`, `/admin/coupons`, `/admin/ledger`, `/admin/audit-log`, `/admin/system-health`. `/buyer/auctions/[id]/result` already exists and needs state coverage verification, not a new route.
   - Preserve: current route conventions and existing menu labels; do not create role switching or public Staff/Admin registration.
   - Verify: each flow opens directly and from its owning role menu; every detail route consumes its real ID; no duplicate route competes with an existing page.

2. `src/features/auth/`, `src/components/auth/`, `src/components/layout/`
   - Change: complete the shared account screens and visible session states; connect logout to session revocation and clear local tokens on success; show OTP purpose (registration vs password reset), resend cooldown, expired/invalid/max-attempt responses, and the documented 30-minute temporary lockout state.
   - Preserve: Gateway as the authority for auth and role access; client role gates are presentation, not authorization.
   - Verify: map each action to the workbook contract; errors use the standard error envelope; direct access and refresh behavior are explicit; no screen claims a session is revoked before Gateway success.

3. `src/features/commerce/`, `src/features/wallet/`, `src/widgets/payment/`, `src/features/auction/`
   - Change: finish buyer QR payment, payment outcome, refund, top-up, review, and auction outcome states; separate ordinary purchase payment from auction winner payment; show 24-hour auction payment deadline and only contract-backed consequences. Ensure buyer wallet presents top-up while hiding withdrawal actions.
   - Preserve: existing cart, checkout, order detail, wallet and auction route owners; no invoice fields or legal document downloads without an approved requirement.
   - Verify: each visible amount and deadline has a response field or approved rule; pending/success/failure/expired states are distinct; successful payment/refund is rendered only from Gateway response.

4. `src/features/seller/`, `src/widgets/`
   - Change: split order processing from shipment tracking; add order detail accept/refuse, GHN create/tracking, seller revenue wallet and withdrawal requests, and approved shop/coupon/report/review/support screens. Show order deadline and return/refund states only where approved by the SRS.
   - Preserve: current product, inventory and auction screens and their feature owners; reuse the Stitch Seller frames instead of duplicating them.
   - Verify: order, shipment and withdrawal IDs flow from list to detail; seller sees only their own records; refusal/transfer/refund result is response-backed; any unresolved return policy remains a product decision gate.

5. `src/features/staff/`, `src/features/admin/`
   - Change: add Staff product moderation, discrepancy handling, withdrawal approval, and explicit dispute outcome states; add Admin overview, categories, general configs, coupons, ledger/reconciliation, audit log, and system health. Keep Staff investigation read-only until the separate adjustment operation is approved and available.
   - Preserve: existing seller review, reports, auction operations, admin users/RBAC, auction configuration, and the existing Stitch ledger/withdrawal/auction frames.
   - Verify: role-specific permissions, immutable ledger presentation, reason and confirmation requirements, audit trail, and separate totals by period; do not give Admin/Staff actions to Buyer or Seller through shared components.

6. `src/features/*/types/`, `src/lib/api/`, `src/lib/presentation.ts`
   - Change: apply the canonical PascalCase enums using typed API values and per-domain display labels; standardize success, paged success, 204 and ProblemDetails handling using the workbook Response Standards; keep pagination mapping consistent.
   - Preserve: API enum wire values exactly; do not invent status strings or infer a success state from missing data.
   - Verify: each status displayed in the UI maps to an enum in the canonical enum catalog; error states expose user-meaningful copy while retaining trace ID for support; read-only and write endpoints match the current Gateway contract.

7. Environment/runtime configuration and feature owners
   - Change: document one controlled local UI mode using the Gateway Mock fixtures and Bypass only in Development, and one Real/Enforce integration mode. Align the Next BFF, Gateway and runtime indicators; prevent browser headers or client configuration from enabling Bypass in production.
   - Preserve: current CSR/BFF boundary and the backend audit requirement that non-available operations fail visibly in Real mode; fixtures are for layout/state validation and never evidence persisted transactions.
   - Verify: mode is reported by the server-side Gateway response, only development configuration can use Bypass, Real mode does not silently fall back to Mock, and no transaction success is fabricated.

## Scope

- Inherit: all role routes and the shared auth flow described above.
- Verify: `/buyer/checkout`, `/buyer/orders/[id]`, `/buyer/wallet`, auction result/payment; `/seller/orders`, `/seller/inventory`, seller auction routes; `/staff/reports`, seller approval and auction operations; `/admin/users`, roles, auction operations/configs. These routes exist but need outcome, permission, response and Stitch alignment checks.
- Exclude: redesigning the Nexus identity; rewriting existing implemented route screens without a documented gap; adding unspecified invoice/tax policy, return policy, coupon rules or new role permissions; changing backend services; changing or deleting Stitch screens during this frontend implementation.

## Validation

- Product: walk F1–F16 by role from the start point to the terminal state, including direct detail URLs, rejected/expired outcomes, and permission-denied cases.
- Interface: compare each route to its canonical Stitch frame at desktop 1440×900 and responsive widths 768px/390px; cover loading, empty, error, no-permission, validation, confirmation, success and failure states where applicable. Check long product names, large amounts, empty ledgers and paginated results.
- System: confirm routes live under the existing feature owner, shared pieces are reused only where contracts match, user-visible enum labels map to canonical wire values, and Gateway error/envelope handling is consistent.
- Runtime: verify local Mock/Bypass only in Development and Real/Enforce separately. Confirm Real mode has no silent mock fallback and all state-changing actions require a successful response.
- Repository: `npm run lint`, `npm run typecheck`, and `npm run build` passed; build enumerated 62 routes. This validates static checks and compilation, not full F1–F16 behavior or visual parity.

## Stop conditions

- Stop before implementing a route when the current Stitch project has no canonical screen and the user-facing intent is not fully determined; request a design decision or add a Stitch design task first. The 28 Oct inventory found no dedicated Stitch frame for Buyer reports/reviews, Admin overview/categories/coupons/audit/system health, or Staff moderation/discrepancy queues.
- Stop before enabling an operation when the workbook contract conflicts with current Gateway/OpenAPI or the downstream endpoint is absent. The 28 Oct real-backend audit currently records major Catalog path mismatches and missing Commerce, Auction, Fulfillment, Wallet, Staff and Admin downstream APIs.
- Stop before applying enum labels if the referenced canonical 78-enum catalog is unavailable or conflicts with Gateway values.
- Stop before implementing conditional Staff permissions, delivery failure/return, invoice/receipt, or shop onboarding if product/SRS scope is not confirmed. Stitch has a Seller shop registration frame (`a35841fab3c94e49813a0e2bbc86dac8`), but screen existence alone does not confirm that onboarding remains in product scope or identify a live submit contract.
- Stop before enabling Mock/Bypass outside Development. The gateway guide prohibits production Bypass; current Nexus audit is configured Real/Enforce.

## Design documentation

- After implementation acceptance: update the role screen inventory with route-to-Stitch IDs, canonical enum/display mappings, and any decisions made for conditional flows. Do not treat mock examples as approved business rules.

## Implementation progress — 2026-10-28

- Added shared auth screens/routes for forgot/reset/change password, active sessions, and personal profile; registration and password-reset OTP resend now send the required purpose and show the resend cooldown.
- Added Buyer report submission/history, completed-order review entry and product/partner review forms, wallet top-up screen, and payment deadline/link display from the returned order.
- Added Seller shop profile, separate order lookup/detail, shipment list/detail, seller revenue wallet, and withdrawal-request surfaces.
- Added Admin overview, audit-log filters, and routes for categories, system config, coupons, ledger, and system health. Added Staff routes for withdrawal, moderation, and discrepancy queues.
- Added or updated role navigation and deep links for these surfaces. `npm run typecheck` has passed after the latest changes.
- Incomplete: coupons, transaction ledger, system health, withdrawals, product moderation, discrepancy adjustments, Buyer product/transaction reports, order refunds, and review/history APIs still lack confirmed live backend contracts. Related screens remain read-only or show an unavailable state. Responsive visual comparison against the exact Stitch HTML/screenshots and full F1–F16 walk-through remain outstanding.
- Verification: `npm run lint`, `npm run typecheck`, and `npm run build` passed after removing the reset-email prefill effect flagged by ESLint. The production build generates 62 routes, including the new account, Buyer review/report/top-up, Seller shop/order/shipment/wallet/withdrawal, Admin, and Staff routes. `/auctions/[id]` needed its route parameter moved under `Suspense` for Next.js 16 Cache Components prerendering. The build needed elevated workspace write access because Windows denied Next.js access to create `.next/types` under the sandbox ACL.

## Canonical Stitch screen mapping — 2026-10-28

Fetched the current screen inventory directly from Stitch project `6106604581197312568` through the connected MCP. IDs below are canonical candidates selected by title and route purpose; duplicate screens exist, and visual parity has not yet been checked. Product photography and generic flow-board records are not counted as UI screens.

| Nexus route / flow | Stitch screen ID | Stitch title |
| --- | --- | --- |
| `/account/login` | `cc7b83dfd90b4cecb7cb519171746a79` | BUYER/SELLER/ADMIN/STAFF - Đăng nhập (Desktop) |
| `/account/register` | `332f686596eb4f6ba940ec93631645cc` | BUYER/SELLER/ADMIN/STAFF - Đăng ký (Desktop) |
| OTP verification | `a1b5220dead94d9495f6763587dacdea` | BUYER/SELLER/ADMIN/STAFF - Xác thực OTP (Desktop) |
| `/account/forgot-password` | `a7518a9114f54ccbb5b7f6d481ad8898` | BUYER/SELLER/ADMIN/STAFF - Quên mật khẩu (Desktop) |
| `/account/reset-password` | `57fc48d723064abdb57616e5e8ec2ec9` | BUYER/SELLER/ADMIN/STAFF - Đặt lại mật khẩu (Desktop) |
| `/account/change-password` | `bd711b03d9964b07952107fc1973b4f1` | BUYER/SELLER/ADMIN/STAFF - Đổi mật khẩu (Desktop) |
| `/account/profile` | `474da206db5f45e89241b733ff9b44df` | BUYER/SELLER/ADMIN/STAFF - Hồ sơ cá nhân (Desktop) |
| `/buyer/checkout` | `e689026feacd4ec781dd8a57789e7e80` | Nexus - Giỏ Hàng & Thanh Toán |
| `/buyer/orders/[id]` | `6e174ac9a29c4ea89b3d985ae2835311` | Nexus - Chi Tiết Đơn Mua & Theo Dõi Vận Chuyển (B4) |
| `/buyer/orders/[id]/review` | — | No dedicated review screen found |
| `/buyer/wallet` | `ab5ca64188ce49979ab79f007b2e48df` | Nexus - Ví Điện Tử & Quản Lý Ký Quỹ Buyer (B6) |
| `/buyer/wallet/top-up` | `6ee3d1a2bc9d471c8fea04a9a2d080a8` | BUYER - QR chuyển khoản |
| `/buyer/reports` | — | No matching Buyer report submission/history screen found |
| `/auctions` | `faa6d014f28e46cdb660ef92c551fcde` | NEXUS - Sàn Đấu Giá Công Khai (/auctions) |
| `/auctions/[id]` | `39b4ee5bfe5e48978d3b0738c5affdd4` | Nexus - Chi Tiết Sản Phẩm Niêm Yết (B1) |
| `/buyer/auctions/[id]` | `f3d4e2b26c1146b68eeff8f99e8ebd4a` | Nexus - Phòng Đấu Giá Trực Tiếp (B2) |
| `/buyer/auctions` | `f30f106205f44d63a7444ac55f5b960d` | Nexus - Đấu Giá Của Tôi (B3) |
| Buyer payment result | `293fe36696884bea8a4277d60aedfafb` | Nexus - Kết Quả Thanh Toán & Ký Quỹ (B5) |
| `/seller/products` | `dab4c0549dfe4b15ab3a1bc9261b0d99` | SELLER - Quản lý sản phẩm (Desktop) |
| `/seller/products/new` | `2c7a242282c347aa93a633f536ce55c6` | Nexus Seller - Kho Sản Phẩm & Thêm Sản Phẩm |
| `/seller/inventory` | `3033648bf0b84409bab5fa7169e4aef4` | SELLER - Quản lý kho (Desktop) |
| Seller shop onboarding | `a35841fab3c94e49813a0e2bbc86dac8` | Nexus Seller - Đăng Ký Mở Gian Hàng (C1) |
| `/seller/orders/[id]` | `99efeb61142a4dd6ac285c8f636d7c39` | Nexus Seller - Quản Lý Đơn Hàng (C2) |
| `/seller/shipments` | `b00207a2e1e84a6c831fbcb731152bb6` | Nexus Seller - Quản Lý Vận Chuyển & Vận Đơn (C3) |
| Seller shipment tracking | `72b196da8c6942ccb6858aac5b600045` | SELLER - Theo dõi vận đơn GHN (Desktop) |
| `/seller/wallet`, `/seller/withdrawals` | `e23e0b4aa33742beb6fde22c0add7a2a` | SELLER - Ví doanh thu & lệnh rút (Desktop) |
| `/seller/shop` | `030d857b2b814fa2a6a204904dcaec04` | Nexus Seller - Trang Cá Nhân & Ví Doanh Thu |
| `/staff/sellers` | `e47d755c1897419f981cbe15ac11b3e7` | Nexus Staff - Quản Lý & Phê Duyệt Hồ Sơ Đăng Ký Seller |
| `/staff/reports` | `72b9e3f8902442cc81799b0695d5358f` | Nexus Staff - Quản Lý & Xử Lý Báo Cáo Khách Hàng |
| Staff withdrawal approval | `95b8d887895d4868b4a6de57c7dccf8a` | Nexus Finance - Phê Duyệt Rút Tiền & Quản Trị Escrow (D1) |
| `/staff/auctions` | `23486b93c81e472490afd7bb22f65a34` | STAFF - Vận hành & Lịch sử phiên đấu giá (Desktop) |
| `/admin/users` | `afcc237631e14fc0af0b884ec11ad4a5` | Nexus Admin - Quản Lý Người Dùng & Nhân Sự |
| `/admin/roles` | `9d685a31f49b42889dd69383fcfaa4f6` | Nexus Admin - Quản Trị Phân Quyền & Vai Trò (RBAC) |
| `/admin/ledger` | `4561f294d1c749ba811a27ec1b87ba7f` | ADMIN - Sổ cái & đối soát (Desktop) |
| `/admin/auctions` | `05569d4df5274631900b0a090473baca` | ADMIN - Vận hành & Giám sát phiên đấu giá (Desktop) |
| `/admin/configs` | `b8b1631d8cfc4bbc9582e1c60f30388c` | ADMIN - Vận hành, Giám sát phiên đấu giá & Cấu hình hệ thống (Console Reimagine) |

Additional current Stitch records include common notification preferences (`71231ef9b73944dd8fec4900c21541ed`), buyer payment processing/result/success/failure states (`aa1de29a6370448aa391f63695cdc337`, `198d2a23fa344c2fbaedbe2b3ad26cdb`, `54f8926b5acb4f398d74ed6c9228113e`, `6bd2fd2b7f614f7684758b07230b184b`), and seller auction listing/create/result screens (`39e9d97c6dd94672a73cc16766e0d305`, `b27638a97cf24584b8a9a7ce1b4c6d1b`, `75f593ce4c084805951c1f97fa7cbb4e`). No dedicated frames were found for Admin overview/categories/coupons/audit/system health or Staff moderation/discrepancy queues; these should remain contract-driven gap screens pending design and backend decisions.
