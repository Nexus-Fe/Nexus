import assert from "node:assert/strict";
import test from "node:test";
import {
  describeCategoryError,
  leafCategoryOptions,
} from "../src/features/seller/services/category-options.ts";

const tree = [
  { categoryId: "root-a", name: "Điện tử", parentId: null },
  { categoryId: "phone", name: "Điện thoại", parentId: "root-a" },
  { categoryId: "smart", name: "Điện thoại thông minh", parentId: "phone" },
  { categoryId: "laptop", name: "Laptop", parentId: "root-a" },
  { categoryId: "root-b", name: "Sách", parentId: null },
  { categoryId: "off", name: "Đã tắt", parentId: "root-b", isDisabled: true },
  { categoryId: "root-c", name: "Khác", parentId: null },
];

test("only leaf categories are offered, labelled with their full path", () => {
  const options = leafCategoryOptions(tree);
  assert.deepEqual(
    options.map((option) => option.categoryId).sort(),
    ["laptop", "root-c", "smart"],
  );
  assert.equal(options.find((option) => option.categoryId === "smart")?.label, "Điện tử › Điện thoại › Điện thoại thông minh");
  assert.equal(options.find((option) => option.categoryId === "root-c")?.label, "Khác");
});

test("parents are never offered and disabled categories are skipped", () => {
  const ids = leafCategoryOptions(tree).map((option) => option.categoryId);
  assert.ok(!ids.includes("root-a"));
  assert.ok(!ids.includes("phone"));
  assert.ok(!ids.includes("off"));
  // root-b chỉ có con đã tắt: Catalog vẫn coi là danh mục cha nên không được đề xuất.
  assert.ok(!ids.includes("root-b"));
});

test("a parent cycle does not hang and an empty list yields no options", () => {
  const cyclic = [
    { categoryId: "x", name: "X", parentId: "y" },
    { categoryId: "y", name: "Y", parentId: "x" },
  ];
  assert.deepEqual(leafCategoryOptions(cyclic), []);
  assert.deepEqual(leafCategoryOptions([]), []);
});

test("backend leaf-category rejection is translated, other messages pass through", () => {
  assert.match(describeCategoryError("Products can only be assigned to a leaf category."), /danh mục con/);
  assert.equal(describeCategoryError("Tên sản phẩm bắt buộc."), "Tên sản phẩm bắt buộc.");
});
