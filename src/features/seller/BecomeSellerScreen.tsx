"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ROUTES } from "@/constants/routes";
import { useSession } from "@/components/auth/SessionProvider";
import { Icon } from "@/components/ui/Icon";
import { Badge, ButtonLink, Card, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { ApiError, api, type ApiResponse } from "@/lib/api/client";
import {
  classifySellerRegistrationError,
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
import { takeSellerRegistrationHandoff } from "./services/seller-registration-handoff";

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

function sellerOtpErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.errorCode?.toUpperCase()) {
      case "OTP_INVALID": return "Mã OTP không đúng. Kiểm tra email doanh nghiệp và nhập lại mã.";
      case "OTP_EXPIRED": return "Mã OTP đã hết hạn. Chọn Gửi lại mã để nhận mã mới.";
      case "OTP_ALREADY_USED": return "Mã OTP này đã được sử dụng. Kiểm tra trạng thái hồ sơ hoặc gửi mã mới.";
      case "OTP_MAX_ATTEMPTS_EXCEEDED": return "Đã nhập sai quá số lần cho phép. Điền lại hồ sơ để nhận mã mới.";
      case "DRAFT_NOT_FOUND": return "Phiên đăng ký đã hết hạn. Điền lại hồ sơ để nhận mã mới.";
      case "OTP_COOLDOWN_ACTIVE": return "Vui lòng chờ 60 giây trước khi gửi lại mã.";
    }
    if ([502, 503, 504].includes(error.status)) return "Không kết nối được Gateway hoặc UserService. Vui lòng thử lại.";
  }
  return error instanceof Error ? error.message : "Không thể xác thực email doanh nghiệp. Vui lòng thử lại.";
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
  const [nextStep, setNextStep] = useState<string | null>(null);
  const [editingAfterReject, setEditingAfterReject] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpNotice, setOtpNotice] = useState("");
  const otpInputRef = useRef<HTMLInputElement>(null);

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
            endpoint: "/api/v1/sellers/profile",
            method: "GET",
            role: "Seller",
            httpStatus: err.status,
            errorCode: err.errorCode,
            traceId: err.traceId,
            actualResponse: `${err.message} (HTTP ${err.status}${err.errorCode ? ` · ${err.errorCode}` : ""})`,
            expectedResponse: "{ shopId, shopName, hotline, pickupAddress, ghnShopId, provinceId, districtId, wardCode }",
            blockedSurface: "Đọc thông tin kho GHN đã đồng bộ trên /buyer/become-seller và /seller/shop",
            recommendation: "Kiểm tra kết nối Gateway đến GET /api/v1/sellers/profile.",
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
          setShopForm((prev) => ({
            shopName: prev.shopName || savedDraft.shopName,
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

        // 3. Read the persisted Seller status from UserService.
        try {
          const statusRes = await sellerService.getRegistrationStatus();
          const record: SellerRegistrationStatusRecord = unwrap(statusRes);
          const resolvedStatus = normalizeSellerRegistrationStatus(record.status, { isSellerRole: meHasSellerRole });
          const reason = record.rejectionReason ?? null;
          setRejectionReason(reason ? String(reason) : null);
          setNextStep(record.nextStep ?? null);
          if (record.businessEmail) {
            setShopForm((prev) => ({ ...prev, businessEmail: String(record.businessEmail) }));
            if (resolvedStatus === "PENDING") setOtpEmail(String(record.businessEmail));
          }

          setCurrentStatus(resolvedStatus);
          if (resolvedStatus && currentUserId && savedDraft?.otpVerified) {
            saveSafeRegistrationDraft({
              ...savedDraft,
              userId: currentUserId,
              businessEmail: String(record.businessEmail ?? savedDraft.businessEmail),
              status: resolvedStatus,
              rejectionReason: reason ? String(reason) : null,
            });
          }

          if (resolvedStatus === "APPROVED" || meHasSellerRole) {
            await loadSellerWarehouseProfile();
          }

          if (isManualRefresh) {
            setStatusNotice("Đã đồng bộ trạng thái hồ sơ mới nhất từ hệ thống.");
          }
        } catch (err) {
          // Preserve a verified local result while the status endpoint is unavailable.
          if (meHasSellerRole) {
            setCurrentStatus("APPROVED");
            await loadSellerWarehouseProfile();
          } else if (savedDraft?.otpVerified) {
            setCurrentStatus(savedDraft.status);
            setRejectionReason(savedDraft.rejectionReason ?? null);
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
                endpoint: "/api/v1/sellers/status",
                method: "GET",
                role: "Buyer (Authenticated)",
                httpStatus: err.status,
                errorCode: err.errorCode,
                traceId: err.traceId,
                actualResponse: `${err.message} (HTTP ${err.status}${err.errorCode ? ` · ${err.errorCode}` : ""})`,
                expectedResponse:
                  "{ status: 'NOT_REGISTERED' | 'OTP_VERIFICATION_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED', rejectionReason, nextStep, businessEmail }",
                blockedSurface: "Đọc trạng thái hồ sơ và lý do từ chối trên /buyer/become-seller",
                recommendation: "Kiểm tra kết nối Gateway đến GET /api/v1/sellers/status.",
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

  useEffect(() => {
    if (!otpOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    otpInputRef.current?.focus();
    return () => previousFocus?.focus();
  }, [otpOpen]);

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

  async function sendBusinessOtp() {
    setClassifiedError(null);
    setStatusNotice(null);

    const validationError = validateRegistrationForm();
    if (validationError) {
      setClassifiedError(validationError);
      return;
    }

    setOtpBusy(true);
    try {
      const businessEmail = shopForm.businessEmail.trim();
      const result = unwrap(await sellerService.register({
        shopName: shopForm.shopName.trim(),
        businessEmail,
        hotline: shopForm.hotline.trim(),
        identityCardNumber: identityCardNumber.trim(),
        warehouseAddress: {
          provinceId: Number(shopForm.provinceId),
          districtId: Number(shopForm.districtId),
          wardCode: shopForm.wardCode.trim(),
          streetAddress: shopForm.streetAddress.trim(),
        },
      }));
      if (result.status.toUpperCase() !== "OTP_VERIFICATION_REQUIRED") throw new Error("Chưa xác nhận được yêu cầu gửi OTP. Vui lòng kiểm tra trạng thái hồ sơ.");
      setOtpEmail(result.businessEmail || businessEmail);
      setOtpCode("");
      setOtpError("");
      setOtpNotice(`Yêu cầu gửi mã tới ${result.businessEmail || businessEmail} đã được tiếp nhận.`);
      setOtpOpen(true);
      setCurrentStatus("PENDING");
      setNextStep("VERIFY_OTP_VIA_POST_/api/v1/sellers/otp/verify");
    } catch (error) {
      setClassifiedError(error instanceof ApiError || error instanceof TypeError ? classifySellerRegistrationError(error) : {
        category: "BUSINESS_RULE",
        categoryLabel: "Phản hồi hồ sơ",
        title: "Chưa xác nhận được yêu cầu mở shop",
        detail: error instanceof Error ? error.message : "Vui lòng kiểm tra trạng thái hồ sơ rồi thử lại.",
      });
    } finally {
      setOtpBusy(false);
    }
  }

  async function verifyBusinessOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(otpCode)) {
      setOtpError("Nhập mã OTP gồm 6 chữ số.");
      return;
    }
    setOtpBusy(true);
    setOtpError("");
    try {
      const result = unwrap(await sellerService.verifyOtp(otpEmail, otpCode));
      if (result.status.toUpperCase() !== "PENDING") throw new Error("Chưa xác nhận được trạng thái hồ sơ. Vui lòng kiểm tra lại.");
      setCurrentStatus("PENDING_APPROVAL");
      setRegistrationId(result.sellerId);
      setNextStep("AWAITING_STAFF_APPROVAL");
      setRejectionReason(null);
      setEditingAfterReject(false);
      setIdentityCardNumber("");
      setOtpCode("");
      setOtpOpen(false);
      setStatusNotice("✓ Hồ sơ đã gửi · Chờ Staff duyệt");
      if (user?.id) {
        saveSafeRegistrationDraft({
          userId: user.id,
          registrationId: result.sellerId,
          shopName: shopForm.shopName.trim(),
          businessEmail: otpEmail,
          hotline: shopForm.hotline.trim(),
          warehouseAddress: {
            provinceId: Number(shopForm.provinceId),
            districtId: Number(shopForm.districtId),
            wardCode: shopForm.wardCode.trim(),
            streetAddress: shopForm.streetAddress.trim(),
          },
          status: "PENDING_APPROVAL",
          otpVerified: true,
        });
      }
    } catch (error) {
      const message = sellerOtpErrorMessage(error);
      if (error instanceof ApiError && ["OTP_MAX_ATTEMPTS_EXCEEDED", "DRAFT_NOT_FOUND"].includes(error.errorCode ?? "")) {
        setOtpOpen(false);
        setCurrentStatus(null);
        setOtpEmail("");
        setClassifiedError({ category: "BUSINESS_RULE", categoryLabel: "Xác thực email", title: "Cần gửi lại hồ sơ", detail: message });
      } else {
        setOtpError(message);
      }
    } finally {
      setOtpBusy(false);
    }
  }

  async function resendBusinessOtp() {
    setOtpBusy(true);
    setOtpError("");
    setOtpNotice("");
    try {
      await sellerService.resendOtp(otpEmail);
      setOtpNotice(`Mã mới đã gửi tới ${otpEmail}.`);
    } catch (error) {
      const message = sellerOtpErrorMessage(error);
      if (error instanceof ApiError && error.errorCode === "DRAFT_NOT_FOUND") {
        setOtpOpen(false);
        setCurrentStatus(null);
        setOtpEmail("");
        setClassifiedError({ category: "BUSINESS_RULE", categoryLabel: "Xác thực email", title: "Cần gửi lại hồ sơ", detail: message });
      } else {
        setOtpError(message);
      }
    } finally {
      setOtpBusy(false);
    }
  }

  function cancelBusinessOtp() {
    if (otpBusy) return;
    setOtpOpen(false);
    setOtpCode("");
    setOtpError("");
    setOtpNotice("");
    setStatusNotice("Chưa nộp hồ sơ cho Staff. Bạn có thể nhập lại mã OTP hoặc sửa hồ sơ và gửi mã mới.");
  }

  const effectiveStatus: SellerRegistrationStatus | null = isSellerRole
    ? "APPROVED"
    : currentStatus;

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
      <PageHeading title="Đăng kí mở gian hàng" />

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
                {rejectionReason || "Hệ thống chưa cung cấp lý do từ chối. Vui lòng liên hệ hỗ trợ để được giải thích."}
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

          {/* Backend draft exists in Redis until the business OTP is verified. */}
          {effectiveStatus === "PENDING" && (
            <Card className="card-pad" style={{ marginBottom: 24 }}>
              <div className="status-card-heading"><h2>Đang chờ xác thực email doanh nghiệp</h2><Badge tone="amber">Chưa nộp hồ sơ</Badge></div>
               <p>Chưa nộp hồ sơ cho Staff. Bản nháp và mã OTP chỉ có hiệu lực tạm thời; nhập mã thành công để nộp hồ sơ hoặc sửa thông tin rồi gửi mã mới.</p>
              <div className="info-row"><span>Email nhận OTP</span><strong>{otpEmail || shopForm.businessEmail || "—"}</strong></div>
               <div className="action-row"><button type="button" className="button button-primary" disabled={!otpEmail || (nextStep !== null && !nextStep.startsWith("VERIFY_OTP_VIA_POST_"))} onClick={() => { setOtpError(""); setOtpNotice(""); setStatusNotice(null); setOtpOpen(true); }}>Nhập mã OTP</button><button type="button" className="button button-secondary" onClick={() => { setCurrentStatus(null); setOtpEmail(""); setNextStep(null); setStatusNotice(null); }}>Sửa hồ sơ và gửi mã mới</button></div>
            </Card>
          )}
          {/* PENDING_APPROVAL STATE: Waiting for Staff approval */}
          {effectiveStatus === "PENDING_APPROVAL" && (
            <Card className="card-pad" style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>Hồ sơ đang chờ Staff thẩm định &amp; phê duyệt</h2>
                <Badge tone="green">✓ Chờ Staff duyệt</Badge>
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                Hồ sơ đăng ký mở gian hàng của bạn đã được chuyển sang hàng đợi thẩm định của Staff. Sau khi Staff phê duyệt, tài khoản của bạn sẽ nhận vai trò <strong>Seller</strong> và có thể vào Kênh người bán.
              </p>
              <div className="info-row">
                <span>Trạng thái thẩm định</span>
                <strong>
                  <Badge tone="sky">Chờ Staff duyệt</Badge>
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

          {/* The first request stores a draft; verification submits it for Staff review. */}
          {showRegistrationForm && (
            <div>
              <div className="split seller-onboarding-form" style={{ alignItems: "start" }}>
                <div className="mini-list">
                  <Card className="card-pad">
                    <SectionHeading title="Tài khoản Buyer" hint="Email tài khoản đã được xác thực khi đăng ký. Hồ sơ shop dùng email doanh nghiệp riêng." />
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
                    <h2 style={{ margin: "0 0 14px", fontSize: 18 }}>Các bước mở shop</h2>
                    <div className="info-row"><span>Điểm uy tín hiện tại</span><strong>{reputationScore !== null ? `${reputationScore} điểm` : "Chưa có dữ liệu"}</strong></div>
                    <div className="info-row"><span>Điểm tối thiểu</span><strong>&gt;= 50 điểm</strong></div>
                    <div className="info-row"><span>Email nhận OTP</span><strong>{shopForm.businessEmail || "Email doanh nghiệp"}</strong></div>
                    <p className="status-note seller-onboarding-note">Chọn Nộp hồ sơ để nhận OTP qua email doanh nghiệp. Hồ sơ chỉ chuyển đến Staff sau khi bạn xác nhận mã thành công.</p>
                    <div className="seller-onboarding-actions">
                      <button type="button" className="button button-primary full-width" disabled={initialLoading || otpBusy || Object.keys(validateShopRegistrationFields({ ...shopForm, identityCardNumber })).length > 0} onClick={() => void sendBusinessOtp()}>{otpBusy ? "Đang gửi mã…" : "Nộp hồ sơ"}</button>
                      <button type="button" className="button button-secondary full-width" disabled={refreshingStatus || initialLoading} onClick={() => void handleManualRefresh()}>{refreshingStatus ? "Đang kiểm tra…" : "Kiểm tra trạng thái hồ sơ"}</button>
                      {editingAfterReject && <button type="button" className="button button-secondary full-width" onClick={() => setEditingAfterReject(false)}>Hủy chỉnh sửa</button>}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}
          {otpOpen && (
            <div className="seller-otp-backdrop" onKeyDown={(event) => {
              if (event.key === "Escape" && !otpBusy) cancelBusinessOtp();
              if (event.key !== "Tab") return;
              const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled])"));
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
              else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
            }}>
              <section className="seller-otp-dialog" role="dialog" aria-modal="true" aria-labelledby="seller-otp-title" aria-describedby="seller-otp-description">
                <div className="seller-otp-heading">
                  <h2 id="seller-otp-title">Xác minh email doanh nghiệp</h2>
                  <button type="button" className="button button-secondary button-small" disabled={otpBusy} onClick={cancelBusinessOtp}>Hủy xác thực</button>
                </div>
                <p id="seller-otp-description" className="seller-otp-description">Mã OTP đã gửi tới <strong>{otpEmail}</strong>. Xác thực thành công sẽ nộp hồ sơ để Staff duyệt.</p>
                <form className="seller-otp-form" onSubmit={(event) => void verifyBusinessOtp(event)}>
                  <label className="seller-otp-label" htmlFor="seller-business-otp">Mã xác thực gồm 6 chữ số</label>
                  <input ref={otpInputRef} id="seller-business-otp" className="field seller-otp-input" type="text" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" maxLength={6} required value={otpCode} onChange={(event) => { setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(""); }} />
                  {otpError && <p className="form-error" role="alert">{otpError}</p>}
                  {otpNotice && <p className="form-success" role="status">{otpNotice}</p>}
                  <div className="seller-otp-actions">
                    <button type="button" className="button button-secondary" disabled={otpBusy} onClick={() => void resendBusinessOtp()}>Gửi lại mã</button>
                    <button type="submit" className="button button-primary" disabled={otpBusy || otpCode.length !== 6}>{otpBusy ? "Đang xác thực…" : "Xác nhận và nộp hồ sơ"}</button>
                  </div>
                </form>
              </section>
            </div>
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
