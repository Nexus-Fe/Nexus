export type Product = {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock?: number;
  imageUrl?: string;
  categoryId?: string;
};

export type Category = {
  id: string;
  name: string;
  slug?: string;
};

export type ProductListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
};

export type ProductListResponse = {
  items: Product[];
  total: number;
};
