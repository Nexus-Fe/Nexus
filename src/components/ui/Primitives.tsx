import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./Icon";

export function ButtonLink({ href, children, variant = "primary", small = false }: { href: string; children: ReactNode; variant?: "primary" | "secondary" | "light"; small?: boolean }) {
  return <Link className={"button button-" + variant + (small ? " button-small" : "")} href={href}>{children}</Link>;
}

export function DisabledAction({ children, small = false }: { children: ReactNode; small?: boolean }) {
  return <button className={"button button-disabled" + (small ? " button-small" : "")} disabled title="Thao tác này chưa có API hoạt động">{children}</button>;
}

export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <section className={"card " + className} style={style}>{children}</section>;
}

export function Badge({ children, tone = "sky" }: { children: ReactNode; tone?: "sky" | "green" | "amber" | "slate" | "red" | "indigo" }) {
  return <span className={"badge badge-" + tone}>{children}</span>;
}

export function PageHeading({ title, description, action, overline }: { title: string; description?: string; action?: ReactNode; overline?: string }) {
  return <div className="page-heading"><div>{overline && <p className="overline">{overline}</p>}<h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action && <div className="page-action">{action}</div>}</div>;
}

export function SectionHeading({ title, hint, action, id }: { title: string; hint?: string; action?: ReactNode; id?: string }) {
  return <div className="section-heading"><div><h2 id={id}>{title}</h2>{hint && <p>{hint}</p>}</div>{action}</div>;
}

export function NoData({ className = "", title = "Chưa có dữ liệu" }: { className?: string; title?: string }) {
  return <div className={"no-data " + className} role="status"><span className="no-data-icon"><Icon name="grid" size={22} /></span><strong>{title}</strong></div>;
}

export function EmptyTable({ columns }: { columns: string[] }) {
  return <div className="table-scroll"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody><tr className="table-empty"><td colSpan={columns.length}><NoData /></td></tr></tbody></table></div>;
}
