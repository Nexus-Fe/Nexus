"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Badge, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { BackendImage } from "@/components/ui/BackendImage";
import { ROUTES } from "@/constants/routes";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatMoney, resolveImageUrl } from "@/lib/presentation";
import { sellerCatalogService, type SellerProductDetail } from "./services/catalog.service";
import { MAX_INVENTORY_QUANTITY, parseInitialInventoryQuantity } from "./services/inventory-quantity";

const maxImageBytes = 5 * 1024 * 1024;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function ProductDetailsForm({ product, onSaved }: { product: SellerProductDetail; onSaved: () => void }) {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? "");
  const [brand, setBrand] = useState(product.brand ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await sellerCatalogService.update(product.productId, { name: name.trim(), description: description.trim(), brand: brand.trim(), categoryId: product.categoryId });
      onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không lưu được sản phẩm."); }
    finally { setBusy(false); }
  }
  return <Card className="card-pad"><SectionHeading title="Thông tin sản phẩm" /><form className="auth-fields" onSubmit={(event) => void save(event)}>
    <label className="field-wrap">Tên sản phẩm<input className="field" required value={name} onChange={(event) => setName(event.target.value)} /></label>
    <div className="form-grid"><label className="field-wrap">Thương hiệu<input className="field" value={brand} onChange={(event) => setBrand(event.target.value)} /></label><div className="field-wrap"><span>Danh mục</span><strong>{product.categoryName ?? product.categoryId}</strong></div></div>
    <label className="field-wrap">Mô tả<textarea className="textarea-field" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
    {error && <p className="notice" role="alert">{error}</p>}
    <button className="button button-secondary" disabled={busy}>{busy ? "Đang lưu…" : "Lưu thay đổi"}</button>
  </form></Card>;
}

