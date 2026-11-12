"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ROUTES } from "@/constants/routes";
import { Icon } from "@/components/ui/Icon";
import { ButtonLink, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { BackendImage } from "@/components/ui/BackendImage";
import { SwipeCarousel } from "@/components/ui/SwipeCarousel";
import { api, unwrap, type ApiResponse } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatMoney, resolveImageUrl } from "@/lib/presentation";
import { AuctionTile, auctionService } from "@/features/auction";
import { CatalogPromoBanner } from "./CatalogPromoBanner";

type Product = { id: string; productId?: string; name: string; description?: string; price: number; minPrice?: number | null; maxPrice?: number | null; primaryImageUrl?: string | null; imageUrl?: string; brand?: string; status?: string; categoryId?: string; categoryName?: string; variantCount?: number; variants?: Array<{ id: string; skuId?: string; name?: string; sku?: string; price?: number | null; status?: string; stock?: number }> };
type Category = { id: string; categoryId?: string; name: string; parentId?: string | null; children?: Category[] | null };
type List<T> = T[] | { items?: T[]; data?: T[]; results?: T[]; categories?: T[]; pagination?: { hasNextPage?: boolean } };
type ProductPage = { items: Product[]; pagination: { pageIndex: number; pageSize: number; totalCount: number; totalPages: number; hasPreviousPage: boolean; hasNextPage: boolean } };
const rows = <T,>(value: List<T> | null): T[] => Array.isArray(value) ? value : value?.items ?? value?.data ?? value?.results ?? value?.categories ?? [];
const problem = (error: Error | null) => error?.message ?? "";
const pageSizes = [10, 30, 50] as const;

function normalizeCategories(list: Category[], parentId: string | null = null): Category[] {
  return list.flatMap((category) => {
    const id = category.id ?? category.categoryId ?? "";
    return [
      { ...category, id, parentId: category.parentId ?? parentId },
      ...normalizeCategories(category.children ?? [], id),
    ];
  }).filter((category) => Boolean(category.id));
}

async function loadCategories(signal?: AbortSignal): Promise<Category[]> {
  const all: Category[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const result = unwrap(await api.get<ApiResponse<List<Category>>>(`/api/v1/categories?page=${page}&pageSize=100`, { signal }));
    all.push(...rows(result));
    if (Array.isArray(result) || !result.pagination?.hasNextPage) break;
  }
  return [...new Map(normalizeCategories(all).map((category) => [category.id, category])).values()];
}

function categoryGroups(categories: Category[]) {
  const ids = new Set(categories.map((category) => category.id));
  const roots = categories.filter((category) => !category.parentId || !ids.has(category.parentId));
  const descendants = (id: string, seen = new Set<string>()): Category[] => {
    if (seen.has(id)) return [];
    const visited = new Set([...seen, id]);
    return categories.filter((category) => category.parentId === id).flatMap((child) => [
      child,
      ...descendants(child.id, visited),
    ]);
  };
  return roots.map((parent) => ({ parent, children: descendants(parent.id) }));
}

type CatalogFilterValues = { keyword: string; categoryId: string; sortBy: string; minPrice: string; maxPrice: string; brand: string; minRating: string };
const emptyCatalogFilters: CatalogFilterValues = { keyword: "", categoryId: "", sortBy: "", minPrice: "", maxPrice: "", brand: "", minRating: "" };

function catalogHref(filters: CatalogFilterValues, page: number, pageSize: number, basePath: string = ROUTES.catalog.index): string {
  const params = new URLSearchParams();
  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.minPrice) params.set("minPrice", filters.minPrice);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  if (filters.brand) params.set("brand", filters.brand);
  if (filters.minRating) params.set("minRating", filters.minRating);
  if (page > 1) params.set("page", String(page));
  if (pageSize !== 10) params.set("pageSize", String(pageSize));
  return `${basePath}${params.size ? `?${params}` : ""}`;
}

function pageChoices(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const start = Math.max(2, Math.min(current - 1, total - 3));
  const end = Math.min(total - 1, start + 2);
  return [1, ...(start > 2 ? ["…" as const] : []),
    ...Array.from({ length: end - start + 1 }, (_, index) => start + index),
    ...(end < total - 1 ? ["…" as const] : []), total];
}

