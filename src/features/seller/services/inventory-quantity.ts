export const MAX_INVENTORY_QUANTITY = 2147483647;

export function parseInitialInventoryQuantity(value: string): number {
  const quantity = Number(value);
  if (value.trim() === "" || !Number.isInteger(quantity) || quantity < 0 || quantity > MAX_INVENTORY_QUANTITY) {
    throw new Error("Tồn ban đầu phải là số nguyên từ 0 đến 2.147.483.647.");
  }
  return quantity;
}
