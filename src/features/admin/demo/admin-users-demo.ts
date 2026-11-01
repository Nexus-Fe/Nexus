import { readDemoState, writeDemoState } from "@/lib/demo/staff-admin-demo";
import type { AdminUser, AdminUserPage } from "../services/admin-users.service";

const key = "users";
const initial: AdminUser[] = [
  { userId: "11111111-1111-4111-8111-111111111111", displayName: "Nguyễn Minh Anh", email: "buyer.demo@nexus.local", roles: ["Buyer"], status: "Active" },
  { userId: "22222222-2222-4222-8222-222222222222", displayName: "Trần Hải Nam", email: "seller.demo@nexus.local", roles: ["Buyer", "Seller"], status: "Active" },
  { userId: "33333333-3333-4333-8333-333333333333", displayName: "Lê Thu Hà", email: "staff.demo@nexus.local", roles: ["SupportStaff"], status: "Banned" },
];

const read = () => readDemoState(key, initial);
const write = (users: AdminUser[]) => writeDemoState(key, users);

function findUser(id: string): { users: AdminUser[]; user: AdminUser } {
  const users = read();
  const user = users.find((item) => (item.userId ?? item.id) === id);
  if (!user) throw new Error("Không tìm thấy tài khoản trong dữ liệu demo.");
  return { users, user };
}

export const adminUsersDemo = {
  list(query: { page: number; limit: number; keyword: string; role: string; status: string }): AdminUserPage {
    const keyword = query.keyword.toLocaleLowerCase("vi-VN");
    const filtered = read().filter((user) =>
      (!keyword || `${user.displayName ?? ""} ${user.username ?? ""} ${user.email}`.toLocaleLowerCase("vi-VN").includes(keyword)) &&
      (!query.role || user.roles?.some((role) => role.toLowerCase() === query.role.toLowerCase())) &&
      (!query.status || user.status?.toLowerCase() === query.status.toLowerCase()),
    );
    const start = (query.page - 1) * query.limit;
    return { items: filtered.slice(start, start + query.limit), total: filtered.length, page: query.page, limit: query.limit };
  },
  detail(id: string): AdminUser {
    return { ...findUser(id).user };
  },
  ban(id: string): void {
    const { users, user } = findUser(id);
    if (user.status === "Deleted") throw new Error("Tài khoản đã xóa không thể khóa.");
    user.status = "Banned";
    write(users);
  },
  unban(id: string): void {
    const { users, user } = findUser(id);
    if (user.status !== "Banned") throw new Error("Tài khoản chưa bị khóa.");
    user.status = "Active";
    write(users);
  },
  remove(id: string): void {
    const { users, user } = findUser(id);
    user.status = "Deleted";
    write(users);
  },
};
