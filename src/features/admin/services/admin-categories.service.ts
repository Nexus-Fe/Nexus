import { api, type ApiResponse } from "@/lib/api/client";

export type AdminCategory = {
  categoryId: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  level?: number;
  isActive?: boolean;
  children?: AdminCategory[];
};

type CategoryList = { items: AdminCategory[]; pagination: { hasNextPage: boolean } };

export type CategoryInput = {
  name: string;
  description: string;
  parentId: string | null;
  sortOrder: number;
};

function flatten(categories: AdminCategory[], parentId: string | null = null): AdminCategory[] {
  return categories.flatMap((category) => [
    { ...category, parentId: category.parentId ?? parentId, isActive: true },
    ...flatten(category.children ?? [], category.categoryId),
  ]);
}

function unwrap<T>(response: ApiResponse<T> | T): T {
  return response && typeof response === "object" && "data" in response ? response.data : response;
}

export const adminCategoriesService = {
  async list(signal?: AbortSignal): Promise<AdminCategory[]> {
    const categories: AdminCategory[] = [];
    let page = 1;
    while (true) {
      const response = await api.get<ApiResponse<CategoryList> | CategoryList>(`/api/v1/categories?tree=true&page=${page}&pageSize=100`, { signal });
      const payload = unwrap(response);
      categories.push(...payload.items);
      if (!payload.pagination.hasNextPage) break;
      page += 1;
    }
    return flatten(categories);
  },
  async create(input: CategoryInput): Promise<void> {
    await api.post<AdminCategory>("/api/v1/categories", input);
  },
  async update(id: string, input: { name: string; description: string; level: number; sortOrder: number; isDisabled: boolean }): Promise<void> {
    await api.put<AdminCategory>(`/api/v1/categories/${encodeURIComponent(id)}`, input);
  },
  async remove(id: string): Promise<void> {
    await api.delete<void>(`/api/v1/categories/${encodeURIComponent(id)}`);
  },
};
