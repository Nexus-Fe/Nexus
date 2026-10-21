type RoutePlaceholderProps = {
  area: string;
  title: string;
  description: string;
};

export function RoutePlaceholder({
  area,
  title,
  description,
}: RoutePlaceholderProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 text-slate-900 sm:px-10">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-700">
          {area}
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          {description}
        </p>
        <div
          className="mt-8 rounded-2xl bg-indigo-50 px-5 py-4 text-sm leading-6 text-indigo-950"
          role="status"
        >
          Đường dẫn đã sẵn sàng. Giao diện nghiệp vụ và kết nối API sẽ được bổ sung
          theo hợp đồng của backend.
        </div>
      </div>
    </main>
  );
}
