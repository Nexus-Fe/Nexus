export const ROUTES = {
  home: "/",
  auth: {
    login: "/login",
    register: "/register",
  },
  catalog: {
    index: "/catalog",
    product: (id: string) => `/catalog/${encodeURIComponent(id)}`,
  },
  buyer: {
    profile: "/buyer/profile",
    cart: "/buyer/cart",
    checkout: "/buyer/checkout",
    orders: "/buyer/orders",
    order: (id: string) => `/buyer/orders/${encodeURIComponent(id)}`,
    wallet: "/buyer/wallet",
  },
  seller: {
    products: "/seller/products",
    inventory: "/seller/inventory",
  },
  staff: {
    sellers: "/staff/sellers",
    orders: "/staff/orders",
    fulfillment: "/staff/fulfillment",
  },
  admin: {
    users: "/admin/users",
    categories: "/admin/categories",
    auditLog: "/admin/audit-log",
  },
} as const;
