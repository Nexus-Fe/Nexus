"use client";

export type AdminPaginationProps = {
  page: number;
  pageSize?: number;
  totalItems?: number;
  totalPages?: number;
  onPageChange: (nextPage: number) => void;
  loading?: boolean;
  itemLabel?: string;
  hideIfSinglePage?: boolean;
  className?: string;
};

export function AdminPagination({
  page,
  pageSize = 20,
  totalItems,
  totalPages: propTotalPages,
  onPageChange,
  loading = false,
  itemLabel = "bản ghi",
  hideIfSinglePage = true,
  className = "",
}: AdminPaginationProps) {
  const computedTotalPages =
    propTotalPages ??
    (totalItems !== undefined && pageSize > 0 ? Math.ceil(totalItems / pageSize) : 1);
  const totalPages = Math.max(1, computedTotalPages);

  if (hideIfSinglePage && totalPages <= 1) {
    return null;
  }

  const hasPrevious = page > 1;
  const hasNext = page < totalPages;
  const pageItems = getPageNumbers(page, totalPages);

  const from = totalItems !== undefined && totalItems > 0 ? (page - 1) * pageSize + 1 : 0;
  const to = totalItems !== undefined ? Math.min(page * pageSize, totalItems) : 0;

  return (
    <nav
      className={"admin-pagination-bar " + className}
      aria-label="Phân trang dữ liệu"
    >
      <div className="admin-pagination-controls">
        {/* Nút Về trang đầu (khi có nhiều hơn 5 trang và không ở trang 1) */}
        {totalPages > 5 && (
          <button
            type="button"
            className="admin-pagination-btn is-edge"
            disabled={!hasPrevious || loading}
            onClick={() => onPageChange(1)}
            aria-label="Trang đầu tiên"
            title="Trang đầu"
          >
            <span aria-hidden="true">«</span>
          </button>
        )}

        {/* Nút Trang trước */}
        <button
          type="button"
          className="admin-pagination-btn admin-pagination-nav-btn is-prev"
          disabled={!hasPrevious || loading}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          aria-label="Trang trước"
        >
          <span aria-hidden="true">‹</span>
          <span className="admin-pagination-nav-label">Trang trước</span>
        </button>

        {/* Danh sách các số trang */}
        <div className="admin-pagination-pages" role="group" aria-label="Các trang">
          {pageItems.map((item, idx) => {
            if (item === "ellipsis") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="admin-pagination-ellipsis"
                  aria-hidden="true"
                >
                  …
                </span>
              );
            }

            const isCurrent = item === page;
            return (
              <button
                key={item}
                type="button"
                className={"admin-pagination-btn is-number" + (isCurrent ? " is-active" : "")}
                disabled={loading}
                aria-current={isCurrent ? "page" : undefined}
                aria-label={`Trang ${item}`}
                onClick={() => onPageChange(item)}
              >
                {item}
              </button>
            );
          })}
        </div>

        {/* Nút Trang sau */}
        <button
          type="button"
          className="admin-pagination-btn admin-pagination-nav-btn is-next"
          disabled={!hasNext || loading}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          aria-label="Trang sau"
        >
          <span className="admin-pagination-nav-label">Trang sau</span>
          <span aria-hidden="true">›</span>
        </button>

        {/* Nút Đến trang cuối (khi có nhiều hơn 5 trang và không ở trang cuối) */}
        {totalPages > 5 && (
          <button
            type="button"
            className="admin-pagination-btn is-edge"
            disabled={!hasNext || loading}
            onClick={() => onPageChange(totalPages)}
            aria-label="Trang cuối cùng"
            title="Trang cuối"
          >
            <span aria-hidden="true">»</span>
          </button>
        )}
      </div>

      {/* Thông tin số lượng hiển thị và vị trí trang */}
      <div className="admin-pagination-info">
        {totalItems !== undefined && totalItems > 0 ? (
          <span>
            Hiển thị <strong>{from}–{to}</strong> trên <strong>{totalItems}</strong> {itemLabel}
            <span className="admin-pagination-dot" aria-hidden="true">
              •
            </span>
            Trang <strong>{page}</strong> / <strong>{totalPages}</strong>
          </span>
        ) : (
          <span>
            Trang <strong>{page}</strong> / <strong>{totalPages}</strong>
          </span>
        )}
      </div>
    </nav>
  );
}

function getPageNumbers(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
}
