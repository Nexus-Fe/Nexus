"use client";

import { useState } from "react";
import { ghnPresets } from "../ghn-presets";

export function SellerShopAddressFields({ provinceId, districtId, wardCode, streetAddress }: {
  provinceId: string;
  districtId: string;
  wardCode: string;
  streetAddress: string;
}) {
  const [selectedProvince, setSelectedProvince] = useState(provinceId);
  const [selectedDistrict, setSelectedDistrict] = useState(districtId);
  const [selectedWard, setSelectedWard] = useState(wardCode);
  const provinces = [...new Map(ghnPresets.map((place) => [place.provinceId, place.city])).entries()];
  const districts = [...new Map(ghnPresets.filter((place) => place.provinceId === selectedProvince)
    .map((place) => [place.districtId, place.district])).entries()];
  const wards = ghnPresets.filter((place) => place.provinceId === selectedProvince && place.districtId === selectedDistrict);
  const existingProvince = selectedProvince && !provinces.some(([id]) => id === selectedProvince);
  const existingDistrict = selectedDistrict && !districts.some(([id]) => id === selectedDistrict);
  const existingWard = selectedWard && !wards.some((place) => place.wardCode === selectedWard);

  return <>
    <h3>Địa chỉ lấy hàng</h3>
    <div className="form-grid">
      <label className="field-wrap" htmlFor="seller-shop-province">Tỉnh / thành phố
        <select id="seller-shop-province" className="select-field" name="provinceId" required value={selectedProvince}
          onChange={(event) => { setSelectedProvince(event.target.value); setSelectedDistrict(""); setSelectedWard(""); }}>
          <option value="">Chọn tỉnh / thành phố</option>
          {existingProvince && <option value={selectedProvince}>Khu vực đã lưu</option>}
          {provinces.map(([id, city]) => <option key={id} value={id}>{city}</option>)}
        </select>
      </label>
      <label className="field-wrap" htmlFor="seller-shop-district">Quận / huyện
        <select id="seller-shop-district" className="select-field" name="districtId" required value={selectedDistrict}
          disabled={!selectedProvince} onChange={(event) => { setSelectedDistrict(event.target.value); setSelectedWard(""); }}>
          <option value="">Chọn quận / huyện</option>
          {existingDistrict && <option value={selectedDistrict}>Quận / huyện đã lưu</option>}
          {districts.map(([id, district]) => <option key={id} value={id}>{district}</option>)}
        </select>
      </label>
      <label className="field-wrap" htmlFor="seller-shop-ward">Phường / xã
        <select id="seller-shop-ward" className="select-field" name="wardCode" required value={selectedWard}
          disabled={!selectedDistrict} onChange={(event) => setSelectedWard(event.target.value)}>
          <option value="">Chọn phường / xã</option>
          {existingWard && <option value={selectedWard}>Phường / xã đã lưu</option>}
          {wards.map((place) => <option key={place.wardCode} value={place.wardCode}>{place.ward}</option>)}
        </select>
      </label>
      <label className="field-wrap" htmlFor="seller-shop-street">Địa chỉ cụ thể
        <input id="seller-shop-street" className="field" name="streetAddress" required defaultValue={streetAddress} />
      </label>
    </div>
    <p className="status-note">Danh sách chọn nhanh hiện có 4 khu vực GHN mẫu.</p>
  </>;
}
