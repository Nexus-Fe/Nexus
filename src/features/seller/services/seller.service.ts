import { ApiError, api, type ApiResponse } from "@/lib/api/client";

export type SellerRegistrationStatus = "PENDING" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

export type GhnWarehouseAddress = {
  provinceId: number;
  districtId: number;
  wardCode: string;
  streetAddress: string;
};

export type CreateSellerRegistrationPayload = {
  shopName: string;
  businessEmail: string;
  hotline: string;
  identityCardNumber: string;
  provinceId: number;
  districtId: number;
  wardCode: string;
  streetAddress: string;
  pickupAddress?: string;
  warehouseAddress: GhnWarehouseAddress;
};

export type SellerRegistrationCreatedResponse = {
  registrationId: string;
  status: string;
  submittedAt?: string;
};

export type VerifySellerOtpPayload = {
  registrationId: string;
  otpCode: string;
};

export type VerifySellerOtpResponse = {
  registrationId: string;
  status: string;
  message?: string;
};

export type ResendSellerOtpPayload = {
  registrationId: string;
  businessEmail: string;
};

export type ResendSellerOtpResponse = {
  registrationId?: string;
  cooldown?: number;
  message?: string;
};

export type SellerRegistrationStatusRecord = {
  registrationId?: string;
  status?: string;
  reason?: string | null;
  rejectionReason?: string | null;
  submittedAt?: string | null;
  shopName?: string | null;
  businessEmail?: string | null;
  hotline?: string | null;
  pickupAddress?: string | GhnWarehouseAddress | null;
  warehouseAddress?: string | GhnWarehouseAddress | null;
  provinceId?: number | null;
  districtId?: number | null;
  wardCode?: string | null;
  streetAddress?: string | null;
};

export type SellerProfile = {
  shopId?: string;
  sellerId?: string;
  shopName: string;
  hotline?: string;
  description?: string;
  pickupAddress?: string | GhnWarehouseAddress;
  warehouseAddress?: string | GhnWarehouseAddress;
  provinceId?: number;
  districtId?: number;
  wardCode?: string;
  streetAddress?: string;
  ghnShopId?: string;
  ratingAvg?: number;
  totalProducts?: number;
  status?: string;
};

export type SellerErrorCategory =
  | "MISSING_FIELD"
  | "INVALID_GHN"
  | "DUPLICATE_PROFILE"
  | "CONNECTION_ERROR"
  | "BUSINESS_RULE";

export type ClassifiedSellerError = {
  category: SellerErrorCategory;
  categoryLabel: string;
  title: string;
  detail: string;
  errorCode?: string;
  status?: number;
  traceId?: string;
  fieldErrors?: Record<string, string[]>;
};

export type SellerBlockerInfo = {
  service: string;
  endpoint: string;
  method: string;
  role: string;
  httpStatus?: number;
  errorCode?: string;
  traceId?: string;
  actualResponse: string;
  expectedResponse: string;
  blockedSurface: string;
  recommendation: string;
};

/**
 * Checks whether an object key represents a sensitive Citizen ID (CCCD/CMND) field.
 * Used to prevent accidental rendering or persistence of CCCD in public/general screens.
 */
export function isSensitiveIdentityKey(key: string): boolean {
  return /identitycard|identifynumber|citizenid|cccd|cmnd|nationalid/i.test(key);
}

/**
 * Masks a Citizen ID (CCCD) string so raw digits are never shown on general screens.
 */
export function maskIdentityCard(value?: unknown): string {
  if (typeof value !== "string") return "—";
  const digits = value.trim();
  if (!digits) return "—";
  if (digits.length <= 4) return "••••";
  return `••••••••${digits.slice(-4)}`;
}

/**
 * Normalizes backend registration status values into the 4 canonical onboarding states:
 * PENDING (awaiting business email OTP), PENDING_APPROVAL (OTP verified / awaiting Staff),
 * APPROVED (Staff approved / Seller role granted), REJECTED (Staff rejected).
 */