function ProductCard({ product }: { product: Product }) {
  const hasPriceRange = typeof product.maxPrice === "number" && product.maxPrice > product.price;
  return <article className="product-card"><Link href={ROUTES.catalog.product(product.id)} className="product-media"><BackendImage src={resolveImageUrl(product.imageUrl ?? null)} alt={product.name} compact /></Link><div className="product-body"><p className="product-category">{product.brand ?? product.categoryName ?? ""}</p><h3><Link href={ROUTES.catalog.product(product.id)}>{product.name}</Link></h3><p className="product-seller">{product.status ?? ""}</p><div className="product-bottom"><div className="product-card-price"><span>{hasPriceRange ? "Giá từ" : "Giá bán"}</span><strong>{formatMoney(product.price)}</strong></div><Link aria-label={`Xem ${product.name}`} href={ROUTES.catalog.product(product.id)} className="round-link"><Icon name="arrow" size={18} /></Link></div></div></article>;
}

function HomeProductBanner({ products }: { products: Product[] }) {
  const [slides, setSlides] = useState<Product[]>([]);
  useEffect(() => {
    let current = true;
    const candidates = products.filter((product) => product.id && product.imageUrl).slice(0, 20);
    Promise.all(candidates.map((product) => new Promise<Product | null>((resolve) => {
      const url = resolveImageUrl(product.imageUrl ?? null);
      if (!url) { resolve(null); return; }
      const image = new Image();
      image.onload = () => resolve(image.naturalWidth > 0 ? product : null);
      image.onerror = () => resolve(null);
      image.src = url;
    }))).then((verified) => { if (current) setSlides(verified.filter((product): product is Product => product !== null).slice(0, 5)); });
    return () => { current = false; };
  }, [products]);
  if (!slides.length) return null;
  return <section className="home-product-banner" aria-label="Sản phẩm nổi bật">
    <SwipeCarousel slides={slides} className="hero-banner" trackClassName="hero-banner-track" ariaLabel="Vuốt ngang để xem sản phẩm nổi bật" renderSlide={(product, index, isClone) =>
      <Link key={`${product.id}-${index}`} className="hero-banner-link" href={ROUTES.catalog.product(product.id)} aria-label={`Xem sản phẩm ${product.name}`} aria-hidden={isClone || undefined} tabIndex={isClone ? -1 : undefined} draggable={false}>
        <div className="hero-banner-image"><div className="hero-banner-backdrop" aria-hidden="true"><BackendImage src={resolveImageUrl(product.imageUrl ?? null)} alt="" compact /></div><BackendImage src={resolveImageUrl(product.imageUrl ?? null)} alt={product.name} compact /></div>
      </Link>
    } />
  </section>;
}

function useProducts(filters: CatalogFilterValues = emptyCatalogFilters, page = 1, pageSize = 10, sellerId = "") {
  const path = filters.keyword || filters.categoryId || filters.sortBy || filters.minPrice || filters.maxPrice || filters.brand || filters.minRating || sellerId
    ? "/api/v1/products/search" : "/api/v1/products";
  const key = `${path}?${new URLSearchParams({ page: String(page), pageSize: String(pageSize), saleType: "REGULAR", status: "ACTIVE", ...(filters.keyword ? { keyword: filters.keyword } : {}), ...(filters.categoryId ? { categoryId: filters.categoryId } : {}), ...(filters.sortBy ? { sortBy: filters.sortBy } : {}), ...(filters.minPrice ? { minPrice: filters.minPrice } : {}), ...(filters.maxPrice ? { maxPrice: filters.maxPrice } : {}), ...(filters.brand ? { brand: filters.brand } : {}), ...(filters.minRating ? { minRating: filters.minRating } : {}), ...(sellerId ? { sellerId } : {}) })}`;
  return useApiResource(key, async (signal) => {
    const result = unwrap(await api.get<ApiResponse<ProductPage> | ProductPage>(key, { signal }));
    return {
      ...result,
      items: result.items.filter((product) => !product.status || product.status.toUpperCase() === "ACTIVE").map((product) => ({
        ...product,
        id: product.id ?? product.productId ?? "",
        price: product.minPrice ?? product.price ?? Number.NaN,
        imageUrl: product.primaryImageUrl ?? product.imageUrl,
      })),
    };
  });
}

