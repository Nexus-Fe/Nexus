import { readDemoState, writeDemoState } from "@/lib/demo/staff-admin-demo";
import type { SellerRegistration, SellerRegistrationPage } from "../services/seller-registrations.service";

const key = "seller-registrations";
const initial: SellerRegistration[] = [
  { registrationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", userId: "11111111-1111-4111-8111-111111111111", shopName: "Nexus Tech Demo", businessEmail: "tech.demo@nexus.local", hotline: "0900000001", identityCardNumber: "000000000001", warehouseAddress: "12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh", status: "PENDING" },
  { registrationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", userId: "22222222-2222-4222-8222-222222222222", shopName: "Nexus Home Demo", businessEmail: "home.demo@nexus.local", hotline: "0900000002", identityCardNumber: "000000000002", warehouseAddress: "45 Lê Lợi, Quận 1, TP. Hồ Chí Minh", status: "PENDING" },
  { registrationId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", shopName: "Nexus Fashion Demo", businessEmail: "fashion.demo@nexus.local", status: "APPROVED" },
  { registrationId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", shopName: "Nexus Market Demo", businessEmail: "market.demo@nexus.local", status: "REJECTED", rejectionReason: "Hồ sơ chưa đủ thông tin." },
];

const read = () => readDemoState(key, initial);
const write = (items: SellerRegistration[]) => writeDemoState(key, items);

function findRegistration(id: string): { items: SellerRegistration[]; registration: SellerRegistration } {
  const items = read();
  const registration = items.find((item) => item.registrationId === id);
  if (!registration) throw new Error("Không tìm thấy hồ sơ trong dữ liệu demo.");
  return { items, registration };
}

export const sellerRegistrationsDemo = {
  list(query: { page: number; limit: number; status: string }): SellerRegistrationPage {
    const filtered = read().filter((registration) => !query.status || registration.status.toLowerCase() === query.status.toLowerCase());
    const start = (query.page - 1) * query.limit;
    return { items: filtered.slice(start, start + query.limit), total: filtered.length, page: query.page, limit: query.limit };
  },
  detail(id: string): SellerRegistration {
    return { ...findRegistration(id).registration };
  },
  approve(id: string): void {
    const { items, registration } = findRegistration(id);
    if (registration.status !== "PENDING") throw new Error("Chỉ hồ sơ chờ duyệt mới có thể phê duyệt.");
    registration.status = "APPROVED";
    write(items);
  },
  reject(id: string, rejectionReason: string): void {
    const { items, registration } = findRegistration(id);
    if (registration.status !== "PENDING") throw new Error("Chỉ hồ sơ chờ duyệt mới có thể từ chối.");
    registration.status = "REJECTED";
    registration.rejectionReason = rejectionReason;
    write(items);
  },
};
