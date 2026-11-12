"use client";

import { useState, useSyncExternalStore } from "react";
import { SwipeCarousel } from "@/components/ui/SwipeCarousel";

const storageKey = "nexus-preview-vouchers";
const updateEvent = "nexus-vouchers-updated";
const subscribeToSavedCodes = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(updateEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(updateEvent, onChange);
  };
};
const savedCodesSnapshot = () => {
  try { return window.localStorage.getItem(storageKey) ?? "[]"; }
  catch { return "[]"; }
};
const serverSavedCodesSnapshot = () => "[]";
const promotions = [
  { id: "ship15", code: "NEXUSSHIP15", amount: "15%", title: "Giảm phí vận chuyển", detail: "Mã ưu đãi vận chuyển mẫu", tone: "sky" },
  { id: "sale10", code: "NEXUSSALE10", amount: "10%", title: "Ưu đãi toàn sàn", detail: "Mã giảm giá sản phẩm mẫu", tone: "peach" },
  { id: "ship20", code: "NEXUSSHIP20", amount: "20%", title: "Thêm ưu đãi vận chuyển", detail: "Mã ưu đãi vận chuyển mẫu", tone: "mint" },
] as const;

export function CatalogPromoBanner() {
  const savedCodesJson = useSyncExternalStore(subscribeToSavedCodes, savedCodesSnapshot, serverSavedCodesSnapshot);
  const [notice, setNotice] = useState("");
  let savedCodes: string[] = [];
  try {
    const stored = JSON.parse(savedCodesJson);
    if (Array.isArray(stored)) savedCodes = stored.filter((code): code is string => typeof code === "string");
  } catch { /* Invalid preview data is treated as empty. */ }

  const saveCode = (code: string) => {
    if (savedCodes.includes(code)) return;
    const next = [...savedCodes, code];
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      window.dispatchEvent(new Event(updateEvent));
      setNotice(`Đã lưu mã ${code} trên trình duyệt này. Mã mẫu chưa áp dụng được khi thanh toán.`);
    } catch {
      setNotice("Không lưu được mã trên trình duyệt này. Vui lòng thử lại.");
    }
  };

  return <section className="catalog-promo" aria-label="Ưu đãi xem trước">
    <SwipeCarousel slides={[...promotions]} className="catalog-promo-carousel" ariaLabel="Vuốt ngang để xem các ưu đãi" renderSlide={(promotion, index, isClone) =>
      <article key={`${promotion.id}-${index}`} className={`catalog-promo-slide catalog-promo-${promotion.tone}`} aria-hidden={isClone || undefined}>
        <div className="catalog-promo-copy">
          <span className="catalog-promo-eyebrow">Ưu đãi xem trước</span>
          <h2><strong>{promotion.amount}</strong> {promotion.title}</h2>
          <p>{promotion.detail} · Chưa áp dụng thanh toán</p>
        </div>
        <div className="catalog-promo-action">
          <span className="catalog-promo-code">{promotion.code}</span>
          <button type="button" className="button button-primary button-small" disabled={isClone || savedCodes.includes(promotion.code)} tabIndex={isClone ? -1 : undefined} onClick={() => saveCode(promotion.code)}>{savedCodes.includes(promotion.code) ? "Đã lưu" : "Lưu mã"}</button>
        </div>
      </article>
    } />
    <p className="catalog-promo-notice" role="status" aria-live="polite">{notice}</p>
  </section>;
}
