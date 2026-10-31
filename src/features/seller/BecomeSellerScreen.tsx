"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ROUTES } from "@/constants/routes";
import { useSession } from "@/components/auth/SessionProvider";
import { Icon } from "@/components/ui/Icon";
import { Badge, ButtonLink, Card, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { ApiError, api, type ApiResponse } from "@/lib/api/client";
import {
  classifySellerRegistrationError,
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

type PersonalFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
};

type ShopFormState = {
  shopName: string;
  businessEmail: string;
  hotline: string;
  provinceId: string;
  districtId: string;
  wardCode: string;
  streetAddress: string;
};

const GHN_PRESETS: Array<{
  label: string;
  provinceId: string;
  districtId: string;
  wardCode: string;
}> = [
    { label: "TP. Hồ Chí Minh — Quận 1 — Phường Bến Nghé (202 / 1442 / 20101)", provinceId: "202", districtId: "1442", wardCode: "20101" },
    { label: "TP. Hồ Chí Minh — TP. Thủ Đức — Phường Hiệp Bình Chánh (202 / 3695 / 90737)", provinceId: "202", districtId: "3695", wardCode: "90737" },
    { label: "Hà Nội — Quận Cầu Giấy — Phường Dịch Vọng Hậu (201 / 1485 / 1A0601)", provinceId: "201", districtId: "1485", wardCode: "1A0601" },
    { label: "Đà Nẵng — Quận Hải Châu — Phường Thạch Thang (203 / 1526 / 40101)", provinceId: "203", districtId: "1526", wardCode: "40101" },
  ];

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
  const { user, refreshUser } = useSession();

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
  const [showIdentityCard, setShowIdentityCard] = useState(false);

  // Shop & GHN Warehouse fields
  const [shopForm, setShopForm] = useState<ShopFormState>({
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
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [otpVerified, setOtpVerified] = useState(false);
  const [editingAfterReject, setEditingAfterReject] = useState(false);

  // OTP Verification state
  const [otpCode, setOtpCode] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);

  // Synchronized Seller Profile & Warehouse (when APPROVED)
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);

  // Loading, Error classification & Backend Blocker tracking
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
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

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = window.setTimeout(() => setOtpCooldown((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [otpCooldown]);

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
          setOtpVerified((prev) => prev || savedDraft.otpVerified);
          setSubmittedAt((prev) => prev || savedDraft.submittedAt || null);
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
          if (record.businessEmail) {
            setShopForm((prev) => ({ ...prev, businessEmail: String(record.businessEmail) }));
          }
          if (record.hotline) {
            setShopForm((prev) => ({ ...prev, hotline: String(record.hotline) }));
          }

          if (resolvedStatus) {
            setCurrentStatus(resolvedStatus);
            if (resolvedStatus === "PENDING_APPROVAL" || resolvedStatus === "APPROVED") {
              setOtpVerified(true);
            }
            if (currentUserId && (record.registrationId || savedDraft?.registrationId)) {
              saveSafeRegistrationDraft({
                userId: currentUserId,
                registrationId: record.registrationId ?? savedDraft?.registrationId ?? "",
                shopName: String(record.shopName ?? savedDraft?.shopName ?? meShopName ?? ""),
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
    void syncOnboardingState(false);
  }, [syncOnboardingState]);

  function validateRegistrationForm(): ClassifiedSellerError | null {
    const fieldErrors: Record<string, string[]> = {};

    // 1. Validate personal fields
    if (!personal.firstName.trim()) {
      fieldErrors.firstName = ["Vui lòng nhập Họ của người đăng ký."];
    }
    if (!personal.lastName.trim()) {
      fieldErrors.lastName = ["Vui lòng nhập Tên của người đăng ký."];
    }
    if (!personal.phoneNumber.trim() || !/^[0-9+() -]{9,15}$/.test(personal.phoneNumber.trim())) {
      fieldErrors.phoneNumber = ["Số điện thoại cá nhân không hợp lệ (9–15 chữ số)."];
    }

    // 2. Validate shop & business email & CCCD fields
    const trimmedShop = shopForm.shopName.trim();
    if (!trimmedShop || trimmedShop.length < 3 || trimmedShop.length > 100) {
      fieldErrors.shopName = ["Tên gian hàng phải từ 3 đến 100 ký tự."];
    }
    const trimmedBizEmail = shopForm.businessEmail.trim();
    if (!trimmedBizEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedBizEmail)) {
      fieldErrors.businessEmail = ["Email doanh nghiệp (businessEmail) không đúng định dạng."];
    }
    const trimmedHotline = shopForm.hotline.trim();
    if (!trimmedHotline || !/^[0-9+() -]{9,15}$/.test(trimmedHotline)) {
      fieldErrors.hotline = ["Hotline gian hàng phải từ 9 đến 15 chữ số."];
    }
    const trimmedCccd = identityCardNumber.trim();
    if (!trimmedCccd || !/^(\d{9}|\d{12})$/.test(trimmedCccd)) {
      fieldErrors.identityCardNumber = ["Số CCCD/CMND phải gồm đúng 9 hoặc 12 chữ số."];
    }

    if (Object.keys(fieldErrors).length > 0) {
      return {
        category: "MISSING_FIELD",
        categoryLabel: "Thiếu hoặc sai thông tin trường bắt buộc",
        title: "Vui lòng kiểm tra lại thông tin hồ sơ",
        detail: "Một số trường thông tin cá nhân, gian hàng hoặc CCCD còn thiếu hoặc chưa đúng định dạng.",
        fieldErrors,
      };
    }

    // 3. Validate GHN Warehouse codes separately so INVALID_GHN is clearly distinguished
    const ghnErrors: Record<string, string[]> = {};
    const provinceNum = Number(shopForm.provinceId);
    const districtNum = Number(shopForm.districtId);
    const wardTrimmed = shopForm.wardCode.trim();
    const streetTrimmed = shopForm.streetAddress.trim();

    if (!Number.isInteger(provinceNum) || provinceNum <= 0 || provinceNum > 9999) {
      ghnErrors.provinceId = ["Mã Tỉnh/Thành GHN (provinceId) phải là số nguyên dương hợp lệ (ví dụ: 201, 202, 203)."];
    }
    if (!Number.isInteger(districtNum) || districtNum <= 0 || districtNum > 99999) {
      ghnErrors.districtId = ["Mã Quận/Huyện GHN (districtId) phải là số nguyên dương hợp lệ (ví dụ: 1442, 1485)."];
    }
    if (!wardTrimmed || wardTrimmed === "00000" || !/^[A-Za-z0-9]{4,10}$/.test(wardTrimmed)) {
      ghnErrors.wardCode = ["Mã Phường/Xã GHN (wardCode) không hợp lệ (ví dụ: 20101, 1A0601)."];
    }
    if (!streetTrimmed || streetTrimmed.length < 5) {
      ghnErrors.streetAddress = ["Vui lòng nhập địa chỉ kho lấy hàng cụ thể (tối thiểu 5 ký tự)."];
    }

    if (Object.keys(ghnErrors).length > 0) {
      return {
        category: "INVALID_GHN",
        categoryLabel: "Sai mã địa chỉ kho GHN",
        title: "Mã địa chỉ kho GHN không hợp lệ",
        detail: "Vui lòng nhập đúng Mã Tỉnh (provinceId), Mã Quận/Huyện (districtId), Mã Phường/Xã (wardCode) và địa chỉ lấy hàng theo danh mục GHN.",
        fieldErrors: ghnErrors,
      };
    }

    return null;
  }

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClassifiedError(null);
    setStatusNotice(null);
    setOtpMessage(null);

    const validationError = validateRegistrationForm();
    if (validationError) {
      setClassifiedError(validationError);
      return;
    }

    const cccdToSubmit = identityCardNumber.trim();
    const warehouseAddress: GhnWarehouseAddress = {
      provinceId: Number(shopForm.provinceId),
      districtId: Number(shopForm.districtId),
      wardCode: shopForm.wardCode.trim(),
      streetAddress: shopForm.streetAddress.trim(),
    };

    setSubmitting(true);
    try {
      // Optionally sync personal profile if firstName, lastName, or phoneNumber was provided
      try {
        await api.patch("/api/v1/me", {
          firstName: personal.firstName.trim(),
          lastName: personal.lastName.trim(),
          phoneNumber: personal.phoneNumber.trim(),
        });
      } catch {
        /* Non-blocking if /api/v1/me PATCH has a different optional contract; Seller registration is primary */
      }

      const response = await sellerService.registerSeller({
        shopName: shopForm.shopName.trim(),
        businessEmail: shopForm.businessEmail.trim(),
        hotline: shopForm.hotline.trim(),
        identityCardNumber: cccdToSubmit,
        provinceId: warehouseAddress.provinceId,
        districtId: warehouseAddress.districtId,
        wardCode: warehouseAddress.wardCode,
        streetAddress: warehouseAddress.streetAddress,
        pickupAddress: warehouseAddress.streetAddress,
        warehouseAddress,
      });

      // Immediately wipe CCCD from component state after submission so it never lingers in memory
      setIdentityCardNumber("");
      setShowIdentityCard(false);

      const created = unwrap(response);
      const newRegId = String(created?.registrationId ?? "");
      const initialStatus =
        normalizeSellerRegistrationStatus(created?.status, { otpVerified: false }) ?? "PENDING";

      setRegistrationId(newRegId);
      setCurrentStatus(initialStatus);
      setOtpVerified(false);
      setEditingAfterReject(false);
      setRejectionReason(null);
      setSubmittedAt(created?.submittedAt ?? new Date().toISOString());
      setOtpCooldown(60);
      setOtpMessage(
        `Đã gửi hồ sơ đăng ký mở shop. Mã OTP xác thực đã được gửi tới email doanh nghiệp ${shopForm.businessEmail.trim()}.`,
      );

      if (user?.id) {
        saveSafeRegistrationDraft({
          userId: user.id,
          registrationId: newRegId,
          shopName: shopForm.shopName.trim(),
          businessEmail: shopForm.businessEmail.trim(),
          hotline: shopForm.hotline.trim(),
          warehouseAddress,
          status: initialStatus,
          otpVerified: false,
          rejectionReason: null,
          submittedAt: created?.submittedAt ?? new Date().toISOString(),
        });
      }
    } catch (err) {
      // Wipe CCCD on error or keep? Wiping on duplicate/server error ensures CCCD isn't left exposed
      const classified = classifySellerRegistrationError(err);
      setClassifiedError(classified);

      const code = (classified.errorCode ?? "").toUpperCase();
      if (code === "ALREADY_SELLER") {
        setIdentityCardNumber("");
        setCurrentStatus("APPROVED");
        await refreshUser();
        await loadSellerWarehouseProfile();
      } else if (code === "REQUEST_ALREADY_PENDING") {
        setIdentityCardNumber("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function submitOtpVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClassifiedError(null);
    setOtpMessage(null);

    const trimmedOtp = otpCode.trim();
    if (!/^\d{6}$/.test(trimmedOtp)) {
      setClassifiedError({
        category: "MISSING_FIELD",
        categoryLabel: "Thiếu hoặc sai thông tin trường bắt buộc",
        title: "Mã OTP không hợp lệ",
        detail: "Mã OTP xác thực email doanh nghiệp phải gồm đúng 6 chữ số.",
        fieldErrors: { otpCode: ["Vui lòng nhập mã OTP gồm 6 chữ số."] },
      });
      return;
    }

    if (!registrationId.trim()) {
      setClassifiedError({
        category: "MISSING_FIELD",
        categoryLabel: "Thiếu mã hồ sơ",
        title: "Thiếu mã hồ sơ đăng ký (registrationId)",
        detail: "Vui lòng nhập mã hồ sơ đăng ký hoặc nộp hồ sơ trước khi xác thực OTP.",
      });
      return;
    }

    setVerifyingOtp(true);
    try {
      const response = await sellerService.verifyRegistrationOtp({
        registrationId: registrationId.trim(),
        otpCode: trimmedOtp,
      });
      const verifiedData = unwrap(response);
      const nextStatus =
        normalizeSellerRegistrationStatus(verifiedData?.status, { otpVerified: true }) ??
        "PENDING_APPROVAL";

      setOtpVerified(true);
      setCurrentStatus(nextStatus);
      setOtpCode("");
      setStatusNotice(
        "Xác thực OTP email doanh nghiệp thành công! Hồ sơ của bạn đã chuyển sang trạng thái PENDING_APPROVAL (Chờ Staff phê duyệt).",
      );

      if (user?.id) {
        saveSafeRegistrationDraft({
          userId: user.id,
          registrationId: registrationId.trim(),
          shopName: shopForm.shopName.trim(),
          businessEmail: shopForm.businessEmail.trim(),
          hotline: shopForm.hotline.trim(),
          warehouseAddress: {
            provinceId: Number(shopForm.provinceId) || 202,
            districtId: Number(shopForm.districtId) || 1442,
            wardCode: shopForm.wardCode.trim() || "20101",
            streetAddress: shopForm.streetAddress.trim(),
          },
          status: nextStatus,
          otpVerified: true,
          rejectionReason: null,
          submittedAt: submittedAt ?? undefined,
        });
      }
    } catch (err) {
      const classified = classifySellerRegistrationError(err);
      setClassifiedError(classified);

      if (
        err instanceof ApiError &&
        (err.status === 404 || err.status === 405 || err.status === 501 || err.status === 502 || err.status === 503 || err.status === 504)
      ) {
        appendBlocker({
          service: "UserService (users)",
          endpoint: "/api/v1/seller/otp/verify",
          method: "POST",
          role: "Buyer (Authenticated)",
          httpStatus: err.status,
          errorCode: err.errorCode,
          traceId: err.traceId,
          actualResponse: `${err.message} (HTTP ${err.status}${err.errorCode ? ` · ${err.errorCode}` : ""})`,
          expectedResponse: "{ registrationId, status: 'VERIFIED' | 'PENDING_APPROVAL', message }",
          blockedSurface: "Xác thực OTP email doanh nghiệp trên /buyer/become-seller",
          recommendation:
            "Gateway đã có POST /api/v1/seller/otp/verify (UsersController.cs:432), nhưng User.Api/Controllers/SellerController.cs chưa có action [HttpPost('/api/v1/seller/otp/verify')] gọi IRedisOtpService với purpose 'seller_registration'.",
        });
      }
    } finally {
      setVerifyingOtp(false);
    }
  }

  async function handleResendOtp() {
    if (!registrationId.trim() || !shopForm.businessEmail.trim()) {
      setClassifiedError({
        category: "MISSING_FIELD",
        categoryLabel: "Thiếu thông tin",
        title: "Không thể gửi lại mã OTP",
        detail: "Cần có mã hồ sơ (registrationId) và email doanh nghiệp (businessEmail) để gửi lại OTP.",
      });
      return;
    }

    setResendingOtp(true);
    setClassifiedError(null);
    setOtpMessage(null);
    try {
      const res = await sellerService.resendRegistrationOtp({
        registrationId: registrationId.trim(),
        businessEmail: shopForm.businessEmail.trim(),
      });
      const data = unwrap(res);
      setOtpCooldown(Number(data?.cooldown) || 60);
      setOtpMessage(`Đã gửi lại mã OTP tới email doanh nghiệp ${shopForm.businessEmail.trim()}.`);
    } catch (err) {
      setClassifiedError(classifySellerRegistrationError(err));
      if (err instanceof ApiError && (err.status === 404 || err.status === 502 || err.status === 503 || err.status === 504)) {
        appendBlocker({
          service: "UserService (users)",
          endpoint: "/api/v1/seller/registration/otp/resend",
          method: "POST",
          role: "Buyer (Authenticated)",
          httpStatus: err.status,
          errorCode: err.errorCode,
          traceId: err.traceId,
          actualResponse: `${err.message} (HTTP ${err.status}${err.errorCode ? ` · ${err.errorCode}` : ""})`,
          expectedResponse: "{ registrationId, cooldown: 60 }",
          blockedSurface: "Gửi lại OTP email doanh nghiệp trên /buyer/become-seller",
          recommendation:
            "Bổ sung POST /api/v1/seller/registration/otp/resend trong User.Api/Controllers/SellerController.cs.",
        });
      }
    } finally {
      setResendingOtp(false);
    }
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
        description="Hoàn tất thông tin cá nhân, định danh, email doanh nghiệp và địa chỉ kho GHN để mở kênh bán hàng trên NEXUS."
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
              Buyer nộp hồ sơ → Xác thực OTP email doanh nghiệp → Staff duyệt hồ sơ → Mở kênh bán &amp; đồng bộ kho GHN
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
                desc: "Đã gửi đơn đăng ký, chờ xác thực OTP email doanh nghiệp.",
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
                <span>Email doanh nghiệp</span>
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

          {/* PENDING STATE: Business Email OTP Verification via POST /api/v1/seller/otp/verify */}
          {effectiveStatus === "PENDING" && (
            <div className="split" style={{ marginBottom: 24 }}>
              <Card className="card-pad">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                  <h2 style={{ margin: 0, fontSize: 20 }}>Xác thực OTP Email doanh nghiệp</h2>
                  <Badge tone="amber">PENDING</Badge>
                </div>
                <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>
                  Nhập mã OTP 6 chữ số đã được gửi tới email doanh nghiệp{" "}
                  <strong>{shopForm.businessEmail || "của bạn"}</strong> để hoàn tất xác thực và chuyển hồ sơ sang hàng đợi Staff duyệt (<code>POST /api/v1/seller/otp/verify</code>).
                </p>
                {otpMessage && (
                  <p role="status" className="form-success" style={{ marginBottom: 14 }}>
                    {otpMessage}
                  </p>
                )}
                <form className="auth-fields" onSubmit={(e) => void submitOtpVerification(e)}>
                  <label className="field-wrap">
                    Mã hồ sơ đăng ký (registrationId)
                    <input
                      className="field"
                      required
                      value={registrationId}
                      onChange={(e) => setRegistrationId(e.target.value)}
                      placeholder="UUID hoặc mã hồ sơ từ hệ thống"
                    />
                  </label>
                  <label className="field-wrap">
                    Mã OTP (6 chữ số)
                    <input
                      className="field"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Nhập 6 chữ số OTP"
                    />
                  </label>
                  <div className="action-row">
                    <button
                      type="submit"
                      className="button button-primary"
                      disabled={verifyingOtp || otpCode.length !== 6}
                    >
                      {verifyingOtp ? "Đang xác thực OTP…" : "Xác thực OTP doanh nghiệp"}
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      disabled={resendingOtp || otpCooldown > 0}
                      onClick={() => void handleResendOtp()}
                    >
                      {otpCooldown > 0 ? `Gửi lại mã sau ${otpCooldown}s` : resendingOtp ? "Đang gửi lại…" : "Gửi lại mã OTP"}
                    </button>
                  </div>
                </form>
              </Card>

              <Card className="card-pad">
                <h2 style={{ margin: "0 0 14px", fontSize: 18 }}>Tóm tắt hồ sơ đã nộp</h2>
                <div className="info-row">
                  <span>Trạng thái hiện tại</span>
                  <strong>
                    <Badge tone="amber">PENDING</Badge>
                  </strong>
                </div>
                <div className="info-row">
                  <span>Mã hồ sơ</span>
                  <strong>{registrationId || "—"}</strong>
                </div>
                <div className="info-row">
                  <span>Tên gian hàng</span>
                  <strong>{shopForm.shopName || "—"}</strong>
                </div>
                <div className="info-row">
                  <span>Email doanh nghiệp</span>
                  <strong>{shopForm.businessEmail || "—"}</strong>
                </div>
                <div className="info-row">
                  <span>Hotline</span>
                  <strong>{shopForm.hotline || "—"}</strong>
                </div>
                <div className="info-row">
                  <span>Địa chỉ kho GHN</span>
                  <strong>
                    {shopForm.streetAddress || "—"} (Tỉnh {shopForm.provinceId} · Quận {shopForm.districtId} · Phường {shopForm.wardCode})
                  </strong>
                </div>
                <div className="info-row">
                  <span>Số CCCD</span>
                  <strong>Đã ẩn bảo mật (Không lưu/hiển thị công khai)</strong>
                </div>
                <div className="action-row">
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => setCurrentStatus("PENDING_APPROVAL")}
                  >
                    Xem trạng thái chờ Staff duyệt (PENDING_APPROVAL)
                  </button>
                </div>
              </Card>
            </div>
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
                <span>Email doanh nghiệp</span>
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
                {!otpVerified && (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setCurrentStatus("PENDING")}
                  >
                    Quay lại nhập OTP email doanh nghiệp
                  </button>
                )}
              </div>
            </Card>
          )}

          {/* REGISTRATION FORM: Shown when Buyer has not registered yet or is resubmitting after REJECTED */}
          {showRegistrationForm && (
            <form onSubmit={(e) => void submitRegistration(e)} autoComplete="off">
              <div className="split" style={{ alignItems: "start" }}>
                <div className="mini-list">
                  <Card className="card-pad">
                    <SectionHeading
                      title="1. Thông tin cá nhân & Định danh"
                      hint="Thông tin chủ tài khoản Buyer và số CCCD phục vụ thẩm định mở gian hàng."
                    />
                    <div className="form-grid">
                      <label className="field-wrap">
                        Họ người đăng ký *
                        <input
                          className="field"
                          required
                          value={personal.firstName}
                          onChange={(e) => setPersonal((s) => ({ ...s, firstName: e.target.value }))}
                          placeholder="Nguyễn"
                        />
                      </label>
                      <label className="field-wrap">
                        Tên người đăng ký *
                        <input
                          className="field"
                          required
                          value={personal.lastName}
                          onChange={(e) => setPersonal((s) => ({ ...s, lastName: e.target.value }))}
                          placeholder="Văn A"
                        />
                      </label>
                      <label className="field-wrap">
                        Email tài khoản Buyer
                        <input
                          className="field"
                          type="email"
                          value={personal.email}
                          readOnly
                          aria-readonly="true"
                        />
                      </label>
                      <label className="field-wrap">
                        Số điện thoại cá nhân *
                        <input
                          className="field"
                          type="tel"
                          required
                          value={personal.phoneNumber}
                          onChange={(e) => setPersonal((s) => ({ ...s, phoneNumber: e.target.value }))}
                          placeholder="0901234567"
                        />
                      </label>
                    </div>

                    <div className="field-wrap" style={{ marginTop: 18 }}>
                      <label htmlFor="seller-cccd-input">
                        Số CCCD / CMND chủ gian hàng (9 hoặc 12 chữ số) *
                      </label>
                      <div style={{ display: "flex", gap: 10 }}>
                        <input
                          id="seller-cccd-input"
                          className="field"
                          type={showIdentityCard ? "text" : "password"}
                          inputMode="numeric"
                          autoComplete="off"
                          required
                          maxLength={12}
                          value={identityCardNumber}
                          onChange={(e) =>
                            setIdentityCardNumber(e.target.value.replace(/\D/g, "").slice(0, 12))
                          }
                          placeholder="Nhập 12 chữ số CCCD (được ẩn bảo mật)"
                        />
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => setShowIdentityCard((v) => !v)}
                        >
                          {showIdentityCard ? "Ẩn CCCD" : "Hiện CCCD"}
                        </button>
                      </div>
                      <small style={{ color: "var(--muted)", fontSize: 11 }}>
                        Bảo mật dữ liệu: Số CCCD chỉ gửi một lần qua HTTPS trong body <code>POST /api/v1/seller/registration</code>, không lưu vào bộ nhớ trình duyệt và không hiển thị ra màn công khai hoặc console.
                      </small>
                    </div>
                  </Card>

                  <Card className="card-pad">
                    <SectionHeading
                      title="2. Thông tin gian hàng & Email doanh nghiệp"
                      hint="Tên gian hàng phải là duy nhất (3–100 ký tự). Hệ thống sẽ gửi OTP 6 số tới businessEmail."
                    />
                    <div className="form-grid">
                      <label className="field-wrap">
                        Tên gian hàng (shopName) *
                        <input
                          className="field"
                          required
                          minLength={3}
                          maxLength={100}
                          value={shopForm.shopName}
                          onChange={(e) => setShopForm((s) => ({ ...s, shopName: e.target.value }))}
                          placeholder="Ví dụ: Nexus Official Tech Store"
                        />
                      </label>
                      <label className="field-wrap">
                        Hotline gian hàng (hotline) *
                        <input
                          className="field"
                          type="tel"
                          required
                          value={shopForm.hotline}
                          onChange={(e) => setShopForm((s) => ({ ...s, hotline: e.target.value }))}
                          placeholder="+84901234567"
                        />
                      </label>
                    </div>
                    <label className="field-wrap" style={{ marginTop: 18 }}>
                      Email doanh nghiệp nhận OTP (businessEmail) *
                      <input
                        className="field"
                        type="email"
                        required
                        value={shopForm.businessEmail}
                        onChange={(e) => setShopForm((s) => ({ ...s, businessEmail: e.target.value }))}
                        placeholder="shop-contact@doanhnghiep.vn"
                      />
                    </label>
                  </Card>

                  <Card className="card-pad">
                    <SectionHeading
                      title="3. Địa chỉ kho lấy hàng (Mã GHN)"
                      hint="Cấu hình mã Tỉnh/Quận/Phường theo chuẩn Giao Hàng Nhanh (GHN) để đồng bộ kho lấy hàng sau khi duyệt."
                    />
                    <label className="field-wrap" style={{ marginBottom: 18 }}>
                      Chọn nhanh khu vực mẫu GHN (hoặc tự nhập mã GHN bên dưới)
                      <select
                        className="select-field"
                        defaultValue=""
                        onChange={(e) => {
                          const idx = Number(e.target.value);
                          const preset = GHN_PRESETS[idx];
                          if (preset) {
                            setShopForm((s) => ({
                              ...s,
                              provinceId: preset.provinceId,
                              districtId: preset.districtId,
                              wardCode: preset.wardCode,
                            }));
                          }
                        }}
                      >
                        <option value="">-- Chọn mã vùng GHN mẫu hoặc nhập thủ công --</option>
                        {GHN_PRESETS.map((preset, index) => (
                          <option key={preset.label} value={index}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="form-grid">
                      <label className="field-wrap">
                        Mã Tỉnh/Thành GHN (provinceId) *
                        <input
                          className="field"
                          type="number"
                          min={1}
                          required
                          value={shopForm.provinceId}
                          onChange={(e) => setShopForm((s) => ({ ...s, provinceId: e.target.value }))}
                          placeholder="202"
                        />
                      </label>
                      <label className="field-wrap">
                        Mã Quận/Huyện GHN (districtId) *
                        <input
                          className="field"
                          type="number"
                          min={1}
                          required
                          value={shopForm.districtId}
                          onChange={(e) => setShopForm((s) => ({ ...s, districtId: e.target.value }))}
                          placeholder="1442"
                        />
                      </label>
                      <label className="field-wrap">
                        Mã Phường/Xã GHN (wardCode) *
                        <input
                          className="field"
                          required
                          value={shopForm.wardCode}
                          onChange={(e) => setShopForm((s) => ({ ...s, wardCode: e.target.value }))}
                          placeholder="20101"
                        />
                      </label>
                      <label className="field-wrap">
                        Địa chỉ kho cụ thể (streetAddress) *
                        <input
                          className="field"
                          required
                          value={shopForm.streetAddress}
                          onChange={(e) => setShopForm((s) => ({ ...s, streetAddress: e.target.value }))}
                          placeholder="Số 456 Nguyễn Huệ, Phường Bến Nghé"
                        />
                      </label>
                    </div>
                  </Card>
                </div>

                {/* Right Rail: Conditions, Summary & Submit Action */}
                <div className="mini-list">
                  <Card className="card-pad">
                    <h2 style={{ margin: "0 0 14px", fontSize: 18 }}>Điều kiện &amp; Quy trình mở Shop</h2>
                    <div className="info-row">
                      <span>Điểm uy tín hiện tại</span>
                      <strong>
                        {reputationScore !== null ? `${reputationScore} điểm` : "Mặc định (>= 50)"}
                      </strong>
                    </div>
                    <div className="info-row">
                      <span>Ngưỡng uy tín tối thiểu</span>
                      <strong>&gt;= 50 điểm</strong>
                    </div>
                    <div className="info-row">
                      <span>Xác thực email doanh nghiệp</span>
                      <strong>OTP 6 số (hiệu lực 5 phút)</strong>
                    </div>
                    <div className="info-row">
                      <span>Thẩm định hồ sơ</span>
                      <strong>Staff duyệt (/staff/sellers)</strong>
                    </div>
                    <p style={{ margin: "14px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.55 }}>
                      Sau khi gửi biểu mẫu, hệ thống sẽ tạo hồ sơ ở trạng thái <code>PENDING</code> và gửi mã OTP tới <code>businessEmail</code>. Khi Staff phê duyệt, tài khoản sẽ nhận quyền <code>Seller</code> và đồng bộ kho lấy hàng GHN.
                    </p>
                    <div className="action-row" style={{ marginTop: 20 }}>
                      <button
                        type="submit"
                        className="button button-primary full-width"
                        disabled={submitting || initialLoading}
                      >
                        {submitting ? "Đang gửi hồ sơ đăng ký…" : "Gửi hồ sơ đăng ký Seller"}
                      </button>
                      {editingAfterReject && (
                        <button
                          type="button"
                          className="button button-secondary full-width"
                          onClick={() => setEditingAfterReject(false)}
                        >
                          Hủy chỉnh sửa
                        </button>
                      )}
                    </div>
                  </Card>

                  <Card className="card-pad">
                    <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>Đã nộp hồ sơ trước đó?</h3>
                    <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                      Nếu bạn đã nhận mã OTP qua email doanh nghiệp hoặc muốn kiểm tra tiến độ duyệt hồ sơ:
                    </p>
                    <div className="action-row" style={{ marginTop: 0 }}>
                      <button
                        type="button"
                        className="button button-secondary button-small"
                        onClick={() => setCurrentStatus("PENDING")}
                      >
                        Mở màn xác thực OTP
                      </button>
                      <button
                        type="button"
                        className="button button-secondary button-small"
                        onClick={() => void handleManualRefresh()}
                      >
                        Đọc trạng thái từ API
                      </button>
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
