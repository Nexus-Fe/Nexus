"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useSession } from "@/components/auth/SessionProvider";
import { BackendImage } from "@/components/ui/BackendImage";
import { Badge, Card, NoData, PageHeading } from "@/components/ui/Primitives";
import { ROUTES } from "@/constants/routes";
import { api, unwrap, type ApiResponse } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatMoney, resolveImageUrl } from "@/lib/presentation";
import { fulfillmentService } from "@/features/fulfillment";
import administrativeUnits from "@/data/vietnam-administrative-units.json";

type CartItem = { id: string; productId: string; skuId: string; sellerId: string; productName: string; quantity: number; unitPriceSnapshot: number };
type Cart = { id: string; buyerId: string; status: string; itemCount: number; subtotalAmount: number; items: CartItem[] };
type Order = { id: string; buyerId: string; status: string; totalAmount: number; paymentDeadlineAt: string };
type Paged<T> = { items: T[]; pagination: { pageIndex: number; pageSize: number; totalCount: number; totalPages: number; hasNextPage: boolean } };

function useCart() {
  return useApiResource("buyer-active-cart", (signal) => api.get<ApiResponse<Cart> | Cart>("/api/v1/carts/me", { signal }).then(unwrap));
}

const SHIPPING_STORAGE_KEY = "nexus:checkout-shipping";
const SHIPPING_EXTRA_KEY = "nexus:checkout-extra";
type ShippingForm = { receiverName: string; phone: string; address: string };
type ShippingExtra = { email: string; province: string; ward: string; note: string };
type ShippingErrors = Partial<Record<keyof ShippingForm | "province" | "ward", string>>;
const emptyShipping: ShippingForm = { receiverName: "", phone: "", address: "" };

function loadShipping(): ShippingForm {
  if (typeof window === "undefined") return emptyShipping;
  try {
    const raw = window.sessionStorage.getItem(SHIPPING_STORAGE_KEY);
    if (!raw) return emptyShipping;
    const parsed = JSON.parse(raw) as Partial<ShippingForm>;
    return { receiverName: String(parsed.receiverName ?? ""), phone: String(parsed.phone ?? ""), address: String(parsed.address ?? "") };
  } catch {
    return emptyShipping;
  }
}

function loadShippingExtra(): ShippingExtra {
  const empty = { email: "", province: "", ward: "", note: "" };
  if (typeof window === "undefined") return empty;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(SHIPPING_EXTRA_KEY) ?? "null") as Partial<ShippingExtra> | null;
    if (!parsed) return empty;
    const savedProvince = String(parsed.province ?? "").trim();
    const province = administrativeUnits.provinces.find((entry) => entry.code === savedProvince || entry.name === savedProvince || entry.name.replace(/^(Tỉnh|Thành phố) /, "") === savedProvince);
    const savedWard = String(parsed.ward ?? "").trim();
    const ward = province?.wards.find((entry) => entry.code === savedWard || entry.name === savedWard);
    return { email: String(parsed.email ?? ""), province: province?.code ?? "", ward: ward?.code ?? "", note: String(parsed.note ?? "") };
  } catch { return empty; }
}

function validateShipping(form: ShippingForm, extra: ShippingExtra): ShippingErrors {
  const errors: ShippingErrors = {};
  if (form.receiverName.trim().length < 2) errors.receiverName = "Nhập họ tên người nhận.";
  if (!/^(0|\+84)\d{9}$/.test(form.phone.replace(/[\s.-]/g, ""))) errors.phone = "Nhập số điện thoại Việt Nam hợp lệ, ví dụ 0901234567.";
  if (form.address.trim().length < 5) errors.address = "Nhập địa chỉ nhận hàng cụ thể.";
  const province = administrativeUnits.provinces.find((entry) => entry.code === extra.province);
  if (!province) errors.province = "Chọn tỉnh hoặc thành phố.";
  if (!province?.wards.some((entry) => entry.code === extra.ward)) errors.ward = "Chọn phường, xã hoặc đặc khu thuộc tỉnh/thành phố đã chọn.";
  return errors;
}