export function HomeScreen() {
  const products = useProducts();
  const auctions = useApiResource("/api/v1/auctions?page=1&pageSize=3", async (signal) => (await auctionService.list(1, 3, undefined, signal)).data.items);
  const categories = useApiResource("/api/v1/categories", loadCategories);
  return <>
    <div className="hero">
      <div className="hero-copy">
        <p className="overline">Nexus Marketplace</p>
        <h1>Khám phá món đồ bạn muốn sở hữu.</h1>
        <p>Tìm kiếm sản phẩm và theo dõi các phiên đấu giá trong một không gian rõ ràng, dễ sử dụng.</p>
        <div className="action-row"><ButtonLink href={ROUTES.catalog.index}>Khám phá sản phẩm <Icon name="arrow" /></ButtonLink><ButtonLink href="#home-auctions" variant="secondary">Xem phiên đấu giá</ButtonLink></div>
      </div>
      <div className="hero-visual" aria-hidden="true"><span className="hero-orbit hero-orbit-one"/><span className="hero-orbit hero-orbit-two"/><span className="hero-icon"><Icon name="gavel" size={58} /></span></div>
    </div>

    <HomeProductBanner products={products.data?.items ?? []} />

    <section id="home-auctions" className="home-section" aria-label="Phiên đấu giá">
      <SectionHeading id="home-auctions-title" title="Phiên đấu giá trực tuyến" hint="Theo dõi các phiên đang diễn ra và sắp mở." />
      <div className="auction-list-grid">
        {auctions.data?.length ? auctions.data.map((auction) => <AuctionTile key={auction.auctionId} auction={auction} href={ROUTES.auction.room(auction.auctionId)} />) : <Card className="empty-grid"><NoData title={auctions.loading ? "Đang tải phiên đấu giá…" : auctions.error ? problem(auctions.error) : "Chưa có phiên đấu giá"} /></Card>}
      </div>
    </section>

    <section className="home-section" aria-labelledby="home-products-title">
      <SectionHeading id="home-products-title" title="Sản phẩm niêm yết mua ngay" hint="Xem các sản phẩm đang được đăng bán." action={<Link href={ROUTES.catalog.index}>Tất cả sản phẩm <Icon name="arrow" size={15}/></Link>} />
      {products.error && <p role="alert" className="notice">{problem(products.error)}</p>}
      <div className="product-grid">{products.data?.items.length ? products.data.items.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} />) : <NoData className="empty-grid" title={products.loading ? "Đang tải sản phẩm…" : products.error ? "Không tải được sản phẩm" : "Chưa có sản phẩm"} />}</div>
    </section>

    <section className="home-section home-categories" aria-labelledby="home-categories-title">
      <SectionHeading id="home-categories-title" title="Danh mục khám phá" hint="Tìm nhanh theo danh mục sản phẩm." action={<Link href={ROUTES.catalog.index}>Mở danh mục <Icon name="arrow" size={15}/></Link>} />
      {categories.error ? <p role="alert" className="notice">{problem(categories.error)}</p> : categories.data?.length ? <div className="category-rail">{categoryGroups(categories.data).map(({ parent, children }) => <div className="category-tile" key={parent.id}><span className="category-tile-mark"><Icon name="grid" size={20}/></span>{children.length ? <><strong>{parent.name}</strong><div className="category-tile-children">{children.map((child) => <Link key={child.id} href={`${ROUTES.catalog.index}?categoryId=${encodeURIComponent(child.id)}`}>{child.name}</Link>)}</div></> : <Link href={`${ROUTES.catalog.index}?categoryId=${encodeURIComponent(parent.id)}`}><strong>{parent.name}</strong></Link>}</div>)}</div> : <NoData className="empty-grid" title={categories.loading ? "Đang tải danh mục…" : "Chưa có danh mục"} />}
    </section>
  </>;
}

