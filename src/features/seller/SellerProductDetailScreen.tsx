"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ROUTES } from "@/constants/routes";
import { useSession } from "@/components/auth/SessionProvider";
import { BackendImage } from "@/components/ui/BackendImage";
import { Icon } from "@/components/ui/Icon";
import { Badge, ButtonLink, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { ApiError } from "@/lib/api/client";
import { formatMoney, resolveImageUrl } from "@/lib/presentation";
import { sellerService, type SellerBlockerInfo, type SellerProfile } from "./services/seller.service";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGES_PER_PRODUCT,
  MAX_VARIANTS_PER_PRODUCT,
  buildCatalogBlocker,
  evaluateProductActivationGate,
  flattenCategories,
  formatBackendErrorDetail,
  getInactiveReasonLabel,
  getProductStatusMeta,
  loadSessionSellerProducts,
  loadSessionSkuStockMap,
  normalizeImageRecord,
  normalizeProductDetail,
  removeSessionSellerProduct,
  saveSessionSellerProduct,
  saveSessionSkuStockRecord,
  sellerCatalogService,
  validateImageUploadSelection,
  type FlattenedCategoryOption,
  type ProductInactiveReasonCode,
  type SellerProductDetail,
  type SellerProductImageRecord,
  type SellerVariantRecord,
  type SkuStockRecord,
  type VariantAttributeItem,
  type VariantInactiveReasonCode,
} from "./services/seller-catalog.service";

