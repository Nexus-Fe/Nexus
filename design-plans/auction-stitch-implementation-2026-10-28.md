# Auction UI: Stitch to Nexus mapping

Date: 2026-10-28. Project: [Stitch Nexus](https://stitch.withgoogle.com/projects/6106604581197312568?pli=1).

## New designs

| Stitch screen | Screen ID | Nexus routes |
| --- | --- | --- |
| NEXUS - Sàn Đấu Giá Công Khai | `faa6d014f28e46cdb660ef92c551fcde` | `/auctions` |
| STAFF - Vận hành & Giám sát phiên đấu giá | `6d9b3af0884b489cbf40701c26d7129d` | `/staff/auctions`, `/staff/auctions/[id]` |
| ADMIN - Vận hành, Giám sát phiên đấu giá & Cấu hình hệ thống | `b8b1631d8cfc4bbc9582e1c60f30388c` | `/admin/auctions`, `/admin/auctions/[id]`, `/admin/auction-configs` |

These screens were generated as variants of existing Nexus designs, then retrieved by screen ID to confirm they exist in the Stitch project. The existing Buyer room, My Auctions, payment and Seller management screens remain references for the other routes.

## Implementation decisions

- Public listing: feature a real `RUNNING` auction from the current API page, followed by status filters, product cards and pagination. The featured panel uses image, price, bid count and countdown from `GET /api/v1/auctions`.
- Staff: keep search by UUID, paginated list and read-only detail. The detail reads status history and saga through their documented endpoints.
- Admin: use the same investigation structure, add reason-gated force cancel with a second confirmation step, and maintain auction configs through the documented GET/PUT endpoints.
- Nexus tokens: Plus Jakarta Sans, `#F8F9FF` canvas, `#FFFFFF` panels, `#0B1C30` text, `#4F46E5` primary action, `#E2E8F0` separators and `#BA1A1A` destructive action.
- The Stitch variants contain illustrative counts, sample names, escrow breakdowns, event-broker health indicators and other controls without corresponding Auction REST fields. The product UI does not present those examples as real data.

## Runtime limit

The Auction and Wallet service endpoints in the workbook are not exposed by the current backend. Frontend reads and writes use the real Gateway path and show its error; transaction success cannot be verified until the backend contract exists. Backend services were not started for this work.
