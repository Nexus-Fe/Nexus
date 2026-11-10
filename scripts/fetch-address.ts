/**
 * SCRIPT TẢI DỮ LIỆU ĐỊA CHỈ TỪ GHN MASTER DATA API (Giao Hàng Nhanh)
 *
 * Chạy 1 lần trên máy phát triển bằng lệnh:
 *   npm run fetch:address
 *
 * Yêu cầu:
 * - Node.js 18+ (sử dụng fetch có sẵn)
 * - File .env chứa biến GHN_TOKEN=<token_cua_ban>
 * - KHÔNG đưa script hay token này lên client/web.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { removeVietnameseTones } from "../src/utils/vietnamese";
import type { AddressItem, GhnApiResponse, GhnDistrict, GhnProvince, GhnWard } from "../src/types/address";

/**
 * Hàm đọc biến môi trường từ file .env không phụ thuộc thư viện ngoài
 */
function loadDotEnv(envPath: string): void {
  if (!fs.existsSync(envPath)) return;
  try {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separatorIdx = trimmed.indexOf("=");
      if (separatorIdx > 0) {
        const key = trimmed.slice(0, separatorIdx).trim();
        let value = trimmed.slice(separatorIdx + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  } catch {
    // Bỏ qua lỗi đọc file .env
  }
}

/**
 * Hàm sleep để tạo độ trễ giữa các request (chống rate limit 429)
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gọi HTTP fetch với cơ chế tự động thử lại (Retry) khi gặp lỗi mạng hoặc mã 429/5xx
 */
async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  retries = 3,
  delayMs = 800,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        console.warn(`[Cảnh báo] Bị GHN giới hạn tốc độ (429). Đang chờ ${delayMs * 2}ms để thử lại lần ${attempt}/${retries}...`);
        await sleep(delayMs * 2);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const json = (await response.json()) as GhnApiResponse<T>;
      if (json.code !== 200 && json.code !== 0) {
        throw new Error(`Lỗi từ GHN API (${json.code}): ${json.message}`);
      }

      return json.data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < retries) {
        await sleep(delayMs * attempt);
      }
    }
  }

  throw lastError ?? new Error(`Thất bại sau ${retries} lần thử: ${url}`);
}

async function main(): Promise<void> {
  const rootDir = process.cwd();
  loadDotEnv(path.join(rootDir, ".env"));
  loadDotEnv(path.join(rootDir, ".env.local"));

  const token = process.env.GHN_TOKEN;
  if (!token) {
    console.error("❌ LỖI: Chưa cấu hình biến môi trường GHN_TOKEN trong file .env!");
    console.error("Vui lòng tạo file .env với nội dung:");
    console.error("GHN_TOKEN=your_token_here");
    console.error("GHN_ENV=prod # hoặc dev");
    process.exit(1);
  }

  const isDev = process.env.GHN_ENV === "dev";
  const baseUrl = isDev
    ? "https://dev-online-gateway.ghn.vn/shiip/public-api/master-data"
    : "https://online-gateway.ghn.vn/shiip/public-api/master-data";

  console.log("==================================================");
  console.log(`🚀 BẮT ĐẦU TẢI DỮ LIỆU ĐỊA CHỈ TỪ GHN MASTER DATA`);
  console.log(`🌐 Môi trường: ${isDev ? "DEV (Sandbox)" : "PRODUCTION"}`);
  console.log(`🔗 Endpoint: ${baseUrl}`);
  console.log("==================================================\n");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Token: token,
  };

  // 1. Tải danh sách Tỉnh / Thành phố
  console.log("1️⃣ Đang tải danh sách Tỉnh/Thành phố...");
  const provinces = await fetchWithRetry<GhnProvince[]>(`${baseUrl}/province`, {
    method: "GET",
    headers,
  });
  console.log(`   ✓ Đã lấy được ${provinces.length} Tỉnh/Thành phố.`);

  const allAddressItems: AddressItem[] = [];
  const delayBetweenRequestsMs = 50; // Tránh quá tải cho server GHN

  // 2. Duyệt qua từng Tỉnh để lấy Quận/Huyện
  for (let pIndex = 0; pIndex < provinces.length; pIndex++) {
    const province = provinces[pIndex];
    console.log(`\n[${pIndex + 1}/${provinces.length}] Đang xử lý: ${province.ProvinceName} (ID: ${province.ProvinceID})...`);

    let districts: GhnDistrict[] = [];
    try {
      districts = await fetchWithRetry<GhnDistrict[]>(`${baseUrl}/district`, {
        method: "POST",
        headers,
        body: JSON.stringify({ province_id: province.ProvinceID }),
      });
      await sleep(delayBetweenRequestsMs);
    } catch (err) {
      console.error(`   ⚠️ Không thể tải danh sách quận/huyện cho ${province.ProvinceName}:`, err);
      continue;
    }

    // 3. Với mỗi Quận/Huyện, lấy danh sách Phường/Xã
    // Chia lô xử lý 5 quận cùng lúc để tối ưu thời gian nhưng không gây quá tải
    const batchSize = 5;
    for (let dIndex = 0; dIndex < districts.length; dIndex += batchSize) {
      const batch = districts.slice(dIndex, dIndex + batchSize);

      await Promise.all(
        batch.map(async (district) => {
          try {
            const wards = await fetchWithRetry<GhnWard[]>(`${baseUrl}/ward`, {
              method: "POST",
              headers,
              body: JSON.stringify({ district_id: district.DistrictID }),
            });

            if (Array.isArray(wards)) {
              for (const ward of wards) {
                // Tạo chuỗi fullName: "Phường, Quận, Tỉnh" (hỗ trợ cả tìm kiếm 2 cấp và 3 cấp)
                const fullName = `${ward.WardName}, ${district.DistrictName}, ${province.ProvinceName}`;
                const searchText = removeVietnameseTones(fullName);

                allAddressItems.push({
                  provinceId: province.ProvinceID,
                  provinceName: province.ProvinceName,
                  districtId: district.DistrictID,
                  districtName: district.DistrictName,
                  wardCode: ward.WardCode,
                  wardName: ward.WardName,
                  fullName,
                  searchText,
                });
              }
            }
          } catch (err) {
            console.warn(`   ⚠️ Lỗi tải phường/xã của ${district.DistrictName}:`, (err as Error).message);
          }
        }),
      );

      await sleep(delayBetweenRequestsMs);
    }
    console.log(`   ✓ Hoàn tất ${province.ProvinceName}. Tổng tích lũy: ${allAddressItems.length} địa chỉ.`);
  }

  // 4. Lưu ra file public/address.json
  const publicDir = path.join(rootDir, "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const outputPath = path.join(publicDir, "address.json");
  console.log("\n💾 Đang ghi dữ liệu ra file tĩnh...");
  // Ghi dạng JSON rút gọn (minify) để tiết kiệm dung lượng
  fs.writeFileSync(outputPath, JSON.stringify(allAddressItems), "utf-8");

  const stat = fs.statSync(outputPath);
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
  const sizeKb = (stat.size / 1024).toFixed(0);

  console.log("==================================================");
  console.log(`🎉 HOÀN THÀNH XUẤT SẮC!`);
  console.log(`📦 Tổng số đơn vị phường/xã đã lưu: ${allAddressItems.length}`);
  console.log(`📁 Đường dẫn file: ${outputPath}`);
  console.log(`📊 Dung lượng file: ${sizeMb} MB (~${sizeKb} KB)`);
  console.log("==================================================");
}

// Chạy hàm chính nếu được gọi từ CLI
main().catch((err) => {
  console.error("❌ Lỗi chương trình:", err);
  process.exit(1);
});