export function CartScreen() {
  const router = useRouter();
  const cart = useCart();
  const items = cart.data?.items ?? [];
  const productIds = [...new Set(items.map((item) => item.productId).filter(Boolean))];
  const imageKey = productIds.length ? `cart-images:${productIds.join(",")}` : null;
  const productDetails = useApiResource(imageKey, async (signal) => {
    const results = await Promise.all(productIds.map(async (id) => {
      try {
        const detail = unwrap(await api.get<ApiResponse<CartProductDetail> | CartProductDetail>(`/api/v1/products/${encodeURIComponent(id)}`, { signal }));
        return [id, detail] as const;
      } catch {
        return [id, null] as const;
      }
    }));
    return Object.fromEntries(results) as Record<string, CartProductDetail | null>;
  });
  const skuIds = [...new Set(items.map((item) => item.skuId).filter(Boolean))].sort();
  const stockKey = skuIds.length ? `cart-stock:${skuIds.join(",")}` : null;
  const stock = useApiResource(stockKey, async (signal) => {
    const result = unwrap(await api.request<ApiResponse<InventoryBalance[]> | InventoryBalance[]>("/api/v1/inventories/by-skus", "POST", {
      body: JSON.stringify(skuIds), headers: { "Content-Type": "application/json" }, signal,
    }));
    if (!Array.isArray(result)) throw new Error("Không đọc được tồn kho sản phẩm.");
    return result.reduce<Record<string, number>>((totals, row) => {
      if (row && typeof row.skuId === "string" && typeof row.availableQuantity === "number") {
        totals[row.skuId] = (totals[row.skuId] ?? 0) + row.availableQuantity;
      }
      return totals;
    }, {});
  });
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string> | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [draftQuantities, setDraftQuantities] = useState<Record<string, string>>({});
  const [quantityErrors, setQuantityErrors] = useState<Record<string, string>>({});
  const groups = items.reduce<Record<string, CartItem[]>>((result, item) => {
    (result[item.sellerId] ??= []).push(item);
    return result;
  }, {});
  const selectedItems = items.filter((item) => selectedIds === null || selectedIds.has(item.id));
  const selectedTotal = selectedItems.reduce((sum, item) => sum + item.unitPriceSnapshot * item.quantity, 0);
  const allSelected = items.length > 0 && selectedItems.length === items.length;
  const hasQuantityError = selectedItems.some((item) => {
    const value = draftQuantities[item.id] ?? String(item.quantity);
    const parsed = Number(value);
    const available = stock.data?.[item.skuId] ?? 0;
    return !Number.isInteger(parsed) || parsed < 1 || parsed > available || Boolean(quantityErrors[item.id]);
  });

  function toggleItem(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current ?? items.map((item) => item.id));
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : null);
  }
  async function updateQuantity(item: CartItem, quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1 || busyId || !stock.data || quantity > (stock.data[item.skuId] ?? 0)) return;
    setBusyId(item.id);
    setActionError("");
    try {
      await api.patch(`/api/v1/carts/me/items/${encodeURIComponent(item.id)}`, { cartItemId: item.id, quantity });
      setDraftQuantities((current) => { const next = { ...current }; delete next[item.id]; return next; });
      setQuantityErrors((current) => { const next = { ...current }; delete next[item.id]; return next; });
      cart.reload();
    } catch (error) {
      setQuantityErrors((current) => ({ ...current, [item.id]: error instanceof Error ? error.message : "Không cập nhật được số lượng." }));
      stock.reload();
    } finally { setBusyId(null); }
  }
  function setDraft(item: CartItem, value: string) {
    setDraftQuantities((current) => ({ ...current, [item.id]: value }));
    setQuantityErrors((current) => { const next = { ...current }; delete next[item.id]; return next; });
  }
  function commitDraft(item: CartItem) {
    const raw = draftQuantities[item.id];
    if (raw === undefined) return;
    const quantity = Number(raw);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > (stock.data?.[item.skuId] ?? 0)) return;
    if (quantity === item.quantity) {
      setDraftQuantities((current) => { const next = { ...current }; delete next[item.id]; return next; });
      return;
    }
    void updateQuantity(item, quantity);
  }
  async function removeItem(item: CartItem) {
    if (busyId) return;
    setBusyId(item.id);
    setActionError("");
    try {
      await api.delete(`/api/v1/carts/me/items/${encodeURIComponent(item.id)}`);
      setSelectedIds((current) => current === null ? null : new Set([...current].filter((id) => id !== item.id)));
      cart.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Không xóa được sản phẩm.");
    } finally { setBusyId(null); }
  }
  function continueToCheckout() {
    if (!selectedItems.length || hasQuantityError || stock.loading || stock.error || busyId) return;
    const query = new URLSearchParams({ items: selectedItems.map((item) => item.id).join(",") });
    router.push(`${ROUTES.buyer.checkout}?${query}`);
  }

  return <>
    <div className="cart-page-heading"><div><h1>Giỏ hàng</h1><p>{items.length ? `${items.length} sản phẩm trong giỏ` : "Xem và chọn sản phẩm trước khi tiếp tục."}</p></div><Link href={ROUTES.catalog.index}>Tiếp tục mua sắm</Link></div>
    {cart.error && <p className="notice" role="alert">{cart.error.message}</p>}
    {actionError && <p className="notice" role="alert">{actionError}</p>}
    <div className="buyer-cart-layout">
      <div className="buyer-cart-items">
        {items.length ? <>
          <label className="cart-select-all"><input type="checkbox" checked={allSelected} onChange={toggleAll} /><span>Chọn tất cả ({items.length})</span></label>
          {Object.entries(groups).map(([sellerId, sellerItems]) => <section className="cart-seller-group" key={sellerId} aria-label={`Gian hàng ${sellerId.slice(0, 8)}`}>
            <h2>Gian hàng <span>{sellerId.slice(0, 8)}</span></h2>
            {sellerItems.map((item) => {
              const draft = draftQuantities[item.id] ?? String(item.quantity);
              const desiredQuantity = Number(draft);
              const available = stock.data?.[item.skuId];
              const quantityError = quantityErrors[item.id] || (stock.data && !Number.isInteger(desiredQuantity) ? "Nhập số lượng nguyên hợp lệ." : stock.data && desiredQuantity < 1 ? "Số lượng phải từ 1 trở lên." : available !== undefined && desiredQuantity > available ? `Kho chỉ còn ${available} sản phẩm.` : stock.data && available === undefined ? "Sản phẩm hiện không có tồn kho." : "");
              const detail = productDetails.data?.[item.productId];
              const variant = detail?.variants?.find((entry) => entry.variantId === item.skuId);
              const image = variant?.primaryImageUrl ?? variant?.images?.find((entry) => entry.isActive !== false)?.url ?? detail?.images?.find((entry) => entry.isActive !== false)?.url ?? null;
              return <article className="cart-product" key={item.id}>
                <input className="cart-product-check" type="checkbox" checked={selectedIds === null || selectedIds.has(item.id)} onChange={() => toggleItem(item.id)} aria-label={`Chọn ${item.productName}`} />
                <Link className="cart-product-image" href={ROUTES.catalog.product(item.productId)} aria-label={`Xem ${item.productName}`}><BackendImage src={resolveImageUrl(image)} alt="" compact /></Link>
                <div className="cart-product-info">
                  <Link className="cart-product-title" href={ROUTES.catalog.product(item.productId)}>{item.productName}</Link>
                  {variant?.name && <p>Phiên bản: {variant.name}</p>}
                  <p>Mã SKU: {variant?.skuCode ?? item.skuId}</p>
                  <div className="cart-product-actions"><span className="cart-quantity-label">Số lượng</span><div className="cart-quantity-control" role="group" aria-label={`Số lượng ${item.productName}`}>
                    <button type="button" disabled={busyId !== null || stock.loading} aria-label={item.quantity === 1 ? `Xóa ${item.productName} khỏi giỏ hàng` : `Giảm số lượng ${item.productName}`} onClick={() => void (item.quantity === 1 ? removeItem(item) : updateQuantity(item, item.quantity - 1))}>
                      {item.quantity === 1 ? <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" /></svg> : <span aria-hidden="true">−</span>}
                    </button>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={draft} disabled={busyId !== null} aria-label={`Nhập số lượng ${item.productName}`} aria-invalid={Boolean(quantityError)} aria-describedby={quantityError ? `cart-quantity-error-${item.id}` : undefined} onChange={(event) => setDraft(item, event.target.value)} onBlur={() => commitDraft(item)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />
                    <button type="button" disabled={busyId !== null || stock.loading} aria-label={`Tăng số lượng ${item.productName}`} onClick={() => {
                      const next = item.quantity + 1;
                      if (stock.data && next > (stock.data[item.skuId] ?? 0)) setDraft(item, String(next));
                      else void updateQuantity(item, next);
                    }}><span aria-hidden="true">+</span></button>
                  </div></div>
                  {quantityError && <p className="cart-quantity-error" id={`cart-quantity-error-${item.id}`} role="alert">{quantityError}</p>}
                </div>
                <div className="cart-product-price"><strong>{formatMoney(item.unitPriceSnapshot * item.quantity)}</strong><span>{formatMoney(item.unitPriceSnapshot)} / sản phẩm</span></div>
              </article>;
            })}
          </section>)}
        </> : <div className="cart-empty"><NoData title={cart.loading ? "Đang tải giỏ hàng…" : cart.error ? "Không tải được giỏ hàng" : "Giỏ hàng đang trống"} />{!cart.loading && !cart.error && <Link className="button button-primary" href={ROUTES.catalog.index}>Khám phá sản phẩm</Link>}</div>}
      </div>
      <aside className="buyer-cart-summary"><h2>Tóm tắt đơn hàng</h2><div className="cart-summary-line"><span>Sản phẩm đã chọn ({selectedItems.length})</span><strong>{formatMoney(selectedTotal)}</strong></div><div className="cart-summary-total"><span>Tạm tính</span><strong>{formatMoney(selectedTotal)}</strong></div><button className="button button-primary" type="button" disabled={!selectedItems.length || hasQuantityError || stock.loading || Boolean(stock.error) || busyId !== null} onClick={continueToCheckout}>Tiếp tục đặt hàng</button><p>{stock.error ? "Chưa kiểm tra được tồn kho. Vui lòng tải lại trang." : hasQuantityError ? "Điều chỉnh số lượng theo tồn kho trước khi tiếp tục." : selectedItems.length ? "Bước tiếp theo nhập thông tin giao hàng. Phí vận chuyển được xác định sau." : "Chọn ít nhất một sản phẩm để tiếp tục."}</p></aside>
    </div>
  </>;
}

type CartProductDetail = { images?: Array<{ url: string; isActive?: boolean }>; variants?: Array<{ variantId: string; name?: string; skuCode?: string; primaryImageUrl?: string | null; images?: Array<{ url: string; isActive?: boolean }> }> };
type InventoryBalance = { skuId: string; availableQuantity: number };

export function CheckoutScreen() {
  const cart = useCart();
  const searchParams = useSearchParams();
  const selectedParam = searchParams.get("items");
  const [form, setForm] = useState<ShippingForm>(loadShipping);
  const [errors, setErrors] = useState<ShippingErrors>({});
  const [saved, setSaved] = useState(false);
  const [extra, setExtra] = useState<ShippingExtra>(loadShippingExtra);
  const selectedProvince = administrativeUnits.provinces.find((entry) => entry.code === extra.province);
  const currentErrors = validateShipping(form, extra);
  const isShippingComplete = Object.keys(currentErrors).length === 0;
  const allItems = cart.data?.items ?? [];
  const selectedIds = selectedParam ? new Set(selectedParam.split(",").filter(Boolean)) : null;
  const items = selectedIds ? allItems.filter((item) => selectedIds.has(item.id)) : allItems;
  const subtotal = items.reduce((sum, item) => sum + item.unitPriceSnapshot * item.quantity, 0);
  const checkoutProductIds = [...new Set(items.map((item) => item.productId).filter(Boolean))];
  const checkoutProducts = useApiResource(checkoutProductIds.length ? `checkout-products:${checkoutProductIds.join(",")}` : null, async (signal) => {
    const pairs = await Promise.all(checkoutProductIds.map(async (id) => {
      try { return [id, unwrap(await api.get<ApiResponse<CartProductDetail> | CartProductDetail>(`/api/v1/products/${encodeURIComponent(id)}`, { signal }))] as const; }
      catch { return [id, null] as const; }
    }));
    return Object.fromEntries(pairs) as Record<string, CartProductDetail | null>;
  });

  function setField(field: keyof ShippingForm, value: string) {
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);
    setSaved(false);
    if (errors[field]) {
      const nextErrors = validateShipping(nextForm, extra);
      setErrors((current) => ({ ...current, [field]: nextErrors[field] }));
    }
  }
  function blurField(field: keyof ShippingErrors) {
    const nextErrors = validateShipping(form, extra);
    if (nextErrors[field]) {
      setErrors((current) => ({ ...current, [field]: nextErrors[field] }));
    }
  }
  function saveShipping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateShipping(form, extra);
    setErrors(found);
    if (Object.keys(found).length) {
      setSaved(false);
      const order: Array<keyof ShippingErrors> = ["receiverName", "phone", "address", "province", "ward"];
      const firstKey = order.find((key) => Boolean(found[key]));
      if (firstKey) {
        event.currentTarget.querySelector<HTMLElement>(`[name="${firstKey}"]`)?.focus();
      }
      return;
    }
    window.sessionStorage.setItem(SHIPPING_STORAGE_KEY, JSON.stringify({ receiverName: form.receiverName.trim(), phone: form.phone.trim(), address: form.address.trim() }));
    window.sessionStorage.setItem(SHIPPING_EXTRA_KEY, JSON.stringify(extra));
    setSaved(true);
  }

  return <>
    <nav className="checkout-breadcrumb" aria-label="Đường dẫn"><Link href={ROUTES.buyer.cart}>Giỏ hàng</Link><span aria-hidden="true">›</span><span aria-current="page">Thông tin giao hàng</span><span aria-hidden="true">›</span><span>Thanh toán chưa mở</span></nav>
    {cart.error && <p className="notice" role="alert">{cart.error.message}</p>}
    <div className="checkout-layout"><div className="checkout-main">
      <section className="checkout-panel" aria-labelledby="checkout-address-heading"><div className="checkout-panel-heading"><div><h1 id="checkout-address-heading">Địa chỉ nhận hàng</h1><p>Thông tin này được lưu trên trình duyệt để bạn tiếp tục sau.</p></div></div>
        <form className="checkout-form" onSubmit={saveShipping} noValidate>
          <label className="field-wrap"><span>Họ tên người nhận <abbr className="checkout-required" title="Bắt buộc">*</abbr></span><input className="field" name="receiverName" required autoComplete="name" value={form.receiverName} onChange={(event) => setField("receiverName", event.target.value)} onBlur={() => blurField("receiverName")} aria-invalid={Boolean(errors.receiverName)} placeholder="Ví dụ: Nguyễn Văn A" />{errors.receiverName && <small className="checkout-field-error" role="alert">{errors.receiverName}</small>}</label>
          <div className="checkout-contact-row"><label className="field-wrap">Email liên hệ<input className="field" type="email" autoComplete="email" value={extra.email} onChange={(event) => setExtra((current) => ({ ...current, email: event.target.value }))} placeholder="contact@example.com" /></label>
          <label className="field-wrap"><span>Số điện thoại <abbr className="checkout-required" title="Bắt buộc">*</abbr></span><input className="field" name="phone" type="tel" required autoComplete="tel" inputMode="tel" value={form.phone} onChange={(event) => setField("phone", event.target.value)} onBlur={() => blurField("phone")} aria-invalid={Boolean(errors.phone)} placeholder="Ví dụ: 0901234567" />{errors.phone && <small className="checkout-field-error" role="alert">{errors.phone}</small>}</label></div>
          <label className="field-wrap"><span>Địa chỉ cụ thể <abbr className="checkout-required" title="Bắt buộc">*</abbr></span><input className="field" name="address" required autoComplete="street-address" value={form.address} onChange={(event) => setField("address", event.target.value)} onBlur={() => blurField("address")} aria-invalid={Boolean(errors.address)} placeholder="Số nhà, tên đường" />{errors.address && <small className="checkout-field-error" role="alert">{errors.address}</small>}</label>
          <div className="checkout-form-row"><label className="field-wrap">Quốc gia<input className="field checkout-country" value="Việt Nam" readOnly aria-readonly="true" /></label><label className="field-wrap"><span>Tỉnh / Thành phố <abbr className="checkout-required" title="Bắt buộc">*</abbr></span><select className="field" name="province" required autoComplete="address-level1" value={extra.province} aria-invalid={Boolean(errors.province)} onBlur={() => blurField("province")} onChange={(event) => { setExtra((current) => ({ ...current, province: event.target.value, ward: "" })); setErrors((current) => ({ ...current, province: undefined, ward: undefined })); setSaved(false); }}><option value="">Chọn tỉnh / thành phố</option>{administrativeUnits.provinces.map((province) => <option key={province.code} value={province.code}>{province.name}</option>)}</select>{errors.province && <small className="checkout-field-error" role="alert">{errors.province}</small>}</label></div>
          <label className="field-wrap"><span>Phường / Xã / Đặc khu <abbr className="checkout-required" title="Bắt buộc">*</abbr></span><select className="field" name="ward" required autoComplete="address-level2" value={extra.ward} disabled={!selectedProvince} aria-invalid={Boolean(errors.ward)} onBlur={() => blurField("ward")} onChange={(event) => { setExtra((current) => ({ ...current, ward: event.target.value })); setErrors((current) => ({ ...current, ward: undefined })); setSaved(false); }}><option value="">{selectedProvince ? "Chọn phường / xã / đặc khu" : "Chọn tỉnh / thành phố trước"}</option>{selectedProvince?.wards.map((ward) => <option key={ward.code} value={ward.code}>{ward.name}</option>)}</select>{errors.ward && <small className="checkout-field-error" role="alert">{errors.ward}</small>}</label>
          <label className="field-wrap">Ghi chú giao hàng<textarea className="field" rows={3} value={extra.note} onChange={(event) => setExtra((current) => ({ ...current, note: event.target.value }))} placeholder="Ví dụ: Giao hàng ngoài giờ hành chính" /></label>
          <div className="checkout-form-footer"><Link href={ROUTES.buyer.cart}>← Quay lại giỏ hàng</Link><button className={`button button-primary${isShippingComplete ? "" : " checkout-submit-incomplete"}`} type="submit" aria-disabled={!isShippingComplete}>Lưu thông tin nhận hàng</button></div>{saved && <p className="form-success" role="status">Đã lưu địa chỉ nhận hàng trên trình duyệt. Đơn hàng chưa được tạo.</p>}
        </form>
      </section>
    </div>
    <aside className="checkout-summary">{items.length ? <div className="checkout-items">{items.map((item) => {
      const detail = checkoutProducts.data?.[item.productId];
      const variant = detail?.variants?.find((entry) => entry.variantId === item.skuId);
      const image = variant?.primaryImageUrl ?? variant?.images?.find((entry) => entry.isActive !== false)?.url ?? detail?.images?.find((entry) => entry.isActive !== false)?.url ?? null;
      return <div className="checkout-item" key={item.id}><span className="checkout-item-image"><BackendImage src={resolveImageUrl(image)} alt="" compact /><span className="checkout-item-count">{item.quantity}</span></span><div><strong>{item.productName}</strong><span>{variant?.name ?? `Số lượng: ${item.quantity}`}</span></div><strong>{formatMoney(item.unitPriceSnapshot * item.quantity)}</strong></div>;
    })}</div> : <NoData title={cart.loading ? "Đang tải giỏ hàng…" : "Chưa có sản phẩm được chọn"} />}<div className="checkout-summary-line"><span>Thành tiền</span><strong>{items.length ? formatMoney(subtotal) : "—"}</strong></div><div className="checkout-summary-line"><span>Phí vận chuyển</span><span>Tính sau</span></div><div className="checkout-summary-total"><span>Tạm tính</span><strong>{items.length ? formatMoney(subtotal) : "—"}</strong></div><p>Đặt hàng và thanh toán hiện chưa mở. Bạn có thể lưu thông tin nhận hàng ở bước này.</p></aside></div>
  </>;
}
export function OrdersScreen() {
  const { user } = useSession();
  const [page, setPage] = useState(1);
  const buyerId = user?.id ?? "";
  const orders = useApiResource(buyerId ? `buyer-orders:${buyerId}:${page}` : null, (signal) => api.get<ApiResponse<Paged<Order>> | Paged<Order>>(`/api/v1/orders/buyer/${encodeURIComponent(buyerId)}?page=${page}&pageSize=20`, { signal }).then(unwrap));
  return <>
    <PageHeading title="Đơn hàng của tôi" />
    {orders.error && <p className="notice" role="alert">{orders.error.message}</p>}
    <Card className="card-pad">{orders.data?.items.length ? orders.data.items.map((order) => <div className="info-row" key={order.id}><div><Link href={ROUTES.buyer.order(order.id)}><strong>Đơn {order.id}</strong></Link><p>{order.status}</p></div><strong>{formatMoney(order.totalAmount)}</strong></div>) : <NoData title={orders.loading ? "Đang tải đơn hàng…" : orders.error ? "Không tải được đơn hàng" : "Bạn chưa có đơn hàng"} />}
      {orders.data && orders.data.pagination.totalPages > 1 && <div className="action-row"><button type="button" className="button button-secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Trang trước</button><span>Trang {page}/{orders.data.pagination.totalPages}</span><button type="button" className="button button-secondary" disabled={!orders.data.pagination.hasNextPage} onClick={() => setPage((value) => value + 1)}>Trang sau</button></div>}
    </Card>
  </>;
}

export function OrderDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const orderId = String(id ?? "");
  const order = useApiResource(orderId ? `buyer-order:${orderId}` : null, (signal) => api.get<ApiResponse<Order> | Order>(`/api/v1/orders/${encodeURIComponent(orderId)}`, { signal }).then(unwrap));
  const shipment = useApiResource(orderId ? `buyer-shipment:${orderId}` : null, (signal) => fulfillmentService.getShipmentByOrderId(orderId, signal));
  const pending = order.data?.status.replace(/[^a-z]/gi, "").toUpperCase() === "PENDINGPAYMENT";
  return <>
    <PageHeading title="Chi tiết đơn hàng" />
    {order.error && <p className="notice" role="alert">{order.error.message}</p>}
    <div className="order-detail-layout">
      {pending && <Card className="card-pad"><h2>Chờ thanh toán</h2><p>Hạn thanh toán: {order.data?.paymentDeadlineAt ? new Date(order.data.paymentDeadlineAt).toLocaleString("vi-VN") : "—"}</p><div className="action-row"><button type="button" className="button button-primary" disabled>Thanh toán bằng Ví Nexus</button><button type="button" className="button button-secondary" disabled>Thanh toán qua VNPay</button><button type="button" className="button button-secondary" disabled>Hủy đơn</button></div><p className="status-note">Thanh toán và hủy đơn tạm chưa mở trong bản demo này.</p></Card>}
      <div className="grid-3"><Card className="card-pad"><h2>Trạng thái</h2><Badge>{order.data?.status ?? "—"}</Badge></Card><Card className="card-pad"><h2>Mã đơn hàng</h2><strong className="seller-wrap-value">{orderId}</strong></Card><Card className="card-pad"><h2>Tổng thanh toán</h2><strong>{order.data ? formatMoney(order.data.totalAmount) : "—"}</strong></Card></div>
      <div className="split"><Card className="card-pad"><h2>Thông tin đơn</h2>{order.data ? <><div className="info-row"><span>Mã Buyer</span><strong>{order.data.buyerId}</strong></div><div className="info-row"><span>Hạn thanh toán</span><strong>{new Date(order.data.paymentDeadlineAt).toLocaleString("vi-VN")}</strong></div></> : <NoData title={order.loading ? "Đang tải đơn hàng…" : "Không có dữ liệu đơn hàng"} />}</Card><Card className="card-pad"><h2>Giao nhận</h2>{shipment.error && <p className="notice" role="alert">{shipment.error.message}</p>}{shipment.data ? <><div className="info-row"><span>Mã vận đơn</span><strong>{shipment.data.trackingNumber ?? "Chưa cấp"}</strong></div><div className="info-row"><span>Trạng thái</span><strong>{shipment.data.status}</strong></div><div className="info-row"><span>Người nhận</span><strong>{shipment.data.receiverName}</strong></div><div className="info-row"><span>Địa chỉ</span><strong>{shipment.data.receiverAddress}</strong></div></> : <NoData title={shipment.loading ? "Đang tải vận đơn…" : "Chưa có vận đơn"} />}</Card></div>
      <Card className="card-pad"><h2>Sản phẩm trong đơn</h2><p>Commerce hiện chỉ trả mã, trạng thái, tổng tiền và hạn thanh toán. Danh sách sản phẩm sẽ hiển thị khi API chi tiết đơn cung cấp dữ liệu thật.</p></Card>
    </div>
  </>;
}
