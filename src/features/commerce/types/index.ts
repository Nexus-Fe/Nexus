export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
};

export type Cart = {
  cartId: string;
  items: CartItem[];
  totalAmount: number;
};

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PAID"
  | "CANCELLED"
  | (string & {});

export type Order = {
  orderId: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  message?: string;
};

export type CreateOrderRequest = {
  quoteId: string;
  shippingAddress: string;
  contactPhone: string;
  paymentMethod?: string;
  note?: string;
};
