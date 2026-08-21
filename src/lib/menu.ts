export type CategoryId =
  | "burgers"
  | "shawarma"
  | "wraps"
  | "sides"
  | "juice"
  | "simple-shakes"
  | "special-shakes"
  | "smoothies"
  | "coffee"
  | "frappe"
  | "tea"
  | "ice-cream-shake"
  | "soda";

export type MenuItem = {
  id: string;
  name: string;
  blurb: string;
  price: number;
  category: CategoryId;
  image: string;
  featured?: boolean;
  promo?: boolean;
};

export const RESTAURANT = {
  name: "Chuski Dera",
  tagline: "Crispy. Loaded. Delivered.",
  city: "Jhang",
  address: "Satellite Town B Block, Green Belt, Jhang",
  phoneDisplay: "0313-9235645",
  phoneTel: "+923139235645",
  callDisplay: "03717400624",
  callTel: "+923717400624",
  callHref: "tel:+923717400624",
  mapsQuery: "Satellite Town B Block Green Belt Jhang Pakistan",
} as const;