export function normalizeSellerRegistrationStatus(
  rawStatus?: string | null,
  options?: { otpVerified?: boolean; isSellerRole?: boolean },
): SellerRegistrationStatus | null {
  if (options?.isSellerRole) {
    return "APPROVED";
  }
  const normalized = (rawStatus ?? "").trim().toUpperCase();
  if (!normalized) {
    return options?.otpVerified ? "PENDING_APPROVAL" : null;
  }
  if (normalized === "APPROVED" || normalized === "ACTIVE") {
    return "APPROVED";
  }
  if (normalized === "REJECTED" || normalized === "DENIED") {
    return "REJECTED";
  }
  if (
    normalized === "PENDING_APPROVAL" ||
    normalized === "PENDINGAPPROVAL" ||
    normalized === "UNDER_REVIEW" ||
    normalized === "UNDERREVIEW" ||
    normalized === "VERIFIED"
  ) {
    return "PENDING_APPROVAL";
  }
  if (normalized === "PENDING") {
    return options?.otpVerified ? "PENDING_APPROVAL" : "PENDING";
  }
  return null;
}

export function getSellerStatusMeta(status: SellerRegistrationStatus): {
  code: SellerRegistrationStatus;
  label: string;
  tone: "amber" | "sky" | "green" | "red";
  summary: string;
} {
  switch (status) {
    case "PENDING":
      return {
        code: "PENDING",
        label: "PENDING · Chờ xác thực OTP email doanh nghiệp",
        tone: "amber",
        summary: "Hồ sơ đã ghi nhận bước 1. Vui lòng nhập mã OTP 6 chữ số đã gửi tới email doanh nghiệp để chuyển sang hàng đợi Staff duyệt.",
      };
    case "PENDING_APPROVAL":
      return {
        code: "PENDING_APPROVAL",
        label: "PENDING_APPROVAL · Chờ Staff thẩm định & phê duyệt",
        tone: "sky",
        summary: "Email doanh nghiệp đã xác thực. Hồ sơ đang nằm trong hàng đợi Staff thẩm định thông tin gian hàng và kho lấy hàng GHN.",
      };
    case "APPROVED":
      return {
        code: "APPROVED",
        label: "APPROVED · Đã phê duyệt mở gian hàng",
        tone: "green",
        summary: "Hồ sơ đã được Staff phê duyệt. Tài khoản của bạn đã nhận quyền Seller và kho lấy hàng đã đồng bộ.",
      };
    case "REJECTED":
      return {
        code: "REJECTED",
        label: "REJECTED · Hồ sơ bị từ chối",
        tone: "red",
        summary: "Hồ sơ đăng ký mở gian hàng chưa đạt yêu cầu thẩm định của Staff. Xem lý do từ chối bên dưới và cập nhật lại hồ sơ.",
      };
  }
}

