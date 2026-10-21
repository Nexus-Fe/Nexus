import Link from "next/link";
import { ROUTES } from "@/constants/routes";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white sm:px-10 sm:py-24">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <header className="flex items-center justify-between">
          <span className="text-lg font-semibold tracking-wide">NEXUS</span>
          <Link
            className="rounded-full border border-white/25 px-5 py-2 text-sm font-medium transition hover:bg-white/10"
            href={ROUTES.auth.login}
          >
            Đăng nhập
          </Link>
        </header>
        <section className="max-w-3xl py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
            Sàn thương mại điện tử
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Chào mừng đến với Nexus
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Nền tảng đang được dựng theo từng feature, với các cổng riêng cho
            người mua, người bán, nhân viên vận hành và quản trị viên.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              className="rounded-full bg-indigo-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-indigo-300"
              href={ROUTES.catalog.index}
            >
              Khám phá sản phẩm
            </Link>
            <Link
              className="rounded-full border border-white/25 px-6 py-3 font-semibold transition hover:bg-white/10"
              href={ROUTES.auth.register}
            >
              Tạo tài khoản
            </Link>
          </div>
        </section>
        <nav aria-label="Các cổng làm việc" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Người mua", ROUTES.buyer.profile],
            ["Người bán", ROUTES.seller.products],
            ["Nhân viên", ROUTES.staff.orders],
            ["Quản trị viên", ROUTES.admin.users],
          ].map(([label, href]) => (
            <Link
              key={label}
              className="rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-sm font-medium transition hover:bg-white/10"
              href={href}
            >
              Cổng {label} <span aria-hidden="true">→</span>
            </Link>
          ))}
        </nav>
        <p className="text-sm text-slate-400">
          Đây là bộ khung khởi tạo; các màn hình và phân quyền sẽ được nối với
          backend trong các bước tiếp theo.
        </p>
      </div>
    </main>
  );
}
