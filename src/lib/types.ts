export type RestaurantSettings = {
  id: string;
  name: string;
  logoUrl: string;
  tagline: string;
  address: string;
  city: string;
  hours: string;
  callDisplay: string;
  callTel: string;
  waDisplay: string;
  waTel: string;
  mapsQuery: string;
};

export type CatalogCategory = {
  id: string;
  label: string;
  sortOrder: number;
  isFood: boolean;
};

export type CatalogItem = {
  id: string;
  name: string;
  blurb: string;
  price: number;
  category: string;
  image: string;
  featured: boolean;
  promo: boolean;
  available: boolean;
  sortOrder: number;
};

export type OrderStatus =
  | "new"
  | "pending"
  | "confirmed"
  | "preparing"
  | "delivered"
  | "cancelled";

export type OrderLine = {
  id: number;
  itemId: string;
  name: string;
  price: number;
  qty: number;
};

export type OrderRow = {
  id: number;
  status: OrderStatus;
  subtotal: number;
  delivery: number;
  total: number;
  notes: string;
  createdAt: string;
  customer: { id: number; name: string; phone: string; address: string };
  items: OrderLine[];
};

export type CustomerRow = {
  id: number;
  name: string;
  phone: string;
  address: string;
  createdAt: string;
  orderCount: number;
  spent: number;
};