export function classifySellerRegistrationError(error: unknown): ClassifiedSellerError {
  if (!(error instanceof ApiError)) {
    const message = error instanceof Error ? error.message : "Không thể kết nối tới máy chủ.";
    return {
      category: "CONNECTION_ERROR",
      categoryLabel: "Lỗi kết nối",
      title: "Không kết nối được API Gateway",
      detail: `${message} Vui lòng kiểm tra kết nối mạng hoặc trạng thái API Gateway (cổng 8080) rồi thử lại.`,
    };
  }

  const code = (error.errorCode ?? "").toUpperCase();
  const msg = error.message || `Yêu cầu thất bại (HTTP ${error.status}).`;
  const lowerMsg = msg.toLowerCase();
  const fieldKeys = Object.keys(error.fieldErrors ?? {}).map((k) => k.toLowerCase());

  // 1. Connection / Gateway errors (502, 503, 504, 0)
  if (
    error.status === 0 ||
    error.status === 502 ||
    error.status === 503 ||
    error.status === 504 ||
    code === "GATEWAY_UNAVAILABLE" ||
    code === "GATEWAY_NOT_CONFIGURED" ||
    code === "GATEWAY_URL_INVALID"
  ) {
    return {
      category: "CONNECTION_ERROR",
      categoryLabel: "Lỗi kết nối",
      title: "Không kết nối được API Gateway hoặc UserService",
      detail: `${msg} (HTTP ${error.status}${code ? ` · ${code}` : ""}).`,
      errorCode: error.errorCode,
      status: error.status,
      traceId: error.traceId,
      fieldErrors: error.fieldErrors,
    };
  }

  // 2. Duplicate registration / shop name / already seller (409 or domain conflict codes)
  if (
    error.status === 409 ||
    code === "ALREADY_SELLER" ||
    code === "REQUEST_ALREADY_PENDING" ||
    code === "SHOP_NAME_TAKEN" ||
    code === "DUPLICATE_REGISTRATION" ||
    lowerMsg.includes("already registered as a seller") ||
    lowerMsg.includes("pending seller registration") ||
    lowerMsg.includes("shop name is already taken")
  ) {
    let title = "Trùng hồ sơ đăng ký Seller";
    let detail = msg;
    if (code === "ALREADY_SELLER" || lowerMsg.includes("already registered as a seller")) {
      title = "Tài khoản đã là Seller";
      detail = "Tài khoản của bạn đã được cấp quyền Seller hoặc đã có gian hàng được phê duyệt trước đó.";
    } else if (code === "REQUEST_ALREADY_PENDING" || lowerMsg.includes("pending seller registration")) {
      title = "Hồ sơ đang chờ xử lý";
      detail = "Bạn đã có một hồ sơ đăng ký mở gian hàng đang ở trạng thái chờ xử lý (PENDING / PENDING_APPROVAL).";
    } else if (code === "SHOP_NAME_TAKEN" || lowerMsg.includes("shop name is already taken")) {
      title = "Tên gian hàng đã tồn tại";
      detail = "Tên gian hàng này đã được đăng ký bởi người bán khác. Vui lòng chọn tên gian hàng khác.";
    }
    return {
      category: "DUPLICATE_PROFILE",
      categoryLabel: "Trùng hồ sơ",
      title,
      detail,
      errorCode: error.errorCode,
      status: error.status,
      traceId: error.traceId,
      fieldErrors: error.fieldErrors,
    };
  }

  // 3. Invalid GHN warehouse codes
  const hasGhnFieldError = fieldKeys.some((k) =>
    /province|district|ward|warehouse|pickupaddress|ghn/i.test(k),
  );
  if (
    hasGhnFieldError ||
    /ghn|province|district|ward|warehouse/i.test(code) ||
    /province|district|ward|warehouse|mã tỉnh|mã quận|mã phường|địa chỉ kho|ghn/i.test(lowerMsg)
  ) {
    return {
      category: "INVALID_GHN",
      categoryLabel: "Sai mã địa chỉ kho GHN",
      title: "Mã địa chỉ kho GHN không hợp lệ",
      detail: `${msg} Vui lòng kiểm tra lại Mã tỉnh (provinceId), Mã quận/huyện (districtId), Mã phường/xã (wardCode) và địa chỉ kho lấy hàng theo chuẩn GHN.`,
      errorCode: error.errorCode,
      status: error.status,
      traceId: error.traceId,
      fieldErrors: error.fieldErrors,
    };
  }

  // 4. Missing or invalid fields (400 / 422 / VAL_*)
  if (
    code === "VAL_INVALID_INPUT" ||
    code === "VAL_INVALID_SHOP_NAME" ||
    code === "VAL_INVALID_EMAIL" ||
    code === "VAL_INVALID_HOTLINE" ||
    code === "VAL_INVALID_IDENTITY_CARD" ||
    (error.fieldErrors && Object.keys(error.fieldErrors).length > 0)
  ) {
    return {
      category: "MISSING_FIELD",
      categoryLabel: "Thiếu hoặc sai thông tin trường bắt buộc",
      title: "Thông tin hồ sơ chưa hợp lệ",
      detail: msg,
      errorCode: error.errorCode,
      status: error.status,
      traceId: error.traceId,
      fieldErrors: error.fieldErrors,
    };
  }

  // 5. Other business rules (Reputation < 50, account status, OTP errors)
  return {
    category: "BUSINESS_RULE",
    categoryLabel: "Quy tắc nghiệp vụ",
    title:
      code === "REPUTATION_TOO_LOW"
        ? "Điểm uy tín chưa đủ điều kiện mở shop (yêu cầu >= 50)"
        : "Không thể thực hiện yêu cầu",
    detail: msg,
    errorCode: error.errorCode,
    status: error.status,
    traceId: error.traceId,
    fieldErrors: error.fieldErrors,
  };
}

