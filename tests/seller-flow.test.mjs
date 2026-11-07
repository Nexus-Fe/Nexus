import assert from "node:assert/strict";
import test from "node:test";
import {
  isPlatformWarehouse,
  isSellerWarehouse,
  sellerCatalogService,
} from "../src/features/seller/services/catalog.service.ts";
import {
  leafCategoryOptions,
  describeCategoryError,
} from "../src/features/seller/services/category-options.ts";
import {
  MAX_INVENTORY_QUANTITY,
  parseInitialInventoryQuantity,
} from "../src/features/seller/services/inventory-quantity.ts";
import { saveSessionTokens } from "../src/lib/api/client.ts";

function browserSession() {
  const values = new Map();
  const browser = new EventTarget();
  browser.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  globalThis.window = browser;
  return browser;
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

test("warehouse categorization identifies platform and seller warehouses accurately", () => {
  const platform1 = { id: "wh-1", code: "WH-CENTRAL-01", name: "Kho Tổng Nexus" };
  const platform2 = { id: "wh-2", code: "WH-NORTH", name: "Kho Miền Bắc", type: "PlatformWarehouse" };
  const platform3 = { id: "wh-3", code: "WH-SOUTH", name: "Kho Miền Nam", type: "1" };
  const sellerWh = { id: "wh-seller", code: "WH-SHOP", name: "Kho Shop A", sellerId: "seller-123", type: "SellerWarehouse" };
  const otherSellerWh = { id: "wh-other", code: "WH-OTHER", name: "Kho Shop B", sellerId: "seller-999" };

  assert.equal(isPlatformWarehouse(platform1), true);
  assert.equal(isPlatformWarehouse(platform2), true);
  assert.equal(isPlatformWarehouse(platform3), true);
  assert.equal(isPlatformWarehouse(sellerWh), false);

  assert.equal(isSellerWarehouse(sellerWh, "seller-123"), true);
  assert.equal(isSellerWarehouse(sellerWh, "other-user"), false);
  assert.equal(isSellerWarehouse(platform1, "seller-123"), false);
  assert.equal(isSellerWarehouse(otherSellerWh, "seller-123"), false);
});

test("category selection only permits leaf categories with proper error handling", () => {
  const tree = [
    { categoryId: "c1", name: "Thời trang", parentId: null },
    { categoryId: "c1-1", name: "Áo nam", parentId: "c1" },
    { categoryId: "c1-1-1", name: "Áo sơ mi", parentId: "c1-1" },
    { categoryId: "c2", name: "Đồ chơi", parentId: null, isDisabled: true },
  ];

  const leaves = leafCategoryOptions(tree);
  assert.equal(leaves.length, 1);
  assert.equal(leaves[0].categoryId, "c1-1-1");
  assert.equal(leaves[0].label, "Thời trang › Áo nam › Áo sơ mi");

  assert.equal(
    describeCategoryError("Products can only be assigned to a leaf category."),
    "Danh mục này còn danh mục con. Hãy chọn một danh mục con cụ thể.",
  );
});

test("initial inventory quantity boundary constraints", () => {
  assert.equal(parseInitialInventoryQuantity("0"), 0);
  assert.equal(parseInitialInventoryQuantity("50"), 50);
  assert.equal(parseInitialInventoryQuantity(String(MAX_INVENTORY_QUANTITY)), MAX_INVENTORY_QUANTITY);

  assert.throws(() => parseInitialInventoryQuantity("-5"), /Tồn ban đầu phải là số nguyên/);
  assert.throws(() => parseInitialInventoryQuantity("12.5"), /Tồn ban đầu phải là số nguyên/);
  assert.throws(() => parseInitialInventoryQuantity("abc"), /Tồn ban đầu phải là số nguyên/);
  assert.throws(() => parseInitialInventoryQuantity(String(MAX_INVENTORY_QUANTITY + 1)), /Tồn ban đầu phải là số nguyên/);
});

test("seller product creation payload links initial inventory to active warehouse", async () => {
  browserSession();
  saveSessionTokens("test-access", "test-refresh");

  let capturedBody = null;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith("/me")) {
      return json({ id: "seller-123", status: "Active" });
    }
    if (url.endsWith("/api/v1/products") && options?.method === "POST") {
      capturedBody = JSON.parse(options.body);
      return json({
        data: {
          id: "prod-new-123",
          productId: "prod-new-123",
          status: "DRAFT",
          saleType: "REGULAR",
          variants: [{ variantId: "var-1", skuCode: "SKU-001" }],
        },
      });
    }
    return json({ data: null });
  };

  const created = await sellerCatalogService.create({
    sellerId: "seller-123",
    categoryId: "c1-1-1",
    name: "Áo sơ mi cao cấp",
    description: "Chất liệu cotton 100%",
    brand: "NexusWear",
    specifications: [{ name: "Xuất xứ", value: "Việt Nam" }],
    variants: [
      {
        skuCode: "SKU-001",
        name: "Size M",
        price: 250000,
        currency: "VND",
        quantity: 50,
        isActive: true,
        warehouseId: "wh-central-01",
        attributes: [{ attrName: "Size", attrValue: "M" }],
      },
    ],
  });

  assert.equal(created.id, "prod-new-123");
  assert.ok(capturedBody);
  assert.equal(capturedBody.sellerId, "seller-123");
  assert.equal(capturedBody.saleType, "REGULAR");
  assert.equal(capturedBody.categoryId, "c1-1-1");
  assert.equal(capturedBody.variants[0].quantity, 50);
  assert.equal(capturedBody.variants[0].warehouseId, "wh-central-01");
  assert.deepEqual(capturedBody.specifications, [{ name: "Xuất xứ", value: "Việt Nam" }]);
});

