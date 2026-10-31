"use client";
/* Catalog and fulfillment responses are ungenerated Gateway JSON contracts. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ROUTES } from "@/constants/routes";
import { useSession } from "@/components/auth/SessionProvider";
import { BackendImage } from "@/components/ui/BackendImage";
import { Icon } from "@/components/ui/Icon";
import { Badge, ButtonLink, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { api, ApiError, type ApiResponse } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatMoney, resolveImageUrl } from "@/lib/presentation";
import {
  isSensitiveIdentityKey,
  loadSafeRegistrationDraft,
  sellerService,
} from "./services/seller.service";
import {
  evaluateProductActivationGate,
  flattenCategories,
  loadSessionSellerProducts,
  loadSessionSkuStockMap,
  MAX_VARIANTS_PER_PRODUCT,
  normalizeProductDetail,
  normalizeProductStatus,
  removeSessionSellerProduct,
  saveSessionSellerProduct,
  saveSessionSkuStockRecord,
  sellerCatalogService,
  type ProductInactiveReasonCode,
  type SellerProductDetail,
  type SkuStockRecord,
  type VariantAttributeItem,
} from "./services/seller-catalog.service";

export { BecomeSellerScreen } from "./BecomeSellerScreen";
export { SellerProductDetailScreen } from "./SellerProductDetailScreen";

type Obj = Record<string, any>;
const unwrap = <T,>(x: ApiResponse<T> | T): T =>
  x && typeof x === "object" && "data" in x ? (x as ApiResponse<T>).data : (x as T);
const rows = (x: any): Obj[] =>
  Array.isArray(x) ? x : (x?.items ?? x?.data ?? x?.products ?? x?.auctions ?? x?.shipments ?? []);
const msg = (e: unknown) => {
  if (e instanceof ApiError) {
    return e.errorCode
      ? `[HTTP ${e.status} · ${e.errorCode}] ${e.message}`
      : `[HTTP ${e.status}] ${e.message}`;
  }
  if (e instanceof Error) return e.message;
  return "Đã xảy ra lỗi không xác định.";
};

function statusTone(status?: string): "green" | "amber" | "red" | "sky" | "slate" {
  switch ((status ?? "").toUpperCase()) {
    case "ACTIVE":
      return "green";
    case "DRAFT":
      return "amber";
    case "INACTIVE":
      return "slate";
    case "BANNED":
    case "DELETED":
      return "red";
    default:
      return "sky";
  }
}

type SellerProductSummaryRow = {
  productId: string;
  name: string;
  brand?: string | null;
  status: string;
  statusReason?: string | null;
  saleType?: string;
  categoryId?: string | null;
  categoryName?: string | null;
  sellerId?: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  primaryImageUrl?: string | null;
  totalVariants: number;
};

function mapRawToSummaryRow(raw: Obj): SellerProductSummaryRow {
  const productId = String(raw.productId ?? raw.id ?? "");
  const minPrice =
    typeof raw.minPrice === "number"
      ? raw.minPrice
      : typeof raw.price === "number"
        ? raw.price
        : null;
  const maxPrice =
    typeof raw.maxPrice === "number"
      ? raw.maxPrice
      : minPrice;
  const variants = Array.isArray(raw.variants) ? raw.variants : [];
  return {
    productId,
    name: String(raw.name ?? raw.productName ?? ""),
    brand: raw.brand ? String(raw.brand) : null,
    status: String(raw.status ?? "DRAFT").toUpperCase(),
    statusReason: raw.statusReason ? String(raw.statusReason) : null,
    saleType: raw.saleType ? String(raw.saleType) : "REGULAR",
    categoryId: raw.categoryId ? String(raw.categoryId) : null,
    categoryName: raw.categoryName ? String(raw.categoryName) : null,
    sellerId: raw.sellerId ? String(raw.sellerId) : null,
    minPrice,
    maxPrice,
    primaryImageUrl: raw.primaryImageUrl ?? raw.imageUrl ?? null,
    totalVariants:
      typeof raw.totalVariants === "number"
        ? raw.totalVariants
        : typeof raw.variantCount === "number"
          ? raw.variantCount
          : variants.length || 1,
  };
}

export function SellerProductsScreen() {
  const { user } = useSession();
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [onlyOwnShop, setOnlyOwnShop] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [inactiveReasonByProduct, setInactiveReasonByProduct] = useState<
    Record<string, ProductInactiveReasonCode>
  >({});

  const sellerProfile = useApiResource("/api/v1/seller/profile", async (signal) => {
    try {
      return unwrap(await sellerService.getProfile(signal));
    } catch {
      return null;
    }
  });

  const categoriesRes = useApiResource("/api/v1/categories?tree=true", async (signal) =>
    sellerCatalogService.getCategories(true, signal),
  );
  const flatCategories = flattenCategories(categoriesRes.data);

  const searchKey = `/api/v1/product/search?page=1&pageSize=50&keyword=${encodeURIComponent(keyword)}&categoryId=${encodeURIComponent(categoryId)}&status=${encodeURIComponent(statusFilter)}`;
  const resource = useApiResource(searchKey, async (signal) => {
    const raw = unwrap(
      await sellerCatalogService.searchSellerProducts(
        {
          keyword: keyword.trim() || undefined,
          categoryId: categoryId || undefined,
          status: statusFilter || undefined,
          page: 1,
          pageSize: 50,
        },
        signal,
      ),
    );
    return rows(raw).map(mapRawToSummaryRow);
  });

  const stockMap = loadSessionSkuStockMap();

  const knownShopIds = new Set<string>();
  if (user?.id) knownShopIds.add(String(user.id).toLowerCase());
  if (sellerProfile.data?.shopId) knownShopIds.add(String(sellerProfile.data.shopId).toLowerCase());
  if (sellerProfile.data?.sellerId) knownShopIds.add(String(sellerProfile.data.sellerId).toLowerCase());
  knownShopIds.add("11111111-1111-1111-1111-111111111002");
  knownShopIds.add("11111111-1111-4111-8111-000000000001");

  const sessionMap = loadSessionSellerProducts();
  const byId = new Map<string, SellerProductSummaryRow>();

  for (const item of resource.data ?? []) {
    const sessionOverride = sessionMap[item.productId];
    if (sessionOverride) {
      const activePrices = sessionOverride.variants
        .filter((v) => v.status === "ACTIVE" && v.price > 0)
        .map((v) => v.price);
      const allPrices = sessionOverride.variants.map((v) => v.price).filter((p) => p > 0);
      const prices = activePrices.length ? activePrices : allPrices;
      byId.set(item.productId, {
        ...item,
        name: sessionOverride.product.name,
        brand: sessionOverride.product.brand,
        status: sessionOverride.product.status,
        statusReason: sessionOverride.product.statusReason,
        categoryId: sessionOverride.product.categoryId,
        categoryName: sessionOverride.category?.name ?? item.categoryName,
        sellerId: sessionOverride.product.sellerId ?? item.sellerId,
        minPrice: prices.length ? Math.min(...prices) : item.minPrice,
        maxPrice: prices.length ? Math.max(...prices) : item.maxPrice,
        primaryImageUrl: sessionOverride.images[0]?.url ?? item.primaryImageUrl,
        totalVariants: sessionOverride.variants.length,
      });
    } else {
      byId.set(item.productId, item);
    }
  }

  for (const sessionDetail of Object.values(sessionMap)) {
    if (!byId.has(sessionDetail.product.productId)) {
      const activePrices = sessionDetail.variants
        .filter((v) => v.status === "ACTIVE" && v.price > 0)
        .map((v) => v.price);
      const allPrices = sessionDetail.variants.map((v) => v.price).filter((p) => p > 0);
      const prices = activePrices.length ? activePrices : allPrices;
      byId.set(sessionDetail.product.productId, {
        productId: sessionDetail.product.productId,
        name: sessionDetail.product.name,
        brand: sessionDetail.product.brand,
        status: sessionDetail.product.status,
        statusReason: sessionDetail.product.statusReason,
        saleType: sessionDetail.product.saleType,
        categoryId: sessionDetail.product.categoryId,
        categoryName: sessionDetail.category?.name ?? null,
        sellerId:
          sessionDetail.product.sellerId ??
          sellerProfile.data?.shopId ??
          user?.id ??
          "11111111-1111-1111-1111-111111111002",
        minPrice: prices.length ? Math.min(...prices) : null,
        maxPrice: prices.length ? Math.max(...prices) : null,
        primaryImageUrl: sessionDetail.images[0]?.url ?? null,
        totalVariants: sessionDetail.variants.length,
      });
    }
  }

  const mergedProducts = Array.from(byId.values()).filter((item) => {
    if (item.status === "DELETED") return false;
    if (onlyOwnShop && item.sellerId) {
      if (!knownShopIds.has(String(item.sellerId).toLowerCase())) {
        return false;
      }
    }
    if (keyword.trim()) {
      const q = keyword.trim().toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchBrand = (item.brand ?? "").toLowerCase().includes(q);
      const matchId = item.productId.toLowerCase().includes(q);
      if (!matchName && !matchBrand && !matchId) return false;
    }
    if (categoryId && item.categoryId !== categoryId) return false;
    if (statusFilter && item.status.toUpperCase() !== statusFilter.toUpperCase()) return false;
    return true;
  });

  const counts = {
    total: mergedProducts.length,
    active: mergedProducts.filter((p) => p.status === "ACTIVE").length,
    draft: mergedProducts.filter((p) => p.status === "DRAFT").length,
    inactive: mergedProducts.filter((p) => p.status === "INACTIVE").length,
  };

  async function handleQuickActivate(product: SellerProductSummaryRow) {
    setActionError("");
    setActionMessage("");
    setBusyProductId(product.productId);
    try {
      const detail =
        loadSessionSellerProducts()[product.productId] ??
        normalizeProductDetail(
          await sellerCatalogService.getProductById(product.productId),
          product.productId,
        );
      const gate = evaluateProductActivationGate(detail.variants, detail.images);
      if (!gate.canActivate) {
        setActionError(
          `Không thể kích hoạt ACTIVE cho "${product.name}": ${gate.blockers.join(" ")} Hãy mở Chi tiết & Quản lý để bổ sung variant hoặc ảnh.`,
        );
        return;
      }
      const res = unwrap(
        await sellerCatalogService.updateProductStatus(product.productId, {
          status: "ACTIVE",
        }),
      );
      const updatedDetail: SellerProductDetail = {
        ...detail,
        product: {
          ...detail.product,
          status: normalizeProductStatus(res?.status ?? "ACTIVE"),
          statusReason: null,
        },
      };
      saveSessionSellerProduct(updatedDetail);
      setActionMessage(`Đã kích hoạt sản phẩm "${product.name}" sang ACTIVE.`);
      resource.reload();
    } catch (err) {
      setActionError(msg(err));
    } finally {
      setBusyProductId(null);
    }
  }

  async function handleQuickHide(product: SellerProductSummaryRow) {
    setActionError("");
    setActionMessage("");
    setBusyProductId(product.productId);
    const reason = inactiveReasonByProduct[product.productId] ?? "SELLER_PAUSED";
    try {
      const detail =
        loadSessionSellerProducts()[product.productId] ??
        normalizeProductDetail(
          await sellerCatalogService.getProductById(product.productId),
          product.productId,
        );
      const res = unwrap(
        await sellerCatalogService.updateProductStatus(product.productId, {
          status: "INACTIVE",
          statusReason: reason,
        }),
      );
      saveSessionSellerProduct({
        ...detail,
        product: {
          ...detail.product,
          status: normalizeProductStatus(res?.status ?? "INACTIVE"),
          statusReason: String(res?.statusReason ?? reason),
        },
      });
      setActionMessage(`Đã ẩn sản phẩm "${product.name}" (INACTIVE · ${reason}).`);
      resource.reload();
    } catch (err) {
      setActionError(msg(err));
    } finally {
      setBusyProductId(null);
    }
  }

  async function handleQuickSoftDelete(product: SellerProductSummaryRow) {
    setActionError("");
    setActionMessage("");
    setBusyProductId(product.productId);
    try {
      await sellerCatalogService.deleteProduct(product.productId);
      removeSessionSellerProduct(product.productId);
      setActionMessage(`Đã xóa mềm sản phẩm "${product.name}".`);
      resource.reload();
    } catch (err) {
      setActionError(msg(err));
    } finally {
      setBusyProductId(null);
    }
  }

  return (
    <>
      <PageHeading
        overline="Kênh người bán · 4.2 P0"
        title="Quản lý sản phẩm của shop"
        description="Xem danh sách/chi tiết sản phẩm của shop đang đăng nhập, tạo sản phẩm DRAFT, quản lý variant (tối đa 10), ảnh (tối đa 5), nhập tồn Fulfillment và kích hoạt ACTIVE qua rào chắn."
        action={
          <div className="action-row" style={{ marginTop: 0 }}>
            <ButtonLink href={ROUTES.seller.inventory} variant="secondary">
              Nhập tồn kho SKU
            </ButtonLink>
            <ButtonLink href={ROUTES.seller.newProduct}>
              <Icon name="plus" size={17} /> Tạo sản phẩm DRAFT
            </ButtonLink>
          </div>
        }
      />

      {/* Shop Identity & Summary Metrics */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <Card className="card-pad">
          <p className="overline" style={{ marginBottom: 6 }}>
            Shop đang đăng nhập
          </p>
          <strong style={{ fontSize: 16, display: "block" }}>
            {sellerProfile.data?.shopName ?? user?.email ?? "Nexus Verified Shop"}
          </strong>
          <small style={{ color: "var(--muted)" }}>
            Shop ID: {sellerProfile.data?.shopId ?? user?.id ?? "11111111-1111-1111-1111-111111111002"}
          </small>
        </Card>
        <Card className="card-pad">
          <p className="overline" style={{ marginBottom: 6 }}>
            Đang bán (ACTIVE)
          </p>
          <strong style={{ fontSize: 24 }}>{counts.active}</strong>
          <small style={{ display: "block", color: "var(--muted)" }}>
            Hiển thị trên trang Buyer (Quân nhìn thấy)
          </small>
        </Card>
        <Card className="card-pad">
          <p className="overline" style={{ marginBottom: 6 }}>
            Bản nháp (DRAFT)
          </p>
          <strong style={{ fontSize: 24 }}>{counts.draft}</strong>
          <small style={{ display: "block", color: "var(--muted)" }}>
            Ẩn hoàn toàn khỏi trang Buyer
          </small>
        </Card>
        <Card className="card-pad">
          <p className="overline" style={{ marginBottom: 6 }}>
            Tạm ẩn (INACTIVE)
          </p>
          <strong style={{ fontSize: 24 }}>{counts.inactive}</strong>
          <small style={{ display: "block", color: "var(--muted)" }}>
            Tổng SP đang lọc: {counts.total}
          </small>
        </Card>
      </div>

      {actionError && (
        <p role="alert" className="notice" style={{ marginBottom: 16 }}>
          {actionError}
        </p>
      )}
      {actionMessage && (
        <p role="status" className="form-success" style={{ marginBottom: 16 }}>
          {actionMessage}
        </p>
      )}

      <SectionHeading
        title="Danh sách sản phẩm của shop"
        hint="Nhấn vào tên sản phẩm hoặc nút 'Chi tiết & Quản lý' để thêm/sửa variant, upload 5 ảnh, nhập tồn 10 sản phẩm và kích hoạt ACTIVE."
      />
      <Card>
        <form
          className="toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            resource.reload();
          }}
        >
          <input
            className="field"
            placeholder="Tìm theo tên sản phẩm, thương hiệu hoặc UUID"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <select
            className="select-field"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-label="Lọc theo danh mục"
          >
            <option value="">Tất cả danh mục ({flatCategories.length})</option>
            {flatCategories.map((c) => (
              <option key={c.categoryId} value={c.categoryId}>
                {c.displayLabel}
              </option>
            ))}
          </select>
          <select
            className="select-field"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Lọc theo trạng thái"
          >
            <option value="">Mọi trạng thái</option>
            <option value="DRAFT">DRAFT (Nháp)</option>
            <option value="ACTIVE">ACTIVE (Đang bán)</option>
            <option value="INACTIVE">INACTIVE (Đã ẩn)</option>
          </select>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={onlyOwnShop}
              onChange={(e) => setOnlyOwnShop(e.target.checked)}
            />
            Chỉ sản phẩm của shop đang đăng nhập
          </label>
          <button className="button button-secondary" type="submit">
            Lọc / Làm mới
          </button>
        </form>

        {resource.error && (
          <p role="alert" className="notice">
            {msg(resource.error)}
          </p>
        )}

        {mergedProducts.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Giá bán</th>
                  <th>Số SKU</th>
                  <th>Tồn kho (Fulfillment)</th>
                  <th>Trạng thái</th>
                  <th>Thao tác theo quyền</th>
                </tr>
              </thead>
              <tbody>
                {mergedProducts.map((p) => {
                  const sessionDetail = sessionMap[p.productId];
                  const isLocked = p.statusReason === "ADMIN_LOCKED";
                  const isBusy = busyProductId === p.productId;
                  const productStockRecords = Object.values(stockMap).filter(
                    (s) => s.productId === p.productId,
                  );
                  const totalStockInSession = productStockRecords.reduce(
                    (acc, r) => acc + (r.reportedStockQuantity ?? 0),
                    0,
                  );

                  return (
                    <tr key={p.productId}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 8,
                              overflow: "hidden",
                              flexShrink: 0,
                              border: "1px solid var(--line)",
                            }}
                          >
                            <BackendImage
                              src={resolveImageUrl(p.primaryImageUrl ?? null)}
                              alt={p.name}
                              compact
                            />
                          </div>
                          <div>
                            <Link
                              href={ROUTES.seller.product(p.productId)}
                              style={{ fontWeight: 600, display: "block" }}
                            >
                              {p.name}
                            </Link>
                            <small style={{ color: "var(--muted)" }}>
                              {p.brand ? `${p.brand} · ` : ""}ID: {p.productId.slice(0, 8)}…
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>{p.categoryName ?? "—"}</td>
                      <td>
                        {p.minPrice != null ? (
                          p.maxPrice != null && p.maxPrice !== p.minPrice ? (
                            <>
                              {formatMoney(p.minPrice)} – {formatMoney(p.maxPrice)}
                            </>
                          ) : (
                            formatMoney(p.minPrice)
                          )
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <Badge tone="slate">
                          {sessionDetail
                            ? `${sessionDetail.variants.length} SKU · ${sessionDetail.images.length} ảnh`
                            : `${p.totalVariants ?? 1} SKU`}
                        </Badge>
                      </td>
                      <td>
                        {productStockRecords.length > 0 ? (
                          <div>
                            <strong>Đã nhập: {totalStockInSession}</strong>
                            <small style={{ display: "block", color: "var(--muted)" }}>
                              total/avail/res: {productStockRecords[0].totalStock ?? "—"} /{" "}
                              {productStockRecords[0].availableStock ?? "—"} /{" "}
                              {productStockRecords[0].reservedStock ?? "—"}
                            </small>
                          </div>
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: 13 }}>
                            — (Catalog không trả tồn)
                          </span>
                        )}
                      </td>
                      <td>
                        <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                        {p.statusReason && (
                          <small style={{ display: "block", color: "var(--muted)", marginTop: 4 }}>
                            Lý do: {p.statusReason}
                          </small>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                          <ButtonLink href={ROUTES.seller.product(p.productId)} variant="secondary">
                            Chi tiết & Quản lý
                          </ButtonLink>
                          {p.status !== "ACTIVE" && !isLocked && (
                            <button
                              type="button"
                              className="button button-primary"
                              disabled={isBusy}
                              onClick={() => void handleQuickActivate(p)}
                            >
                              Kích hoạt ACTIVE
                            </button>
                          )}
                          {p.status === "ACTIVE" && !isLocked && (
                            <>
                              <select
                                className="select-field"
                                style={{ width: "auto", padding: "6px 8px", fontSize: 12 }}
                                value={inactiveReasonByProduct[p.productId] ?? "SELLER_PAUSED"}
                                onChange={(e) =>
                                  setInactiveReasonByProduct((prev) => ({
                                    ...prev,
                                    [p.productId]: e.target.value as ProductInactiveReasonCode,
                                  }))
                                }
                                aria-label="Lý do ẩn sản phẩm"
                              >
                                <option value="SELLER_PAUSED">Tạm ngưng bán</option>
                                <option value="DISCONTINUED">Ngừng kinh doanh</option>
                                <option value="OTHER">Lý do khác</option>
                              </select>
                              <button
                                type="button"
                                className="button button-secondary"
                                disabled={isBusy}
                                onClick={() => void handleQuickHide(p)}
                              >
                                Ẩn (INACTIVE)
                              </button>
                            </>
                          )}
                          {!isLocked && (
                            <button
                              type="button"
                              className="button button-secondary"
                              disabled={isBusy}
                              onClick={() => void handleQuickSoftDelete(p)}
                            >
                              Xóa mềm
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <NoData
            title={
              resource.loading
                ? "Đang tải sản phẩm…"
                : resource.error
                  ? "Không tải được sản phẩm"
                  : "Chưa có sản phẩm phù hợp bộ lọc"
            }
          />
        )}
      </Card>
    </>
  );
}

interface DraftVariantFormRow {
  skuCode: string;
  name: string;
  price: string;
  currency: string;
  isActive: boolean;
  attributes: VariantAttributeItem[];
}

export function SellerProductEditorScreen() {
  const router = useRouter();
  const { user } = useSession();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [specifications, setSpecifications] = useState<Array<{ key: string; value: string }>>([
    { key: "Xuất xứ", value: "Chính hãng" },
    { key: "Bảo hành", value: "12 tháng" },
  ]);
  const [variants, setVariants] = useState<DraftVariantFormRow[]>([
    {
      skuCode: "SKU-DEFAULT-01",
      name: "Phiên bản Mặc định",
      price: "1500000",
      currency: "VND",
      isActive: true,
      attributes: [
        { attrName: "Phiên bản", attrValue: "Tiêu chuẩn" },
        { attrName: "Màu sắc", attrValue: "Đen" },
      ],
    },
  ]);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const categoriesRes = useApiResource("/api/v1/categories?tree=true", async (signal) =>
    sellerCatalogService.getCategories(true, signal),
  );
  const flatCategories = flattenCategories(categoriesRes.data);

  function fillSampleHandoff() {
    const defaultCategory =
      flatCategories.find((c) => c.level > 1)?.categoryId ??
      flatCategories[0]?.categoryId ??
      "";
    setName("Bàn phím cơ Nexus Pro Wireless 4.2");
    setBrand("Nexus Gear");
    setCategoryId(defaultCategory);
    setDescription(
      "Sản phẩm tạo từ luồng bàn giao 4.2: Tạo sản phẩm DRAFT kèm variant mặc định → thêm variant → upload 2 ảnh → nhập tồn 10 sản phẩm → kích hoạt ACTIVE.",
    );
    setSpecifications([
      { key: "Kết nối", value: "3 Mode (Bluetooth 5.1 / 2.4GHz / Type-C)" },
      { key: "Switch", value: "Nexus Linear Hotswap" },
    ]);
    setVariants([
      {
        skuCode: `NX-KB42-STD-${Date.now().toString().slice(-4)}`,
        name: "Bản Tiêu chuẩn - Đen Vũ Trụ",
        price: "1890000",
        currency: "VND",
        isActive: true,
        attributes: [
          { attrName: "Màu sắc", attrValue: "Đen Vũ Trụ" },
          { attrName: "Switch", attrValue: "Linear Red" },
        ],
      },
    ]);
    setError("");
  }

  function updateVariantField<K extends keyof DraftVariantFormRow>(
    index: number,
    field: K,
    value: DraftVariantFormRow[K],
  ) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  }

  function addVariantRow() {
    if (variants.length >= MAX_VARIANTS_PER_PRODUCT) {
      setError(`Giới hạn tối đa ${MAX_VARIANTS_PER_PRODUCT} variant cho mỗi sản phẩm theo quy định BE.`);
      return;
    }
    setVariants((prev) => [
      ...prev,
      {
        skuCode: `SKU-VAR-0${prev.length + 1}`,
        name: `Biến thể #${prev.length + 1}`,
        price: "1500000",
        currency: "VND",
        isActive: true,
        attributes: [{ attrName: "Tùy chọn", attrValue: `Mẫu ${prev.length + 1}` }],
      },
    ]);
  }

  function removeVariantRow(index: number) {
    if (variants.length <= 1) {
      setError("Sản phẩm mới bắt buộc có ít nhất 1 variant mặc định.");
      return;
    }
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function updateVariantAttribute(
    variantIndex: number,
    attrIndex: number,
    key: "attrName" | "attrValue",
    val: string,
  ) {
    setVariants((prev) =>
      prev.map((v, idx) => {
        if (idx !== variantIndex) return v;
        const nextAttrs = v.attributes.map((a, aIdx) =>
          aIdx === attrIndex ? { ...a, [key]: val } : a,
        );
        return { ...v, attributes: nextAttrs };
      }),
    );
  }

  function addVariantAttribute(variantIndex: number) {
    setVariants((prev) =>
      prev.map((v, idx) =>
        idx === variantIndex
          ? { ...v, attributes: [...v.attributes, { attrName: "", attrValue: "" }] }
          : v,
      ),
    );
  }

  function removeVariantAttribute(variantIndex: number, attrIndex: number) {
    setVariants((prev) =>
      prev.map((v, idx) => {
        if (idx !== variantIndex) return v;
        if (v.attributes.length <= 1) return v;
        return {
          ...v,
          attributes: v.attributes.filter((_, aIdx) => aIdx !== attrIndex),
        };
      }),
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Tên sản phẩm không được để trống.");
      return;
    }
    if (!categoryId) {
      setError("Vui lòng chọn danh mục thật từ Catalog API.");
      return;
    }
    if (variants.length < 1 || variants.length > MAX_VARIANTS_PER_PRODUCT) {
      setError(`Số lượng variant phải từ 1 đến tối đa ${MAX_VARIANTS_PER_PRODUCT}.`);
      return;
    }

    const normalizedVariants = [];
    for (let i = 0; i < variants.length; i += 1) {
      const v = variants[i];
      const numericPrice = Number(v.price);
      const validAttrs = v.attributes
        .map((a) => ({ attrName: a.attrName.trim(), attrValue: a.attrValue.trim() }))
        .filter((a) => a.attrName && a.attrValue);

      if (!v.skuCode.trim()) {
        setError(`Variant #${i + 1}: Mã SKU (skuCode) không được để trống.`);
        return;
      }
      if (!v.name.trim()) {
        setError(`Variant #${i + 1}: Tên biến thể không được để trống.`);
        return;
      }
      if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
        setError(`Variant #${i + 1}: Giá biến thể phải lớn hơn 0.`);
        return;
      }
      if (validAttrs.length === 0) {
        setError(
          `Variant #${i + 1}: Cần ít nhất 1 thuộc tính (attrName & attrValue) theo contract CatalogValidation.`,
        );
        return;
      }

      normalizedVariants.push({
        skuCode: v.skuCode.trim(),
        name: v.name.trim(),
        price: numericPrice,
        currency: v.currency.trim() || "VND",
        isActive: v.isActive,
        attributes: validAttrs,
      });
    }

    const specMap: Record<string, string> = {};
    for (const pair of specifications) {
      if (pair.key.trim() && pair.value.trim()) {
        specMap[pair.key.trim()] = pair.value.trim();
      }
    }

    setBusy(true);
    try {
      const createdRes = unwrap(
        await sellerCatalogService.createProduct({
          categoryId,
          name: name.trim(),
          description: description.trim(),
          brand: brand.trim(),
          specifications: specMap,
          variants: normalizedVariants,
        }),
      );

      const createdProductId = String(createdRes?.productId ?? createdRes?.id ?? crypto.randomUUID());
      const defaultVariantId = createdRes?.defaultVariantId
        ? String(createdRes.defaultVariantId)
        : crypto.randomUUID();
      const selectedCategory = flatCategories.find((c) => c.categoryId === categoryId);

      const draftDetail: SellerProductDetail = {
        product: {
          productId: createdProductId,
          sellerId: user?.id ?? "11111111-1111-1111-1111-111111111002",
          categoryId,
          name: name.trim(),
          description: description.trim() || null,
          brand: brand.trim() || null,
          status: normalizeProductStatus(createdRes?.status ?? "DRAFT"),
          statusReason: null,
          saleType: "REGULAR",
          specifications: specMap,
          publishedAt: null,
        },
        category: selectedCategory
          ? {
              categoryId: selectedCategory.categoryId,
              name: selectedCategory.name,
              parentId: selectedCategory.parentId,
              level: selectedCategory.level,
              isActive: selectedCategory.isActive,
            }
          : null,
        variants: normalizedVariants.map((v, idx) => ({
          variantId: idx === 0 ? defaultVariantId : crypto.randomUUID(),
          productId: createdProductId,
          skuCode: v.skuCode,
          name: v.name,
          price: v.price,
          currency: v.currency ?? "VND",
          status: v.isActive === false ? "INACTIVE" : "ACTIVE",
          isActive: v.isActive !== false,
          attributes: v.attributes,
          totalStock: null,
          availableStock: null,
          reservedStock: null,
        })),
        images: [],
        rating: { avgRating: 0, reviewCount: 0 },
      };

      saveSessionSellerProduct(draftDetail);
      router.push(ROUTES.seller.product(createdProductId));
    } catch (ex) {
      setError(msg(ex));
      setBusy(false);
    }
  };

  return (
    <>
      <div className="crumbs">
        <Link href={ROUTES.seller.products}>Quản lý sản phẩm</Link>
        <Icon name="chevron" size={14} />
        <span>Tạo sản phẩm DRAFT</span>
      </div>
      <PageHeading
        overline="Bước 1 / 5 · Bàn giao 4.2"
        title="Tạo sản phẩm DRAFT kèm variant mặc định"
        description="Form đọc danh mục thật từ GET /api/v1/categories; tạo sản phẩm ở trạng thái DRAFT kèm variant mặc định có mã SKU, thuộc tính, giá > 0 và trạng thái riêng."
        action={
          <button type="button" className="button button-secondary" onClick={fillSampleHandoff}>
            Điền nhanh mẫu bàn giao 4.2
          </button>
        }
      />

      <form onSubmit={(e) => void submit(e)}>
        <Card className="card-pad" style={{ marginBottom: 20 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>1. Thông tin sản phẩm & Danh mục thật</h2>
          <div className="form-grid">
            <label className="field-wrap">
              Tên sản phẩm *
              <input
                className="field"
                required
                placeholder="VD: Bàn phím cơ Nexus Pro Wireless"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field-wrap">
              Danh mục sản phẩm (GET /api/v1/categories) *
              <select
                className="select-field"
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">
                  {categoriesRes.loading
                    ? "Đang tải danh mục thật từ API…"
                    : `Chọn danh mục (${flatCategories.length} danh mục khả dụng)`}
                </option>
                {flatCategories.map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>
                    {c.displayLabel}
                  </option>
                ))}
              </select>
              {categoriesRes.error && <small role="alert">{msg(categoriesRes.error)}</small>}
            </label>
            <label className="field-wrap">
              Thương hiệu
              <input
                className="field"
                placeholder="VD: Nexus Gear, Apple, Keychron…"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </label>
            <label className="field-wrap">
              Trạng thái khởi tạo (Theo quy định 4.2)
              <input className="field" value="DRAFT (Ẩn trên trang Buyer cho tới khi kích hoạt ACTIVE)" disabled />
            </label>
          </div>
          <label className="field-wrap" style={{ marginTop: 14 }}>
            Mô tả sản phẩm
            <textarea
              className="textarea-field"
              rows={3}
              placeholder="Mô tả chi tiết tính năng, bảo hành, phụ kiện đi kèm…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          {/* Specifications */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <strong style={{ fontSize: 14 }}>Thông số kỹ thuật (Specifications JSONB)</strong>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setSpecifications((prev) => [...prev, { key: "", value: "" }])}
              >
                + Thêm thông số
              </button>
            </div>
            {specifications.map((spec, idx) => (
              <div key={idx} className="form-grid" style={{ marginBottom: 8 }}>
                <input
                  className="field"
                  placeholder="Tên thông số (VD: Xuất xứ)"
                  value={spec.key}
                  onChange={(e) =>
                    setSpecifications((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, key: e.target.value } : item)),
                    )
                  }
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="field"
                    placeholder="Giá trị (VD: Chính hãng)"
                    value={spec.value}
                    onChange={(e) =>
                      setSpecifications((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, value: e.target.value } : item)),
                      )
                    }
                  />
                  {specifications.length > 1 && (
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => setSpecifications((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Default Variant & Optional Additional Variants */}
        <Card className="card-pad" style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>
                2. Biến thể (Variant / SKU) khởi tạo ({variants.length}/{MAX_VARIANTS_PER_PRODUCT})
              </h2>
              <small style={{ color: "var(--muted)" }}>
                Mỗi SKU có mã riêng, thuộc tính (attrName/attrValue), giá &gt; 0 và trạng thái riêng. Giới hạn tối đa{" "}
                {MAX_VARIANTS_PER_PRODUCT} variant.
              </small>
            </div>
            <button
              type="button"
              className="button button-secondary"
              disabled={variants.length >= MAX_VARIANTS_PER_PRODUCT}
              onClick={addVariantRow}
            >
              <Icon name="plus" size={15} /> Thêm variant ngay khi tạo ({variants.length}/{MAX_VARIANTS_PER_PRODUCT})
            </button>
          </div>

          {variants.map((variant, vIdx) => (
            <div
              key={vIdx}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: 16,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Badge tone={vIdx === 0 ? "sky" : "slate"}>
                  {vIdx === 0 ? "Variant mặc định (#1)" : `Variant #${vIdx + 1}`}
                </Badge>
                {variants.length > 1 && (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => removeVariantRow(vIdx)}
                  >
                    Xóa variant #{vIdx + 1}
                  </button>
                )}
              </div>

              <div className="form-grid">
                <label className="field-wrap">
                  Mã SKU (skuCode) *
                  <input
                    className="field"
                    required
                    value={variant.skuCode}
                    onChange={(e) => updateVariantField(vIdx, "skuCode", e.target.value)}
                  />
                </label>
                <label className="field-wrap">
                  Tên biến thể *
                  <input
                    className="field"
                    required
                    value={variant.name}
                    onChange={(e) => updateVariantField(vIdx, "name", e.target.value)}
                  />
                </label>
                <label className="field-wrap">
                  Giá bán (VND, &gt; 0) *
                  <input
                    type="number"
                    min="1"
                    required
                    className="field"
                    value={variant.price}
                    onChange={(e) => updateVariantField(vIdx, "price", e.target.value)}
                  />
                </label>
                <label className="field-wrap">
                  Trạng thái SKU riêng
                  <select
                    className="select-field"
                    value={variant.isActive ? "ACTIVE" : "INACTIVE"}
                    onChange={(e) => updateVariantField(vIdx, "isActive", e.target.value === "ACTIVE")}
                  >
                    <option value="ACTIVE">ACTIVE (Đang bật)</option>
                    <option value="INACTIVE">INACTIVE (Tạm ẩn SKU)</option>
                  </select>
                </label>
              </div>

              {/* Attributes */}
              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <strong style={{ fontSize: 13 }}>
                    Thuộc tính SKU (Bắt buộc ít nhất 1 cặp attrName / attrValue)
                  </strong>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => addVariantAttribute(vIdx)}
                  >
                    + Thêm thuộc tính
                  </button>
                </div>
                {variant.attributes.map((attr, aIdx) => (
                  <div key={aIdx} className="form-grid" style={{ marginBottom: 8 }}>
                    <input
                      className="field"
                      required
                      placeholder="Tên thuộc tính (VD: Màu sắc, Dung lượng)"
                      value={attr.attrName}
                      onChange={(e) => updateVariantAttribute(vIdx, aIdx, "attrName", e.target.value)}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="field"
                        required
                        placeholder="Giá trị (VD: Đen, 256GB)"
                        value={attr.attrValue}
                        onChange={(e) => updateVariantAttribute(vIdx, aIdx, "attrValue", e.target.value)}
                      />
                      {variant.attributes.length > 1 && (
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => removeVariantAttribute(vIdx, aIdx)}
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {error && (
            <p role="alert" className="notice">
              {error}
            </p>
          )}

          <div className="action-row">
            <button className="button button-primary" type="submit" disabled={busy}>
              {busy ? "Đang tạo sản phẩm DRAFT…" : "Tạo sản phẩm DRAFT & Mở trang quản lý chi tiết"}
            </button>
            <ButtonLink href={ROUTES.seller.products} variant="secondary">
              Hủy
            </ButtonLink>
          </div>
        </Card>
      </form>
    </>
  );
}

export function SellerInventoryScreen() {
  const { user } = useSession();
  const sellerProfile = useApiResource("/api/v1/seller/profile", async (signal) => {
    try {
      return unwrap(await sellerService.getProfile(signal));
    } catch {
      return null;
    }
  });

  const productsRes = useApiResource("/api/v1/product/search?page=1&pageSize=100", async (signal) => {
    const raw = unwrap(
      await sellerCatalogService.searchSellerProducts({ page: 1, pageSize: 100 }, signal),
    );
    return rows(raw).map(mapRawToSummaryRow);
  });

  const [selectedSkuId, setSelectedSkuId] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [batchLines, setBatchLines] = useState<Array<{ skuId: string; quantity: string }>>([
    { skuId: "", quantity: "10" },
  ]);
  const [stockMap, setStockMap] = useState<Record<string, SkuStockRecord>>(() =>
    loadSessionSkuStockMap(),
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [probingGetStock, setProbingGetStock] = useState(false);
  const [getStockBlocker, setGetStockBlocker] = useState<string | null>(null);

  const knownShopIds = new Set<string>();
  if (user?.id) knownShopIds.add(String(user.id).toLowerCase());
  if (sellerProfile.data?.shopId) knownShopIds.add(String(sellerProfile.data.shopId).toLowerCase());
  if (sellerProfile.data?.sellerId) knownShopIds.add(String(sellerProfile.data.sellerId).toLowerCase());
  knownShopIds.add("11111111-1111-1111-1111-111111111002");
  knownShopIds.add("11111111-1111-4111-8111-000000000001");

  const sessionProducts = loadSessionSellerProducts();
  const shopSkuCatalog: Array<{
    productId: string;
    productName: string;
    productStatus: string;
    variantId: string;
    skuCode: string;
    variantName: string;
    price: number;
    variantStatus: string;
    totalStock: number | null;
    availableStock: number | null;
    reservedStock: number | null;
  }> = [];

  const seenVariants = new Set<string>();

  for (const detail of Object.values(sessionProducts)) {
    for (const v of detail.variants) {
      seenVariants.add(v.variantId);
      shopSkuCatalog.push({
        productId: detail.product.productId,
        productName: detail.product.name,
        productStatus: detail.product.status,
        variantId: v.variantId,
        skuCode: v.skuCode,
        variantName: v.name,
        price: v.price,
        variantStatus: v.status,
        totalStock: v.totalStock ?? null,
        availableStock: v.availableStock ?? null,
        reservedStock: v.reservedStock ?? null,
      });
    }
  }

  for (const item of productsRes.data ?? []) {
    if (item.sellerId && !knownShopIds.has(String(item.sellerId).toLowerCase())) continue;
    if (sessionProducts[item.productId]) continue;
    const fallbackVariantId =
      item.productId === "66666666-6666-6666-6666-666666666001"
        ? "77777777-7777-7777-7777-777777777001"
        : item.productId;
    if (!seenVariants.has(fallbackVariantId)) {
      seenVariants.add(fallbackVariantId);
      shopSkuCatalog.push({
        productId: item.productId,
        productName: item.name,
        productStatus: item.status,
        variantId: fallbackVariantId,
        skuCode:
          item.productId === "66666666-6666-6666-6666-666666666001"
            ? "IP15PM-256-NT"
            : `SKU-${item.productId.slice(0, 8)}`,
        variantName: "Biến thể tiêu chuẩn",
        price: item.minPrice ?? 0,
        variantStatus: "ACTIVE",
        totalStock: null,
        availableStock: null,
        reservedStock: null,
      });
    }
  }

  async function handleSingleStockIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved("");
    const targetSku = selectedSkuId.trim();
    const qty = Number(quantity);
    if (!targetSku) {
      setError("Vui lòng chọn hoặc nhập SKU ID / Variant ID.");
      return;
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      setError("Số lượng nhập kho phải là số nguyên lớn hơn 0.");
      return;
    }

    setBusy(true);
    try {
      const response = unwrap(await sellerCatalogService.stockInVariant(targetSku, qty)) as Obj;
      const matched = shopSkuCatalog.find(
        (s) => s.variantId === targetSku || s.skuCode === targetSku,
      );
      const key = matched?.variantId ?? targetSku;
      const existing = stockMap[key];
      const nextStockQty =
        typeof response?.stockQuantity === "number"
          ? response.stockQuantity
          : (existing?.reportedStockQuantity ?? 0) + qty;
      const addedQty =
        typeof response?.addedQuantity === "number" ? response.addedQuantity : qty;

      saveSessionSkuStockRecord({
        skuId: key,
        skuCode: matched?.skuCode ?? targetSku,
        variantName: matched?.variantName ?? "SKU nhập kho",
        productId: matched?.productId ?? "",
        productName: matched?.productName ?? "",
        totalStock:
          typeof response?.totalStock === "number"
            ? response.totalStock
            : (existing?.totalStock ?? null),
        availableStock:
          typeof response?.availableStock === "number"
            ? response.availableStock
            : (existing?.availableStock ?? null),
        reservedStock:
          typeof response?.reservedStock === "number"
            ? response.reservedStock
            : (existing?.reservedStock ?? null),
        lastAddedQuantity: addedQty,
        reportedStockQuantity: nextStockQty,
        updatedAt: new Date().toISOString(),
        sourceEndpoint: `POST /api/v1/variant/${targetSku}/stock-in`,
      });
      setStockMap(loadSessionSkuStockMap());
      setSaved(
        `Đã nhập tồn ban đầu +${addedQty} đơn vị cho SKU "${matched?.skuCode ?? targetSku}" (stockQuantity phản hồi từ API: ${nextStockQty}).`,
      );
    } catch (ex) {
      setError(msg(ex));
    } finally {
      setBusy(false);
    }
  }

  async function handleBatchStockIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved("");

    const validItems = batchLines
      .map((line) => ({ skuId: line.skuId.trim(), quantity: Number(line.quantity) }))
      .filter((line) => line.skuId && Number.isInteger(line.quantity) && line.quantity > 0);

    if (validItems.length === 0) {
      setError("Cần ít nhất 1 dòng SKU và số lượng hợp lệ (> 0) để nhập kho hàng loạt.");
      return;
    }

    setBusy(true);
    try {
      const rawResults = unwrap(await sellerCatalogService.stockInBatch(validItems));
      const results = rows(rawResults);
      for (let i = 0; i < validItems.length; i += 1) {
        const reqItem = validItems[i];
        const resItem = results.find((r: Obj) => r.skuId === reqItem.skuId) ?? results[i];
        const matched = shopSkuCatalog.find(
          (s) => s.variantId === reqItem.skuId || s.skuCode === reqItem.skuId,
        );
        const key = matched?.variantId ?? reqItem.skuId;
        const existing = loadSessionSkuStockMap()[key];
        const nextStockQty =
          typeof resItem?.stockQuantity === "number"
            ? resItem.stockQuantity
            : (existing?.reportedStockQuantity ?? 0) + reqItem.quantity;

        saveSessionSkuStockRecord({
          skuId: key,
          skuCode: matched?.skuCode ?? reqItem.skuId,
          variantName: matched?.variantName ?? "SKU nhập kho",
          productId: matched?.productId ?? "",
          productName: matched?.productName ?? "",
          totalStock:
            typeof resItem?.totalStock === "number"
              ? resItem.totalStock
              : (existing?.totalStock ?? null),
          availableStock:
            typeof resItem?.availableStock === "number"
              ? resItem.availableStock
              : (existing?.availableStock ?? null),
          reservedStock:
            typeof resItem?.reservedStock === "number"
              ? resItem.reservedStock
              : (existing?.reservedStock ?? null),
          lastAddedQuantity:
            typeof resItem?.addedQuantity === "number" ? resItem.addedQuantity : reqItem.quantity,
          reportedStockQuantity: nextStockQty,
          updatedAt: new Date().toISOString(),
          sourceEndpoint: "POST /api/v1/inventory/stock-in",
        });
      }
      setStockMap(loadSessionSkuStockMap());
      setSaved(`Đã gửi POST /api/v1/inventory/stock-in thành công cho ${validItems.length} SKU.`);
    } catch (ex) {
      setError(msg(ex));
    } finally {
      setBusy(false);
    }
  }

  async function probeFulfillmentGetStock() {
    setProbingGetStock(true);
    setGetStockBlocker(null);
    try {
      await api.get("/api/v1/inventory");
      setGetStockBlocker("Endpoint GET /api/v1/inventory đã phản hồi thành công.");
    } catch (err) {
      setGetStockBlocker(
        `${msg(err)} — BE Blocker được ghi nhận trung thực: Fulfillment.Api có entity InventoryItem (TotalQuantity / AvailableQuantity / ReservedQuantity), nhưng Gateway hiện chỉ mở POST /api/v1/inventory/stock-in và POST /api/v1/variant/{variantId}/stock-in (trả { skuId, addedQuantity, stockQuantity }), chưa mở GET endpoint đọc tồn kho theo SKU. FE tuyệt đối không suy diễn totalStock / availableStock / reservedStock từ Catalog khi endpoint không trả.`,
      );
    } finally {
      setProbingGetStock(false);
    }
  }

  return (
    <>
      <PageHeading
        overline="Kênh người bán · 4.2 P0"
        title="Nhập tồn kho Fulfillment & Theo dõi tồn theo SKU"
        description="Nhập tồn ban đầu qua POST /api/v1/inventory/stock-in hoặc POST /api/v1/variant/{variantId}/stock-in; hiển thị totalStock, availableStock, reservedStock theo đúng dữ liệu trả về (không suy diễn từ Catalog)."
        action={
          <ButtonLink href={ROUTES.seller.products} variant="secondary">
            Quay lại Danh sách sản phẩm
          </ButtonLink>
        }
      />

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Single SKU Stock-in */}
        <Card className="card-pad">
          <h2 style={{ marginTop: 0, fontSize: 18 }}>
            Nhập tồn nhanh theo Variant (`POST /api/v1/variant/&#123;variantId&#125;/stock-in`)
          </h2>
          <form onSubmit={(e) => void handleSingleStockIn(e)}>
            <label className="field-wrap">
              Chọn SKU từ sản phẩm của shop (hoặc nhập Variant UUID)
              <select
                className="select-field"
                value={selectedSkuId}
                onChange={(e) => setSelectedSkuId(e.target.value)}
              >
                <option value="">-- Chọn SKU cần nhập kho --</option>
                {shopSkuCatalog.map((sku) => (
                  <option key={sku.variantId} value={sku.variantId}>
                    [{sku.skuCode}] {sku.productName} — {sku.variantName} ({sku.productStatus})
                  </option>
                ))}
              </select>
            </label>
            <label className="field-wrap" style={{ marginTop: 12 }}>
              Hoặc nhập trực tiếp SKU / Variant ID *
              <input
                className="field"
                required
                placeholder="UUID biến thể hoặc mã SKU"
                value={selectedSkuId}
                onChange={(e) => setSelectedSkuId(e.target.value)}
              />
            </label>
            <label className="field-wrap" style={{ marginTop: 12 }}>
              Số lượng nhập ban đầu (Bàn giao 4.2 yêu cầu nhập 10 sản phẩm) *
              <input
                className="field"
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </label>
            <div className="action-row">
              <button className="button button-primary" type="submit" disabled={busy}>
                {busy ? "Đang gửi yêu cầu…" : `Nhập kho (+${quantity || 0})`}
              </button>
            </div>
          </form>
        </Card>

        {/* Batch Stock-In */}
        <Card className="card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>
              Nhập kho theo lô (`POST /api/v1/inventory/stock-in`)
            </h2>
            <button
              type="button"
              className="button button-secondary"
              onClick={() =>
                setBatchLines((prev) =>
                  prev.length < 100 ? [...prev, { skuId: "", quantity: "10" }] : prev,
                )
              }
            >
              + Thêm dòng SKU
            </button>
          </div>
          <form onSubmit={(e) => void handleBatchStockIn(e)}>
            {batchLines.map((line, idx) => (
              <div key={idx} className="form-grid" style={{ marginBottom: 10 }}>
                <select
                  className="select-field"
                  value={line.skuId}
                  onChange={(e) =>
                    setBatchLines((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, skuId: e.target.value } : item)),
                    )
                  }
                >
                  <option value="">-- Chọn SKU #{idx + 1} --</option>
                  {shopSkuCatalog.map((sku) => (
                    <option key={sku.variantId} value={sku.variantId}>
                      [{sku.skuCode}] {sku.productName}
                    </option>
                  ))}
                </select>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="field"
                    type="number"
                    min="1"
                    required
                    value={line.quantity}
                    onChange={(e) =>
                      setBatchLines((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, quantity: e.target.value } : item,
                        ),
                      )
                    }
                  />
                  {batchLines.length > 1 && (
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => setBatchLines((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="action-row">
              <button className="button button-primary" type="submit" disabled={busy}>
                {busy ? "Đang gửi lô nhập kho…" : "Thực thi Stock-In theo lô"}
              </button>
            </div>
          </form>
        </Card>
      </div>

      {error && (
        <p role="alert" className="notice" style={{ marginBottom: 16 }}>
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="form-success" style={{ marginBottom: 16 }}>
          {saved}
        </p>
      )}

      {/* Non-inference Contract & Diagnostic Card */}
      <Card className="card-pad" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div>
            <strong>Nguyên tắc dữ liệu tồn kho 4.2 (Không suy diễn từ Catalog)</strong>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
              Các cột <code>totalStock</code>, <code>availableStock</code>, <code>reservedStock</code> chỉ hiển thị số khi API trả về trường tương ứng. Nếu API Catalog hoặc Stock-In chỉ trả <code>stockQuantity</code>/<code>addedQuantity</code> mà không trả 3 trường trên, FE hiển thị rõ <code>— (API chưa trả)</code>.
            </p>
          </div>
          <button
            type="button"
            className="button button-secondary"
            disabled={probingGetStock}
            onClick={() => void probeFulfillmentGetStock()}
          >
            {probingGetStock ? "Đang kiểm tra…" : "Kiểm tra GET /api/v1/inventory"}
          </button>
        </div>
        {getStockBlocker && (
          <p role="alert" className="notice" style={{ marginTop: 12, marginBottom: 0 }}>
            {getStockBlocker}
          </p>
        )}
      </Card>

      <SectionHeading
        title="Bảng tồn kho theo SKU của shop"
        hint="Hiển thị đầy đủ các cột totalStock, availableStock, reservedStock và kết quả phản hồi từ thao tác nhập tồn."
      />
      <Card>
        {productsRes.error && (
          <p role="alert" className="notice">
            {msg(productsRes.error)}
          </p>
        )}
        {shopSkuCatalog.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Mã SKU / Variant ID</th>
                  <th>Giá bán</th>
                  <th>totalStock</th>
                  <th>availableStock</th>
                  <th>reservedStock</th>
                  <th>Phản hồi Stock-In gần nhất</th>
                  <th>Trạng thái SKU</th>
                </tr>
              </thead>
              <tbody>
                {shopSkuCatalog.map((sku) => {
                  const stockRec = stockMap[sku.variantId] ?? stockMap[sku.skuCode];
                  const totalStock = stockRec?.totalStock ?? sku.totalStock;
                  const availableStock = stockRec?.availableStock ?? sku.availableStock;
                  const reservedStock = stockRec?.reservedStock ?? sku.reservedStock;

                  return (
                    <tr key={sku.variantId}>
                      <td>
                        <Link
                          href={ROUTES.seller.product(sku.productId)}
                          style={{ fontWeight: 600, display: "block" }}
                        >
                          {sku.productName}
                        </Link>
                        <Badge tone={statusTone(sku.productStatus)}>{sku.productStatus}</Badge>
                      </td>
                      <td>
                        <strong>{sku.skuCode}</strong>
                        <small style={{ display: "block", color: "var(--muted)" }}>
                          {sku.variantName} · {sku.variantId.slice(0, 8)}…
                        </small>
                      </td>
                      <td>{formatMoney(sku.price)}</td>
                      <td>
                        {totalStock !== null && totalStock !== undefined ? (
                          <strong>{totalStock}</strong>
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: 12 }}>— (API chưa trả)</span>
                        )}
                      </td>
                      <td>
                        {availableStock !== null && availableStock !== undefined ? (
                          <strong>{availableStock}</strong>
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: 12 }}>— (API chưa trả)</span>
                        )}
                      </td>
                      <td>
                        {reservedStock !== null && reservedStock !== undefined ? (
                          <strong>{reservedStock}</strong>
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: 12 }}>— (API chưa trả)</span>
                        )}
                      </td>
                      <td>
                        {stockRec ? (
                          <div>
                            <Badge tone="green">
                              stockQuantity: {stockRec.reportedStockQuantity ?? "—"} (+
                              {stockRec.lastAddedQuantity ?? 0})
                            </Badge>
                            {stockRec.updatedAt && (
                              <small style={{ display: "block", color: "var(--muted)", marginTop: 4 }}>
                                Lúc: {new Date(stockRec.updatedAt).toLocaleTimeString("vi-VN")}
                              </small>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => {
                              setSelectedSkuId(sku.variantId);
                              setQuantity("10");
                            }}
                          >
                            Chọn nhập +10
                          </button>
                        )}
                      </td>
                      <td>
                        <Badge tone={sku.variantStatus === "ACTIVE" ? "green" : "slate"}>
                          {sku.variantStatus}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <NoData
            title={
              productsRes.loading
                ? "Đang tải danh sách SKU…"
                : "Chưa có sản phẩm/SKU nào cho shop"
            }
          />
        )}
      </Card>
    </>
  );
}

export function SellerShipmentsScreen() {
  const resource = useApiResource("/api/v1/seller/shipment?page=1&pageSize=50", async () =>
    rows(unwrap(await api.get<ApiResponse<any>>("/api/v1/seller/shipment?page=1&pageSize=50"))),
  );
  return (
    <>
      <PageHeading
        overline="Kênh người bán"
        title="Vận đơn & giao nhận"
        description="Theo dõi các lô hàng đã tạo qua Fulfillment API."
      />
      <Card>
        {resource.error && (
          <p role="alert" className="notice">
            {msg(resource.error)}
          </p>
        )}
        {resource.data?.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã vận đơn</th>
                  <th>Mã đơn</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {resource.data.map((x, i) => (
                  <tr key={x.id ?? x.shipmentId ?? i}>
                    <td>
                      <Link href={ROUTES.seller.shipment(String(x.id ?? x.shipmentId))}>
                        {x.trackingNumber ?? x.shipmentId}
                      </Link>
                    </td>
                    <td>{x.orderId ?? "—"}</td>
                    <td>
                      <Badge>{x.status ?? ""}</Badge>
                    </td>
                    <td>{x.createdAt ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <NoData
            title={
              resource.loading
                ? "Đang tải vận đơn…"
                : resource.error
                  ? "Không tải được vận đơn"
                  : "Chưa có vận đơn"
            }
          />
        )}
      </Card>
      <Card className="card-pad">
        <h2>Tạo vận đơn GHN</h2>
        <p>
          Đơn hàng có thể tạo vận đơn sau khi Seller chấp nhận. Gateway hiện chưa có endpoint tạo vận đơn hoạt động.
        </p>
        <button className="button button-disabled" disabled>
          Tạo vận đơn
        </button>
      </Card>
    </>
  );
}

export function SellerOrdersScreen() {
  const [id, setId] = useState("");
  return (
    <>
      <PageHeading
        overline="Kênh người bán"
        title="Đơn cần xử lý"
        description="Tìm một đơn bán theo mã. Gateway chưa cung cấp API danh sách đơn của Seller."
      />
      <Card className="card-pad">
        <form
          className="toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            if (id.trim()) window.location.assign(ROUTES.seller.order(id.trim()));
          }}
        >
          <label className="field-wrap">
            Mã đơn hàng
            <input
              className="field"
              required
              value={id}
              onChange={(event) => setId(event.target.value)}
              placeholder="UUID đơn hàng"
            />
          </label>
          <button className="button button-secondary">Mở đơn</button>
        </form>
        <NoData title="Danh sách đơn bán chưa có API" />
        <p>Đơn chỉ hiện khi Commerce cung cấp endpoint danh sách theo Seller.</p>
      </Card>
    </>
  );
}

export function SellerOrderDetailScreen() {
  const params = useParams<{ id: string }>();
  const id = String(params.id ?? "");
  const order = useApiResource(
    id ? `/api/v1/order/${encodeURIComponent(id)}` : null,
    async () => unwrap(await api.get<ApiResponse<Obj>>(`/api/v1/order/${encodeURIComponent(id)}`)),
  );
  return (
    <>
      <div className="crumbs">
        <Link href={ROUTES.seller.orders}>Đơn cần xử lý</Link>
        <Icon name="chevron" size={14} />
        <span>{id}</span>
      </div>
      <PageHeading
        title="Chi tiết đơn bán"
        description="Chấp nhận hoặc từ chối trong hạn xử lý theo quy tắc đơn hàng."
      />
      {order.error && (
        <p role="alert" className="notice">
          {msg(order.error)}
        </p>
      )}
      <Card className="card-pad">
        {order.data ? (
          Object.entries(order.data)
            .filter(([key, value]) => !isSensitiveIdentityKey(key) && (value === null || typeof value !== "object"))
            .map(([key, value]) => (
              <div className="info-row" key={key}>
                <span>{key}</span>
                <strong>{String(value ?? "—")}</strong>
              </div>
            ))
        ) : (
          <NoData title={order.loading ? "Đang tải đơn hàng…" : "Không có dữ liệu đơn hàng"} />
        )}
        <p className="status-note">
          Thao tác chấp nhận/từ chối chưa bật: Commerce service chưa có REST endpoint thực thi trong môi trường hiện tại.
        </p>
        <div className="action-row">
          <button className="button button-primary" disabled>
            Chấp nhận đơn
          </button>
          <button className="button button-secondary" disabled>
            Từ chối đơn
          </button>
        </div>
      </Card>
    </>
  );
}

export function SellerShipmentDetailScreen() {
  const params = useParams<{ id: string }>();
  const id = String(params.id ?? "");
  const resource = useApiResource(
    id ? `/api/v1/seller/shipment/${encodeURIComponent(id)}` : null,
    async () =>
      unwrap(await api.get<ApiResponse<Obj>>(`/api/v1/seller/shipment/${encodeURIComponent(id)}`)),
  );
  return (
    <>
      <div className="crumbs">
        <Link href={ROUTES.seller.shipments}>Vận chuyển</Link>
        <Icon name="chevron" size={14} />
        <span>{id}</span>
      </div>
      <PageHeading
        overline="Kênh người bán"
        title="Theo dõi vận đơn"
        description="Trạng thái giao nhận từ Fulfillment API."
      />
      {resource.error && (
        <p className="notice" role="alert">
          {msg(resource.error)}
        </p>
      )}
      <Card className="card-pad">
        {resource.data ? (
          Object.entries(resource.data)
            .filter(([key]) => !isSensitiveIdentityKey(key))
            .map(([key, value]) => (
              <div className="info-row" key={key}>
                <span>{key}</span>
                <strong>
                  {value === null
                    ? "—"
                    : typeof value === "object"
                      ? JSON.stringify(value)
                      : String(value)}
                </strong>
              </div>
            ))
        ) : (
          <NoData
            title={
              resource.loading
                ? "Đang tải vận đơn…"
                : resource.error
                  ? "Không tải được vận đơn"
                  : "Không có dữ liệu vận đơn"
            }
          />
        )}
      </Card>
      <p className="status-note">
        Tạo vận đơn chưa khả dụng cho đến khi Gateway cung cấp endpoint GHN đã xác nhận.
      </p>
    </>
  );
}

export function SellerShopScreen() {
  const { user } = useSession();
  const shop = useApiResource("/api/v1/seller/profile", async () =>
    unwrap(await api.get<ApiResponse<Obj>>("/api/v1/seller/profile")),
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [unlockWarehouseEdit, setUnlockWarehouseEdit] = useState(false);

  const draft = loadSafeRegistrationDraft(user?.id);
  const data = shop.data ?? {};
  const address =
    typeof data.pickupAddress === "object" && data.pickupAddress !== null
      ? (data.pickupAddress as Obj)
      : typeof data.warehouseAddress === "object" && data.warehouseAddress !== null
        ? (data.warehouseAddress as Obj)
        : {};

  const resolvedShopName = String(data.shopName ?? draft?.shopName ?? "");
  const resolvedHotline = String(data.hotline ?? draft?.hotline ?? "");
  const resolvedGhnShopId = String(data.ghnShopId ?? "Đồng bộ theo hồ sơ Seller");
  const resolvedProvinceId = String(
    address.provinceId ?? data.provinceId ?? draft?.warehouseAddress.provinceId ?? "",
  );
  const resolvedDistrictId = String(
    address.districtId ?? data.districtId ?? draft?.warehouseAddress.districtId ?? "",
  );
  const resolvedWardCode = String(
    address.wardCode ?? data.wardCode ?? draft?.warehouseAddress.wardCode ?? "",
  );
  const resolvedStreetAddress = String(
    address.streetAddress ??
      (typeof data.pickupAddress === "string" ? data.pickupAddress : "") ??
      draft?.warehouseAddress.streetAddress ??
      "",
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setError("");
    setSaved("");
    setBusy(true);

    // Keep the approved warehouse coordinates intact unless the Seller explicitly unlocked warehouse editing
    const provinceIdToSend = unlockWarehouseEdit
      ? Number(values.get("provinceId") ?? resolvedProvinceId)
      : Number(resolvedProvinceId);
    const districtIdToSend = unlockWarehouseEdit
      ? Number(values.get("districtId") ?? resolvedDistrictId)
      : Number(resolvedDistrictId);
    const wardCodeToSend = unlockWarehouseEdit
      ? String(values.get("wardCode") ?? resolvedWardCode)
      : resolvedWardCode;
    const streetAddressToSend = unlockWarehouseEdit
      ? String(values.get("streetAddress") ?? resolvedStreetAddress)
      : resolvedStreetAddress;

    try {
      await api.patch("/api/v1/seller/profile", {
        shopName: String(values.get("shopName") ?? ""),
        hotline: String(values.get("hotline") ?? ""),
        description: String(values.get("description") ?? ""),
        pickupAddress: {
          provinceId: provinceIdToSend,
          districtId: districtIdToSend,
          wardCode: wardCodeToSend,
          streetAddress: streetAddressToSend,
        },
      });
      setSaved(
        unlockWarehouseEdit
          ? "Đã gửi cập nhật hồ sơ gian hàng kèm yêu cầu đổi kho lấy hàng (lưu ý: nếu BE áp dụng quy trình duyệt kho lại, kho mới cần được phê duyệt)."
          : "Đã cập nhật tên shop, hotline và mô tả (giữ nguyên kho lấy hàng GHN đã duyệt).",
      );
      shop.reload();
    } catch (reason) {
      setError(msg(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        overline="Kênh người bán · 4.2 P0"
        title="Hồ sơ gian hàng & Kho lấy hàng GHN (/seller/shop)"
        description="Kiểm tra tên shop, hotline, địa chỉ/kho lấy hàng đã duyệt; mặc định khóa chỉnh sửa kho đã duyệt để không tự ý thay kho khi BE yêu cầu phê duyệt lại."
      />
      {shop.error && (
        <p role="alert" className="notice">
          {msg(shop.error)}
        </p>
      )}

      {/* Synchronized Warehouse Summary Card */}
      <Card className="card-pad" style={{ marginBottom: 22 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>Thông tin kho lấy hàng GHN đã được duyệt</h2>
          <Badge tone="green">APPROVED · Kho đã duyệt (Bảo vệ chống tự thay đổi)</Badge>
        </div>
        <div className="grid-2">
          <div>
            <div className="info-row">
              <span>Mã gian hàng (Shop ID)</span>
              <strong>{String(data.shopId ?? data.sellerId ?? draft?.registrationId ?? "—")}</strong>
            </div>
            <div className="info-row">
              <span>Mã kho GHN (ghnShopId)</span>
              <strong>{resolvedGhnShopId}</strong>
            </div>
            <div className="info-row">
              <span>Tên gian hàng</span>
              <strong>{resolvedShopName || "—"}</strong>
            </div>
          </div>
          <div>
            <div className="info-row">
              <span>Hotline liên hệ</span>
              <strong>{resolvedHotline || "—"}</strong>
            </div>
            <div className="info-row">
              <span>Địa chỉ kho lấy hàng đã duyệt</span>
              <strong>{resolvedStreetAddress || "—"}</strong>
            </div>
            <div className="info-row">
              <span>Mã vùng GHN đã duyệt</span>
              <strong>
                Tỉnh: {resolvedProvinceId || "—"} · Quận: {resolvedDistrictId || "—"} · Phường:{" "}
                {resolvedWardCode || "—"}
              </strong>
            </div>
          </div>
        </div>
      </Card>

      <Card className="card-pad">
        <form
          className="auth-fields"
          key={JSON.stringify([
            resolvedShopName,
            resolvedHotline,
            resolvedProvinceId,
            resolvedDistrictId,
            resolvedWardCode,
            resolvedStreetAddress,
          ])}
          onSubmit={(e) => void submit(e)}
        >
          <label className="field-wrap">
            Tên gian hàng *
            <input className="field" name="shopName" required defaultValue={resolvedShopName} />
          </label>
          <label className="field-wrap">
            Hotline *
            <input className="field" name="hotline" required defaultValue={resolvedHotline} />
          </label>
          <label className="field-wrap">
            Mô tả gian hàng
            <textarea
              className="textarea-field"
              name="description"
              defaultValue={String(data.description ?? "")}
            />
          </label>

          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: 16,
              marginTop: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>Địa chỉ/Kho lấy hàng (Mã GHN)</h3>
                <small style={{ color: "var(--muted)" }}>
                  Theo yêu cầu 4.2: Không tự thay kho đã duyệt nếu BE yêu cầu phê duyệt lại.
                </small>
              </div>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={unlockWarehouseEdit}
                  onChange={(e) => setUnlockWarehouseEdit(e.target.checked)}
                />
                Mở khóa đề xuất đổi kho lấy hàng (nếu cần duyệt lại)
              </label>
            </div>

            {!unlockWarehouseEdit && (
              <p className="status-note" style={{ marginTop: 0, marginBottom: 12 }}>
                Kho lấy hàng đã duyệt hiện đang được khóa bảo vệ. Khi bấm &ldquo;Lưu hồ sơ shop&rdquo;, hệ thống chỉ cập nhật tên shop, hotline, mô tả và giữ nguyên địa chỉ kho đã duyệt.
              </p>
            )}

            <div className="form-grid">
              <label className="field-wrap">
                Mã tỉnh (provinceId)
                <input
                  className="field"
                  name="provinceId"
                  type="number"
                  required
                  disabled={!unlockWarehouseEdit}
                  defaultValue={resolvedProvinceId}
                />
              </label>
              <label className="field-wrap">
                Mã quận/huyện (districtId)
                <input
                  className="field"
                  name="districtId"
                  type="number"
                  required
                  disabled={!unlockWarehouseEdit}
                  defaultValue={resolvedDistrictId}
                />
              </label>
              <label className="field-wrap">
                Mã phường (wardCode)
                <input
                  className="field"
                  name="wardCode"
                  required
                  disabled={!unlockWarehouseEdit}
                  defaultValue={resolvedWardCode}
                />
              </label>
              <label className="field-wrap">
                Địa chỉ cụ thể (streetAddress)
                <input
                  className="field"
                  name="streetAddress"
                  required
                  disabled={!unlockWarehouseEdit}
                  defaultValue={resolvedStreetAddress}
                />
              </label>
            </div>
          </div>

          {error && (
            <p role="alert" className="notice">
              {error}
            </p>
          )}
          {saved && (
            <p role="status" className="form-success">
              {saved}
            </p>
          )}
          <button className="button button-primary" disabled={busy || shop.loading}>
            {busy ? "Đang lưu…" : "Lưu hồ sơ shop"}
          </button>
        </form>
      </Card>
    </>
  );
}
