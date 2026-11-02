/**
 * =============================================================================
 * DOMAIN: Seller & Onboarding (Nexus E-Commerce)
 * Architecture: Feature-Sliced Design (FSD)
 * File: seller.types.ts
 * Description: Core types & interfaces for Seller domain:
 *  1. Onboarding (Registration)
 *  2. Seller Profile
 *  3. Product Management
 *  4. Inventory / SKU Management
 * =============================================================================
 */

// -----------------------------------------------------------------------------
// 1. ONBOARDING (ĐĂNG KÝ MỞ SHOP)
// -----------------------------------------------------------------------------

/**
 * Dữ liệu form đăng ký mở shop do Buyer điền.
 * Lưu ý bảo mật: citizenId (CCCD) là thông tin nhạy cảm, không log ra console.
 */
export interface SellerRegistrationForm {
  fullName: string;            // Họ và tên người đại diện
  email: string;               // Email liên hệ
  phone: string;               // Số điện thoại liên hệ
  citizenId: string;           // Số CCCD / CMND (Sensitive Data)
  shopName: string;            // Tên shop kinh doanh
  hotline: string;             // Hotline bán hàng của shop
  warehouseAddress: string;    // Địa chỉ kho / lấy hàng
}

export type SellerApplicationStatusCode =
  | "PENDING_APPROVAL" // Chờ duyệt
  | "APPROVED"         // Đã duyệt
  | "REJECTED";        // Bị từ chối

export interface SellerApplicationStatus {
  registrationId?: string;
  status: SellerApplicationStatusCode;
  rejectionReason?: string | null; // Lý do từ chối nếu có
  appliedAt?: string;              // ISO Date string
  updatedAt?: string;              // ISO Date string
}

// -----------------------------------------------------------------------------
// 2. SELLER PROFILE (QUẢN LÝ HỒ SƠ SHOP)
// -----------------------------------------------------------------------------

/**
 * Thông tin shop của Seller.
 * Chuẩn bị sẵn DTO để chia sẻ dữ liệu hiển thị cho Buyer-facing screens.
 */
export interface SellerProfile {
  shopId?: string;
  shopName: string;            // Tên shop
  hotline: string;             // Hotline liên hệ
  pickupAddress: string;       // Địa chỉ lấy hàng
  description?: string;        // Giới thiệu shop
  businessEmail?: string;      // Email nghiệp vụ
  avatarUrl?: string;          // Logo shop
  ratingAvg?: number;          // Điểm đánh giá trung bình
  totalProducts?: number;      // Tổng số sản phẩm đang có
}

export interface UpdateSellerProfileDTO {
  shopName?: string;
  hotline?: string;
  pickupAddress?: string;
  description?: string;
  avatarUrl?: string;
}

// -----------------------------------------------------------------------------
// 3. PRODUCT & CATEGORY MANAGEMENT (QUẢN LÝ SẢN PHẨM & DANH MỤC)
// -----------------------------------------------------------------------------

/**
 * Danh mục sản phẩm (Read-only từ Catalog Service)
 */
export interface Category {
  id: string;
  name: string;
  code?: string;
  parentId?: string | null;
  level?: number;
  description?: string;
  isActive?: boolean;
}

/**
 * Trạng thái vòng đời của sản phẩm:
 * - PENDING_APPROVAL: Chờ kiểm duyệt từ Staff
 * - ACTIVE: Đang mở bán
 * - INACTIVE: Tạm ẩn hoặc ngừng bán
 */
export type ProductStatus = "PENDING_APPROVAL" | "ACTIVE" | "INACTIVE";

/**
 * Thông tin sản phẩm trong hệ thống
 */
export interface Product {
  id: string;                  // ID sản phẩm
  name: string;                // Tên sản phẩm
  price: number;               // Giá niêm yết
  categoryId: string;          // ID danh mục
  categoryName?: string;       // Tên danh mục (mapping để hiển thị UI)
  status: ProductStatus;       // PENDING_APPROVAL | ACTIVE | INACTIVE
  description?: string;        // Mô tả chi tiết
  imageUrl?: string;           // Ảnh đại diện sản phẩm
  images?: string[];           // Danh sách URL ảnh sản phẩm
  sku?: string;                // SKU code mặc định nếu là sản phẩm đơn
  createdAt?: string;          // ISO Date string
  updatedAt?: string;          // ISO Date string
}

export interface CreateProductDTO {
  name: string;
  price: number;
  categoryId: string;
  description?: string;
  images?: string[];
  sku?: string;
  initialStock?: number;
}

export interface UpdateProductDTO {
  name?: string;
  price?: number;
  categoryId?: string;
  description?: string;
  images?: string[];
  status?: ProductStatus;
}

// -----------------------------------------------------------------------------
// 4. INVENTORY / SKU MANAGEMENT (QUẢN LÝ TỒN KHO)
// -----------------------------------------------------------------------------

/**
 * Thông tin tồn kho theo từng SKU
 * Tách biệt hoàn toàn logic & giao diện khỏi form thông tin shop
 */
export interface InventoryItem {
  sku: string;                 // Mã định danh SKU duy nhất
  productId?: string;          // ID sản phẩm cha
  productName?: string;        // Tên sản phẩm để hiển thị UI
  variantName?: string;        // Tên phân loại (VD: Màu Đen, Size XL)
  quantity: number;            // Số lượng tồn kho thực tế hiện tại
  reservedQuantity?: number;   // Số lượng tạm giữ (đang nằm trong đơn chờ xử lý)
  availableQuantity?: number;  // Số lượng khả dụng để bán (= quantity - reservedQuantity)
  lastUpdated?: string;        // Thời gian cập nhật gần nhất (ISO Date)
}

export interface AdjustStockPayload {
  sku: string;
  quantity: number;            // Số lượng điều chỉnh (hoặc số lượng mới tùy BE contract)
  note?: string;               // Lý do điều chỉnh kho (nhập hàng, kiểm kho, hư hao)
}

