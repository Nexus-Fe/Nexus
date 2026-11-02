"use client";
/* Catalog and fulfillment responses are ungenerated Gateway JSON contracts. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ROUTES } from "@/constants/routes";
import { useSession } from "@/components/auth/SessionProvider";
import { Icon } from "@/components/ui/Icon";
import { Badge, ButtonLink, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { api, type ApiResponse } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatMoney } from "@/lib/presentation";
import { isSensitiveIdentityKey, loadSafeRegistrationDraft } from "./services/seller.service";
import { sellerCatalogService } from "./services/catalog.service";

export { BecomeSellerScreen } from "./BecomeSellerScreen";

type Obj = Record<string, any>;
const unwrap = <T,>(x: ApiResponse<T> | T): T =>
  x && typeof x === "object" && "data" in x ? (x as ApiResponse<T>).data : (x as T);
const rows = (x: any): Obj[] =>
  Array.isArray(x) ? x : (x?.items ?? x?.data ?? x?.products ?? x?.auctions ?? x?.shipments ?? []);
const msg = (e: Error | null) => e?.message ?? "";

export function SellerProductsScreen() {
  const [q, setQ] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const resource = useApiResource(
    `seller-products:${page}:${keyword}`,
    (signal) => sellerCatalogService.list(page, keyword, signal),
  );
  return (
    <>
      <PageHeading
        overline="Kênh người bán"
        title="Quản lý sản phẩm"
        description="Sản phẩm và trạng thái từ Catalog API."
      />
      <SectionHeading title="Danh sách sản phẩm" action={<ButtonLink href={ROUTES.seller.newProduct}><Icon name="plus" size={17} /> Tạo sản phẩm</ButtonLink>} />
      <Card>
        <form
          className="toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setKeyword(q.trim());
            if (keyword === q.trim() && page === 1) resource.reload();
          }}
        >
          <input
            className="field"
            placeholder="Tìm theo tên sản phẩm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="button button-secondary">Tìm kiếm</button>
        </form>
        {resource.error && (
          <p role="alert" className="notice">
            {msg(resource.error)}
          </p>
        )}
        {resource.data?.items.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Giá</th>
                  <th>Biến thể</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {resource.data.items.map((p) => (
                  <tr key={p.productId}>
                    <td><Link href={ROUTES.seller.product(p.productId)}>{p.name}</Link></td>
                    <td>{formatMoney(p.minPrice ?? null)}</td>
                    <td>{p.variantCount}</td>
                    <td>
                      <Badge>{p.status ?? ""}</Badge>
                    </td>
                  </tr>
                ))}
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
                  : "Chưa có sản phẩm"
            }
          />
        )}
        {resource.data && resource.data.pagination.totalPages > 1 && <div className="action-row"><button type="button" className="button button-secondary" disabled={page <= 1 || resource.loading} onClick={() => setPage((value) => value - 1)}>Trang trước</button><span>Trang {page}/{resource.data.pagination.totalPages}</span><button type="button" className="button button-secondary" disabled={!resource.data.pagination.hasNextPage || resource.loading} onClick={() => setPage((value) => value + 1)}>Trang sau</button></div>}
      </Card>
    </>
  );
}

export function SellerProductEditorScreen() {
  const { user } = useSession();
  const [f, setF] = useState({
    name: "",
    description: "",
    brand: "",
    categoryId: "",
    skuCode: "",
    variantName: "Mặc định",
    price: "",
    currency: "VND",
    color: "",
    size: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  const categories = useApiResource("/api/v1/categories", async () =>
    rows(unwrap(await api.get<ApiResponse<any>>("/api/v1/categories"))),
  );
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!user?.id) throw new Error("Bạn cần đăng nhập Seller để tạo sản phẩm.");
      const created = await sellerCatalogService.create({
        sellerId: user.id,
        categoryId: f.categoryId,
        name: f.name.trim(),
        description: f.description.trim(),
        brand: f.brand.trim(),
        variants: [{ skuCode: f.skuCode.trim(), name: f.variantName.trim(), price: Number(f.price), currency: f.currency, attributes: [f.color.trim() && { attrName: "Màu sắc", attrValue: f.color.trim() }, f.size.trim() && { attrName: "Kích cỡ", attrValue: f.size.trim() }].filter((attribute): attribute is { attrName: string; attrValue: string } => Boolean(attribute)) }],
      });
      if (!created.id) throw new Error("Catalog chưa trả mã sản phẩm.");
      window.location.assign(ROUTES.seller.product(created.id));
    } catch (ex) {
      setError(msg(ex as Error));
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeading title="Tạo sản phẩm" description="Thông tin sẽ được gửi đến Catalog API." />
      <form onSubmit={(e) => void submit(e)}>
        <Card className="card-pad">
          <div className="form-grid">
            <label className="field-wrap">
              Tên sản phẩm
              <input
                className="field"
                required
                value={f.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </label>
            <label className="field-wrap">
              Danh mục
              <select
                className="select-field"
                required
                value={f.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
              >
                <option value="">Chọn danh mục</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.id ?? c.categoryId} value={c.id ?? c.categoryId}>
                    {c.name}
                  </option>
                ))}
              </select>
              {categories.error && <small role="alert">{msg(categories.error)}</small>}
            </label>
            <label className="field-wrap">
              Thương hiệu
              <input
                className="field"
                value={f.brand}
                onChange={(e) => set("brand", e.target.value)}
              />
            </label>
            <label className="field-wrap">
              Mã SKU
              <input
                className="field"
                required
                value={f.skuCode}
                onChange={(e) => set("skuCode", e.target.value)}
              />
            </label>
            <label className="field-wrap">
              Tên biến thể
              <input
                className="field"
                required
                value={f.variantName}
                onChange={(e) => set("variantName", e.target.value)}
              />
            </label>
            <label className="field-wrap">
              Giá (VND)
              <input
                type="number"
                min="1"
                required
                className="field"
                value={f.price}
                onChange={(e) => set("price", e.target.value)}
              />
            </label>
            <label className="field-wrap">Màu sắc<input className="field" value={f.color} onChange={(e) => set("color", e.target.value)} /></label>
            <label className="field-wrap">Kích cỡ<input className="field" value={f.size} onChange={(e) => set("size", e.target.value)} /></label>
            <label className="field-wrap">
              Mô tả
              <textarea
                className="textarea-field"
                value={f.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </label>
          </div>
          {error && (
            <p role="alert" className="notice">
              {error}
            </p>
          )}
          <div className="action-row">
            <button className="button button-primary" disabled={busy}>
              {busy ? "Đang lưu…" : "Lưu sản phẩm"}
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
  const products = useApiResource("seller-inventory-products", (signal) => sellerCatalogService.list(1, "", signal));
  const [productId, setProductId] = useState("");
  const detail = useApiResource(productId ? `seller-inventory-product:${productId}` : null, (signal) => sellerCatalogService.detail(productId, signal));
  const [skuId, setSkuId] = useState("");
  const balance = useApiResource(skuId ? `seller-inventory:${skuId}` : null, (signal) => sellerCatalogService.inventory(skuId, signal));
  return (
    <>
      <PageHeading title="Quản lý kho" />
      <Card className="card-pad">
        <SectionHeading title="Chọn SKU cần kiểm tra" />
        <div className="form-grid"><label className="field-wrap">Sản phẩm<select className="select-field" value={productId} onChange={(event) => { setProductId(event.target.value); setSkuId(""); }}><option value="">Chọn sản phẩm</option>{products.data?.items.map((item) => <option key={item.productId} value={item.productId}>{item.name}</option>)}</select></label><label className="field-wrap">Biến thể<select className="select-field" value={skuId} onChange={(event) => setSkuId(event.target.value)} disabled={!detail.data}><option value="">Chọn SKU</option>{detail.data?.variants.map((variant) => <option key={variant.variantId} value={variant.variantId}>{variant.skuCode} · {variant.name}</option>)}</select></label></div>
        {products.error && <p className="notice" role="alert">{products.error.message} Gateway cần chuyển tiếp /api/v1/seller/products.</p>}
        {detail.error && <p className="notice" role="alert">{detail.error.message}</p>}
        <p className="status-note">Tồn kho được tra cứu theo mã biến thể (SKU ID), không theo mã sản phẩm.</p>
      </Card>
      <Card className="card-pad">
        <SectionHeading title="Số dư tồn kho" />
        {balance.error && <p className="notice" role="alert">{balance.error.message} Gateway cần chuyển tiếp /api/v1/inventories.</p>}
        {balance.data ? <div className="grid-3"><div><span>Tổng tồn</span><h2>{balance.data.totalQuantity}</h2></div><div><span>Có thể bán</span><h2>{balance.data.availableQuantity}</h2></div><div><span>Đang giữ</span><h2>{balance.data.reservedQuantity}</h2></div><div><span>Không khả dụng</span><h2>{balance.data.unavailableQuantity}</h2></div></div> : <NoData title={skuId ? balance.loading ? "Đang tải tồn kho…" : balance.error ? "Không đọc được tồn kho" : "SKU chưa có bản ghi tồn kho" : "Chọn SKU để xem tồn kho"} />}
        <div className="action-row"><button type="button" className="button button-secondary" disabled>Nhập hoặc điều chỉnh tồn kho</button><button type="button" className="button button-secondary" disabled>Xem sổ cái tồn kho</button></div>
        <p className="status-note">Fulfillment hiện chưa cung cấp action khai báo, điều chỉnh và đọc sổ cái theo tài liệu demo. Không gửi yêu cầu nhập kho giả.</p>
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
  const shop = useApiResource("/api/v1/sellers/profile", async () =>
    unwrap(await api.get<ApiResponse<Obj>>("/api/v1/sellers/profile")),
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setError("");
    setSaved("");
    setBusy(true);
    try {
      await api.patch("/api/v1/sellers/profile", {
        shopName: String(values.get("shopName") ?? ""),
        hotline: String(values.get("hotline") ?? ""),
        description: String(values.get("description") ?? ""),
        pickupAddress: String(values.get("streetAddress") ?? ""),
        provinceId: Number(values.get("provinceId")),
        districtId: Number(values.get("districtId")),
        wardCode: String(values.get("wardCode") ?? ""),
      });
      setSaved("Đã cập nhật hồ sơ gian hàng.");
      shop.reload();
    } catch (reason) {
      setError(msg(reason as Error));
    } finally {
      setBusy(false);
    }
  }

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
  const resolvedProvinceId = String(address.provinceId ?? data.provinceId ?? draft?.warehouseAddress.provinceId ?? "");
  const resolvedDistrictId = String(address.districtId ?? data.districtId ?? draft?.warehouseAddress.districtId ?? "");
  const resolvedWardCode = String(address.wardCode ?? data.wardCode ?? draft?.warehouseAddress.wardCode ?? "");
  const resolvedStreetAddress = String(
    address.streetAddress ??
    (typeof data.pickupAddress === "string" ? data.pickupAddress : "") ??
    draft?.warehouseAddress.streetAddress ??
    "",
  );

  return (
    <>
      <PageHeading
        overline="Kênh người bán"
        title="Hồ sơ gian hàng & Kho GHN"
        description="Xem hồ sơ shop và địa chỉ lấy hàng từ UserService."
      />
      {shop.error && (
        <p role="alert" className="notice">
          {msg(shop.error)}
        </p>
      )}

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
          <h2 style={{ margin: 0, fontSize: 18 }}>Thông tin lấy hàng đã khai báo</h2>
          <Badge>{String(data.status ?? "Chưa xác nhận")}</Badge>
        </div>
        <div className="grid-2">
          <div>
            <div className="info-row">
              <span>Mã gian hàng (Shop ID)</span>
              <strong>{String(data.shopId ?? data.sellerId ?? draft?.registrationId ?? "—")}</strong>
            </div>
            <div className="info-row">
              <span>Tên gian hàng</span>
              <strong>{resolvedShopName || "—"}</strong>
            </div>
          </div>
          <div>
            <div className="info-row">
              <span>Hotline kho</span>
              <strong>{resolvedHotline || "—"}</strong>
            </div>
            <div className="info-row">
              <span>Địa chỉ kho lấy hàng</span>
              <strong>{resolvedStreetAddress || "—"}</strong>
            </div>
            <div className="info-row">
              <span>Mã vùng GHN</span>
              <strong>
                Tỉnh: {resolvedProvinceId || "—"} · Quận: {resolvedDistrictId || "—"} · Phường: {resolvedWardCode || "—"}
              </strong>
            </div>
          </div>
        </div>
        <p className="status-note">Trạng thái hồ sơ UserService không chứng minh kho đã được tạo ở Fulfillment. Chỉ xác nhận đồng bộ khi backend cung cấp mã kho hoặc truy vấn kho theo Seller.</p>
      </Card>

      <Card className="card-pad">
        <form
          className="auth-fields"
          key={JSON.stringify([resolvedShopName, resolvedHotline, resolvedProvinceId, resolvedDistrictId, resolvedWardCode, resolvedStreetAddress])}
          onSubmit={(e) => void submit(e)}
        >
          <label className="field-wrap">
            Tên gian hàng
            <input className="field" name="shopName" required defaultValue={resolvedShopName} />
          </label>
          <label className="field-wrap">
            Hotline
            <input className="field" name="hotline" required defaultValue={resolvedHotline} />
          </label>
          <label className="field-wrap">
            Mô tả
            <textarea
              className="textarea-field"
              name="description"
              defaultValue={String(data.description ?? "")}
            />
          </label>
          <h3>Địa chỉ lấy hàng (Mã GHN)</h3>
          <div className="form-grid">
            <label className="field-wrap">
              Mã tỉnh (provinceId)
              <input
                className="field"
                name="provinceId"
                type="number"
                required
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
                defaultValue={resolvedDistrictId}
              />
            </label>
            <label className="field-wrap">
              Mã phường (wardCode)
              <input className="field" name="wardCode" required defaultValue={resolvedWardCode} />
            </label>
            <label className="field-wrap">
              Địa chỉ cụ thể (streetAddress)
              <input
                className="field"
                name="streetAddress"
                required
                defaultValue={resolvedStreetAddress}
              />
            </label>
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
