"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

type Slide = { id: string };

export function SwipeCarousel<T extends Slide>({ slides, className, trackClassName, ariaLabel, renderSlide }: {
  slides: T[];
  className: string;
  trackClassName?: string;
  ariaLabel: string;
  renderSlide: (slide: T, index: number, isClone: boolean) => ReactNode;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; scrollLeft: number } | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (track && slides.length > 1) track.scrollLeft = track.clientWidth;
  }, [slides.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || slides.length < 2) return;
    const wrap = () => {
      const index = Math.round(track.scrollLeft / track.clientWidth);
      const target = index === 0 ? slides.length : index === slides.length + 1 ? 1 : null;
      if (target === null) return;
      track.style.scrollBehavior = "auto";
      track.scrollLeft = target * track.clientWidth;
      track.style.scrollBehavior = "";
    };
    track.addEventListener("scrollend", wrap);
    return () => track.removeEventListener("scrollend", wrap);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      const track = trackRef.current;
      if (track && document.visibilityState === "visible") {
        const index = Math.round(track.scrollLeft / track.clientWidth);
        track.scrollTo({ left: Math.min(index + 1, slides.length + 1) * track.clientWidth, behavior: "smooth" });
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [slides.length, paused]);

  if (!slides.length) return null;

  const finishDrag = () => {
    if (!dragStart.current) return;
    dragStart.current = null;
    setDragging(false);
    const track = trackRef.current;
    if (track) {
      const index = Math.round(track.scrollLeft / track.clientWidth);
      track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
    }
  };
  const renderedSlides = slides.length > 1 ? [slides[slides.length - 1], ...slides, slides[0]] : slides;

  return <div className={className} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
    <div ref={trackRef} className={`swipe-carousel-track ${trackClassName ?? ""}`} data-dragging={dragging} tabIndex={0} aria-label={ariaLabel}
      onScroll={(event) => { if (slides.length > 1) { const index = Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth); setActive((index - 1 + slides.length) % slides.length); } }}
      onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); const track = event.currentTarget; const direction = event.key === "ArrowRight" ? 1 : -1; track.scrollTo({ left: Math.max(0, Math.min(slides.length + 1, Math.round(track.scrollLeft / track.clientWidth) + direction)) * track.clientWidth, behavior: "smooth" }); } }}
      onTouchStart={(event) => { touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; swiped.current = false; }}
      onTouchEnd={(event) => { if (!touchStart.current) return; const dx = event.changedTouches[0].clientX - touchStart.current.x; const dy = event.changedTouches[0].clientY - touchStart.current.y; if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) swiped.current = true; touchStart.current = null; }}
      onPointerDown={(event) => { if (event.pointerType !== "mouse") return; dragStart.current = { x: event.clientX, scrollLeft: event.currentTarget.scrollLeft }; swiped.current = false; setDragging(true); }}
      onPointerMove={(event) => { if (!dragStart.current) return; const dx = event.clientX - dragStart.current.x; if (Math.abs(dx) > 6) swiped.current = true; event.currentTarget.scrollLeft = dragStart.current.scrollLeft - dx; }}
      onPointerUp={finishDrag} onPointerCancel={finishDrag} onPointerLeave={finishDrag}
      onClickCapture={(event) => { if (swiped.current && event.detail !== 0) event.preventDefault(); swiped.current = false; }}>
      {renderedSlides.map((slide, index) => renderSlide(slide, index, slides.length > 1 && (index === 0 || index === renderedSlides.length - 1)))}
    </div>
    {slides.length > 1 && <div className="swipe-carousel-dots" aria-label={`${ariaLabel}: ${active + 1}/${slides.length}`}>{slides.map((slide, index) => <span key={slide.id} className={index === active ? "active" : ""} />)}</div>}
  </div>;
}
