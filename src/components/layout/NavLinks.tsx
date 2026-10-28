"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavigationItem } from "@/constants/navigation";
import { Icon } from "@/components/ui/Icon";

export function NavLinks({ items, variant = "side" }: { items: NavigationItem[]; variant?: "side" | "top" }) {
  const pathname = usePathname();
  return <nav aria-label="Điều hướng" className={variant === "side" ? "side-nav" : "top-nav"}>{items.map((item) => {
    const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(item.href + "/");
    return <Link key={item.href} className={active ? "nav-link active" : "nav-link"} href={item.href} aria-current={active ? "page" : undefined}><Icon name={item.icon} size={18} /><span>{item.label}</span></Link>;
  })}</nav>;
}
