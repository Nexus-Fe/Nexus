"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ROUTES } from "@/constants/routes";
import { Icon } from "@/components/ui/Icon";
import { ButtonLink, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { BackendImage } from "@/components/ui/BackendImage";
import { api, unwrap, type ApiResponse } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatMoney, resolveImageUrl } from "@/lib/presentation";
import { AuctionTile, auctionService } from "@/features/auction";

type Product = { id: string; productId?: string; name: string; description?: string; price: number; minPrice?: number | null; maxPrice?: number | null; primaryImageUrl?: string | null; imageUrl?: string; brand?: string; status?: string; categoryId?: string; categoryName?: string; variantCount?: number; variants?: Array<{ id: string; skuId?: string; name?: string; sku?: string; price?: number | null; status?: string; stock?: number }> };
type Category = { id: string; categoryId?: string; name: string; parentId?: string | null };
type List<T> = T[] | { items?: T[]; data?: T[]; results?: T[]; categories?: T[] };
type ProductPage = { items: Product[]; pagination: { pageIndex: number; pageSize: number; totalCount: number; totalPages: number; hasPreviousPage: boolean; hasNextPage: boolean } };
const rows = <T,>(value: List<T> | null): T[] => Array.isArray(value) ? value : value?.items ?? value?.data ?? value?.results ?? value?.categories ?? [];
const problem = (error: Error | null) => error?.message ?? "";
const pageSizes = [10, 30, 50] as const;

function catalogHref(keyword: string, categoryId: string, page: number, pageSize: number): string {
  const params = new URLSearchParams();
  if (keyword) params.set("keyword", keyword);
  if (categoryId) params.set("categoryId", categoryId);
  if (page > 1) params.set("page", String(page));
  if (pageSize !== 10) params.set("pageSize", String(pageSize));
  return `${ROUTES.catalog.index}${params.size ? `?${params}` : ""}`;
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
function useProducts(search = "", categoryId = "", page = 1, pageSize = 10) {
  const path = search || categoryId ? "/api/v1/products/search" : "/api/v1/products";
  const key = `${path}?${new URLSearchParams({ page: String(page), pageSize: String(pageSize), saleType: "REGULAR", status: "ACTIVE", ...(search ? { keyword: search } : {}), ...(categoryId ? { categoryId } : {}) })}`;
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
  const categories = useApiResource("/api/v1/categories", async () => rows(unwrap(await api.get<ApiResponse<List<Category>>>("/api/v1/categories"))).map((category) => ({ ...category, id: category.id ?? category.categoryId ?? "" })));
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
      {categories.error ? <p role="alert" className="notice">{problem(categories.error)}</p> : categories.data?.length ? <div className="category-rail">{categories.data.map((category) => <Link className="category-tile" key={category.id} href={`${ROUTES.catalog.index}?categoryId=${encodeURIComponent(category.id)}`}><span className="category-tile-mark"><Icon name="grid" size={20}/></span><strong>{category.name}</strong><Icon name="arrow" size={15}/></Link>)}</div> : <NoData className="empty-grid" title={categories.loading ? "Đang tải danh mục…" : "Chưa có danh mục"} />}
    </section>
  </>;
}

function CatalogFilters({ initialSearch, initialCategoryId, pageSize, categories, categoriesError }: {
  initialSearch: string;
  initialCategoryId: string;
  pageSize: number;
  categories: Category[];
  categoriesError: Error | null;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [categoryId, setCategoryId] = useState(initialCategoryId);

  const applyFilters = () => {
    router.push(catalogHref(search.trim(), categoryId, 1, pageSize), { scroll: false });
  };

  const clearFilters = () => {
    setSearch("");
    setCategoryId("");
    router.push(catalogHref("", "", 1, pageSize), { scroll: false });
  };

  return <Card className="card-pad catalog-filters"><h2 style={{fontSize:16}}>Bộ lọc tìm kiếm</h2><form onSubmit={(e) => { e.preventDefault(); applyFilters(); }}><div className="field-wrap"><label htmlFor="catalog-search">Tìm sản phẩm</label><input id="catalog-search" value={search} onChange={(e) => setSearch(e.target.value)} type="search" className="field" placeholder="Tên hoặc từ khóa" maxLength={100} /></div><div className="field-wrap" style={{marginTop:18}}><label htmlFor="catalog-category">Danh mục sản phẩm</label><select id="catalog-category" className="select-field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">Tất cả danh mục</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{categoriesError && <small role="alert">{problem(categoriesError)}</small>}</div><div className="action-row"><button className="button button-primary" type="submit">Tìm kiếm</button><button className="button button-secondary" type="button" onClick={clearFilters}>Xóa lọc</button></div></form></Card>;
}

export function CatalogScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("keyword") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const requestedPage = Number(searchParams.get("page"));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const requestedPageSize = Number(searchParams.get("pageSize"));
  const pageSize = pageSizes.find((size) => size === requestedPageSize) ?? 10;
  const categories = useApiResource("/api/v1/categories", async () => rows(unwrap(await api.get<ApiResponse<List<Category>>>("/api/v1/categories"))).map((category) => ({ ...category, id: category.id ?? category.categoryId ?? "" })));
  const products = useProducts(query, categoryId, page, pageSize);
  const categoryRows = categories.data ?? []; const productRows = products.data?.items ?? [];
  const categoryName = categoryRows.find((item) => item.id === categoryId)?.name;
  const pagination = products.data?.pagination;
  const totalPages = pagination?.totalPages ?? 0;
  const pageIndex = pagination?.pageIndex ?? page;
  const firstItem = productRows.length ? (pageIndex - 1) * pageSize + 1 : 0;
  const lastItem = productRows.length ? firstItem + productRows.length - 1 : 0;
  const goToPage = (target: number) => router.push(`${catalogHref(query, categoryId, target, pageSize)}#catalog-results`);

  return <>
    <PageHeading title="Danh sách sản phẩm" description="Khám phá các sản phẩm đang được bán trên sàn." />
    <div className="split catalog-layout">
      <CatalogFilters key={JSON.stringify([query, categoryId])} initialSearch={query} initialCategoryId={categoryId} pageSize={pageSize} categories={categoryRows} categoriesError={categories.error} />
      <div id="catalog-results" className="catalog-results">
        <div className="section-heading catalog-results-heading">
          <div><h2>Sản phẩm đang bán</h2><p aria-live="polite">{products.loading ? "Đang tải…" : `Hiển thị ${firstItem}–${lastItem} / ${pagination?.totalCount ?? 0} sản phẩm${categoryName ? ` · ${categoryName}` : ""}`}</p></div>
          <label className="catalog-page-size" htmlFor="catalog-page-size">Sản phẩm / trang
            <select id="catalog-page-size" className="select-field" value={pageSize} onChange={(event) => router.push(catalogHref(query, categoryId, 1, Number(event.target.value)), { scroll: false })}>
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
