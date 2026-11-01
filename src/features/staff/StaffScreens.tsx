"use client";
/* Admin workflow responses are ungenerated Gateway JSON contracts. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ROUTES } from "@/constants/routes";
import { Icon } from "@/components/ui/Icon";
import { Badge, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import {
  isSensitiveIdentityKey,
  maskIdentityCard,
  normalizeSellerRegistrationStatus,
} from "@/features/seller/services/seller.service";
import { api, type ApiResponse } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";

type Obj = Record<string, any>;
const unwrap = <T,>(x: ApiResponse<T> | T): T =>
  x && typeof x === "object" && "data" in x ? (x as ApiResponse<T>).data : (x as T);
const rows = (x: any): Obj[] =>
  Array.isArray(x) ? x : (x?.items ?? x?.data ?? x?.registrations ?? x?.reports ?? []);
const msg = (e: Error | null) => e?.message ?? "";

function statusTone(status?: string | null): "sky" | "green" | "amber" | "slate" | "red" | "indigo" {
  const normalized = normalizeSellerRegistrationStatus(status);
  if (normalized === "APPROVED") return "green";
  if (normalized === "REJECTED") return "red";
  if (normalized === "PENDING_APPROVAL") return "sky";
  if (normalized === "PENDING") return "amber";
  return "slate";
}

export function StaffSellersScreen() {
  const [status, setStatus] = useState("PENDING");
  const queryStatus = status ? `&status=${encodeURIComponent(status)}` : "";
  const resource = useApiResource(
    `/api/v1/admin/seller-registrations?page=1&limit=50${queryStatus}`,
    async () =>
      rows(
        unwrap(
          await api.get<ApiResponse<any>>(
            `/api/v1/admin/seller-registrations?page=1&limit=50${queryStatus}`,
          ),
        ),
      ),
  );

  return (
    <>
      <PageHeading
        overline="Nghiệp vụ Staff · Handoff 4.1"
        title="Duyệt hồ sơ Seller"
        description="Danh sách hồ sơ đăng ký Seller từ Buyer nộp lên qua User API. Không hiển thị số CCCD ở bảng danh sách."
      />
      <div className="field-wrap" style={{ maxWidth: 360 }}>
        <label>
          Trạng thái hồ sơ
          <select
            className="select-field"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="PENDING">PENDING / PENDING_APPROVAL — Chờ duyệt</option>
            <option value="APPROVED">APPROVED — Đã phê duyệt</option>
            <option value="REJECTED">REJECTED — Đã từ chối</option>
            <option value="">Tất cả trạng thái</option>
          </select>
        </label>
      </div>
      <Card>
        {resource.error && (
          <p role="alert" className="notice">
            {msg(resource.error)}
          </p>
        )}
        {resource.data?.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã hồ sơ</th>
                  <th>Tên shop</th>
                  <th>Người nộp / Email DN</th>
                  <th>Kho GHN</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {resource.data.map((x, i) => {
                  const regId = String(x.registrationId ?? x.id ?? i);
                  const rawStatus = String(x.status ?? "PENDING");
                  const normalized = normalizeSellerRegistrationStatus(rawStatus, {
                    otpVerified: Boolean(x.otpVerified),
                  });
                  return (
                    <tr key={regId}>
                      <td>{regId}</td>
                      <td>
                        <strong>{x.shopName ?? x.businessName ?? "—"}</strong>
                      </td>
                      <td>{x.businessEmail ?? x.userName ?? x.email ?? "—"}</td>
                      <td>
                        {x.provinceId || x.districtId || x.wardCode
                          ? `Tỉnh ${x.provinceId ?? "—"} · Quận ${x.districtId ?? "—"} · Phường ${x.wardCode ?? "—"}`
                          : (x.streetAddress ?? x.pickupAddress ?? "—")}
                      </td>
                      <td>
                        <Badge tone={statusTone(normalized)}>{normalized}</Badge>
                      </td>
                      <td>
                        <Link
                          className="button button-secondary button-small"
                          href={ROUTES.staff.seller(regId)}
                        >
                          Chi tiết & Duyệt
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <NoData
            title={
              resource.loading
                ? "Đang tải hồ sơ…"
                : resource.error
                  ? "Không tải được hồ sơ"
                  : "Không có hồ sơ"
            }
          />
        )}
      </Card>
    </>
  );
}

export function StaffSellerDetailScreen() {
  const params = useParams<{ id: string }>();
  const id = String(params.id ?? "");
  const [usedListFallback, setUsedListFallback] = useState(false);
  const [revealIdentityCard, setRevealIdentityCard] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  const detail = useApiResource(
    id ? `/api/v1/admin/seller-registrations/${id}` : null,
    async () => {
      try {
        setUsedListFallback(false);
        return unwrap(
          await api.get<ApiResponse<Obj>>(
            `/api/v1/admin/seller-registrations/${encodeURIComponent(id)}`,
          ),
        );
      } catch (directError) {
        // Fallback if User.Api in Real mode has not implemented GET /api/v1/admin/seller-registrations/{id}
        const listResult = rows(
          unwrap(
            await api.get<ApiResponse<any>>(
              "/api/v1/admin/seller-registrations?page=1&limit=100",
            ),
          ),
        );
        const matched = listResult.find(
          (item) =>
            String(item.registrationId ?? "") === id ||
            String(item.id ?? "") === id ||
            String(item.userId ?? "") === id,
        );
        if (matched) {
          setUsedListFallback(true);
          return matched;
        }
        throw directError;
      }
    },
  );

  const currentStatus = detail.data
    ? normalizeSellerRegistrationStatus(String(detail.data.status ?? "PENDING"), {
        otpVerified: Boolean(detail.data.otpVerified),
      })
    : null;

  const decide = async (approved: boolean) => {
    if (!approved && !reason.trim()) {
      setError("Vui lòng nhập lý do từ chối hồ sơ Seller để hiển thị cho Buyer.");
      return;
    }
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      await api.put(
        `/api/v1/admin/seller-registrations/${encodeURIComponent(id)}/${approved ? "approve" : "reject"}`,
        approved ? {} : { rejectionReason: reason.trim() },
      );
      setFeedback(
        approved
          ? "Đã phê duyệt hồ sơ Seller. Tài khoản Buyer đã được cấp role Seller và kích hoạt lối vào kênh bán."
          : `Đã từ chối hồ sơ Seller với lý do: "${reason.trim()}".`,
      );
      detail.reload();
    } catch (e) {
      setError(msg(e as Error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="crumbs">
        <Link href={ROUTES.staff.sellers}>Duyệt hồ sơ Seller</Link>
        <Icon name="chevron" size={14} />
        <span>Chi tiết</span>
      </div>
      <PageHeading
        overline="Nghiệp vụ Staff · Handoff 4.1"
        title="Chi tiết & Phê duyệt hồ sơ Seller"
        description={`Hồ sơ ${id}. Khi phê duyệt, tài khoản sẽ nhận role Seller và đồng bộ địa chỉ kho GHN.`}
      />
      {usedListFallback && (
        <p role="status" className="status-note">
          Lưu ý kỹ thuật (Real mode): Endpoint chi tiết <code>GET /api/v1/admin/seller-registrations/&#123;id&#125;</code> chưa có trong{" "}
          <code>User.Api/Controllers/SellerController.cs</code>, hệ thống đã tự động nạp dữ liệu từ danh sách{" "}
          <code>GET /api/v1/admin/seller-registrations</code> để Staff vẫn duyệt/từ chối được hồ sơ.
        </p>
      )}
      {detail.error && (
        <p role="alert" className="notice">
          {msg(detail.error)}
        </p>
      )}
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      {feedback && (
        <p role="status" className="form-success">
          {feedback}
        </p>
      )}
      <Card className="card-pad">
        {detail.data ? (
          <>
            <div className="info-row">
              <span>Trạng thái chuẩn hóa</span>
              <Badge tone={statusTone(currentStatus ?? "PENDING")}>
                {currentStatus ?? "PENDING"}
              </Badge>
            </div>
            {Object.entries(detail.data)
              .filter(([, v]) => v == null || typeof v !== "object")
              .map(([k, v]) => {
                if (isSensitiveIdentityKey(k)) {
                  const rawValue = String(v ?? "");
                  return (
                    <div className="info-row" key={k}>
                      <span>{k} (Bảo mật CCCD)</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <strong>
                          {revealIdentityCard ? rawValue || "—" : maskIdentityCard(rawValue)}
                        </strong>
                        {rawValue && (
                          <button
                            type="button"
                            className="button button-secondary button-small"
                            onClick={() => setRevealIdentityCard((prev) => !prev)}
                          >
                            {revealIdentityCard ? "Ẩn CCCD" : "Đối chiếu CCCD"}
                          </button>
                        )}
                      </span>
                    </div>
                  );
                }
                return (
                  <div className="info-row" key={k}>
                    <span>{k}</span>
                    <strong>{String(v ?? "—")}</strong>
                  </div>
                );
              })}

            <SectionHeading
              title="Quyết định thẩm định của Staff"
              hint="Phê duyệt để cấp role Seller cho tài khoản hoặc từ chối kèm lý do cụ thể."
            />
            <label className="field-wrap">
              Lý do từ chối (bắt buộc nếu chọn Từ chối)
              <textarea
                className="textarea-field"
                placeholder="Ví dụ: Mã phường/xã GHN không khớp với địa chỉ kho thực tế hoặc thông tin doanh nghiệp chưa hợp lệ."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <div className="action-row">
              <button
                type="button"
                className="button button-primary"
                disabled={busy || !detail.data || currentStatus === "APPROVED"}
                onClick={() => void decide(true)}
              >
                {currentStatus === "APPROVED" ? "Đã phê duyệt" : "Phê duyệt (Cấp role Seller)"}
              </button>
              <button
                type="button"
                className="button button-secondary"
                disabled={busy || !detail.data || !reason.trim()}
                onClick={() => void decide(false)}
              >
                Từ chối hồ sơ
              </button>
            </div>
          </>
        ) : (
          <NoData title={detail.loading ? "Đang tải hồ sơ…" : "Không có dữ liệu hồ sơ"} />
        )}
      </Card>
    </>
  );
}

export function StaffReportsScreen() {
  const [status, setStatus] = useState("");
  const resource = useApiResource(
    `/api/v1/admin/reports?page=1&limit=50&status=${status}`,
    async () =>
      rows(
        unwrap(
          await api.get<ApiResponse<any>>(
            `/api/v1/admin/reports?page=1&limit=50&status=${status}`,
          ),
        ),
      ),
  );
  const [selected, setSelected] = useState<Obj | null>(null);

  return (
    <>
      <PageHeading
        overline="Nghiệp vụ Staff"
        title="Xử lý báo cáo & khiếu nại"
        description="Báo cáo từ User API."
      />
      <label className="field-wrap">
        Trạng thái
        <select
          className="select-field"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">Tất cả</option>
          <option value="PENDING">Chờ xử lý</option>
          <option value="RESOLVED">Đã xử lý</option>
          <option value="DISMISSED">Đã bác bỏ</option>
        </select>
      </label>
      {resource.error && (
        <p role="alert" className="notice">
          {msg(resource.error)}
        </p>
      )}
      <div className="split">
        <Card>
          {resource.data?.length ? (
            resource.data.map((report, index) => (
              <button
                className="info-row"
                key={report.reportId ?? report.id ?? index}
                onClick={() => setSelected(report)}
              >
                <span>{report.title ?? report.reason ?? report.reportId}</span>
                <Badge>{report.status ?? ""}</Badge>
              </button>
            ))
          ) : (
            <NoData title={resource.loading ? "Đang tải báo cáo…" : "Không có báo cáo"} />
          )}
        </Card>
        <Card className="card-pad">
          <h2>Nội dung báo cáo</h2>
          {selected ? (
            Object.entries(selected)
              .filter(([key]) => !isSensitiveIdentityKey(key))
              .map(([key, value]) => (
                <div className="info-row" key={key}>
                  <span>{key}</span>
                  <strong>
                    {typeof value === "object" ? JSON.stringify(value) : String(value ?? "—")}
                  </strong>
                </div>
              ))
          ) : (
            <NoData title="Chọn báo cáo để xem" />
          )}
        </Card>
      </div>
      <p role="status" className="notice">
        Quyết định xử lý chưa khả dụng: UserService chưa công khai API REST cho báo cáo và Gateway
        chưa xác định danh sách mã hành động được phép.
      </p>
    </>
  );
}

export function StaffQueueScreen({
  queue,
}: {
  queue: "withdrawals" | "moderation" | "discrepancies";
}) {
  const details = {
    withdrawals: {
      title: "Duyệt yêu cầu rút tiền",
      description:
        "Gateway có hợp đồng PATCH quyết định Admin nhưng chưa có endpoint danh sách để nạp hàng đợi an toàn.",
    },
    moderation: {
      title: "Kiểm duyệt sản phẩm",
      description:
        "Chưa có API hàng đợi báo cáo sản phẩm, chi tiết kiểm duyệt hoặc hợp đồng hành động Staff.",
    },
    discrepancies: {
      title: "Sai lệch giao dịch",
      description:
        "Chưa có endpoint đối chiếu ledger và ghi bút toán điều chỉnh riêng. Không sửa trực tiếp giao dịch cũ.",
    },
  }[queue];
  return (
    <>
      <PageHeading
        overline="Nghiệp vụ Staff"
        title={details.title}
        description={details.description}
      />
      <Card>
        <NoData title="Chưa thể tải hàng đợi từ Gateway" />
      </Card>
      <p className="status-note">
        Không có hành động nào được bật cho đến khi Gateway cung cấp danh sách, quyền và hợp đồng
        xử lý tương ứng.
      </p>
    </>
  );
}