/**
 * Non-sensitive session state for onboarding progress (NEVER stores CCCD).
 */
export type SafeRegistrationDraft = {
  userId: string;
  registrationId: string;
  shopName: string;
  businessEmail: string;
  hotline: string;
  warehouseAddress: GhnWarehouseAddress;
  status: SellerRegistrationStatus;
  otpVerified: boolean;
  rejectionReason?: string | null;
  submittedAt?: string;
};

const DRAFT_STORAGE_PREFIX = "nexus_seller_onboarding_";

export function saveSafeRegistrationDraft(draft: SafeRegistrationDraft): void {
  if (typeof window === "undefined" || !draft.userId) return;
  try {
    const safePayload: SafeRegistrationDraft = {
      userId: draft.userId,
      registrationId: draft.registrationId,
      shopName: draft.shopName,
      businessEmail: draft.businessEmail,
      hotline: draft.hotline,
      warehouseAddress: {
        provinceId: Number(draft.warehouseAddress.provinceId) || 0,
        districtId: Number(draft.warehouseAddress.districtId) || 0,
        wardCode: String(draft.warehouseAddress.wardCode ?? ""),
        streetAddress: String(draft.warehouseAddress.streetAddress ?? ""),
      },
      status: draft.status,
      otpVerified: Boolean(draft.otpVerified),
      rejectionReason: draft.rejectionReason ?? null,
      submittedAt: draft.submittedAt,
    };
    window.sessionStorage.setItem(`${DRAFT_STORAGE_PREFIX}${draft.userId}`, JSON.stringify(safePayload));
  } catch {
    /* Ignore storage quota errors */
  }
}

export function loadSafeRegistrationDraft(userId?: string | null): SafeRegistrationDraft | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = window.sessionStorage.getItem(`${DRAFT_STORAGE_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // Ensure any sensitive key is never read even if externally injected
    for (const key of Object.keys(parsed)) {
      if (isSensitiveIdentityKey(key)) {
        delete parsed[key];
      }
    }
    if (typeof parsed.registrationId !== "string" || typeof parsed.shopName !== "string") {
      return null;
    }
    return parsed as unknown as SafeRegistrationDraft;
  } catch {
    return null;
  }
}

export const sellerService = {
  getProfile: (signal?: AbortSignal) =>
    api.get<ApiResponse<SellerProfile>>("/api/v1/seller/profile", { signal }),

  updateProfile: (payload: Record<string, unknown>) =>
    api.patch<ApiResponse<Record<string, unknown>>>("/api/v1/seller/profile", payload),

  registerSeller: (payload: CreateSellerRegistrationPayload) =>
    api.post<ApiResponse<SellerRegistrationCreatedResponse>>("/api/v1/seller/registration", payload),

  verifyRegistrationOtp: (payload: VerifySellerOtpPayload) =>
    api.post<ApiResponse<VerifySellerOtpResponse>>("/api/v1/seller/otp/verify", payload),

  resendRegistrationOtp: (payload: ResendSellerOtpPayload) =>
    api.post<ApiResponse<ResendSellerOtpResponse>>("/api/v1/seller/registration/otp/resend", payload),

  getRegistrationStatus: (signal?: AbortSignal) =>
    api.get<ApiResponse<SellerRegistrationStatusRecord>>("/api/v1/seller/registration", { signal }),
};
