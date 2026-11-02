"use client";

import React, { useState } from "react";
import { SellerRoleGate } from "@/features/seller/components/SellerRoleGate";
import { ProductList, ProductForm } from "@/features/seller/components/Product";
import type { Product } from "@/features/seller/types/seller.types";

export default function SellerProductsPage() {
  const [viewMode, setViewMode] = useState<"list" | "create" | "edit">("list");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleOpenCreate = () => {
    setSelectedProduct(null);
    setViewMode("create");
  };

  const handleOpenEdit = (product: Product) => {
    setSelectedProduct(product);
    setViewMode("edit");
  };

  const handleFormBack = () => {
    setSelectedProduct(null);
    setViewMode("list");
  };

  return (
    <SellerRoleGate>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px", display: "grid", gap: 24 }}>
        {viewMode === "list" ? (
          <ProductList
            onCreateProduct={handleOpenCreate}
            onEditProduct={handleOpenEdit}
          />
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <button
                type="button"
                onClick={handleFormBack}
                className="button button-secondary button-small"
              >
                &larr; Quay lại danh sách sản phẩm
              </button>
            </div>

            <ProductForm
              initialProduct={selectedProduct}
              onSuccess={() => {
                setViewMode("list");
                setSelectedProduct(null);
              }}
              onCancel={handleFormBack}
            />
          </div>
        )}
      </div>
    </SellerRoleGate>
  );
}
