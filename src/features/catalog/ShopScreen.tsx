"use client";

import { useParams } from "next/navigation";
import { BackendImage } from "@/components/ui/BackendImage";
import { Card, NoData } from "@/components/ui/Primitives";
import { api, unwrap, type ApiResponse } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import { resolveImageUrl } from "@/lib/presentation";
import { CatalogScreen } from "./CatalogScreens";

type PublicSellerProfile = {
  shopName: string;
  logoUrl?: string | null;
  description?: string | null;
  ratingAvg?: number | null;
  totalProducts?: number | null;
};

export function ShopScreen() {
  const { id } = useParams<{ id: string }>();
  const sellerId = String(id ?? "");
  const key = sellerId ? `/api/v1/sellers/${encodeURIComponent(sellerId)}` : null;
  const profile = useApiResource(key, async (signal) => {
    if (!key) throw new Error("Thiếu thông tin gian hàng.");
    return unwrap(await api.get<ApiResponse<PublicSellerProfile> | PublicSellerProfile>(key, { signal }));
  });

  return <>
    <Card className="card-pad public-shop-profile">
      {profile.data ? <>
        {profile.data.logoUrl && <div className="public-shop-logo"><BackendImage src={resolveImageUrl(profile.data.logoUrl)} alt={`Logo ${profile.data.shopName}`} compact /></div>}
        <div><p className="overline">Gian hàng trên Nexus</p><h1>{profile.data.shopName}</h1>
          {profile.data.description && <p>{profile.data.description}</p>}
          <div className="product-detail-seller-facts">
            {typeof profile.data.ratingAvg === "number" && profile.data.ratingAvg > 0 && <span>★ {profile.data.ratingAvg.toFixed(1)}/5</span>}
            {typeof profile.data.totalProducts === "number" && <span>{profile.data.totalProducts} sản phẩm</span>}
          </div>
        </div>
      </> : <div>{profile.error ? <><h1>Gian hàng</h1><p role="alert">Chưa tải được hồ sơ gian hàng. Bạn vẫn có thể xem sản phẩm bên dưới.</p><button type="button" className="button button-secondary button-small" onClick={profile.reload}>Thử lại</button></> : <NoData title="Đang tải thông tin gian hàng…" />}</div>}
    </Card>
    <CatalogScreen sellerId={sellerId} title="Sản phẩm của gian hàng" description={profile.data ? `Khám phá các sản phẩm đang bán tại ${profile.data.shopName}.` : "Khám phá các sản phẩm đang bán tại gian hàng này."} />
  </>;
}
