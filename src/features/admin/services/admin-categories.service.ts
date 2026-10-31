import { api, type ApiResponse } from "@/lib/api/client";
import { staffAdminDemoEnabled } from "@/lib/demo/staff-admin-demo";

export type AdminCategory = {
  categoryId: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  children?: AdminCategory[];
};

type CategoryList = AdminCategory[] | { items?: AdminCategory[]; categories?: AdminCategory[] };

export type CategoryInput = {
  name: string;
  description: string;
  parentId: string | null;
  sortOrder: number;
};

function flatten(categories: AdminCategory[], parentId: string | null = null): AdminCategory[] {
  return categories.flatMap((category) => [
    { ...category, parentId: category.parentId ?? parentId },
    ...flatten(category.children ?? [], category.categoryId),
  ]);
}

export const adminCategoriesService = {
  async list(signal?: AbortSignal): Promise<AdminCategory[]> {
    if (staffAdminDemoEnabled) return (await import("../demo/admin-categories-demo")).adminCategoriesDemo.list();
    const response = await api.get<ApiResponse<CategoryList>>("/api/v1/categories?tree=true", { signal });
    const payload = response.data;
    const categories = Array.isArray(payload) ? payload : payload.items ?? payload.categories ?? [];
    return flatten(categories);
  },
  async create(input: CategoryInput): Promise<void> {
    if (staffAdminDemoEnabled) return (await import("../demo/admin-categories-demo")).adminCategoriesDemo.create(input);
    await api.post<ApiResponse<AdminCategory>>("/api/v1/categories", input);
  },
  async update(id: string, input: CategoryInput & { isActive: boolean }): Promise<void> {
    if (staffAdminDemoEnabled) return (await import("../demo/admin-categories-demo")).adminCategoriesDemo.update(id, input);
    await api.put<ApiResponse<AdminCategory>>(`/api/v1/categories/${encodeURIComponent(id)}`, input);
  },
  async remove(id: string): Promise<void> {
    if (staffAdminDemoEnabled) return (await import("../demo/admin-categories-demo")).adminCategoriesDemo.remove(id);
    await api.delete<void>(`/api/v1/categories/${encodeURIComponent(id)}`);
  },
};
