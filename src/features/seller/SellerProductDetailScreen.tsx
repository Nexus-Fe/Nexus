"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Badge, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { BackendImage } from "@/components/ui/BackendImage";
import { ROUTES } from "@/constants/routes";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatMoney, resolveImageUrl } from "@/lib/presentation";
import { sellerCatalogService, type SellerProductDetail } from "./services/catalog.service";

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
  const id = String(params.id ?? "");
  const product = useApiResource(id ? `seller-product:${id}` : null, (signal) => sellerCatalogService.detail(id, signal));
  const [skuCode, setSkuCode] = useState("");
  const [variantName, setVariantName] = useState("");
  const [price, setPrice] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const data = product.data;
  const activeVariants = data?.variants.filter((variant) => variant.status.toUpperCase() === "ACTIVE" && Number(variant.price) > 0) ?? [];
  const hasImage = data?.images.some((image) => image.isActive) ?? false;

  async function addVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await sellerCatalogService.addVariant(id, { skuCode: skuCode.trim(), name: variantName.trim(), price: Number(price), currency: "VND", attributes: [color.trim() && { attrName: "Màu sắc", attrValue: color.trim() }, size.trim() && { attrName: "Kích cỡ", attrValue: size.trim() }].filter((attribute): attribute is { attrName: string; attrValue: string } => Boolean(attribute)) });
      setSkuCode(""); setVariantName(""); setPrice(""); setColor(""); setSize(""); setNotice("Đã thêm biến thể."); product.reload();
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
  async function publish() {
    setBusy(true); setError(""); setNotice("");
    try { await sellerCatalogService.publish(id); setNotice("Sản phẩm đã được kích hoạt."); product.reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không kích hoạt được sản phẩm."); }
    finally { setBusy(false); }
  }

  return <>
    <PageHeading title={data?.name ?? "Chi tiết sản phẩm"} />
    {product.error && <p className="notice" role="alert">{product.error.message} Kiểm tra route /api/v1/seller/products trên Gateway.</p>}
    {error && <p className="notice" role="alert">{error}</p>}{notice && <p className="form-success" role="status">{notice}</p>}
    {!data ? <Card><NoData title={product.loading ? "Đang tải sản phẩm…" : "Chưa tải được sản phẩm"} /></Card> : <div className="seller-product-workspace">
      <Card className="card-pad"><div className="seller-product-summary"><div><Badge>{data.status}</Badge><p>Mã sản phẩm: {data.productId}</p></div><Link className="button button-secondary" href={ROUTES.seller.inventory}>Xem tồn kho</Link></div></Card>
      <ProductDetailsForm key={data.productId} product={data} onSaved={() => { setNotice("Đã lưu sản phẩm."); product.reload(); }} />
      <Card className="card-pad"><SectionHeading title={`Biến thể (${data.variants.length}/10)`} /><div className="table-scroll"><table className="data-table"><thead><tr><th>SKU</th><th>Tên</th><th>Thuộc tính</th><th>Giá</th><th>Trạng thái</th></tr></thead><tbody>{data.variants.map((variant) => <tr key={variant.variantId}><td>{variant.skuCode}</td><td>{variant.name}</td><td>{variant.attributes.map((attribute) => `${attribute.attrName}: ${attribute.attrValue}`).join(", ") || "—"}</td><td>{formatMoney(variant.price)}</td><td><Badge>{variant.status}</Badge></td></tr>)}</tbody></table></div>
        {data.variants.length < 10 && <form className="auth-fields seller-product-form" onSubmit={(event) => void addVariant(event)}><h3>Thêm biến thể</h3><div className="form-grid"><label className="field-wrap">Mã SKU<input className="field" required value={skuCode} onChange={(event) => setSkuCode(event.target.value)} /></label><label className="field-wrap">Tên biến thể<input className="field" required value={variantName} onChange={(event) => setVariantName(event.target.value)} /></label><label className="field-wrap">Màu sắc<input className="field" value={color} onChange={(event) => setColor(event.target.value)} /></label><label className="field-wrap">Kích cỡ<input className="field" value={size} onChange={(event) => setSize(event.target.value)} /></label><label className="field-wrap">Giá (VND)<input className="field" type="number" min="1" required value={price} onChange={(event) => setPrice(event.target.value)} /></label></div><button className="button button-primary" disabled={busy || !Number.isFinite(Number(price)) || Number(price) <= 0}>Thêm biến thể</button></form>}
        <p className="status-note">Sửa hoặc xóa biến thể cần Gateway chuyển tiếp /api/v1/variants. Các thao tác này chưa khả dụng.</p>
      </Card>
      <Card className="card-pad"><SectionHeading title={`Ảnh sản phẩm (${data.images.length}/5)`} /><div className="seller-product-images">{data.images.map((image) => <div className="seller-product-image" key={image.id}><BackendImage src={resolveImageUrl(image.url)} alt={image.altText || data.name} compact /><span>{image.isActive ? "Ảnh đại diện" : image.altText || "Ảnh sản phẩm"}</span></div>)}</div>{data.images.length < 5 && <form className="auth-fields seller-product-form" onSubmit={(event) => void upload(event)}><label className="field-wrap">Tải ảnh JPG, PNG hoặc WEBP (tối đa 5 MB)<input className="field" type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label><label className="field-wrap">Mô tả ảnh<input className="field" value={altText} onChange={(event) => setAltText(event.target.value)} /></label><button className="button button-primary" disabled={busy || !file}>Tải ảnh lên</button></form>}</Card>
      <Card className="card-pad"><SectionHeading title="Kích hoạt bán hàng" /><p>Cần ít nhất một biến thể đang hoạt động có giá hợp lệ và một ảnh đang hoạt động. Kiểm tra tồn kho của đúng SKU trước khi mở bán.</p><button className="button button-primary" type="button" disabled={busy || data.status.toUpperCase() === "ACTIVE" || !activeVariants.length || !hasImage} onClick={() => void publish()}>{busy ? "Đang xử lý…" : "Kích hoạt sản phẩm"}</button></Card>
    </div>}
  </>;
}
