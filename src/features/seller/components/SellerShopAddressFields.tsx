"use client";

import { useState } from "react";
import { WarehouseAddressPicker } from "@/components/address/WarehouseAddressPicker";

export function SellerShopAddressFields({
  provinceId,
  districtId,
  wardCode,
  streetAddress,
}: {
  provinceId: string;
  districtId: string;
  wardCode: string;
  streetAddress: string;
}) {
  const [currentProvinceId, setCurrentProvinceId] = useState(provinceId);
  const [currentDistrictId, setCurrentDistrictId] = useState(districtId);
  const [currentWardCode, setCurrentWardCode] = useState(wardCode);
  const [currentStreet, setCurrentStreet] = useState(streetAddress);

  return (
    <>
      <h3 style={{ marginTop: "1rem", marginBottom: "0.5rem" }}>Địa chỉ lấy hàng (Kho hàng)</h3>
      <WarehouseAddressPicker
        idPrefix="seller-shop"
        provinceId={currentProvinceId}
        districtId={currentDistrictId}
        wardCode={currentWardCode}
        streetAddress={currentStreet}
        registerFormInputs={true}
        onChange={(codes) => {
          setCurrentProvinceId(codes.provinceId);
          setCurrentDistrictId(codes.districtId);
          setCurrentWardCode(codes.wardCode);
          if (codes.streetAddress !== undefined) {
            setCurrentStreet(codes.streetAddress);
          }
        }}
      />
      <p className="status-note" style={{ marginTop: "0.5rem" }}>
        💡 Gõ tên phường/xã để tìm nhanh hoặc tự điều chỉnh trực tiếp 3 mã GHN nếu cần.
      </p>
    </>
  );
}