function CatalogFilters({ initialFilters, pageSize, categories, categoriesError, basePath }: {
  initialFilters: CatalogFilterValues;
  pageSize: number;
  categories: Category[];
  categoriesError: Error | null;
  basePath: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialFilters.keyword);
  const [categoryId, setCategoryId] = useState(initialFilters.categoryId);
  const [sortBy, setSortBy] = useState(initialFilters.sortBy);
  const [minPrice, setMinPrice] = useState(initialFilters.minPrice);
  const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice);
  const [brand, setBrand] = useState(initialFilters.brand);
  const [minRating, setMinRating] = useState(initialFilters.minRating);
  const [filterError, setFilterError] = useState("");

  const applyFilters = () => {
    if ((minPrice && !Number.isSafeInteger(Number(minPrice))) || (maxPrice && !Number.isSafeInteger(Number(maxPrice))) ||
      (minPrice && Number(minPrice) < 0) || (maxPrice && Number(maxPrice) < 0) ||
      (minPrice && maxPrice && Number(minPrice) > Number(maxPrice))) {
      setFilterError("Khoảng giá phải là số nguyên không âm và giá thấp nhất không vượt giá cao nhất.");
      return;
    }
    setFilterError("");
    router.push(catalogHref({ keyword: search.trim(), categoryId, sortBy, minPrice, maxPrice, brand: brand.trim(), minRating }, 1, pageSize, basePath), { scroll: false });
  };

  const clearFilters = () => {
    setSearch(""); setCategoryId(""); setSortBy(""); setMinPrice(""); setMaxPrice(""); setBrand(""); setMinRating(""); setFilterError("");
    router.push(catalogHref(emptyCatalogFilters, 1, pageSize, basePath), { scroll: false });
  };

  return <Card className="card-pad catalog-filters"><h2 style={{fontSize:16}}>Bộ lọc tìm kiếm</h2><form onSubmit={(e) => { e.preventDefault(); applyFilters(); }}><div className="field-wrap"><label htmlFor="catalog-search">Tìm sản phẩm</label><input id="catalog-search" value={search} onChange={(e) => setSearch(e.target.value)} type="search" className="field" placeholder="Tên hoặc từ khóa" maxLength={100} /></div><div className="field-wrap" style={{marginTop:18}}><label htmlFor="catalog-category">Danh mục sản phẩm</label><select id="catalog-category" className="select-field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">Tất cả danh mục</option>{categoryGroups(categories).map(({ parent, children }) => children.length ? <optgroup key={parent.id} label={parent.name}>{children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</optgroup> : <option key={parent.id} value={parent.id}>{parent.name}</option>)}</select>{categoriesError && <small role="alert">{problem(categoriesError)}</small>}</div><div className="field-wrap" style={{marginTop:18}}><label htmlFor="catalog-sort">Sắp xếp giá</label><select id="catalog-sort" className="select-field" value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="">Mặc định</option><option value="price_asc">Giá thấp đến cao</option><option value="price_desc">Giá cao đến thấp</option></select></div><div className="catalog-price-fields"><label className="field-wrap" htmlFor="catalog-min-price">Giá từ<input id="catalog-min-price" className="field" type="number" min="0" step="1" inputMode="numeric" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="₫" /></label><label className="field-wrap" htmlFor="catalog-max-price">Giá đến<input id="catalog-max-price" className="field" type="number" min="0" step="1" inputMode="numeric" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="₫" /></label></div><div className="field-wrap" style={{marginTop:18}}><label htmlFor="catalog-brand">Thương hiệu</label><input id="catalog-brand" className="field" value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={80} placeholder="Tên thương hiệu" /></div><div className="field-wrap" style={{marginTop:18, marginBottom:18}}><label htmlFor="catalog-rating">Đánh giá tối thiểu</label><select id="catalog-rating" className="select-field" value={minRating} onChange={(e) => setMinRating(e.target.value)}><option value="">Tất cả đánh giá</option><option value="3">Từ 3 sao</option><option value="4">Từ 4 sao</option><option value="5">5 sao</option></select></div>{filterError && <p className="notice" role="alert">{filterError}</p>}<div className="action-row"><button className="button button-primary" type="submit">Tìm kiếm</button><button className="button button-secondary" type="button" onClick={clearFilters}>Xóa lọc</button></div></form></Card>;
}