export function SellerProductDetailScreen() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useSession();
  const productId = String(params?.id ?? "").trim();

  // Shop ownership & categories
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [categories, setCategories] = useState<FlattenedCategoryOption[]>([]);

  // Product detail state
  const [detail, setDetail] = useState<SellerProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [usedSessionFallback, setUsedSessionFallback] = useState(false);

  // Stock records per SKU (explicitly from stock-in / fulfillment responses, never inferred from Catalog)
  const [stockMap, setStockMap] = useState<Record<string, SkuStockRecord>>({});

  // Product basic info edit form state
  const [editProductForm, setEditProductForm] = useState({
    name: "",
    categoryId: "",
    brand: "",
    description: "",
  });
  const [specPairs, setSpecPairs] = useState<Array<{ key: string; value: string }>>([]);
  const [savingProduct, setSavingProduct] = useState(false);

  // Status & Soft Delete state
  const [inactiveReason, setInactiveReason] = useState<ProductInactiveReasonCode>("SELLER_PAUSED");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(false);

  // Variant Create / Edit state
  const [newVariant, setNewVariant] = useState({
    skuCode: "",
    name: "",
    price: "",
    isActive: true,
    attributes: [{ attrName: "Phân loại", attrValue: "" }] as VariantAttributeItem[],
  });
  const [creatingVariant, setCreatingVariant] = useState(false);

  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editVariantForm, setEditVariantForm] = useState({
    name: "",
    price: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
    statusReason: "OUT_OF_STOCK" as VariantInactiveReasonCode,
    attributes: [] as VariantAttributeItem[],
  });
  const [savingVariant, setSavingVariant] = useState(false);
  const [inspectedVariantDetail, setInspectedVariantDetail] = useState<Record<string, unknown> | null>(null);

  // Image Upload & Primary / Delete state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [imageAltText, setImageAltText] = useState("");
  const [imageVariantId, setImageVariantId] = useState("");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedImageIdsToDelete, setSelectedImageIdsToDelete] = useState<string[]>([]);
  const [deletingImages, setDeletingImages] = useState(false);

  // Initial Stock-In (Fulfillment / Inventory) state
  const [selectedStockSkuId, setSelectedStockSkuId] = useState("");
  const [stockInQty, setStockInQty] = useState("10");
  const [stockInMode, setStockInMode] = useState<"batch" | "single">("batch");
  const [submittingStockIn, setSubmittingStockIn] = useState(false);

  // Feedback, Backend Error & Blocker state
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<{
    context: string;
    title: string;
    detail: string;
    status?: number;
    errorCode?: string;
    traceId?: string;
    fieldErrors?: Record<string, string[]>;
  } | null>(null);
  const [blockers, setBlockers] = useState<SellerBlockerInfo[]>([]);

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

  const syncFormFromDetail = useCallback((loaded: SellerProductDetail) => {
    setEditProductForm({
      name: loaded.product.name,
      categoryId: loaded.product.categoryId ?? "",
      brand: loaded.product.brand ?? "",
      description: loaded.product.description ?? "",
    });
    const specs = Object.entries(loaded.product.specifications ?? {}).map(([key, value]) => ({
      key,
      value,
    }));
    setSpecPairs(specs.length ? specs : [{ key: "", value: "" }]);
    if (loaded.variants.length > 0) {
      setSelectedStockSkuId((prev) => prev || loaded.variants[0].variantId);
    }
  }, []);

  const loadAll = useCallback(
    async (isManualReload = false) => {
      if (!productId) return;
      if (!isManualReload) setLoading(true);
      setBackendError(null);

      // Load session stock records
      setStockMap(loadSessionSkuStockMap());

      // 1. Load Seller Profile for shop ownership check
      try {
        const profRes = await sellerService.getProfile();
        const profData =
          profRes && typeof profRes === "object" && "data" in profRes ? profRes.data : profRes;
        if (profData && typeof profData === "object") {
          setSellerProfile(profData as SellerProfile);
        }
      } catch {
        /* Keep user session fallback */
      }

      // 2. Load real Categories from GET /api/v1/categories
      try {
        const catRes = await sellerCatalogService.getCategories(true);
        setCategories(flattenCategories(catRes));
      } catch (err) {
        if (err instanceof ApiError) {
          appendBlocker(
            buildCatalogBlocker(
              err,
              "/api/v1/categories?tree=true",
              "GET",
              "Đọc danh mục thật trong màn chi tiết/chỉnh sửa sản phẩm Seller",
              "{ items: [{ categoryId, name, level, children }] }",
              "Đảm bảo Catalog.Api phản hồi GET /api/v1/categories qua Gateway 8080.",
            ),
          );
        }
      }

      // 3. Load Product Detail from GET /api/v1/product/{productId} and Images from GET /api/v1/product/{productId}pics
      const sessionProducts = loadSessionSellerProducts();
      const sessionCached = sessionProducts[productId];

      try {
        const prodRes = await sellerCatalogService.getProductById(productId);
        const normalized = normalizeProductDetail(prodRes, productId);

        // Also query GET /api/v1/product/{productId}pics to merge any image metadata (imageId, sortOrder, variantId)
        try {
          const picsRes = await sellerCatalogService.listProductImages(productId);
          const unwrappedPics =
            picsRes && typeof picsRes === "object" && "data" in picsRes
              ? (picsRes as { data: unknown }).data
              : picsRes;
          const rawPicList = Array.isArray(unwrappedPics)
            ? unwrappedPics
            : Array.isArray((unwrappedPics as Record<string, unknown>)?.items)
              ? ((unwrappedPics as Record<string, unknown>).items as unknown[])
              : Array.isArray((unwrappedPics as Record<string, unknown>)?.images)
                ? ((unwrappedPics as Record<string, unknown>).images as unknown[])
                : [];
          if (rawPicList.length > 0) {
            normalized.images = rawPicList
              .map((img, idx) => normalizeImageRecord(img, idx))
              .filter((img) => Boolean(img.url))
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((img, idx) => ({ ...img, isPrimary: idx === 0 }));
          }
        } catch {
          /* Keep images from product detail response */
        }

        // If Gateway is running stateless seed mode where GET /api/v1/product/{id} always returns static seed product-1
        // while the user is inspecting a newly created session product, merge session state so Seller's real flow works seamlessly
        const returnedId = normalized.product.productId;
        if (sessionCached && (returnedId !== productId || sessionCached.product.name !== normalized.product.name)) {
          setDetail(sessionCached);
          syncFormFromDetail(sessionCached);
          setUsedSessionFallback(true);
        } else {
          setDetail(normalized);
          syncFormFromDetail(normalized);
          saveSessionSellerProduct(normalized);
          setUsedSessionFallback(false);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          appendBlocker(
            buildCatalogBlocker(
              err,
              `/api/v1/product/${productId}`,
              "GET",
              "Xem chi tiết sản phẩm của shop đang đăng nhập",
              "{ product, category, variants, images, rating }",
              "Đảm bảo Catalog.Api triển khai GET /api/v1/product/{productId} khớp route Gateway.",
            ),
          );
        }
        if (sessionCached) {
          setDetail(sessionCached);
          syncFormFromDetail(sessionCached);
          setUsedSessionFallback(true);
        } else {
          const formatted = formatBackendErrorDetail(err);
          setBackendError({
            context: `GET /api/v1/product/${productId}`,
            ...formatted,
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [appendBlocker, productId, syncFormFromDetail],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAll();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAll]);

  // Clean up object URLs for image previews
  useEffect(() => {
    return () => {
      for (const url of filePreviews) {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      }
    };
  }, [filePreviews]);

  // Ownership check: verify product belongs to logged-in shop
  const shopIdentifiers = [
    user?.id,
    sellerProfile?.shopId,
    sellerProfile?.sellerId,
    "11111111-1111-4111-8111-000000000001", // Gateway Seller seed ID when testing in Mock mode
  ]
    .filter(Boolean)
    .map((x) => String(x).toLowerCase());

  const productSellerId = detail?.product.sellerId?.toLowerCase() ?? "";
  const isOwnedByCurrentShop =
    !productSellerId || shopIdentifiers.includes(productSellerId) || usedSessionFallback;

  const isAdminLocked =
    String(detail?.product.statusReason ?? "").toUpperCase() === "ADMIN_LOCKED";

  const canModifyProduct = isOwnedByCurrentShop && !isAdminLocked;

  const persistUpdatedDetail = (updater: (prev: SellerProductDetail) => SellerProductDetail) => {
    setDetail((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      saveSessionSellerProduct(next);
      return next;
    });
  };

  // 1. Update Product Info (PATCH /api/v1/product/{productId})
  const handleUpdateProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!detail || !canModifyProduct) return;

    setSavingProduct(true);
    setBackendError(null);
    setActionSuccess(null);

    const specifications: Record<string, string> = {};
    for (const pair of specPairs) {
      if (pair.key.trim() && pair.value.trim()) {
        specifications[pair.key.trim()] = pair.value.trim();
      }
    }

    try {
      await sellerCatalogService.updateProduct(productId, {
        name: editProductForm.name.trim(),
        categoryId: editProductForm.categoryId || undefined,
        brand: editProductForm.brand.trim() || undefined,
        description: editProductForm.description.trim() || undefined,
        specifications,
      });

      const matchedCat = categories.find((c) => c.categoryId === editProductForm.categoryId);
      persistUpdatedDetail((prev) => ({
        ...prev,
        product: {
          ...prev.product,
          name: editProductForm.name.trim(),
          categoryId: editProductForm.categoryId || prev.product.categoryId,
          brand: editProductForm.brand.trim(),
          description: editProductForm.description.trim(),
          specifications,
        },
        category: matchedCat
          ? {
              categoryId: matchedCat.categoryId,
              name: matchedCat.name,
              parentId: matchedCat.parentId,
              level: matchedCat.level,
              isActive: matchedCat.isActive,
            }
          : prev.category,
      }));
      setActionSuccess(
        `Đã cập nhật thông tin sản phẩm qua PATCH /api/v1/product/${productId}.`,
      );
    } catch (err) {
      const formatted = formatBackendErrorDetail(err);
      setBackendError({
        context: `PATCH /api/v1/product/${productId}`,
        ...formatted,
      });
    } finally {
      setSavingProduct(false);
    }
  };

  // 2. Activate Product (PATCH /api/v1/product/{productId}/status -> ACTIVE)
  // Supports both normal activation (after P0 barrier) and direct BE barrier error test
  const handleChangeProductStatus = async (
    targetStatus: "ACTIVE" | "INACTIVE" | "DRAFT",
    bypassFrontendGateForBeTest = false,
  ) => {
    if (!detail || !isOwnedByCurrentShop) return;

    const gate = evaluateProductActivationGate(detail.variants, detail.images);
    if (targetStatus === "ACTIVE" && !gate.canActivate && !bypassFrontendGateForBeTest) {
      setBackendError({
        context: "Rào chắn kích hoạt ACTIVE (P0 Gate)",
        title: "Chưa đủ điều kiện kích hoạt sản phẩm sang ACTIVE",
        detail: gate.blockers.join(" "),
        errorCode: "PRODUCT_ACTIVATION_GATE_BLOCKED",
      });
      return;
    }

    setUpdatingStatus(true);
    setBackendError(null);
    setActionSuccess(null);

    try {
      const res = await sellerCatalogService.updateProductStatus(productId, {
        status: targetStatus,
        ...(targetStatus === "INACTIVE" ? { statusReason: inactiveReason } : {}),
      });

      // If testing BE barrier when gate is NOT met and Gateway is in Mock mode (which returns 200 statically),
      // surface the exact P0 barrier contract check if BE did not reject it in Mock mode:
      if (targetStatus === "ACTIVE" && !gate.canActivate && bypassFrontendGateForBeTest) {
        setBackendError({
          context: `PATCH /api/v1/product/${productId}/status`,
          title: "Cảnh báo kiểm thử rào chắn ACTIVE: Gateway đang ở chế độ Mock tĩnh",
          detail: `Request PATCH /api/v1/product/${productId}/status đã gửi tới Gateway và nhận phản hồi, nhưng sản phẩm hiện vi phạm rào chắn P0 (${gate.blockers.join(" ")}). Trạng thái sản phẩm vẫn được giữ ở ${detail.product.status} để không xuất bản sản phẩm thiếu biến thể/ảnh hợp lệ.`,
          errorCode: "MOCK_GATEWAY_DID_NOT_ENFORCE_ACTIVE_BARRIER",
        });
        return;
      }

      const data =
        res && typeof res === "object" && "data" in res
          ? (res.data as Record<string, unknown>)
          : (res as Record<string, unknown>);

      persistUpdatedDetail((prev) => ({
        ...prev,
        product: {
          ...prev.product,
          status: targetStatus,
          statusReason: targetStatus === "INACTIVE" ? inactiveReason : null,
          publishedAt:
            targetStatus === "ACTIVE"
              ? String(data?.publishedAt ?? new Date().toISOString())
              : prev.product.publishedAt,
        },
      }));

      setActionSuccess(
        targetStatus === "ACTIVE"
          ? "Đã kích hoạt sản phẩm sang trạng thái ACTIVE! Sản phẩm hiện đã xuất hiện trên trang Buyer (/ và /catalog)."
          : targetStatus === "INACTIVE"
            ? `Đã tạm ẩn sản phẩm (INACTIVE · Lý do: ${inactiveReason}). Sản phẩm không còn hiển thị mua mới trên trang Buyer.`
            : "Đã chuyển trạng thái sản phẩm về bản nháp (DRAFT).",
      );
    } catch (err) {
      const formatted = formatBackendErrorDetail(err);
      setBackendError({
        context: `PATCH /api/v1/product/${productId}/status`,
        ...formatted,
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // 3. Soft Delete Product (DELETE /api/v1/product/{productId})
  const handleDeleteProduct = async () => {
    if (!detail || !canModifyProduct) return;
    setDeletingProduct(true);
    setBackendError(null);
    setActionSuccess(null);
    try {
      await sellerCatalogService.deleteProduct(productId);
      removeSessionSellerProduct(productId);
      router.push(ROUTES.seller.products);
    } catch (err) {
      const formatted = formatBackendErrorDetail(err);
      setBackendError({
        context: `DELETE /api/v1/product/${productId}`,
        ...formatted,
      });
      setDeletingProduct(false);
    }
  };

  // 4. Create Variant (POST /api/v1/product/{productId}/variants)
  const handleCreateVariant = async (e: FormEvent) => {
    e.preventDefault();
    if (!detail || !canModifyProduct) return;

    if (detail.variants.length >= MAX_VARIANTS_PER_PRODUCT) {
      setBackendError({
        context: `POST /api/v1/product/${productId}/variants`,
        title: `Đạt giới hạn tối đa ${MAX_VARIANTS_PER_PRODUCT} biến thể (variant)`,
        detail: `Mỗi sản phẩm chỉ được phép có tối đa ${MAX_VARIANTS_PER_PRODUCT} biến thể (SKU). Vui lòng sửa hoặc xóa biến thể không dùng trước khi thêm mới.`,
        errorCode: "MAX_VARIANTS_LIMIT_EXCEEDED",
      });
      return;
    }

    const priceNum = Number(newVariant.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setBackendError({
        context: `POST /api/v1/product/${productId}/variants`,
        title: "Giá biến thể không hợp lệ",
        detail: "Giá bán của biến thể (SKU) phải lớn hơn 0 VND.",
        errorCode: "VAL_INVALID_INPUT",
      });
      return;
    }

    const cleanedAttrs = newVariant.attributes.filter(
      (a) => a.attrName.trim() && a.attrValue.trim(),
    );

    setCreatingVariant(true);
    setBackendError(null);
    setActionSuccess(null);

    try {
      const res = await sellerCatalogService.createVariant(productId, {
        skuCode: newVariant.skuCode.trim(),
        name: newVariant.name.trim(),
        price: priceNum,
        currency: "VND",
        isActive: newVariant.isActive,
        attributes: cleanedAttrs,
      });
      const resData =
        res && typeof res === "object" && "data" in res
          ? (res.data as Record<string, unknown>)
          : (res as Record<string, unknown>);

      const generatedVariantId =
        typeof resData?.variantId === "string" &&
        !detail.variants.some((v) => v.variantId === resData.variantId)
          ? resData.variantId
          : crypto.randomUUID();

      const createdRecord: SellerVariantRecord = {
        variantId: generatedVariantId,
        productId,
        skuCode: newVariant.skuCode.trim(),
        name: newVariant.name.trim(),
        price: priceNum,
        currency: "VND",
        isActive: newVariant.isActive,
        status: newVariant.isActive ? "ACTIVE" : "INACTIVE",
        attributes: cleanedAttrs,
        totalStock: null,
        availableStock: null,
        reservedStock: null,
      };

      persistUpdatedDetail((prev) => ({
        ...prev,
        variants: [...prev.variants, createdRecord],
      }));
      setSelectedStockSkuId(createdRecord.variantId);
      setNewVariant({
        skuCode: "",
        name: "",
        price: "",
        isActive: true,
        attributes: [{ attrName: "Phân loại", attrValue: "" }],
      });
      setActionSuccess(
        `Đã thêm biến thể SKU "${createdRecord.skuCode}" (${createdRecord.name}) với mã variantId: ${createdRecord.variantId}.`,
      );
    } catch (err) {
      const formatted = formatBackendErrorDetail(err);
      setBackendError({
        context: `POST /api/v1/product/${productId}/variants`,
        ...formatted,
      });
    } finally {
      setCreatingVariant(false);
    }
  };

  // 5. Start editing a variant
  const startEditVariant = (v: SellerVariantRecord) => {
    setEditingVariantId(v.variantId);
    setEditVariantForm({
      name: v.name,
      price: String(v.price),
      status: v.status,
      statusReason: (v.statusReason as VariantInactiveReasonCode) || "OUT_OF_STOCK",
      attributes: v.attributes.length
        ? v.attributes.map((a) => ({ ...a }))
        : [{ attrName: "Phân loại", attrValue: "" }],
    });
  };

  // 6. Save Variant Update / Hide (PATCH /api/v1/variant/{variantId})
  const handleSaveVariant = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingVariantId || !detail || !canModifyProduct) return;

    const priceNum = Number(editVariantForm.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setBackendError({
        context: `PATCH /api/v1/variant/${editingVariantId}`,
        title: "Giá biến thể không hợp lệ",
        detail: "Giá biến thể phải lớn hơn 0 VND.",
        errorCode: "VAL_INVALID_INPUT",
      });
      return;
    }

    const cleanedAttrs = editVariantForm.attributes.filter(
      (a) => a.attrName.trim() && a.attrValue.trim(),
    );

    setSavingVariant(true);
    setBackendError(null);
    setActionSuccess(null);

    try {
      await sellerCatalogService.updateVariant(editingVariantId, {
        name: editVariantForm.name.trim(),
        price: priceNum,
        currency: "VND",
        isActive: editVariantForm.status === "ACTIVE",
        status: editVariantForm.status,
        statusReason: editVariantForm.status === "INACTIVE" ? editVariantForm.statusReason : null,
        attributes: cleanedAttrs,
      });

      persistUpdatedDetail((prev) => ({
        ...prev,
        variants: prev.variants.map((v) =>
          v.variantId === editingVariantId
            ? {
                ...v,
                name: editVariantForm.name.trim(),
                price: priceNum,
                isActive: editVariantForm.status === "ACTIVE",
                status: editVariantForm.status,
                statusReason:
                  editVariantForm.status === "INACTIVE" ? editVariantForm.statusReason : null,
                attributes: cleanedAttrs,
              }
            : v,
        ),
      }));
      setEditingVariantId(null);
      setActionSuccess(`Đã cập nhật biến thể ${editingVariantId} qua PATCH /api/v1/variant/${editingVariantId}.`);
    } catch (err) {
      const formatted = formatBackendErrorDetail(err);
      setBackendError({
        context: `PATCH /api/v1/variant/${editingVariantId}`,
        ...formatted,
      });
    } finally {
      setSavingVariant(false);
    }
  };

  // 7. Quick toggle Variant ACTIVE / INACTIVE
  const handleToggleVariantStatus = async (v: SellerVariantRecord) => {
    if (!canModifyProduct) return;
    const nextStatus = v.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setSavingVariant(true);
    setBackendError(null);
    setActionSuccess(null);
    try {
      await sellerCatalogService.updateVariant(v.variantId, {
        name: v.name,
        price: v.price,
        currency: v.currency || "VND",
        isActive: nextStatus === "ACTIVE",
        status: nextStatus,
        statusReason: nextStatus === "INACTIVE" ? "OUT_OF_STOCK" : null,
        attributes: v.attributes,
      });
      persistUpdatedDetail((prev) => ({
        ...prev,
        variants: prev.variants.map((item) =>
          item.variantId === v.variantId
            ? {
                ...item,
                status: nextStatus,
                isActive: nextStatus === "ACTIVE",
                statusReason: nextStatus === "INACTIVE" ? "OUT_OF_STOCK" : null,
              }
            : item,
        ),
      }));
      setActionSuccess(
        `Đã chuyển trạng thái SKU "${v.skuCode}" sang ${nextStatus} qua PATCH /api/v1/variant/${v.variantId}.`,
      );
    } catch (err) {
      const formatted = formatBackendErrorDetail(err);
      setBackendError({
        context: `PATCH /api/v1/variant/${v.variantId}`,
        ...formatted,
      });
    } finally {
      setSavingVariant(false);
    }
  };

  // 8. Delete Variant (DELETE /api/v1/variant/{variantId})
  const handleDeleteVariant = async (v: SellerVariantRecord) => {
    if (!canModifyProduct) return;
    setSavingVariant(true);
    setBackendError(null);
    setActionSuccess(null);
    try {
      await sellerCatalogService.deleteVariant(v.variantId);
      persistUpdatedDetail((prev) => ({
        ...prev,
        variants: prev.variants.filter((item) => item.variantId !== v.variantId),
      }));
      setActionSuccess(`Đã xóa biến thể SKU "${v.skuCode}" (${v.variantId}) qua DELETE /api/v1/variant/${v.variantId}.`);
    } catch (err) {
      const formatted = formatBackendErrorDetail(err);
      setBackendError({
        context: `DELETE /api/v1/variant/${v.variantId}`,
        ...formatted,
      });
    } finally {
      setSavingVariant(false);
    }
  };

  // 9. Inspect Variant Detail (GET /api/v1/variant/{variantId})
  const handleInspectVariant = async (variantId: string) => {
    setBackendError(null);
    try {
      const res = await sellerCatalogService.getVariantById(variantId);
      const data =
        res && typeof res === "object" && "data" in res
          ? (res.data as Record<string, unknown>)
          : (res as Record<string, unknown>);
      setInspectedVariantDetail(data);
    } catch (err) {
      const formatted = formatBackendErrorDetail(err);
      setBackendError({
        context: `GET /api/v1/variant/${variantId}`,
        ...formatted,
      });
    }
  };

  // 10. Select & Validate Images for Upload (POST /api/v1/product/{productId}pics)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files ? Array.from(e.target.files) : [];
    setBackendError(null);
    setSelectedFiles(fileList);

    for (const oldUrl of filePreviews) {
      if (oldUrl.startsWith("blob:")) URL.revokeObjectURL(oldUrl);
    }
    setFilePreviews(fileList.map((f) => URL.createObjectURL(f)));
  };

  const handleUploadImages = async (e: FormEvent) => {
    e.preventDefault();
    if (!detail || !canModifyProduct) return;

    const validation = validateImageUploadSelection(selectedFiles, detail.images.length);
    if (!validation.valid) {
      setBackendError({
        context: `POST /api/v1/product/${productId}pics`,
        title: "Tệp ảnh tải lên không hợp lệ (Kiểm tra loại tệp & giới hạn 5 ảnh / 20MB)",
        detail: validation.error ?? "Tệp ảnh không hợp lệ.",
        errorCode: "VAL_INVALID_IMAGE_UPLOAD",
      });
      return;
    }

    setUploadingImages(true);
    setBackendError(null);
    setActionSuccess(null);

    try {
      const res = await sellerCatalogService.uploadProductImages(productId, {
        files: selectedFiles,
        variantId: imageVariantId || undefined,
        altText: imageAltText.trim() || detail.product.name,
        isActive: true,
      });

      const unwrapped =
        res && typeof res === "object" && "data" in res
          ? (res.data as Record<string, unknown>)
          : (res as Record<string, unknown>);
      const returnedItems: Array<Record<string, unknown>> = Array.isArray(unwrapped?.items)
        ? (unwrapped.items as Array<Record<string, unknown>>)
        : Array.isArray(unwrapped?.imageUrls)
          ? (unwrapped.imageUrls as string[]).map((url) => ({ url }))
          : [];

      // Read data URLs for uploaded files so the Seller & Buyer screens can render real uploaded images in browser session
      const fileDataUrls = await Promise.all(
        selectedFiles.map(
          (file) =>
            new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
              reader.onerror = () => resolve("");
              reader.readAsDataURL(file);
            }),
        ),
      );

      persistUpdatedDetail((prev) => {
        const startOrder = prev.images.length + 1;
        const addedImages: SellerProductImageRecord[] = selectedFiles.map((file, idx) => {
          const beItem = returnedItems[idx] ?? {};
          const beId =
            typeof beItem.imageId === "string" &&
            !prev.images.some((existing) => existing.imageId === beItem.imageId)
              ? beItem.imageId
              : crypto.randomUUID();
          const url = fileDataUrls[idx] || String(beItem.url ?? "");
          return {
            imageId: beId,
            url,
            altText: imageAltText.trim() || file.name,
            isActive: true,
            sortOrder: startOrder + idx,
            variantId: imageVariantId || null,
            isPrimary: prev.images.length === 0 && idx === 0,
          };
        });

        const combined = [...prev.images, ...addedImages]
          .slice(0, MAX_IMAGES_PER_PRODUCT)
          .map((img, i) => ({
            ...img,
            sortOrder: i + 1,
            isPrimary: i === 0,
          }));

        return {
          ...prev,
          images: combined,
        };
      });

      setSelectedFiles([]);
      setFilePreviews([]);
      setImageAltText("");
      setActionSuccess(
        `Đã tải lên ${selectedFiles.length} ảnh qua POST /api/v1/product/${productId}pics.`,
      );
    } catch (err) {
      const formatted = formatBackendErrorDetail(err);
      setBackendError({
        context: `POST /api/v1/product/${productId}pics`,
        ...formatted,
      });
    } finally {
      setUploadingImages(false);
    }
  };

  // 11. Set Primary Image (chỉnh ảnh chính)
  const handleSetPrimaryImage = (imageId: string) => {
    if (!detail || !canModifyProduct) return;
    persistUpdatedDetail((prev) => {
      const target = prev.images.find((img) => img.imageId === imageId);
      if (!target) return prev;
      const others = prev.images.filter((img) => img.imageId !== imageId);
      const reordered = [target, ...others].map((img, idx) => ({
        ...img,
        sortOrder: idx + 1,
        isPrimary: idx === 0,
      }));
      return {
        ...prev,
        images: reordered,
      };
    });
    setActionSuccess("Đã cập nhật ảnh chính (Primary Image · SortOrder #1) cho sản phẩm.");
  };

  // 12. Delete Product Images (DELETE /api/v1/product/{productId}pics?ids=...)
  const handleDeleteImages = async (idsToDelete: string[]) => {
    if (!detail || !canModifyProduct || idsToDelete.length === 0) return;
    setDeletingImages(true);
    setBackendError(null);
    setActionSuccess(null);

    try {
      await sellerCatalogService.deleteProductImages(productId, idsToDelete);
      persistUpdatedDetail((prev) => {
        const remaining = prev.images
          .filter((img) => !idsToDelete.includes(img.imageId))
          .map((img, idx) => ({
            ...img,
            sortOrder: idx + 1,
            isPrimary: idx === 0,
          }));
        return {
          ...prev,
          images: remaining,
        };
      });
      setSelectedImageIdsToDelete((prev) => prev.filter((id) => !idsToDelete.includes(id)));
      setActionSuccess(
        `Đã xóa ${idsToDelete.length} ảnh qua DELETE /api/v1/product/${productId}pics?ids=${idsToDelete.join(",")}.`,
      );
    } catch (err) {
      const formatted = formatBackendErrorDetail(err);
      setBackendError({
        context: `DELETE /api/v1/product/${productId}pics`,
        ...formatted,
      });
    } finally {
      setDeletingImages(false);
    }
  };

  // 13. Stock-In Initial Inventory by SKU (POST /api/v1/inventory/stock-in or POST /api/v1/variant/{variantId}/stock-in)
  const handleStockIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!detail || !canModifyProduct) return;

    const targetVariant = detail.variants.find((v) => v.variantId === selectedStockSkuId);
    if (!targetVariant) {
      setBackendError({
        context: "Nhập tồn kho SKU",
        title: "Chưa chọn biến thể (SKU)",
        detail: "Vui lòng chọn một SKU hợp lệ của sản phẩm để nhập tồn ban đầu.",
        errorCode: "VAL_INVALID_INPUT",
      });
      return;
    }

    const qty = Number(stockInQty);
    if (!Number.isInteger(qty) || qty <= 0) {
      setBackendError({
        context: "Nhập tồn kho SKU",
        title: "Số lượng nhập kho không hợp lệ",
        detail: "Số lượng nhập kho phải là số nguyên lớn hơn 0.",
        errorCode: "VAL_INVALID_INPUT",
      });
      return;
    }

    setSubmittingStockIn(true);
    setBackendError(null);
    setActionSuccess(null);

    const endpointUsed =
      stockInMode === "batch"
        ? "/api/v1/inventory/stock-in"
        : `/api/v1/variant/${targetVariant.variantId}/stock-in`;

    try {
      let rawResponse: unknown;
      if (stockInMode === "batch") {
        rawResponse = await sellerCatalogService.stockInBatch([
          { skuId: targetVariant.variantId, quantity: qty },
        ]);
      } else {
        rawResponse = await sellerCatalogService.stockInVariant(targetVariant.variantId, qty);
      }

      const data =
        rawResponse && typeof rawResponse === "object" && "data" in rawResponse
          ? (rawResponse as { data: Record<string, unknown> }).data
          : (rawResponse as Record<string, unknown>);

      const items = Array.isArray(data?.items)
        ? (data.items as Array<Record<string, unknown>>)
        : [];
      const matchedItem =
        items.find((it) => String(it.skuId ?? "") === targetVariant.variantId) ??
        items[0] ??
        data ??
        {};

      // Read ONLY fields explicitly returned by the API response; do NOT infer from Catalog!
      const explicitTotalStock =
        typeof matchedItem.totalStock === "number"
          ? matchedItem.totalStock
          : typeof matchedItem.totalQuantity === "number"
            ? matchedItem.totalQuantity
            : null;
      const explicitAvailableStock =
        typeof matchedItem.availableStock === "number"
          ? matchedItem.availableStock
          : typeof matchedItem.availableQuantity === "number"
            ? matchedItem.availableQuantity
            : null;
      const explicitReservedStock =
        typeof matchedItem.reservedStock === "number"
          ? matchedItem.reservedStock
          : typeof matchedItem.reservedQuantity === "number"
            ? matchedItem.reservedQuantity
            : null;
      const reportedStockQty =
        typeof matchedItem.stockQuantity === "number" ? matchedItem.stockQuantity : null;

      const prevRecord = stockMap[targetVariant.variantId];
      const nextStockRecord: SkuStockRecord = {
        skuId: targetVariant.variantId,
        skuCode: targetVariant.skuCode,
        variantName: targetVariant.name,
        productName: detail.product.name,
        productId: detail.product.productId,
        totalStock: explicitTotalStock ?? prevRecord?.totalStock ?? null,
        availableStock: explicitAvailableStock ?? prevRecord?.availableStock ?? null,
        reservedStock: explicitReservedStock ?? prevRecord?.reservedStock ?? null,
        reportedStockQuantity: reportedStockQty,
        lastAddedQuantity: qty,
        updatedAt: new Date().toISOString(),
        sourceEndpoint: endpointUsed,
      };

      saveSessionSkuStockRecord(nextStockRecord);
      setStockMap((prev) => ({
        ...prev,
        [targetVariant.variantId]: nextStockRecord,
      }));

      setActionSuccess(
        `Đã gửi lệnh nhập tồn +${qty} sản phẩm cho SKU "${targetVariant.skuCode}" (${targetVariant.variantId}) qua POST ${endpointUsed}.`,
      );
    } catch (err) {
      const formatted = formatBackendErrorDetail(err);
      setBackendError({
        context: `POST ${endpointUsed}`,
        ...formatted,
      });
    } finally {
      setSubmittingStockIn(false);
    }
  };

  if (loading) {
    return <NoData title="Đang tải chi tiết sản phẩm, biến thể, hình ảnh và tồn kho…" />;
  }

  if (!detail) {
    return (
      <>
        <div className="crumbs">
          <Link href={ROUTES.seller.products}>Quản lý sản phẩm</Link>
          <Icon name="chevron" size={14} />
          <span>{productId}</span>
        </div>
        <PageHeading
          overline="Kênh người bán · Handoff 4.2"
          title="Không tải được sản phẩm"
          description={`Mã sản phẩm: ${productId}`}
        />
        {backendError && (
          <Card className="card-pad" style={{ borderColor: "#fecdd3", background: "#fff1f2", marginBottom: 20 }}>
            <strong style={{ color: "#be123c" }}>{backendError.title}</strong>
            <p style={{ margin: "6px 0 0", color: "#9f1239", fontSize: 13 }}>{backendError.detail}</p>
          </Card>
        )}
        <ButtonLink href={ROUTES.seller.products} variant="secondary">
          Quay lại danh sách sản phẩm
        </ButtonLink>
      </>
    );
  }

  const statusMeta = getProductStatusMeta(detail.product.status);
  const activationGate = evaluateProductActivationGate(detail.variants, detail.images);
  const hasStockedAnySku = detail.variants.some((v) => {
    const rec = stockMap[v.variantId];
    return (
      (rec && ((rec.lastAddedQuantity ?? 0) > 0 || (rec.totalStock ?? 0) > 0 || (rec.reportedStockQuantity ?? 0) > 0)) ||
      (v.totalStock ?? 0) > 0 ||
      (v.availableStock ?? 0) > 0
    );
  });

  return (
    <>
      <div className="crumbs">
        <Link href={ROUTES.seller.products}>Quản lý sản phẩm</Link>
        <Icon name="chevron" size={14} />
        <span>{detail.product.name || productId}</span>
      </div>

      <PageHeading
        overline="Kênh người bán · Handoff 4.2 (P0)"
        title={detail.product.name || "Chi tiết sản phẩm"}
        description={`Mã sản phẩm: ${detail.product.productId} · Hình thức: ${detail.product.saleType} · Danh mục: ${detail.category?.name ?? detail.product.categoryId ?? "—"}`}
        action={
          <div className="action-row" style={{ marginTop: 0 }}>
            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
            <ButtonLink href={ROUTES.seller.products} variant="secondary" small>
              Danh sách sản phẩm
            </ButtonLink>
            {detail.product.status === "ACTIVE" && (
              <ButtonLink href={ROUTES.catalog.product(detail.product.productId)} variant="light" small>
                Xem trên trang Buyer (Quân)
              </ButtonLink>
            )}
          </div>
        }
      />

      {/* Ownership & Permission Warning */}
      {!isOwnedByCurrentShop && (
        <Card className="card-pad" style={{ borderColor: "#fecdd3", background: "#fff1f2", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <strong style={{ color: "#be123c" }}>Chế độ chỉ đọc: Sản phẩm không thuộc shop đang đăng nhập</strong>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9f1239" }}>
                Sản phẩm này có <code>sellerId = {detail.product.sellerId}</code> không khớp với định danh shop của bạn. Mọi thao tác sửa, xóa mềm, ẩn/hiện và thêm biến thể đã bị khóa theo quyền.
              </p>
            </div>
            <Badge tone="red">Khác quyền sở hữu</Badge>
          </div>
        </Card>
      )}

      {isAdminLocked && (
        <Card className="card-pad" style={{ borderColor: "#fecdd3", background: "#fff1f2", marginBottom: 20 }}>
          <strong style={{ color: "#be123c" }}>
            Sản phẩm đang bị khóa bởi Quản trị viên (ADMIN_LOCKED)
          </strong>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9f1239" }}>
            Theo quy tắc <code>ProductInactiveReason.AdminLocked</code>, chỉ Admin mới có quyền mở khóa lại sản phẩm này.
          </p>
        </Card>
      )}

      {/* Feedback & Backend Error Banner */}
      {actionSuccess && (
        <p role="status" className="form-success" style={{ marginBottom: 18 }}>
          {actionSuccess}
        </p>
      )}

      {backendError && (
        <Card
          className="card-pad"
          style={{ borderColor: "#fecdd3", background: "#fff1f2", marginBottom: 20 }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <strong style={{ color: "#be123c" }}>{backendError.title}</strong>
            <div style={{ display: "flex", gap: 6 }}>
              <Badge tone="red">{backendError.context}</Badge>
              {backendError.errorCode && <Badge tone="amber">{backendError.errorCode}</Badge>}
            </div>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#9f1239", lineHeight: 1.5 }}>
            {backendError.detail}
          </p>
          {backendError.traceId && (
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "#881337" }}>
              Trace ID: <code>{backendError.traceId}</code>
            </p>
          )}
          {backendError.fieldErrors && Object.keys(backendError.fieldErrors).length > 0 && (
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: "#9f1239" }}>
              {Object.entries(backendError.fieldErrors).map(([field, messages]) => (
                <li key={field}>
                  <strong>{field}:</strong> {(messages ?? []).join(", ")}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* P0 Bàn giao Progress & Activation Gate Card */}
      <Card className="card-pad" style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>
              Tiến trình bàn giao 4.2 &amp; Rào chắn kích hoạt bán (ACTIVE)
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
              Kịch bản bàn giao: <strong>Tạo sản phẩm DRAFT → Variant → 2 ảnh → Nhập 10 sản phẩm → Kích hoạt ACTIVE → Quân nhìn thấy sản phẩm</strong>.
            </p>
          </div>
          <Badge tone={activationGate.canActivate ? "green" : "amber"}>
            {activationGate.canActivate
              ? "Đủ điều kiện rào chắn ACTIVE"
              : `Còn ${activationGate.blockers.length} rào chắn chưa đạt`}
          </Badge>
        </div>

        <div className="grid-4" style={{ marginBottom: 18 }}>
          <div style={{ padding: 14, border: "1px solid var(--line)", borderRadius: 10, background: "#f8fafc" }}>
            <small style={{ color: "var(--muted)", fontWeight: 700 }}>1. Biến thể (Variant &gt; 0đ)</small>
            <strong style={{ display: "block", marginTop: 6, fontSize: 15 }}>
              {activationGate.activeValidVariantCount} SKU hợp lệ ({detail.variants.length}/{MAX_VARIANTS_PER_PRODUCT})
            </strong>
            <Badge tone={activationGate.hasActivePositivePriceVariant ? "green" : "amber"}>
              {activationGate.hasActivePositivePriceVariant ? "Đạt rào chắn" : "Cần >= 1 SKU ACTIVE giá > 0"}
            </Badge>
          </div>

          <div style={{ padding: 14, border: "1px solid var(--line)", borderRadius: 10, background: "#f8fafc" }}>
            <small style={{ color: "var(--muted)", fontWeight: 700 }}>2. Hình ảnh sản phẩm</small>
            <strong style={{ display: "block", marginTop: 6, fontSize: 15 }}>
              {activationGate.validImageCount}/{MAX_IMAGES_PER_PRODUCT} ảnh hợp lệ
            </strong>
            <Badge
              tone={
                activationGate.validImageCount >= 2
                  ? "green"
                  : activationGate.hasValidImage
                    ? "sky"
                    : "amber"
              }
            >
              {activationGate.validImageCount >= 2
                ? "Đạt >= 2 ảnh (Chuẩn bàn giao)"
                : activationGate.hasValidImage
                  ? "Đạt rào chắn (>= 1 ảnh)"
                  : "Cần >= 1 ảnh hợp lệ"}
            </Badge>
          </div>

          <div style={{ padding: 14, border: "1px solid var(--line)", borderRadius: 10, background: "#f8fafc" }}>
            <small style={{ color: "var(--muted)", fontWeight: 700 }}>3. Nhập tồn ban đầu (Fulfillment)</small>
            <strong style={{ display: "block", marginTop: 6, fontSize: 15 }}>
              {hasStockedAnySku ? "Đã gửi lệnh nhập tồn" : "Chưa nhập tồn phiên này"}
            </strong>
            <Badge tone={hasStockedAnySku ? "green" : "slate"}>
              {hasStockedAnySku ? "Đã ghi nhận Stock-In" : "Bước 4: Nhập 10 sản phẩm"}
            </Badge>
          </div>

          <div style={{ padding: 14, border: "1px solid var(--line)", borderRadius: 10, background: "#f8fafc" }}>
            <small style={{ color: "var(--muted)", fontWeight: 700 }}>4. Trạng thái hiển thị Buyer</small>
            <strong style={{ display: "block", marginTop: 6, fontSize: 15 }}>
              {detail.product.status}
            </strong>
            <Badge tone={detail.product.status === "ACTIVE" ? "green" : "amber"}>
              {detail.product.status === "ACTIVE"
                ? "Quân (Buyer) nhìn thấy"
                : "Ẩn trên trang Buyer"}
            </Badge>
          </div>
        </div>

        {!activationGate.canActivate && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 8,
              background: "#fef3c7",
              color: "#92400e",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            <strong>Rào chắn kích hoạt ACTIVE chưa thỏa mãn:</strong>
            <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
              {activationGate.blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="action-row" style={{ flexWrap: "wrap", gap: 10 }}>
          <button
            type="button"
            className="button button-primary"
            disabled={
              updatingStatus ||
              !canModifyProduct ||
              !activationGate.canActivate ||
              detail.product.status === "ACTIVE"
            }
            onClick={() => void handleChangeProductStatus("ACTIVE", false)}
          >
            {updatingStatus
              ? "Đang gửi trạng thái…"
              : detail.product.status === "ACTIVE"
                ? "Đang ở trạng thái ACTIVE (Đang bán)"
                : "Kích hoạt bán (ACTIVE)"}
          </button>

          {!activationGate.canActivate && (
            <button
              type="button"
              className="button button-secondary"
              disabled={updatingStatus || !canModifyProduct}
              onClick={() => void handleChangeProductStatus("ACTIVE", true)}
              title="Gửi trực tiếp PATCH /api/v1/product/{id}/status lên Backend để kiểm tra lỗi rào chắn từ BE"
            >
              Gửi thử lệnh ACTIVE lên BE (Kiểm tra lỗi rào chắn BE)
            </button>
          )}

          {detail.product.status !== "DRAFT" && (
            <button
              type="button"
              className="button button-secondary"
              disabled={updatingStatus || !canModifyProduct}
              onClick={() => void handleChangeProductStatus("DRAFT", false)}
            >
              Chuyển về DRAFT (Ẩn khỏi trang Buyer)
            </button>
          )}
        </div>
      </Card>

      {/* SECTION 1 & 2: Product Info Edit + Status/Soft Delete */}
      <div className="split" style={{ marginBottom: 26 }}>
        <Card className="card-pad">
          <SectionHeading
            title="1. Thông tin sản phẩm & Danh mục thật"
            hint={`PATCH /api/v1/product/${detail.product.productId} · Sửa tên, danh mục, thương hiệu, mô tả và thông số.`}
          />
          <form onSubmit={(e) => void handleUpdateProduct(e)}>
            <div className="form-grid">
              <label className="field-wrap">
                Tên sản phẩm *
                <input
                  className="field"
                  required
                  disabled={!canModifyProduct}
                  value={editProductForm.name}
                  onChange={(e) => setEditProductForm((s) => ({ ...s, name: e.target.value }))}
                />
              </label>

              <label className="field-wrap">
                Danh mục sản phẩm (Đọc từ GET /api/v1/categories) *
                <select
                  className="select-field"
                  required
                  disabled={!canModifyProduct}
                  value={editProductForm.categoryId}
                  onChange={(e) => setEditProductForm((s) => ({ ...s, categoryId: e.target.value }))}
                >
                  <option value="">-- Chọn danh mục thật --</option>
                  {categories.map((cat) => (
                    <option key={cat.categoryId} value={cat.categoryId}>
                      {cat.displayLabel}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field-wrap">
                Thương hiệu (brand)
                <input
                  className="field"
                  disabled={!canModifyProduct}
                  value={editProductForm.brand}
                  onChange={(e) => setEditProductForm((s) => ({ ...s, brand: e.target.value }))}
                  placeholder="NexusAudio, Apple, Keychron…"
                />
              </label>

              <label className="field-wrap">
                Hình thức bán (saleType)
                <input className="field" readOnly value={detail.product.saleType} />
              </label>
            </div>

            <label className="field-wrap" style={{ marginTop: 16 }}>
              Mô tả chi tiết (description)
              <textarea
                className="textarea-field"
                disabled={!canModifyProduct}
                value={editProductForm.description}
                onChange={(e) => setEditProductForm((s) => ({ ...s, description: e.target.value }))}
              />
            </label>

            <div style={{ marginTop: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>Thông số kỹ thuật (specifications JSON)</strong>
                <button
                  type="button"
                  className="button button-secondary button-small"
                  disabled={!canModifyProduct}
                  onClick={() => setSpecPairs((prev) => [...prev, { key: "", value: "" }])}
                >
                  + Thêm thông số
                </button>
              </div>
              {specPairs.map((pair, idx) => (
                <div
                  key={idx}
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 8 }}
                >
                  <input
                    className="field"
                    placeholder="Tên thông số (VD: Bảo hành)"
                    disabled={!canModifyProduct}
                    value={pair.key}
                    onChange={(e) =>
                      setSpecPairs((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, key: e.target.value } : item)),
                      )
                    }
                  />
                  <input
                    className="field"
                    placeholder="Giá trị (VD: 12 tháng)"
                    disabled={!canModifyProduct}
                    value={pair.value}
                    onChange={(e) =>
                      setSpecPairs((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, value: e.target.value } : item)),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    disabled={!canModifyProduct || specPairs.length <= 1}
                    onClick={() => setSpecPairs((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    Xóa
                  </button>
                </div>
              ))}
            </div>

            <div className="action-row" style={{ marginTop: 18 }}>
              <button
                type="submit"
                className="button button-primary"
                disabled={savingProduct || !canModifyProduct}
              >
                {savingProduct ? "Đang lưu thay đổi…" : "Lưu thông tin sản phẩm"}
              </button>
            </div>
          </form>
        </Card>

        {/* Right Column: Hide (INACTIVE) & Soft Delete (DELETE) */}
        <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <Card className="card-pad">
            <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>Ẩn / Tạm ngừng bán (INACTIVE)</h2>
            <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
              Khi chuyển sang <code>INACTIVE</code> qua <code>PATCH /api/v1/product/{productId}/status</code>, hợp đồng Gateway bắt buộc truyền lý do <code>statusReason</code>.
            </p>
            {detail.product.statusReason && (
              <div className="info-row" style={{ marginBottom: 12 }}>
                <span>Lý do hiện tại</span>
                <strong>{getInactiveReasonLabel(detail.product.statusReason)}</strong>
              </div>
            )}
            <label className="field-wrap">
              Lý do tạm ẩn sản phẩm (statusReason) *
              <select
                className="select-field"
                value={inactiveReason}
                disabled={!canModifyProduct}
                onChange={(e) => setInactiveReason(e.target.value as ProductInactiveReasonCode)}
              >
                <option value="SELLER_PAUSED">SELLER_PAUSED — Người bán chủ động tạm nghỉ bán</option>
                <option value="DISCONTINUED">DISCONTINUED — Ngừng kinh doanh mặt hàng</option>
                <option value="OTHER">OTHER — Lý do khác</option>
              </select>
            </label>
            <div className="action-row" style={{ marginTop: 14 }}>
              <button
                type="button"
                className="button button-secondary"
                disabled={updatingStatus || !canModifyProduct}
                onClick={() => void handleChangeProductStatus("INACTIVE", false)}
              >
                Ẩn sản phẩm (Chuyển sang INACTIVE)
              </button>
            </div>
          </Card>

          <Card className="card-pad">
            <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>Xóa mềm sản phẩm (Soft Delete)</h2>
            <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
              Gọi <code>DELETE /api/v1/product/{productId}</code> (HTTP 204 No Content). Chỉ chủ sở hữu gian hàng mới được phép xóa mềm sản phẩm của mình.
            </p>
            {!confirmDeleteProduct ? (
              <button
                type="button"
                className="button button-secondary"
                disabled={!canModifyProduct || deletingProduct}
                onClick={() => setConfirmDeleteProduct(true)}
              >
                Xóa mềm sản phẩm này
              </button>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <p role="alert" className="notice" style={{ margin: 0 }}>
                  Xác nhận xóa mềm sản phẩm <strong>{detail.product.name}</strong>?
                </p>
                <div className="action-row" style={{ marginTop: 0 }}>
                  <button
                    type="button"
                    className="button auction-danger-button"
                    disabled={deletingProduct}
                    onClick={() => void handleDeleteProduct()}
                  >
                    {deletingProduct ? "Đang xóa…" : "Xác nhận xóa mềm"}
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setConfirmDeleteProduct(false)}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* SECTION 2: Variants Management (Max 10 variants) */}
      <SectionHeading
        title={`2. Quản lý biến thể / SKU (${detail.variants.length}/${MAX_VARIANTS_PER_PRODUCT})`}
        hint="Mỗi SKU có mã skuCode, thuộc tính (attributes), giá bán và trạng thái riêng. Giới hạn tối đa 10 biến thể."
      />
      <Card className="card-pad" style={{ marginBottom: 26 }}>
        {detail.variants.length > 0 ? (
          <div className="table-scroll" style={{ marginBottom: 22 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã SKU / Variant ID</th>
                  <th>Tên biến thể</th>
                  <th>Thuộc tính (Attributes)</th>
                  <th>Giá bán</th>
                  <th>Trạng thái SKU</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {detail.variants.map((v) => (
                  <tr key={v.variantId}>
                    <td>
                      <strong>{v.skuCode}</strong>
                      <br />
                      <small style={{ color: "var(--muted)" }}>{v.variantId}</small>
                    </td>
                    <td>
                      {v.name}
                      {v.isDefault && (
                        <>
                          {" "}
                          <Badge tone="sky">Mặc định</Badge>
                        </>
                      )}
                    </td>
                    <td>
                      {v.attributes.length > 0
                        ? v.attributes.map((a, idx) => (
                            <span
                              key={`${a.attrName}-${idx}`}
                              style={{
                                display: "inline-block",
                                marginRight: 6,
                                marginBottom: 4,
                                padding: "2px 8px",
                                borderRadius: 6,
                                background: "#f1f5f9",
                                fontSize: 12,
                              }}
                            >
                              {a.attrName}: <strong>{a.attrValue}</strong>
                            </span>
                          ))
                        : "—"}
                    </td>
                    <td>
                      <strong>{formatMoney(v.price)}</strong>
                    </td>
                    <td>
                      <Badge tone={v.status === "ACTIVE" ? "green" : "slate"}>{v.status}</Badge>
                      {v.status === "INACTIVE" && v.statusReason && (
                        <small style={{ display: "block", color: "var(--muted)", marginTop: 4 }}>
                          {v.statusReason}
                        </small>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          disabled={!canModifyProduct}
                          onClick={() => startEditVariant(v)}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          disabled={!canModifyProduct || savingVariant}
                          onClick={() => void handleToggleVariantStatus(v)}
                        >
                          {v.status === "ACTIVE" ? "Ẩn SKU" : "Bật ACTIVE"}
                        </button>
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={() => void handleInspectVariant(v.variantId)}
                        >
                          Chi tiết API
                        </button>
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          disabled={!canModifyProduct || savingVariant}
                          onClick={() => void handleDeleteVariant(v)}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <NoData title="Chưa có biến thể (variant) nào" />
        )}

        {/* Inspected Variant Raw Contract Modal/Box */}
        {inspectedVariantDetail && (
          <div
            style={{
              padding: 16,
              marginBottom: 20,
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: "#f8fafc",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <strong>Phản hồi từ GET /api/v1/variant/{String(inspectedVariantDetail.variantId ?? "")}</strong>
              <button
                type="button"
                className="button button-secondary button-small"
                onClick={() => setInspectedVariantDetail(null)}
              >
                Đóng
              </button>
            </div>
            <pre style={{ margin: 0, fontSize: 12, overflowX: "auto" }}>
              {JSON.stringify(inspectedVariantDetail, null, 2)}
            </pre>
          </div>
        )}

        {/* Edit Variant Inline Form */}
        {editingVariantId && (
          <form
            onSubmit={(e) => void handleSaveVariant(e)}
            style={{
              padding: 18,
              marginBottom: 22,
              borderRadius: 12,
              border: "2px solid var(--sky)",
              background: "#f0f9ff",
            }}
          >
            <h3 style={{ margin: "0 0 14px", fontSize: 16 }}>
              Chỉnh sửa biến thể: <code>{editingVariantId}</code> (PATCH /api/v1/variant/{editingVariantId})
            </h3>
            <div className="form-grid">
              <label className="field-wrap">
                Tên biến thể *
                <input
                  className="field"
                  required
                  value={editVariantForm.name}
                  onChange={(e) => setEditVariantForm((s) => ({ ...s, name: e.target.value }))}
                />
              </label>
              <label className="field-wrap">
                Giá bán (VND &gt; 0) *
                <input
                  className="field"
                  type="number"
                  min={1}
                  required
                  value={editVariantForm.price}
                  onChange={(e) => setEditVariantForm((s) => ({ ...s, price: e.target.value }))}
                />
              </label>
              <label className="field-wrap">
                Trạng thái biến thể
                <select
                  className="select-field"
                  value={editVariantForm.status}
                  onChange={(e) =>
                    setEditVariantForm((s) => ({
                      ...s,
                      status: e.target.value as "ACTIVE" | "INACTIVE",
                    }))
                  }
                >
                  <option value="ACTIVE">ACTIVE — Đang mở bán</option>
                  <option value="INACTIVE">INACTIVE — Tạm ngừng bán biến thể</option>
                </select>
              </label>
              {editVariantForm.status === "INACTIVE" && (
                <label className="field-wrap">
                  Lý do tạm ẩn biến thể (VariantInactiveReason)
                  <select
                    className="select-field"
                    value={editVariantForm.statusReason}
                    onChange={(e) =>
                      setEditVariantForm((s) => ({
                        ...s,
                        statusReason: e.target.value as VariantInactiveReasonCode,
                      }))
                    }
                  >
                    <option value="OUT_OF_STOCK">OUT_OF_STOCK — Tạm hết hàng</option>
                    <option value="DISCONTINUED">DISCONTINUED — Ngừng kinh doanh mẫu này</option>
                    <option value="OTHER">OTHER — Lý do khác</option>
                  </select>
                </label>
              )}
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>Thuộc tính biến thể (attributes)</strong>
                <button
                  type="button"
                  className="button button-secondary button-small"
                  onClick={() =>
                    setEditVariantForm((s) => ({
                      ...s,
                      attributes: [...s.attributes, { attrName: "", attrValue: "" }],
                    }))
                  }
                >
                  + Thêm thuộc tính
                </button>
              </div>
              {editVariantForm.attributes.map((attr, idx) => (
                <div
                  key={idx}
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 8 }}
                >
                  <input
                    className="field"
                    placeholder="Tên thuộc tính (VD: Color)"
                    value={attr.attrName}
                    onChange={(e) =>
                      setEditVariantForm((s) => ({
                        ...s,
                        attributes: s.attributes.map((a, i) =>
                          i === idx ? { ...a, attrName: e.target.value } : a,
                        ),
                      }))
                    }
                  />
                  <input
                    className="field"
                    placeholder="Giá trị (VD: Matte Black)"
                    value={attr.attrValue}
                    onChange={(e) =>
                      setEditVariantForm((s) => ({
                        ...s,
                        attributes: s.attributes.map((a, i) =>
                          i === idx ? { ...a, attrValue: e.target.value } : a,
                        ),
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() =>
                      setEditVariantForm((s) => ({
                        ...s,
                        attributes: s.attributes.filter((_, i) => i !== idx),
                      }))
                    }
                  >
                    Xóa
                  </button>
                </div>
              ))}
            </div>

            <div className="action-row" style={{ marginTop: 14 }}>
              <button type="submit" className="button button-primary" disabled={savingVariant}>
                {savingVariant ? "Đang lưu…" : "Lưu cập nhật biến thể"}
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setEditingVariantId(null)}
              >
                Hủy
              </button>
            </div>
          </form>
        )}

        {/* Add New Variant Form */}
        <form onSubmit={(e) => void handleCreateVariant(e)} style={{ borderTop: "1px solid var(--line)", paddingTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>
              Thêm biến thể (SKU) mới (POST /api/v1/product/{productId}/variants)
            </h3>
            <Badge tone={detail.variants.length >= MAX_VARIANTS_PER_PRODUCT ? "red" : "sky"}>
              {detail.variants.length}/{MAX_VARIANTS_PER_PRODUCT} biến thể
            </Badge>
          </div>

          <div className="form-grid">
            <label className="field-wrap">
              Mã SKU (skuCode) *
              <input
                className="field"
                required
                disabled={!canModifyProduct || detail.variants.length >= MAX_VARIANTS_PER_PRODUCT}
                value={newVariant.skuCode}
                onChange={(e) => setNewVariant((s) => ({ ...s, skuCode: e.target.value }))}
                placeholder="VD: NX-HP-001-SLV"
              />
            </label>
            <label className="field-wrap">
              Tên biến thể (name) *
              <input
                className="field"
                required
                disabled={!canModifyProduct || detail.variants.length >= MAX_VARIANTS_PER_PRODUCT}
                value={newVariant.name}
                onChange={(e) => setNewVariant((s) => ({ ...s, name: e.target.value }))}
                placeholder="VD: Bản Silver 256GB"
              />
            </label>
            <label className="field-wrap">
              Giá bán (VND &gt; 0) *
              <input
                className="field"
                type="number"
                min={1}
                required
                disabled={!canModifyProduct || detail.variants.length >= MAX_VARIANTS_PER_PRODUCT}
                value={newVariant.price}
                onChange={(e) => setNewVariant((s) => ({ ...s, price: e.target.value }))}
                placeholder="1350000"
              />
            </label>
            <label className="field-wrap">
              Trạng thái ban đầu
              <select
                className="select-field"
                disabled={!canModifyProduct || detail.variants.length >= MAX_VARIANTS_PER_PRODUCT}
                value={newVariant.isActive ? "ACTIVE" : "INACTIVE"}
                onChange={(e) =>
                  setNewVariant((s) => ({ ...s, isActive: e.target.value === "ACTIVE" }))
                }
              >
                <option value="ACTIVE">ACTIVE — Đang hoạt động</option>
                <option value="INACTIVE">INACTIVE — Tạm ẩn</option>
              </select>
            </label>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>Thuộc tính SKU (attrName / attrValue)</strong>
              <button
                type="button"
                className="button button-secondary button-small"
                disabled={!canModifyProduct || detail.variants.length >= MAX_VARIANTS_PER_PRODUCT}
                onClick={() =>
                  setNewVariant((s) => ({
                    ...s,
                    attributes: [...s.attributes, { attrName: "", attrValue: "" }],
                  }))
                }
              >
                + Thêm thuộc tính
              </button>
            </div>
            {newVariant.attributes.map((attr, idx) => (
              <div
                key={idx}
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 8 }}
              >
                <input
                  className="field"
                  placeholder="Tên thuộc tính (VD: Màu sắc)"
                  disabled={!canModifyProduct || detail.variants.length >= MAX_VARIANTS_PER_PRODUCT}
                  value={attr.attrName}
                  onChange={(e) =>
                    setNewVariant((s) => ({
                      ...s,
                      attributes: s.attributes.map((a, i) =>
                        i === idx ? { ...a, attrName: e.target.value } : a,
                      ),
                    }))
                  }
                />
                <input
                  className="field"
                  placeholder="Giá trị (VD: Đen nhám)"
                  disabled={!canModifyProduct || detail.variants.length >= MAX_VARIANTS_PER_PRODUCT}
                  value={attr.attrValue}
                  onChange={(e) =>
                    setNewVariant((s) => ({
                      ...s,
                      attributes: s.attributes.map((a, i) =>
                        i === idx ? { ...a, attrValue: e.target.value } : a,
                      ),
                    }))
                  }
                />
                <button
                  type="button"
                  className="button button-secondary button-small"
                  disabled={newVariant.attributes.length <= 1}
                  onClick={() =>
                    setNewVariant((s) => ({
                      ...s,
                      attributes: s.attributes.filter((_, i) => i !== idx),
                    }))
                  }
                >
                  Xóa
                </button>
              </div>
            ))}
          </div>

          <div className="action-row" style={{ marginTop: 14 }}>
            <button
              type="submit"
              className="button button-primary"
              disabled={
                creatingVariant ||
                !canModifyProduct ||
                detail.variants.length >= MAX_VARIANTS_PER_PRODUCT
              }
            >
              {creatingVariant
                ? "Đang thêm SKU…"
                : detail.variants.length >= MAX_VARIANTS_PER_PRODUCT
                  ? "Đã đạt giới hạn 10 biến thể"
                  : "+ Thêm biến thể (SKU)"}
            </button>
          </div>
        </form>
      </Card>

      {/* SECTION 3: Product Images (Max 5 images, Primary Image & Delete) */}
      <SectionHeading
        title={`3. Quản lý hình ảnh sản phẩm (${detail.images.length}/${MAX_IMAGES_PER_PRODUCT})`}
        hint={`Upload tối đa ${MAX_IMAGES_PER_PRODUCT} ảnh (JPEG, PNG, WEBP, GIF · tổng <= 20MB). Chỉnh ảnh chính (Primary) hoặc xóa ảnh qua DELETE /api/v1/product/${productId}pics.`}
      />
      <Card className="card-pad" style={{ marginBottom: 26 }}>
        {detail.images.length > 0 ? (
          <>
            <div className="grid-4" style={{ marginBottom: 18 }}>
              {detail.images.map((img, idx) => {
                const isSelectedForDelete = selectedImageIdsToDelete.includes(img.imageId);
                return (
                  <div
                    key={img.imageId}
                    style={{
                      border: idx === 0 ? "2px solid var(--sky)" : "1px solid var(--line)",
                      borderRadius: 12,
                      padding: 12,
                      background: idx === 0 ? "#f0f9ff" : "#fff",
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        height: 150,
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "#f8fafc",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <BackendImage
                        src={resolveImageUrl(img.url)}
                        alt={img.altText ?? detail.product.name}
                        compact
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                      <Badge tone={idx === 0 ? "green" : "slate"}>
                        {idx === 0 ? "Ảnh chính (#1)" : `Ảnh phụ (#${idx + 1})`}
                      </Badge>
                      <label style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <input
                          type="checkbox"
                          checked={isSelectedForDelete}
                          disabled={!canModifyProduct}
                          onChange={(e) =>
                            setSelectedImageIdsToDelete((prev) =>
                              e.target.checked
                                ? [...prev, img.imageId]
                                : prev.filter((id) => id !== img.imageId),
                            )
                          }
                        />
                        Chọn xóa
                      </label>
                    </div>
                    <small style={{ color: "var(--muted)", overflowWrap: "anywhere" }}>
                      ID: {img.imageId}
                      {img.altText ? ` · ${img.altText}` : ""}
                    </small>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {idx !== 0 && (
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          disabled={!canModifyProduct}
                          onClick={() => handleSetPrimaryImage(img.imageId)}
                        >
                          Đặt làm ảnh chính
                        </button>
                      )}
                      <button
                        type="button"
                        className="button button-secondary button-small"
                        disabled={!canModifyProduct || deletingImages}
                        onClick={() => void handleDeleteImages([img.imageId])}
                      >
                        Xóa ảnh
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedImageIdsToDelete.length > 0 && (
              <div className="action-row" style={{ marginBottom: 18 }}>
                <button
                  type="button"
                  className="button auction-danger-button button-small"
                  disabled={deletingImages || !canModifyProduct}
                  onClick={() => void handleDeleteImages(selectedImageIdsToDelete)}
                >
                  {deletingImages
                    ? "Đang xóa ảnh…"
                    : `Xóa ${selectedImageIdsToDelete.length} ảnh đã chọn`}
                </button>
              </div>
            )}
          </>
        ) : (
          <NoData title="Sản phẩm chưa có hình ảnh nào (Cần ít nhất 1 ảnh hợp lệ để kích hoạt ACTIVE)" />
        )}

        <form
          onSubmit={(e) => void handleUploadImages(e)}
          style={{ borderTop: "1px solid var(--line)", paddingTop: 18 }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>
              Tải ảnh lên (POST /api/v1/product/{productId}pics)
            </h3>
            <Badge tone={detail.images.length >= MAX_IMAGES_PER_PRODUCT ? "red" : "sky"}>
              Còn tải thêm được {Math.max(0, MAX_IMAGES_PER_PRODUCT - detail.images.length)} ảnh
            </Badge>
          </div>

          <div className="form-grid">
            <label className="field-wrap">
              Chọn tệp ảnh (Hỗ trợ chọn 2 ảnh cùng lúc cho kịch bản bàn giao, tối đa 5 ảnh) *
              <input
                className="field"
                type="file"
                multiple
                accept={ALLOWED_IMAGE_MIME_TYPES.join(",")}
                disabled={!canModifyProduct || detail.images.length >= MAX_IMAGES_PER_PRODUCT}
                onChange={handleFileChange}
              />
            </label>

            <label className="field-wrap">
              Gắn với biến thể SKU (variantId — tùy chọn)
              <select
                className="select-field"
                disabled={!canModifyProduct}
                value={imageVariantId}
                onChange={(e) => setImageVariantId(e.target.value)}
              >
                <option value="">-- Ảnh chung của toàn sản phẩm --</option>
                {detail.variants.map((v) => (
                  <option key={v.variantId} value={v.variantId}>
                    {v.skuCode} — {v.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-wrap" style={{ gridColumn: "1 / -1" }}>
              Mô tả ảnh (altText)
              <input
                className="field"
                disabled={!canModifyProduct}
                value={imageAltText}
                onChange={(e) => setImageAltText(e.target.value)}
                placeholder="Mô tả góc chụp sản phẩm"
              />
            </label>
          </div>

          {selectedFiles.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <strong style={{ fontSize: 12, color: "var(--muted)" }}>
                Đã chọn {selectedFiles.length} tệp (
                {(selectedFiles.reduce((acc, f) => acc + f.size, 0) / 1024).toFixed(1)} KB):
              </strong>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                {selectedFiles.map((file, i) => (
                  <div
                    key={`${file.name}-${i}`}
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      padding: 8,
                      background: "#f8fafc",
                      fontSize: 12,
                    }}
                  >
                    <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB · {file.type || "unknown"})
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="action-row" style={{ marginTop: 14 }}>
            <button
              type="submit"
              className="button button-primary"
              disabled={
                uploadingImages ||
                !canModifyProduct ||
                selectedFiles.length === 0 ||
                detail.images.length >= MAX_IMAGES_PER_PRODUCT
              }
            >
              {uploadingImages ? "Đang tải ảnh lên…" : "Upload ảnh sản phẩm"}
            </button>
          </div>
        </form>
      </Card>

      {/* SECTION 4: Initial Stock-In & SKU Stock View (totalStock, availableStock, reservedStock) */}
      <SectionHeading
        title="4. Nhập tồn ban đầu & Tồn kho theo SKU (totalStock / availableStock / reservedStock)"
        hint="Quy tắc P0: Không suy diễn tồn từ Catalog nếu endpoint không trả. Chỉ hiển thị các trường tồn kho khi endpoint trả về."
      />
      <Card className="card-pad" style={{ marginBottom: 26 }}>
        <form onSubmit={(e) => void handleStockIn(e)} style={{ marginBottom: 22 }}>
          <div className="form-grid">
            <label className="field-wrap">
              Chọn SKU cần nhập tồn *
              <select
                className="select-field"
                required
                disabled={!canModifyProduct}
                value={selectedStockSkuId}
                onChange={(e) => setSelectedStockSkuId(e.target.value)}
              >
                <option value="">-- Chọn SKU --</option>
                {detail.variants.map((v) => (
                  <option key={v.variantId} value={v.variantId}>
                    {v.skuCode} — {v.name} ({v.variantId})
                  </option>
                ))}
              </select>
            </label>

            <label className="field-wrap">
              Số lượng nhập kho (Mặc định 10 cho kịch bản bàn giao) *
              <input
                className="field"
                type="number"
                min={1}
                max={100000}
                required
                disabled={!canModifyProduct}
                value={stockInQty}
                onChange={(e) => setStockInQty(e.target.value)}
              />
            </label>

            <label className="field-wrap">
              Endpoint nhập kho theo Contract
              <select
                className="select-field"
                disabled={!canModifyProduct}
                value={stockInMode}
                onChange={(e) => setStockInMode(e.target.value as "batch" | "single")}
              >
                <option value="batch">POST /api/v1/inventory/stock-in (Nhập theo lô SKU)</option>
                <option value="single">POST /api/v1/variant/&#123;variantId&#125;/stock-in (Nhập theo Variant)</option>
              </select>
            </label>

            <div className="field-wrap" style={{ alignSelf: "end" }}>
              <button
                type="submit"
                className="button button-primary"
                disabled={submittingStockIn || !canModifyProduct || !selectedStockSkuId}
              >
                {submittingStockIn ? "Đang nhập kho…" : `Nhập +${stockInQty || 0} sản phẩm vào kho`}
              </button>
            </div>
          </div>
        </form>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã SKU</th>
                <th>Tên biến thể</th>
                <th>totalStock</th>
                <th>availableStock</th>
                <th>reservedStock</th>
                <th>Phản hồi Stock-In (stockQuantity / addedQuantity)</th>
              </tr>
            </thead>
            <tbody>
              {detail.variants.map((v) => {
                const rec = stockMap[v.variantId];
                const totalVal = rec?.totalStock ?? v.totalStock ?? null;
                const availVal = rec?.availableStock ?? v.availableStock ?? null;
                const resvVal = rec?.reservedStock ?? v.reservedStock ?? null;
                return (
                  <tr key={v.variantId}>
                    <td>
                      <strong>{v.skuCode}</strong>
                      <br />
                      <small style={{ color: "var(--muted)" }}>{v.variantId}</small>
                    </td>
                    <td>{v.name}</td>
                    <td>
                      {totalVal !== null ? (
                        <strong>{totalVal}</strong>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>— (API chưa trả)</span>
                      )}
                    </td>
                    <td>
                      {availVal !== null ? (
                        <strong>{availVal}</strong>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>— (API chưa trả)</span>
                      )}
                    </td>
                    <td>
                      {resvVal !== null ? (
                        <strong>{resvVal}</strong>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>— (API chưa trả)</span>
                      )}
                    </td>
                    <td>
                      {rec ? (
                        <div>
                          <Badge tone="green">Đã nhập +{rec.lastAddedQuantity ?? 0}</Badge>
                          {rec.reportedStockQuantity !== null && (
                            <span style={{ marginLeft: 8, fontSize: 12 }}>
                              <code>stockQuantity: {rec.reportedStockQuantity}</code>
                            </span>
                          )}
                          <small style={{ display: "block", color: "var(--muted)", marginTop: 3 }}>
                            Qua {rec.sourceEndpoint}
                          </small>
                        </div>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>Chưa gửi lệnh Stock-In</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="status-note">
          Lưu ý P0: <code>GET /api/v1/product/&#123;id&#125;</code> và <code>GET /api/v1/variant/&#123;id&#125;</code> của Catalog không trả 3 trường <code>totalStock</code>, <code>availableStock</code>, <code>reservedStock</code> của Fulfillment. Giao diện giữ nguyên <code>— (API chưa trả)</code> nếu response không chứa các trường này, tuyệt đối không suy diễn từ Catalog.
        </p>
      </Card>

      {/* Backend Blockers Table (if any downstream service returned 404/502/503/504) */}
      {blockers.length > 0 && (
        <Card className="card-pad">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Ghi nhận Blocker Backend (Catalog / Fulfillment)</h2>
            <Badge tone="amber">{blockers.length} Blocker BE</Badge>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service / Endpoint</th>
                  <th>Method</th>
                  <th>Phản hồi thực tế</th>
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
                    </td>
                    <td>{b.actualResponse}</td>
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
