export type CategoryNode = {
  categoryId: string;
  name: string;
  parentId?: string | null;
  isDisabled?: boolean;
};

export type LeafCategoryOption = { categoryId: string; label: string };

const PATH_SEPARATOR = " › ";

/**
 * Catalog chỉ cho gán sản phẩm vào danh mục lá (không có danh mục con).
 * Trả về các danh mục lá đang bật, nhãn là đường dẫn từ gốc, ví dụ "Điện tử › Điện thoại".
 * Danh mục con đã tắt không được trả về từ API công khai nên không thể phát hiện ở đây;
 * trường hợp đó Catalog vẫn từ chối và màn hình hiển thị lỗi từ `describeCategoryError`.
 */
export function leafCategoryOptions(categories: readonly CategoryNode[]): LeafCategoryOption[] {
  const byId = new Map(categories.map((category) => [category.categoryId, category]));
  const parentIds = new Set<string>();
  for (const category of categories) {
    if (category.parentId) parentIds.add(category.parentId);
  }

  function pathOf(category: CategoryNode): string {
    const names = [category.name];
    const visited = new Set([category.categoryId]);
    let parent = category.parentId ? byId.get(category.parentId) : undefined;
    while (parent && !visited.has(parent.categoryId)) {
      names.unshift(parent.name);
      visited.add(parent.categoryId);
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
    return names.join(PATH_SEPARATOR);
  }

  return categories
    .filter((category) => !category.isDisabled && !parentIds.has(category.categoryId))
    .map((category) => ({ categoryId: category.categoryId, label: pathOf(category) }))
    .sort((left, right) => left.label.localeCompare(right.label, "vi"));
}

export function describeCategoryError(message: string): string {
  return /leaf category/i.test(message)
    ? "Danh mục này còn danh mục con. Hãy chọn một danh mục con cụ thể."
    : message;
}

