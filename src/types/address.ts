/**
 * Định nghĩa Type/Interface cho Master Data của GHN (Giao Hàng Nhanh)
 * và cấu trúc dữ liệu địa chỉ dùng chung cho Frontend (TypeScript strict mode, no any).
 */

export interface GhnProvince {
  ProvinceID: number;
  ProvinceName: string;
  CountryID: number;
  Code: string;
  NameExtension?: string[];
  IsEnable?: number;
  RegionID?: number;
  UpdatedBy?: number;
  CreatedAt?: string;
  UpdatedAt?: string;
  AreaID?: number;
}

export interface GhnDistrict {
  DistrictID: number;
  ProvinceID: number;
  DistrictName: string;
  Code: string;
  Type: number;
  SupportType: number;
  NameExtension?: string[];
  IsEnable?: number;
  UpdatedBy?: number;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export interface GhnWard {
  WardCode: string;
  DistrictID: number;
  WardName: string;
  NameExtension?: string[];
  IsEnable?: number;
  CanUpdateCOD?: boolean;
  UpdatedBy?: number;
  CreatedAt?: string;
  UpdatedAt?: string;
  SupportType?: number;
}

export interface GhnApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

/**
 * Cấu trúc một bản ghi địa chỉ phẳng sau khi chuẩn hóa để lưu tĩnh trong public/address.json.
 * Tuân thủ mô hình hành chính 2 cấp hiện đại ({Phường/Xã}, {Tỉnh/Thành phố})
 * đồng thời giữ đủ các mã định tuyến kỹ thuật của GHN (provinceId, districtId, wardCode).
 */
export interface AddressItem {
  readonly provinceId: number;
  readonly provinceName: string;
  readonly districtId: number;
  readonly districtName: string;
  readonly wardCode: string;
  readonly wardName: string;
  readonly fullName: string;
  readonly searchText: string;
}

/**
 * Trạng thái giá trị của bộ 3 mã kho lấy hàng GHN và địa chỉ chi tiết.
 */
export interface WarehouseAddressCodes {
  provinceId: string;
  districtId: string;
  wardCode: string;
  streetAddress?: string;
}
