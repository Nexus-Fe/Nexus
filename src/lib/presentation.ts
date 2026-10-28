export function resolveImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  try {
    const url = new URL(imageUrl, "http://local.invalid");
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin === "http://local.invalid" ? `${url.pathname}${url.search}` : url.toString();
  } catch {
    return null;
  }
}

export function formatMoney(value: number | null): string {
  return value === null || !Number.isFinite(value) ? "Chưa có dữ liệu" : new Intl.NumberFormat("vi-VN").format(value) + " ₫";
}
