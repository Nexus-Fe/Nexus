"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ROUTES } from "@/constants/routes";
import { useSession } from "@/components/auth/SessionProvider";
import { Icon } from "@/components/ui/Icon";
import { Badge, ButtonLink, Card, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { ApiError, api, type ApiResponse } from "@/lib/api/client";
import {
  getSellerStatusMeta,
  loadSafeRegistrationDraft,
  normalizeSellerRegistrationStatus,
  saveSafeRegistrationDraft,
  sellerService,
  type ClassifiedSellerError,
  type GhnWarehouseAddress,
  type SellerBlockerInfo,
  type SellerProfile,
  type SellerRegistrationStatus,
  type SellerRegistrationStatusRecord,
} from "./services/seller.service";
import { ShopRegistrationForm, validateShopRegistrationFields, type ShopRegistrationFields, type ShopRegistrationErrors } from "./components/ShopRegistrationForm";
import { keepSellerRegistrationHandoff, takeSellerRegistrationHandoff } from "./services/seller-registration-handoff";

type PersonalFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
};

function unwrap<T>(value: ApiResponse<T> | T): T {
  if (value && typeof value === "object" && "data" in value) {
    return (value as ApiResponse<T>).data;
  }
  return value as T;
}

function formatWarehouseAddress(
  pickupAddress?: string | GhnWarehouseAddress | null,
  fallback?: Partial<GhnWarehouseAddress> | null,
): {
  streetAddress: string;
  provinceId: number | null;
  districtId: number | null;
  wardCode: string;
  fullText: string;
} {
  const structured =
    typeof pickupAddress === "object" && pickupAddress !== null
      ? pickupAddress
      : fallback ?? {};
  const street =
    typeof pickupAddress === "string"
      ? pickupAddress
      : String(structured.streetAddress ?? "");
  const provinceId =
    typeof structured.provinceId === "number" && structured.provinceId > 0
      ? structured.provinceId
      : fallback?.provinceId && fallback.provinceId > 0
        ? fallback.provinceId
        : null;
  const districtId =
    typeof structured.districtId === "number" && structured.districtId > 0
      ? structured.districtId
      : fallback?.districtId && fallback.districtId > 0
        ? fallback.districtId
        : null;
  const wardCode = String(structured.wardCode ?? fallback?.wardCode ?? "").trim();

  const ghnCodes = [
    provinceId ? `Mã tỉnh GHN: ${provinceId}` : "",
    districtId ? `Mã quận/huyện GHN: ${districtId}` : "",
    wardCode && wardCode !== "00000" ? `Mã phường/xã GHN: ${wardCode}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const fullText = [street, ghnCodes].filter(Boolean).join(" — ") || "Chưa có dữ liệu địa chỉ kho";

  return {
    streetAddress: street || "—",
    provinceId,
    districtId,
    wardCode: wardCode || "—",
    fullText,
  };
}

export function BecomeSellerScreen() {
  const router = useRouter();
  const { user, ready, refreshUser } = useSession();

  // Personal fields (loaded from /api/v1/me)
  const [personal, setPersonal] = useState<PersonalFormState>({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
    phoneNumber: "",
  });
  const [reputationScore, setReputationScore] = useState<number | null>(
    typeof user?.reputationScore === "number" ? user.reputationScore : null,
  );

  // Sensitive Citizen ID (CCCD) — kept ONLY in ephemeral input state, masked by default, cleared immediately on submit
  const [identityCardNumber, setIdentityCardNumber] = useState("");

  // Shop & GHN Warehouse fields
  const [shopForm, setShopForm] = useState<Omit<ShopRegistrationFields, "identityCardNumber">>({
    shopName: "",
    description: "",
    businessEmail: "",
    hotline: "",
    provinceId: "202",
    districtId: "1442",
    wardCode: "20101",
    streetAddress: "",
  });

  // Registration & Onboarding lifecycle state
  const [registrationId, setRegistrationId] = useState("");
  const [currentStatus, setCurrentStatus] = useState<SellerRegistrationStatus | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [editingAfterReject, setEditingAfterReject] = useState(false);

  // Synchronized Seller Profile & Warehouse (when APPROVED)
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);

  // Loading, Error classification & Backend Blocker tracking
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [classifiedError, setClassifiedError] = useState<ClassifiedSellerError | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<SellerBlockerInfo[]>([]);

  const isSellerRole = Boolean(
    user?.roles?.some((role) => role.toLowerCase() === "seller") ||
    user?.role?.toLowerCase() === "seller",
  );

  const appendBlocker = useCallback((blocker: SellerBlockerInfo) => {
    setBlockers((prev) => {
      const exists = prev.some(
        (item) => item.method === blocker.method && item.endpoint === blocker.endpoint,
      );
      if (exists) {
        return prev.map((item) =>
          item.method === blocker.method && item.endpoint === blocker.endpoint ? blocker : item,
        );
      }
      return [...prev, blocker];
    });
  }, []);

  const loadSellerWarehouseProfile = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await sellerService.getProfile(signal);
        const profileData = unwrap(res);
        if (profileData && typeof profileData === "object") {
          setSellerProfile(profileData);
        }
      } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 502 || err.status === 503 || err.status === 504)) {
          appendBlocker({
            service: "UserService (users)",
            endpoint: "/api/v1/seller/profile",
            method: "GET",
            role: "Seller",
            httpStatus: err.status,
            errorCode: err.errorCode,
            traceId: err.traceId,
            actualResponse: `${err.message} (HTTP ${err.status}${err.errorCode ? ` · ${err.errorCode}` : ""})`,
            expectedResponse: "{ shopId, shopName, hotline, pickupAddress, ghnShopId, provinceId, districtId, wardCode }",
            blockedSurface: "Đọc thông tin kho GHN đã đồng bộ trên /buyer/become-seller và /seller/shop",
            recommendation: "Bổ sung GET /api/v1/seller/profile trong User.Api/Controllers/SellerController.cs trả về SellerProfile đã duyệt kèm thông tin địa chỉ kho GHN.",
          });
        }
      }
    },
    [appendBlocker],
  );

  const syncOnboardingState = useCallback(
    async (isManualRefresh = false) => {
      try {
        // 1. Load personal profile & roles from GET /api/v1/me
        let meShopName = "";
        let meHasSellerRole = isSellerRole;
        let currentUserId = user?.id ?? "";

        try {
          const meResponse = await api.get<ApiResponse<Record<string, unknown>>>("/api/v1/me");
          const me = unwrap(meResponse);
          currentUserId = String(me.id ?? me.userId ?? user?.id ?? "");
          const roles = Array.isArray(me.roles)
            ? me.roles.map((r) => String(r).toLowerCase())
            : [];
          meHasSellerRole = roles.includes("seller") || Boolean(me.isSeller);
          meShopName = typeof me.shopName === "string" ? me.shopName.trim() : "";

          setPersonal({
            firstName: String(me.firstName ?? user?.firstName ?? ""),
            lastName: String(me.lastName ?? user?.lastName ?? ""),
            email: String(me.email ?? user?.email ?? ""),
            phoneNumber: String(me.phoneNumber ?? ""),
          });
          if (typeof me.phoneNumber === "string") {
            setShopForm((prev) => ({ ...prev, hotline: prev.hotline || me.phoneNumber as string }));
          }
          if (typeof me.reputationScore === "number") {
            setReputationScore(me.reputationScore);
          }
          if (meHasSellerRole && !isSellerRole) {
            await refreshUser();
          }
        } catch {
          /* Keep session fallback if /api/v1/me fails */
        }

        // 2. Load saved non-sensitive draft from sessionStorage (if any)
        const savedDraft = loadSafeRegistrationDraft(currentUserId || user?.id);
        if (savedDraft) {
          setRegistrationId((prev) => prev || savedDraft.registrationId);
          setSubmittedAt((prev) => prev || savedDraft.submittedAt || null);
          setShopForm((prev) => ({
            shopName: prev.shopName || savedDraft.shopName,
            description: prev.description || savedDraft.description || "",
            businessEmail: prev.businessEmail || savedDraft.businessEmail,
            hotline: prev.hotline || savedDraft.hotline,
            provinceId: String(savedDraft.warehouseAddress.provinceId || prev.provinceId || "202"),
            districtId: String(savedDraft.warehouseAddress.districtId || prev.districtId || "1442"),
            wardCode: savedDraft.warehouseAddress.wardCode || prev.wardCode || "20101",
            streetAddress: prev.streetAddress || savedDraft.warehouseAddress.streetAddress,
          }));
        } else if (meShopName) {
          setShopForm((prev) => ({
            ...prev,
            shopName: prev.shopName || meShopName,
          }));
        }

        // 3. Query GET /api/v1/seller/registration for registration status
        try {
          const statusRes = await sellerService.getRegistrationStatus();
          const record: SellerRegistrationStatusRecord = unwrap(statusRes) ?? {};
          const resolvedStatus = normalizeSellerRegistrationStatus(record.status, {
            otpVerified: savedDraft?.otpVerified,
            isSellerRole: meHasSellerRole,
          });

          if (record.registrationId) {
            setRegistrationId(record.registrationId);
          }
          if (record.submittedAt) {
            setSubmittedAt(record.submittedAt);
          }
          const reason = record.rejectionReason ?? record.reason ?? null;
          setRejectionReason(reason ? String(reason) : null);

          if (record.shopName) {
            setShopForm((prev) => ({ ...prev, shopName: String(record.shopName) }));
          }
          if (record.description) {
            setShopForm((prev) => ({ ...prev, description: String(record.description) }));
          }
          if (record.businessEmail) {
            setShopForm((prev) => ({ ...prev, businessEmail: String(record.businessEmail) }));
          }
          if (record.hotline) {
            setShopForm((prev) => ({ ...prev, hotline: String(record.hotline) }));
          }

          if (resolvedStatus) {
            setCurrentStatus(resolvedStatus);
            if (currentUserId && (record.registrationId || savedDraft?.registrationId)) {
              saveSafeRegistrationDraft({
                userId: currentUserId,
                registrationId: record.registrationId ?? savedDraft?.registrationId ?? "",
                shopName: String(record.shopName ?? savedDraft?.shopName ?? meShopName ?? ""),
                description: String(record.description ?? savedDraft?.description ?? ""),
                businessEmail: String(record.businessEmail ?? savedDraft?.businessEmail ?? ""),
                hotline: String(record.hotline ?? savedDraft?.hotline ?? ""),
                warehouseAddress: savedDraft?.warehouseAddress ?? {
                  provinceId: Number(record.provinceId ?? 202),
                  districtId: Number(record.districtId ?? 1442),
                  wardCode: String(record.wardCode ?? "20101"),
                  streetAddress: String(record.streetAddress ?? ""),
                },
                status: resolvedStatus,
                otpVerified: resolvedStatus === "PENDING_APPROVAL" || resolvedStatus === "APPROVED",
                rejectionReason: reason ? String(reason) : null,
                submittedAt: record.submittedAt ?? savedDraft?.submittedAt,
              });
            }
          }

          if (resolvedStatus === "APPROVED" || meHasSellerRole) {
            await loadSellerWarehouseProfile();
          }

          if (isManualRefresh) {
            setStatusNotice("Đã đồng bộ trạng thái hồ sơ mới nhất từ hệ thống.");
          }
        } catch (err) {
          // Handle missing or failing GET /api/v1/seller/registration
          if (meHasSellerRole) {
            setCurrentStatus("APPROVED");
            await loadSellerWarehouseProfile();
          } else if (savedDraft) {
            setCurrentStatus(savedDraft.status);
            setRejectionReason(savedDraft.rejectionReason ?? null);
          } else if (meShopName) {
            // /api/v1/me returned a shopName for this user even though GET /api/v1/seller/registration failed
            setCurrentStatus("PENDING_APPROVAL");
          }

          if (err instanceof ApiError) {
            // Record explicit blocker if the endpoint is missing on downstream UserService (404/405/501/502/503/504)
            // Note: If the user has never submitted a registration and backend returns 404 with REGISTRATION_NOT_FOUND, we only flag as blocker if user already has a draft/shopName or manual refresh was requested.
            const isMissingEndpoint =
              err.status === 404 ||
              err.status === 405 ||
              err.status === 501 ||
              err.status === 502 ||
              err.status === 503 ||
              err.status === 504;

            if (isMissingEndpoint && (savedDraft || meShopName || isManualRefresh || err.status >= 500)) {
              appendBlocker({
                service: "UserService (users)",
                endpoint: "/api/v1/seller/registration",
                method: "GET",
                role: "Buyer (Authenticated)",
                httpStatus: err.status,
                errorCode: err.errorCode,
                traceId: err.traceId,
                actualResponse: `${err.message} (HTTP ${err.status}${err.errorCode ? ` · ${err.errorCode}` : ""})`,
                expectedResponse:
                  "{ registrationId, status: 'PENDING' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED', rejectionReason, submittedAt, shopName, warehouseAddress }",
                blockedSurface: "Đọc trạng thái hồ sơ và lý do từ chối trên /buyer/become-seller",
                recommendation:
                  "Gateway đã có route GET /api/v1/seller/registration (UsersController.cs:450), nhưng User.Api/Controllers/SellerController.cs chưa có action [HttpGet('/api/v1/seller/registration')] để trả trạng thái SellerProfile và RejectionReason theo x-user-id.",
              });
            }
          }
        }

        const handoff = takeSellerRegistrationHandoff(user?.email);
        if (handoff) {
          const { identityCardNumber: handoffIdentity, ...handoffShop } = handoff;
          setIdentityCardNumber(handoffIdentity);
          setShopForm(handoffShop);
          setEditingAfterReject(false);
          setClassifiedError(null);
          setStatusNotice("Đã chuyển thông tin shop từ bước đăng ký tài khoản. Chưa có hồ sơ nào được gửi.");
        }
      } finally {
        setInitialLoading(false);
        setRefreshingStatus(false);
      }
    },
    [appendBlocker, isSellerRole, loadSellerWarehouseProfile, refreshUser, user],
  );

  const handleManualRefresh = useCallback(async () => {
    setRefreshingStatus(true);
    setClassifiedError(null);
    setStatusNotice(null);
    await syncOnboardingState(true);
  }, [syncOnboardingState]);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace(ROUTES.auth.login);
      return;
    }
    if (isSellerRole) {
      router.replace(ROUTES.seller.products);
      return;
    }
    void syncOnboardingState(false);
  }, [isSellerRole, ready, router, syncOnboardingState, user]);

  function validateRegistrationForm(): ClassifiedSellerError | null {
    const errors = validateShopRegistrationFields({ ...shopForm, identityCardNumber });
    if (!Object.keys(errors).length) return null;
    const fieldErrors = Object.fromEntries(Object.entries(errors).map(([key, value]) => [key, [value ?? ""]]));
    const ghnKeys: Array<keyof ShopRegistrationErrors> = ["provinceId", "districtId", "wardCode", "streetAddress"];
    const invalidGhn = Object.keys(errors).some((key) => ghnKeys.includes(key as keyof ShopRegistrationErrors));
    return {
      category: invalidGhn ? "INVALID_GHN" : "MISSING_FIELD",
      categoryLabel: invalidGhn ? "Sai mã địa chỉ kho GHN" : "Thiếu hoặc sai thông tin trường bắt buộc",
      title: invalidGhn ? "Mã địa chỉ kho GHN chưa hợp lệ" : "Vui lòng kiểm tra lại hồ sơ shop",
      detail: "Sửa các trường được đánh dấu trước khi tiếp tục.",
      fieldErrors,
    };
  }

  function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClassifiedError(null);
    setStatusNotice(null);

    const validationError = validateRegistrationForm();
    if (validationError) {
      setClassifiedError(validationError);
      return;
    }

    if (user?.email) {
      keepSellerRegistrationHandoff(user.email, { ...shopForm, identityCardNumber });
    }
    setStatusNotice("Thông tin đã được kiểm tra và giữ trong phiên này. Chưa có hồ sơ nào được gửi; thao tác gửi đang chờ API tương thích với một OTP tài khoản.");
  }
  const effectiveStatus: SellerRegistrationStatus | null = isSellerRole
    ? "APPROVED"
    : currentStatus;
  const statusMeta = effectiveStatus ? getSellerStatusMeta(effectiveStatus) : null;

  const syncedWarehouse = formatWarehouseAddress(
    sellerProfile?.pickupAddress ?? sellerProfile?.warehouseAddress,
    {
      provinceId: sellerProfile?.provinceId ?? (Number(shopForm.provinceId) || undefined),
      districtId: sellerProfile?.districtId ?? (Number(shopForm.districtId) || undefined),
      wardCode: sellerProfile?.wardCode || shopForm.wardCode,
      streetAddress: sellerProfile?.streetAddress || shopForm.streetAddress,
    },
  );

  const showRegistrationForm =
    !effectiveStatus || (effectiveStatus === "REJECTED" && editingAfterReject);

  return (
    <>
      <div className="crumbs">
        <Link href={ROUTES.home}>Trang chủ</Link>
        <Icon name="chevron" size={14} />
        <Link href={ROUTES.auth.profile}>Tài khoản</Link>
        <Icon name="chevron" size={14} />
        <span>Đăng ký trở thành Seller</span>
      </div>

      <PageHeading
        overline="Kênh đối tác NEXUS"
        title="Đăng ký mở gian hàng Seller"
        description="Chuẩn bị thông tin gian hàng và kho lấy hàng. Email liên hệ shop không bắt buộc; OTP chỉ gửi tới email tài khoản."
        action={
          <div className="action-row" style={{ marginTop: 0 }}>
            <button
              type="button"
              className="button button-secondary"
              disabled={refreshingStatus || initialLoading}
              onClick={() => void handleManualRefresh()}
            >
              <Icon name="clock" size={16} />
              {refreshingStatus ? "Đang kiểm tra…" : "Kiểm tra trạng thái hồ sơ"}
            </button>
            {effectiveStatus === "APPROVED" && (
              <ButtonLink href={ROUTES.seller.products}>
                <Icon name="grid" size={16} /> Vào Kênh người bán
              </ButtonLink>
            )}
          </div>
        }
      />

      {/* Lifecycle Status Bar: PENDING -> PENDING_APPROVAL -> APPROVED / REJECTED */}
      <Card className="card-pad" style={{ marginBottom: 22 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <strong style={{ fontSize: 15 }}>Tiến trình thẩm định &amp; bàn giao hồ sơ Seller</strong>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
              Buyer tạo tài khoản và xác thực email cá nhân → Chuẩn bị hồ sơ shop → Staff duyệt → Mở kênh bán
            </p>
          </div>
          {statusMeta ? (
            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
          ) : (
            <Badge tone="slate">CHƯA NỘP HỒ SƠ</Badge>
          )}
        </div>

        <div className="grid-4">
          {(
            [
              {
                code: "PENDING",
                title: "1. PENDING",
                desc: "Thông tin đã ghi nhận ở trạng thái chờ xử lý.",
              },
              {
                code: "PENDING_APPROVAL",
                title: "2. PENDING_APPROVAL",
                desc: "Đã xác thực OTP, hồ sơ đang chờ Staff thẩm định.",
              },
              {
                code: "APPROVED",
                title: "3. APPROVED",
                desc: "Staff đã phê duyệt, cấp role Seller và đồng bộ kho GHN.",
              },
              {
                code: "REJECTED",
                title: "4. REJECTED",
                desc: "Hồ sơ bị từ chối kèm lý do cụ thể từ Staff.",
              },
            ] as const
          ).map((step) => {
            const isActive = effectiveStatus === step.code;
            return (
              <div
                key={step.code}
                style={{
                  padding: "14px 16px",
                  borderRadius: 10,
                  border: isActive ? "2px solid var(--sky)" : "1px solid var(--line)",
                  background: isActive ? "var(--sky-soft)" : "#f8fafc",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ fontSize: 13 }}>{step.title}</strong>
                  {isActive && <Badge tone={getSellerStatusMeta(step.code).tone}>Hiện tại</Badge>}
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {statusNotice && (
        <p role="status" className="form-success" style={{ marginBottom: 18 }}>
          {statusNotice}
        </p>
      )}

      {/* Classified Error Display: distinguishes MISSING_FIELD, INVALID_GHN, DUPLICATE_PROFILE, CONNECTION_ERROR, BUSINESS_RULE */}
      {classifiedError && (
        <div style={{ marginBottom: 22 }}>
          <Card className="card-pad">
            <div role="alert" style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid #f1c8c6", background: "#fff1f0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
                <strong style={{ color: "#9f2f2c", fontSize: 15 }}>{classifiedError.title}</strong>
                <Badge tone="red">
                  Phân loại lỗi: {classifiedError.category} — {classifiedError.categoryLabel}
                </Badge>
              </div>
              <p style={{ margin: "0 0 8px", color: "#9f2f2c", fontSize: 13 }}>{classifiedError.detail}</p>
              {classifiedError.fieldErrors && Object.keys(classifiedError.fieldErrors).length > 0 && (
                <ul style={{ margin: "8px 0 0", paddingLeft: 20, color: "#9f2f2c", fontSize: 12 }}>
                  {Object.entries(classifiedError.fieldErrors).map(([field, messages]) => (
                    <li key={field}>
                      <strong>{field}:</strong> {(messages ?? []).join(", ")}
                    </li>
                  ))}
                </ul>
              )}
              {(classifiedError.errorCode || classifiedError.status || classifiedError.traceId) && (
                <p style={{ margin: "10px 0 0", fontSize: 11, color: "#7f1d1d" }}>
                  {classifiedError.status ? `HTTP ${classifiedError.status}` : ""}
                  {classifiedError.errorCode ? ` · Mã lỗi: ${classifiedError.errorCode}` : ""}
                  {classifiedError.traceId ? ` · Trace ID: ${classifiedError.traceId}` : ""}
                </p>
              )}
              {classifiedError.category === "DUPLICATE_PROFILE" && !effectiveStatus && (
                <div className="action-row" style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => {
                      setClassifiedError(null);
                      setCurrentStatus("PENDING");
                    }}
                  >
                    Chuyển tới màn nhập OTP / Kiểm tra hồ sơ đã nộp
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

          {/* APPROVED STATE: Seller role granted + Entry to Seller Center + Synchronized Warehouse Info */}
          {effectiveStatus === "APPROVED" && (
            <div className="split" style={{ marginBottom: 24 }}>
              <Card className="card-pad">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                  <h2 style={{ margin: 0, fontSize: 20 }}>Hồ sơ Seller đã được phê duyệt</h2>
                  <Badge tone="green">APPROVED</Badge>
                </div>
                <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>
                  Tài khoản của bạn đã được Staff phê duyệt và cấp quyền <strong>Seller</strong>. Bạn có thể truy cập ngay vào Kênh người bán để đăng tải sản phẩm, quản lý tồn kho và tạo phiên đấu giá.
                </p>
                <div className="info-row">
                  <span>Vai trò tài khoản</span>
                  <strong>{(user?.roles ?? ["buyer", "seller"]).join(", ").toUpperCase()}</strong>
                </div>
                <div className="info-row">
                  <span>Mã hồ sơ đăng ký</span>
                  <strong>{registrationId || sellerProfile?.shopId || sellerProfile?.sellerId || "Đã đồng bộ"}</strong>
                </div>
                <div className="info-row">
                  <span>Trạng thái thẩm định</span>
                  <strong>
                    <Badge tone="green">APPROVED</Badge>
                  </strong>
                </div>
                <div className="action-row">
                  <ButtonLink href={ROUTES.seller.products}>
                    <Icon name="grid" size={16} /> Vào Kênh người bán (Seller Center)
                  </ButtonLink>
                  <ButtonLink href={ROUTES.seller.shop} variant="secondary">
                    <Icon name="users" size={16} /> Hồ sơ gian hàng &amp; Kho
                  </ButtonLink>
                  <ButtonLink href={ROUTES.seller.inventory} variant="secondary">
                    <Icon name="warehouse" size={16} /> Quản lý kho
                  </ButtonLink>
                </div>
              </Card>

              <Card className="card-pad">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                  <h2 style={{ margin: 0, fontSize: 20 }}>Thông tin kho GHN đã đồng bộ</h2>
                  <Badge tone="sky">{sellerProfile?.ghnShopId ? `GHN: ${sellerProfile.ghnShopId}` : "Kho lấy hàng"}</Badge>
                </div>
                <div className="info-row">
                  <span>Tên gian hàng</span>
                  <strong>{sellerProfile?.shopName || shopForm.shopName || "—"}</strong>
                </div>
                <div className="info-row">
                  <span>Mã gian hàng (Shop ID)</span>
                  <strong>{sellerProfile?.shopId || sellerProfile?.sellerId || registrationId || "—"}</strong>
                </div>
                <div className="info-row">
                  <span>Mã kho GHN (ghnShopId)</span>
                  <strong>{sellerProfile?.ghnShopId || "Đồng bộ theo hồ sơ Seller"}</strong>
                </div>
                <div className="info-row">
                  <span>Hotline kho / gian hàng</span>
                  <strong>{sellerProfile?.hotline || shopForm.hotline || personal.phoneNumber || "—"}</strong>
                </div>
                <div className="info-row">
                  <span>Địa chỉ lấy hàng</span>
                  <strong>{syncedWarehouse.streetAddress}</strong>
                </div>
                <div className="info-row">
                  <span>Mã hành chính GHN</span>
                  <strong>
                    Tỉnh: {syncedWarehouse.provinceId ?? "—"} · Quận: {syncedWarehouse.districtId ?? "—"} · Phường: {syncedWarehouse.wardCode}
                  </strong>
                </div>
              </Card>
            </div>
          )}

          {/* REJECTED STATE: Show Rejection Reason clearly & allow resubmission */}
          {effectiveStatus === "REJECTED" && (
            <Card className="card-pad" style={{ marginBottom: 24, borderColor: "#f1c8c6" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 20, color: "#9f2f2c" }}>Hồ sơ mở gian hàng bị từ chối</h2>
                <Badge tone="red">REJECTED</Badge>
              </div>
              <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--muted)" }}>
                Staff đã xem xét hồ sơ đăng ký gian hàng <strong>{shopForm.shopName || registrationId}</strong> và từ chối với lý do sau:
              </p>
              <div
                role="alert"
                className="notice"
                style={{ marginBottom: 16, borderColor: "#f1c8c6", background: "#fff1f0", color: "#9f2f2c" }}
              >
                <strong>Lý do từ chối từ Staff:</strong>{" "}
                {rejectionReason || "Thông tin hồ sơ hoặc chứng từ định danh chưa hợp lệ. Vui lòng kiểm tra và gửi lại."}
              </div>
              <div className="info-row">
                <span>Mã hồ sơ</span>
                <strong>{registrationId || "—"}</strong>
              </div>
              <div className="info-row">
                <span>Tên gian hàng đã đăng ký</span>
                <strong>{shopForm.shopName || "—"}</strong>
              </div>
              <div className="info-row">
                <span>Email liên hệ shop</span>
                <strong>{shopForm.businessEmail || "—"}</strong>
              </div>
              <div className="action-row">
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => {
                    setEditingAfterReject(true);
                    setClassifiedError(null);
                  }}
                >
                  Chỉnh sửa &amp; Gửi lại hồ sơ đăng ký
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={refreshingStatus}
                  onClick={() => void handleManualRefresh()}
                >
                  Làm mới trạng thái
                </button>
              </div>
            </Card>
          )}

          {/* PENDING state remains visible for legacy/API status; no shop OTP action is offered. */}
          {effectiveStatus === "PENDING" && (
            <Card className="card-pad" style={{ marginBottom: 24 }}>
              <div className="status-card-heading"><h2>Hồ sơ đang chờ xử lý</h2><Badge tone="amber">PENDING</Badge></div>
              <p>Trạng thái này được hiển thị theo dữ liệu đã ghi nhận. Mã OTP chỉ dùng để xác thực tài khoản bằng email cá nhân; màn này không gửi hoặc xác thực OTP riêng cho shop.</p>
              <div className="info-row"><span>Mã hồ sơ</span><strong>{registrationId || "—"}</strong></div>
              <div className="info-row"><span>Tên shop</span><strong>{shopForm.shopName || "—"}</strong></div>
              <div className="info-row"><span>Email liên hệ shop</span><strong>{shopForm.businessEmail || "Không cung cấp"}</strong></div>
              <button type="button" className="button button-secondary" disabled={refreshingStatus} onClick={() => void handleManualRefresh()}>{refreshingStatus ? "Đang kiểm tra…" : "Kiểm tra trạng thái"}</button>
            </Card>
          )}
          {/* PENDING_APPROVAL STATE: Waiting for Staff approval */}
          {effectiveStatus === "PENDING_APPROVAL" && (
            <Card className="card-pad" style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>Hồ sơ đang chờ Staff thẩm định &amp; phê duyệt</h2>
                <Badge tone="sky">PENDING_APPROVAL</Badge>
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                Hồ sơ đăng ký mở gian hàng của bạn đã được chuyển sang hàng đợi thẩm định của Staff (<code>/staff/sellers</code>). Sau khi Staff phê duyệt, tài khoản của bạn sẽ tự động nhận vai trò <strong>Seller</strong> và mở lối vào Kênh người bán.
              </p>
              <div className="info-row">
                <span>Trạng thái thẩm định</span>
                <strong>
                  <Badge tone="sky">PENDING_APPROVAL</Badge>
                </strong>
              </div>
              <div className="info-row">
                <span>Mã hồ sơ</span>
                <strong>{registrationId || "Đã ghi nhận"}</strong>
              </div>
              <div className="info-row">
                <span>Tên gian hàng</span>
                <strong>{shopForm.shopName || "—"}</strong>
              </div>
              <div className="info-row">
                <span>Email liên hệ shop</span>
                <strong>{shopForm.businessEmail || "—"}</strong>
              </div>
              <div className="info-row">
                <span>Hotline vận hành</span>
                <strong>{shopForm.hotline || "—"}</strong>
              </div>
              <div className="info-row">
                <span>Kho lấy hàng GHN</span>
                <strong>
                  {shopForm.streetAddress || "—"} (Mã Tỉnh: {shopForm.provinceId} · Mã Quận: {shopForm.districtId} · Mã Phường: {shopForm.wardCode})
                </strong>
              </div>
              <div className="info-row">
                <span>Định danh CCCD</span>
                <strong>Đã mã hóa / Không hiển thị công khai</strong>
              </div>
              {submittedAt && (
                <div className="info-row">
                  <span>Thời điểm gửi hồ sơ</span>
                  <strong>{submittedAt}</strong>
                </div>
              )}
              <div className="action-row">
                <button
                  type="button"
                  className="button button-primary"
                  disabled={refreshingStatus}
                  onClick={() => void handleManualRefresh()}
                >
                  {refreshingStatus ? "Đang đồng bộ…" : "Cập nhật kết quả duyệt từ Staff"}
                </button>
              </div>
            </Card>
          )}

          {/* Shop form is shared with the public registration flow. This screen never calls the legacy Seller OTP endpoint. */}
          {showRegistrationForm && (
            <form onSubmit={(event) => void submitRegistration(event)} autoComplete="off">
              <div className="split" style={{ alignItems: "start" }}>
                <div className="mini-list">
                  <Card className="card-pad">
                    <SectionHeading title="Tài khoản Buyer" hint="Đây là email cá nhân đã đăng nhập; email liên hệ shop không nhận mã xác thực." />
                    <div className="info-row"><span>Chủ tài khoản</span><strong>{[personal.firstName, personal.lastName].filter(Boolean).join(" ") || user?.displayName || user?.username || "Buyer"}</strong></div>
                    <div className="info-row"><span>Email tài khoản</span><strong>{personal.email || user?.email || "—"}</strong></div>
                    <div className="info-row"><span>Số điện thoại</span><strong>{personal.phoneNumber || "Chưa cập nhật"}</strong></div>
                  </Card>
                  <ShopRegistrationForm
                    idPrefix="buyer-seller"
                    value={{ ...shopForm, identityCardNumber }}
                    errors={Object.fromEntries(Object.entries(classifiedError?.fieldErrors ?? {}).map(([key, messages]) => [key, messages[0] ?? ""])) as ShopRegistrationErrors}
                    onChange={(value) => {
                      const { identityCardNumber: nextIdentity, ...nextShop } = value;
                      setIdentityCardNumber(nextIdentity);
                      setShopForm(nextShop);
                    }}
                  />
                </div>
                <div className="mini-list">
                  <Card className="card-pad">
                    <h2 style={{ margin: "0 0 14px", fontSize: 18 }}>Điều kiện và trạng thái gửi</h2>
                    <div className="info-row"><span>Điểm uy tín hiện tại</span><strong>{reputationScore !== null ? `${reputationScore} điểm` : "Chưa có dữ liệu"}</strong></div>
                    <div className="info-row"><span>Điểm tối thiểu</span><strong>&gt;= 50 điểm</strong></div>
                    <div className="info-row"><span>Email nhận OTP</span><strong>{personal.email || user?.email || "Email tài khoản"}</strong></div>
                    <p className="status-note">Thông tin được kiểm tra và giữ trong bộ nhớ phiên. Chưa gửi shop tới Staff; nút bên dưới không gọi API đăng ký Seller.</p>
                    <div className="action-row">
                      <button type="submit" className="button button-primary full-width" disabled={initialLoading}>Kiểm tra và giữ thông tin trong phiên</button>
                      {editingAfterReject && <button type="button" className="button button-secondary full-width" onClick={() => setEditingAfterReject(false)}>Hủy chỉnh sửa</button>}
                      <button type="button" className="button button-secondary full-width" disabled={refreshingStatus || initialLoading} onClick={() => void handleManualRefresh()}>{refreshingStatus ? "Đang kiểm tra…" : "Kiểm tra trạng thái hồ sơ"}</button>
                    </div>
                  </Card>
                </div>
              </div>
            </form>
          )}
          {/* Explicit Backend Blocker Report Card (per P0 requirement: "Nếu thiếu API đọc trạng thái hồ sơ, ghi blocker cụ thể.") */}
          {blockers.length > 0 && (
            <Card className="card-pad" style={{ marginTop: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18 }}>Ghi nhận Blocker API Backend (Đối chiếu thực tế qua Gateway)</h2>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
                    Các endpoint dưới đây đã có route tại Gateway nhưng downstream <code>UserService</code> chưa phản hồi hoặc thiếu REST action.
                  </p>
                </div>
                <Badge tone="amber">{blockers.length} Blocker BE</Badge>
              </div>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Service / Endpoint</th>
                      <th>Method / Role</th>
                      <th>HTTP &amp; Phản hồi thực tế</th>
                      <th>Phản hồi kỳ vọng</th>
                      <th>Màn bị chặn &amp; Đề xuất BE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockers.map((b) => (
                      <tr key={`${b.method}-${b.endpoint}`}>
                        <td>
                          <strong>{b.service}</strong>
                          <br />
                          <code>{b.endpoint}</code>
                        </td>
                        <td>
                          <Badge tone="slate">{b.method}</Badge>
                          <br />
                          <small>{b.role}</small>
                        </td>
                        <td>
                          <strong>{b.actualResponse}</strong>
                          {b.traceId && (
                            <>
                              <br />
                              <small>Trace: {b.traceId}</small>
                            </>
                          )}
                        </td>
                        <td>
                          <code style={{ fontSize: 11 }}>{b.expectedResponse}</code>
                        </td>
                        <td>
                          <strong>{b.blockedSurface}</strong>
                          <br />
                          <small style={{ color: "var(--muted)" }}>{b.recommendation}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      );
}
