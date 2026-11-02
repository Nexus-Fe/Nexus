export type CartItem = {
  id: string;
  productId: string;
  skuId: string;
  sellerId: string;
  productName: string;
  unitPriceSnapshot: number;
  quantity: number;
};

export type Cart = {
  id: string;
  buyerId: string;
  status: string;
  itemCount: number;
  items: CartItem[];
  subtotalAmount: number;
};

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PAID"
  | "CANCELLED"
  | (string & {});

export type Order = {
  id: string;
  buyerId: string;
  status: OrderStatus;
  totalAmount: number;
  paymentDeadlineAt: string;
};