test("listWarehouses fetches seller-specific and platform warehouses seamlessly", async () => {
  browserSession();
  saveSessionTokens("test-access", "test-refresh");

  globalThis.fetch = async (url) => {
    if (url.endsWith("/me")) {
      return json({ id: "seller-123", status: "Active" });
    }
    if (url.includes("/api/v1/warehouses/seller/seller-123")) {
      return json({
        data: [
          { id: "wh-seller-1", code: "WH-S1", name: "Kho Riêng 1", sellerId: "seller-123" },
        ],
      });
    }
    if (url.includes("/api/v1/warehouses?page=1")) {
      return json({
        data: {
          items: [
            { id: "wh-plat-1", code: "WH-CENTRAL-01", name: "Kho Tổng Hà Nội" },
            { id: "wh-seller-1", code: "WH-S1", name: "Kho Riêng 1", sellerId: "seller-123" }, // duplicate check
            { id: "wh-other-seller", code: "WH-S2", name: "Kho Seller Khác", sellerId: "seller-other" },
          ],
          pagination: {
            pageIndex: 1,
            pageSize: 50,
            totalCount: 3,
            totalPages: 1,
            hasNextPage: false,
          },
        },
      });
    }
    return json({ data: null });
  };

  const warehouses = await sellerCatalogService.listWarehouses("seller-123");
  assert.equal(warehouses.length, 2);
  const ids = warehouses.map((w) => w.id);
  assert.ok(ids.includes("wh-seller-1"));
  assert.ok(ids.includes("wh-plat-1"));
  assert.ok(!ids.includes("wh-other-seller"));
});

test("inventory batch query and warehouse filtering isolate products correctly", async () => {
  browserSession();
  saveSessionTokens("test-access", "test-refresh");

  globalThis.fetch = async (url, options) => {
    if (url.endsWith("/me")) {
      return json({ id: "seller-123", status: "Active" });
    }
    if (url.includes("/api/v1/seller/products?")) {
      return json({
        data: {
          items: [
            { productId: "p1", name: "Product 1", categoryId: "c1", saleType: "REGULAR", status: "ACTIVE", variantCount: 1 },
            { productId: "p2", name: "Product 2", categoryId: "c1", saleType: "REGULAR", status: "ACTIVE", variantCount: 1 },
          ],
          pagination: { pageIndex: 1, pageSize: 100, totalCount: 2, totalPages: 1, hasNextPage: false },
        },
      });
    }
    if (url.includes("/api/v1/seller/products/p1")) {
      return json({
        data: {
          productId: "p1",
          name: "Product 1",
          variants: [{ variantId: "v1", skuCode: "SKU-1", name: "V1", price: 100000 }],
        },
      });
    }
    if (url.includes("/api/v1/seller/products/p2")) {
      return json({
        data: {
          productId: "p2",
          name: "Product 2",
          variants: [{ variantId: "v2", skuCode: "SKU-2", name: "V2", price: 200000 }],
        },
      });
    }
    if (url.includes("/api/v1/inventories/by-skus")) {
      return json({
        data: [
          { id: "b1", skuId: "v1", warehouseId: "wh-plat-1", totalQuantity: 10, availableQuantity: 10, reservedQuantity: 0, updatedAt: "2026-11-01" },
          // v2 is in wh-other, not in wh-plat-1
          { id: "b2", skuId: "v2", warehouseId: "wh-other", totalQuantity: 5, availableQuantity: 5, reservedQuantity: 0, updatedAt: "2026-11-01" },
        ],
      });
    }
    return json({ data: null });
  };

  const stockedProducts = await sellerCatalogService.listProductsInWarehouse("wh-plat-1");
  assert.equal(stockedProducts.length, 1);
  assert.equal(stockedProducts[0].productId, "p1");
});