export function SellerProductDetailScreen() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String(params.id ?? "");
  const product = useApiResource(id ? `seller-product:${id}` : null, (signal) => sellerCatalogService.detail(id, signal));
  const [skuCode, setSkuCode] = useState("");
  const [variantName, setVariantName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const data = product.data;
  const activeVariants = data?.variants.filter((variant) => variant.status.toUpperCase() === "ACTIVE" && Number(variant.price) > 0) ?? [];
  const defaultVariant = activeVariants.find((variant) => variant.isActive);
  const hasImage = data?.images.some((image) => image.isActive) ?? false;
  const inventory = useApiResource(defaultVariant ? `seller-product-stock:${defaultVariant.variantId}` : null, (signal) => sellerCatalogService.inventory(defaultVariant?.variantId ?? "", signal));
  const canActivate = Boolean(defaultVariant && hasImage && inventory.data);

  async function addVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const initialQuantity = parseInitialInventoryQuantity(quantity);
      await sellerCatalogService.addVariant(id, { skuCode: skuCode.trim(), name: variantName.trim(), price: Number(price), currency: "VND", quantity: initialQuantity, attributes: [color.trim() && { attrName: "Màu sắc", attrValue: color.trim() }, size.trim() && { attrName: "Kích cỡ", attrValue: size.trim() }].filter((attribute): attribute is { attrName: string; attrValue: string } => Boolean(attribute)) });
      setSkuCode(""); setVariantName(""); setPrice(""); setQuantity(""); setColor(""); setSize(""); setNotice("Đã thêm biến thể cùng tồn ban đầu."); product.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thêm được biến thể."); }
    finally { setBusy(false); }
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !imageTypes.has(file.type) || file.size > maxImageBytes) { setError("Chọn ảnh JPG, PNG hoặc WEBP không quá 5 MB."); return; }
    setBusy(true); setError(""); setNotice("");
    try { await sellerCatalogService.uploadImage(id, file, altText); setFile(null); setAltText(""); setNotice("Đã tải ảnh lên."); product.reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không tải được ảnh."); }
    finally { setBusy(false); }
  }
  async function changeStatus(status: "ACTIVE" | "INACTIVE") {
    setBusy(true); setError(""); setNotice("");
    try { await sellerCatalogService.changeStatus(id, status); setNotice(status === "ACTIVE" ? "Sản phẩm đã được kích hoạt." : "Sản phẩm đã tạm ngừng bán."); product.reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không đổi được trạng thái sản phẩm."); }
    finally { setBusy(false); }
  }
  async function deleteProduct() {
    if (!window.confirm("Xóa sản phẩm này? Thao tác sẽ ẩn sản phẩm và các biến thể khỏi sàn.")) return;
    setBusy(true); setError(""); setNotice("");
    try { await sellerCatalogService.deleteProduct(id); router.replace(ROUTES.seller.products); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không xóa được sản phẩm."); setBusy(false); }
  }
  async function setDefaultVariant(variantId: string) {
    setBusy(true); setError(""); setNotice("");
    try { await sellerCatalogService.setDefaultVariant(id, variantId); setNotice("Đã chọn biến thể mặc định."); product.reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không chọn được biến thể mặc định."); }
    finally { setBusy(false); }
  }
  async function deleteImage(imageId: string) {
    if (!window.confirm("Xóa ảnh này khỏi sản phẩm?")) return;
    setBusy(true); setError(""); setNotice("");
    try { await sellerCatalogService.deleteImage(id, imageId); setNotice("Đã xóa ảnh."); product.reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không xóa được ảnh."); }
    finally { setBusy(false); }
  }

  return <>
    <PageHeading title={data?.name ?? "Chi tiết sản phẩm"} />
    {product.error && <p className="notice" role="alert">{product.error.message} Kiểm tra route /api/v1/seller/products trên Gateway.</p>}
    {error && <p className="notice" role="alert">{error}</p>}{notice && <p className="form-success" role="status">{notice}</p>}
    {!data ? <Card><NoData title={product.loading ? "Đang tải sản phẩm…" : "Chưa tải được sản phẩm"} /></Card> : <div className="seller-product-workspace">
      <Card className="card-pad"><div className="seller-product-summary"><div><Badge>{data.status}</Badge><p>Mã sản phẩm: {data.productId}</p></div><div className="action-row"><Link className="button button-secondary" href={ROUTES.seller.inventory}>Xem tồn kho</Link>{data.status.toUpperCase() === "ACTIVE" && <button type="button" className="button button-secondary" disabled={busy} onClick={() => void changeStatus("INACTIVE")}>Tạm ngừng bán</button>}<button type="button" className="button button-secondary" disabled={busy} onClick={() => void deleteProduct()}>Xóa sản phẩm</button></div></div></Card>
      <ProductDetailsForm key={data.productId} product={data} onSaved={() => { setNotice("Đã lưu sản phẩm."); product.reload(); }} />
      <Card className="card-pad"><SectionHeading title={`Biến thể (${data.variants.length}/10)`} /><div className="table-scroll"><table className="data-table"><thead><tr><th>SKU</th><th>Tên</th><th>Thuộc tính</th><th>Giá</th><th>Trạng thái</th><th>Biến thể mặc định</th></tr></thead><tbody>{data.variants.map((variant) => <tr key={variant.variantId}><td>{variant.skuCode}</td><td>{variant.name}</td><td>{variant.attributes.map((attribute) => `${attribute.attrName}: ${attribute.attrValue}`).join(", ") || "—"}</td><td>{formatMoney(variant.price)}</td><td><Badge>{variant.status}</Badge></td><td>{variant.isActive ? <Badge>Mặc định</Badge> : <button type="button" className="button button-secondary" disabled={busy || variant.status.toUpperCase() !== "ACTIVE"} onClick={() => void setDefaultVariant(variant.variantId)}>Đặt mặc định</button>}</td></tr>)}</tbody></table></div>
        {data.variants.length < 10 && <form className="auth-fields seller-product-form" onSubmit={(event) => void addVariant(event)}><h3>Thêm biến thể</h3><div className="form-grid"><label className="field-wrap">Mã SKU<input className="field" required value={skuCode} onChange={(event) => setSkuCode(event.target.value)} /></label><label className="field-wrap">Tên biến thể<input className="field" required value={variantName} onChange={(event) => setVariantName(event.target.value)} /></label><label className="field-wrap">Màu sắc<input className="field" value={color} onChange={(event) => setColor(event.target.value)} /></label><label className="field-wrap">Kích cỡ<input className="field" value={size} onChange={(event) => setSize(event.target.value)} /></label><label className="field-wrap">Giá (VND)<input className="field" type="number" min="1" required value={price} onChange={(event) => setPrice(event.target.value)} /></label><label className="field-wrap">Tồn ban đầu<input className="field" type="number" min="0" max={MAX_INVENTORY_QUANTITY} step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label></div><button className="button button-primary" disabled={busy || !Number.isFinite(Number(price)) || Number(price) <= 0 || quantity === "" || !Number.isInteger(Number(quantity)) || Number(quantity) < 0 || Number(quantity) > MAX_INVENTORY_QUANTITY}>Thêm biến thể</button></form>}
        <p className="status-note">Sửa hoặc xóa biến thể cần Gateway chuyển tiếp /api/v1/variants. Các thao tác này chưa khả dụng.</p>
      </Card>
      <Card className="card-pad"><SectionHeading title={`Ảnh sản phẩm (${data.images.length}/5)`} /><div className="seller-product-images">{data.images.map((image) => <div className="seller-product-image" key={image.id}><BackendImage src={resolveImageUrl(image.url)} alt={image.altText || data.name} compact /><span>{image.isActive ? "Ảnh đại diện" : image.altText || "Ảnh sản phẩm"}</span>{!image.isActive && <button type="button" className="button button-secondary" disabled>Đặt ảnh đại diện</button>}<button type="button" className="button button-secondary" disabled={busy || (data.status.toUpperCase() === "ACTIVE" && data.images.length === 1)} onClick={() => void deleteImage(image.id)}>Xóa ảnh</button></div>)}</div>{data.images.length < 5 && <form className="auth-fields seller-product-form" onSubmit={(event) => void upload(event)}><label className="field-wrap">Tải ảnh JPG, PNG hoặc WEBP (tối đa 5 MB)<input className="field" type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label><label className="field-wrap">Mô tả ảnh<input className="field" value={altText} onChange={(event) => setAltText(event.target.value)} /></label><button className="button button-primary" disabled={busy || !file}>Tải ảnh lên</button></form>}{data.images.length > 1 && <p className="status-note">Đổi ảnh đại diện cần Gateway chuyển tiếp /api/v1/images. Nút này sẽ mở khi route hoạt động.</p>}{data.status.toUpperCase() === "ACTIVE" && data.images.length === 1 && <p className="status-note">Không xóa ảnh duy nhất khi sản phẩm đang mở bán.</p>}</Card>
      <Card className="card-pad"><SectionHeading title="Kích hoạt bán hàng" /><p>Cần biến thể mặc định đang hoạt động, giá hợp lệ, ảnh đại diện và bản ghi tồn đã xác minh. Tồn ban đầu được khai báo khi tạo SKU.</p>{defaultVariant && <p>SKU mặc định: <strong>{defaultVariant.skuCode}</strong> · Tồn khả dụng: <strong>{inventory.data?.availableQuantity ?? "Chưa xác minh"}</strong></p>}{inventory.data?.availableQuantity === 0 && <p className="status-note">Sản phẩm có thể kích hoạt khi hết hàng, nhưng cần có tồn để nhận đơn.</p>}{inventory.error && <p className="notice" role="alert">Không xác minh được tồn kho: {inventory.error.message}</p>}<div className="action-row">{defaultVariant && <button className="button button-secondary" type="button" disabled={inventory.loading} onClick={() => inventory.reload()}>{inventory.loading ? "Đang kiểm tra…" : "Kiểm tra lại tồn"}</button>}<button className="button button-primary" type="button" disabled={busy || data.status.toUpperCase() === "ACTIVE" || !canActivate} onClick={() => void changeStatus("ACTIVE")}>{busy ? "Đang xử lý…" : data.status.toUpperCase() === "INACTIVE" ? "Mở bán lại" : "Kích hoạt sản phẩm"}</button></div></Card>
    </div>}
  </>;
}
