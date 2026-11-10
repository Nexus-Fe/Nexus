import administrativeUnits from "../data/vietnam-administrative-units.json";
import { removeVietnameseTones } from "./vietnamese";

export interface MatchedAdministrativeLocation {
  provinceCode: string;
  wardCode: string;
}

/**
 * Ánh xạ tên Tỉnh và Phường/Xã từ GHN sang mã đơn vị hành chính chuẩn 2 cấp của dự án
 */
export function matchAdministrativeLocation(
  provinceName: string,
  wardName: string,
): MatchedAdministrativeLocation | null {
  const normalizedItemProvince = removeVietnameseTones(provinceName)
    .replace(/^(tinh|thanh pho|tp\.?)\s+/i, "")
    .trim();

  const matchedProvince = administrativeUnits.provinces.find((p) => {
    const normPName = removeVietnameseTones(p.name)
      .replace(/^(tinh|thanh pho|tp\.?)\s+/i, "")
      .trim();
    return (
      normPName === normalizedItemProvince ||
      normPName.includes(normalizedItemProvince) ||
      normalizedItemProvince.includes(normPName)
    );
  });

  if (!matchedProvince) return null;

  const normalizedItemWard = removeVietnameseTones(wardName)
    .replace(/^(phuong|xa|thi tran)\s+/i, "")
    .trim();

  const matchedWard = matchedProvince.wards.find((w) => {
    const normWName = removeVietnameseTones(w.name)
      .replace(/^(phuong|xa|thi tran)\s+/i, "")
      .trim();
    return (
      normWName === normalizedItemWard ||
      normWName.includes(normalizedItemWard) ||
      normalizedItemWard.includes(normWName)
    );
  });

  return {
    provinceCode: matchedProvince.code,
    wardCode: matchedWard ? matchedWard.code : "",
  };
}
