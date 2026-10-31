import { readDemoState, writeDemoState } from "@/lib/demo/staff-admin-demo";
import type { AdminCategory, CategoryInput } from "../services/admin-categories.service";

const key = "categories";
const initial: AdminCategory[] = [
  { categoryId: "33333333-3333-4333-8333-000000000001", name: "Điện tử", description: "Thiết bị điện tử", sortOrder: 1, isActive: true },
  { categoryId: "33333333-3333-4333-8333-000000000002", name: "Điện thoại", parentId: "33333333-3333-4333-8333-000000000001", sortOrder: 1, isActive: true },
  { categoryId: "33333333-3333-4333-8333-000000000003", name: "Gia dụng", sortOrder: 2, isActive: true },
];

const read = () => readDemoState(key, initial);
const write = (categories: AdminCategory[]) => writeDemoState(key, categories);

function ensureUniqueName(categories: AdminCategory[], name: string, exceptId?: string): void {
  if (categories.some((category) => category.categoryId !== exceptId && category.name.toLocaleLowerCase("vi-VN") === name.toLocaleLowerCase("vi-VN"))) {
    throw new Error("Tên danh mục đã tồn tại trong dữ liệu demo.");
  }
}

export const adminCategoriesDemo = {
  list: () => read(),
  create(input: CategoryInput): void {
    const categories = read();
    ensureUniqueName(categories, input.name);
    categories.push({ categoryId: crypto.randomUUID(), ...input, isActive: true });
    write(categories);
  },
  update(id: string, input: CategoryInput & { isActive: boolean }): void {
    const categories = read();
    const category = categories.find((item) => item.categoryId === id);
    if (!category) throw new Error("Không tìm thấy danh mục trong dữ liệu demo.");
    ensureUniqueName(categories, input.name, id);
    if (input.parentId === id) throw new Error("Danh mục không thể là danh mục cha của chính nó.");
    let ancestorId = input.parentId;
    while (ancestorId) {
      if (ancestorId === id) throw new Error("Danh mục cha không thể nằm trong danh mục con.");
      ancestorId = categories.find((item) => item.categoryId === ancestorId)?.parentId ?? null;
    }
    Object.assign(category, input);
    write(categories);
  },
  remove(id: string): void {
    const categories = read();
    if (categories.some((category) => category.parentId === id)) throw new Error("Hãy xử lý danh mục con trước khi xóa danh mục cha.");
    if (!categories.some((category) => category.categoryId === id)) throw new Error("Không tìm thấy danh mục trong dữ liệu demo.");
    write(categories.filter((category) => category.categoryId !== id));
  },
};