export function CatalogScreen({ sellerId = "", title = "Danh sách sản phẩm", description = "Khám phá các sản phẩm đang được bán trên sàn." }: { sellerId?: string; title?: string; description?: string } = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const filters: CatalogFilterValues = {
    keyword: searchParams.get("keyword") ?? "",
    categoryId: searchParams.get("categoryId") ?? "",
    sortBy: ["price_asc", "price_desc"].includes(searchParams.get("sortBy") ?? "") ? searchParams.get("sortBy")! : "",
    minPrice: searchParams.get("minPrice") ?? "",
    maxPrice: searchParams.get("maxPrice") ?? "",
    brand: searchParams.get("brand") ?? "",
    minRating: searchParams.get("minRating") ?? "",
  };
  const requestedPage = Number(searchParams.get("page"));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const requestedPageSize = Number(searchParams.get("pageSize"));
  const pageSize = pageSizes.find((size) => size === requestedPageSize) ?? 10;
  const categories = useApiResource("/api/v1/categories", loadCategories);
  const products = useProducts(filters, page, pageSize, sellerId);
  const categoryRows = categories.data ?? []; const productRows = products.data?.items ?? [];
  const selectedCategory = categoryRows.find((item) => item.id === filters.categoryId);
  const parentName = categoryRows.find((item) => item.id === selectedCategory?.parentId)?.name;
  const categoryName = selectedCategory ? [parentName, selectedCategory.name].filter(Boolean).join(" / ") : "";
  const pagination = products.data?.pagination;
  const totalPages = pagination?.totalPages ?? 0;
  const pageIndex = pagination?.pageIndex ?? page;
  const firstItem = productRows.length ? (pageIndex - 1) * pageSize + 1 : 0;
  const lastItem = productRows.length ? firstItem + productRows.length - 1 : 0;
  const basePath = sellerId ? ROUTES.catalog.shop(sellerId) : ROUTES.catalog.index;
  const goToPage = (target: number) => router.push(`${catalogHref(filters, target, pageSize, basePath)}#catalog-results`);
  const heading = <PageHeading title={title} description={description} />;

  return <>
    {sellerId ? heading : <div className="catalog-intro">{heading}<CatalogPromoBanner /></div>}
    <div className="split catalog-layout">
      <CatalogFilters key={JSON.stringify(filters)} initialFilters={filters} pageSize={pageSize} categories={categoryRows} categoriesError={categories.error} basePath={basePath} />
      <div id="catalog-results" className="catalog-results">
        <div className="section-heading catalog-results-heading">
          <div><h2>Sản phẩm đang bán</h2><p aria-live="polite">{products.loading ? "Đang tải…" : `Hiển thị ${firstItem}–${lastItem} / ${pagination?.totalCount ?? 0} sản phẩm${categoryName ? ` · ${categoryName}` : ""}`}</p></div>
          <label className="catalog-page-size" htmlFor="catalog-page-size">Sản phẩm / trang
            <select id="catalog-page-size" className="select-field" value={pageSize} onChange={(event) => router.push(catalogHref(filters, 1, Number(event.target.value), basePath), { scroll: false })}>
              {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        </div>
        {products.error && <p role="alert" className="notice">{problem(products.error)}</p>}
        <div className="product-grid catalog-products">{productRows.length ? productRows.map((product) => <ProductCard key={product.id} product={product} />) : <NoData className="empty-grid" title={products.loading ? "Đang tải sản phẩm…" : products.error ? "Không tải được sản phẩm" : "Không tìm thấy sản phẩm"} />}</div>
        {totalPages > 1 && <nav className="catalog-pagination" aria-label="Phân trang sản phẩm">
          <button type="button" className="button button-secondary button-small" disabled={pageIndex <= 1 || products.loading} onClick={() => goToPage(pageIndex - 1)}>Trang trước</button>
          <div className="catalog-page-numbers">
            {pageChoices(pageIndex, totalPages).map((choice, index) => choice === "…"
              ? <span key={`gap-${index}`} aria-hidden="true">…</span>
              : <button key={choice} type="button" className={choice === pageIndex ? "catalog-page-number active" : "catalog-page-number"} aria-label={`Trang ${choice}`} aria-current={choice === pageIndex ? "page" : undefined} disabled={products.loading} onClick={() => goToPage(choice)}>{choice}</button>)}
          </div>
          <button type="button" className="button button-secondary button-small" disabled={pageIndex >= totalPages || products.loading} onClick={() => goToPage(pageIndex + 1)}>Trang sau</button>
        </nav>}
      </div>
    </div>
  </>;
}

export { ProductDetailScreen } from './ProductDetailScreen';
