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
  phoneDisplay: "+923139235645",
  phoneTel: "+923139235645",
  callDisplay: "+923139235645",
  callTel: "+923139235645",
  callHref: "tel:+923139235645",
  mapsQuery: "Satellite Town B Block Green Belt Jhang Pakistan",
} as const;

export const CATEGORIES: { id: CategoryId | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "burgers", label: "Burgers" },
  { id: "shawarma", label: "Shawarma" },
  { id: "wraps", label: "Wraps & Rolls" },
  { id: "sides", label: "Fries & Sides" },
  { id: "juice", label: "Fresh Juice" },
  { id: "simple-shakes", label: "Simple Shakes" },
  { id: "special-shakes", label: "Special Shakes" },
  { id: "smoothies", label: "Fruit Smoothies" },
  { id: "coffee", label: "Coffee Over Ice" },
  { id: "frappe", label: "Frappuccino" },
  { id: "tea", label: "Tea" },
  { id: "ice-cream-shake", label: "Ice Cream Shake" },
  { id: "soda", label: "Italian Soda" },
];

export const FOOD_CATEGORIES: CategoryId[] = ["burgers", "shawarma", "wraps", "sides"];

export const MENU: MenuItem[] = [
  { id: "double-dekar", name: "Double Dekar Burger", blurb: "Two crispy fillets. Built to fill.", price: 700, category: "burgers", image: "/images/double-burger.jpg", featured: true },
  { id: "tower", name: "Tower Burger", blurb: "Stacked high. Sauce down the side.", price: 520, category: "burgers", image: "/images/tower-burger.jpg", featured: true },
  { id: "zinger-cheese", name: "Zinger Cheese Burger", blurb: "Crispy zinger, melted cheddar.", price: 430, category: "burgers", image: "/images/zinger-cheese.jpg", featured: true },
  { id: "zinger", name: "Zinger Burger", blurb: "The house crunch. No shortcuts.", price: 380, category: "burgers", image: "/images/zinger-burger.jpg" },
  { id: "pattie", name: "Pattie Burger", blurb: "Classic patty, toasted bun.", price: 250, category: "burgers", image: "/images/pattie-burger.jpg" },
  { id: "chapli", name: "Chapli Burger", blurb: "Spiced chapli, onion, chutney.", price: 250, category: "burgers", image: "/images/chapli-burger.jpg" },
  { id: "zinger-shawarma", name: "Zinger Shawarma", blurb: "Crispy chicken, garlic, pickle.", price: 330, category: "shawarma", image: "/images/zinger-shawarma.jpg", featured: true },
  { id: "nuggets-shawarma", name: "Nuggets Shawarma", blurb: "Nuggets rolled. Messy on purpose.", price: 220, category: "shawarma", image: "/images/nuggets-shawarma.jpg" },
  { id: "platter-shawarma", name: "Platter Shawarma", blurb: "Chicken, fries, salad. Share it.", price: 500, category: "shawarma", image: "/images/platter.jpg", featured: true },
  { id: "chicken-shawarma-s", name: "Chicken Shawarma (Small)", blurb: "The everyday roll.", price: 150, category: "shawarma", image: "/images/shawarma-small.jpg" },
  { id: "chicken-shawarma-l", name: "Chicken Shawarma (Large)", blurb: "Same wrap. More chicken.", price: 200, category: "shawarma", image: "/images/shawarma-large.jpg" },
  { id: "tortilla", name: "Tortilla Wraps", blurb: "Soft tortilla, grilled filling.", price: 530, category: "wraps", image: "/images/wrap.jpg" },
  { id: "grilled-wrap", name: "Grilled Wraps", blurb: "Toasted, cheese pulled.", price: 550, category: "wraps", image: "/images/grilled-wrap.jpg", featured: true },
  { id: "malai-roll", name: "Malai Boti Paratha Roll", blurb: "Creamy boti in flaky paratha.", price: 380, category: "wraps", image: "/images/malai-roll.jpg", featured: true },
  { id: "chicken-roll", name: "Chicken Paratha Roll", blurb: "Tikka, paratha, chutney.", price: 350, category: "wraps", image: "/images/chicken-roll.jpg" },
  { id: "nuggets-5", name: "Nuggets (5 Pieces)", blurb: "Crispy bites. Dip whatever you want.", price: 300, category: "sides", image: "/images/nuggets-5.jpg" },
  { id: "nuggets-10", name: "Nuggets (10 Pieces)", blurb: "For the table. Or not.", price: 550, category: "sides", image: "/images/nuggets-10.jpg" },
  { id: "wings-5", name: "Hot Wings (5 Pieces)", blurb: "Glazed heat. Keep napkins close.", price: 300, category: "sides", image: "/images/wings-5.jpg" },
  { id: "wings-10", name: "Hot Wings (10 Pieces)", blurb: "Double the burn.", price: 550, category: "sides", image: "/images/wings-10.jpg" },
  { id: "fries", name: "Simple Fries", blurb: "Salt, crunch, done.", price: 100, category: "sides", image: "/images/fries.jpg" },
  { id: "sausi-fries", name: "Sausi Fries", blurb: "Fries with sauce. The Jhang way.", price: 200, category: "sides", image: "/images/sausi-fries.jpg" },
  { id: "loaded-fries", name: "Loaded Fries", blurb: "Cheese, sauce, extra everything.", price: 300, category: "sides", image: "/images/loaded-fries.jpg", featured: true },
  { id: "falsa", name: "Falsa", blurb: "Seasonal. Tart, cold, Jhang summer.", price: 170, category: "juice", image: "/images/falsa.jpg" },
  { id: "peach-juice", name: "Peach", blurb: "Fresh peach. Ice. That's the glass.", price: 170, category: "juice", image: "/images/peach-juice.jpg" },
  { id: "fresh-lime", name: "Fresh Lime", blurb: "Squeezed to order. No cordial.", price: 150, category: "juice", image: "/images/lime-juice.jpg", promo: true },
  { id: "banana-shake", name: "Banana Shake", blurb: "Milk, banana, nothing fancy.", price: 200, category: "simple-shakes", image: "/images/banana-shake.jpg" },
  { id: "apple-shake", name: "Apple Shake", blurb: "Fresh apple, cold milk.", price: 200, category: "simple-shakes", image: "/images/apple-shake.jpg" },
  { id: "mango-shake", name: "Mango Shake", blurb: "The one everyone already knows.", price: 200, category: "simple-shakes", image: "/images/mango-shake.jpg", promo: true },
  { id: "pina-colada", name: "Pina Colada", blurb: "Pineapple, coconut, blended cold.", price: 400, category: "special-shakes", image: "/images/pina-colada.jpg" },
  { id: "oreo-shake", name: "Oreo Shake", blurb: "Cookies in the blender. You asked.", price: 400, category: "special-shakes", image: "/images/oreo-shake.jpg" },
  { id: "iced-chocolate-shake", name: "Iced Chocolate Shake", blurb: "Cocoa, milk, ice. Thick.", price: 400, category: "special-shakes", image: "/images/iced-chocolate-shake.jpg" },
  { id: "chocolate-pb-shake", name: "Chocolate Peanut Butter Shake", blurb: "Chocolate meets peanut butter.", price: 450, category: "special-shakes", image: "/images/pb-shake.jpg", promo: true },
  { id: "bounty-shake", name: "Bounty Chocolate Shake", blurb: "Coconut chocolate. Like the bar.", price: 400, category: "special-shakes", image: "/images/bounty-shake.jpg" },
  { id: "date-delight", name: "Date Delight Shake", blurb: "Khajoor, milk, blended rich.", price: 400, category: "special-shakes", image: "/images/date-delight.jpg" },
  { id: "green-apple-smoothie", name: "Green Apple", blurb: "Tart apple. Milk-based smoothie.", price: 400, category: "smoothies", image: "/images/green-apple.jpg" },
  { id: "blueberry-smoothie", name: "Blue Berry", blurb: "Berry-thick. Served cold.", price: 400, category: "smoothies", image: "/images/blueberry.jpg" },
  { id: "kiwi-smoothie", name: "Kiwi", blurb: "Green, sharp, blended.", price: 400, category: "smoothies", image: "/images/kiwi.jpg" },
  { id: "iced-latte", name: "Iced Latte", blurb: "Espresso, milk, ice.", price: 350, category: "coffee", image: "/images/iced-latte.jpg" },
  { id: "iced-cappuccino", name: "Iced Cappuccino", blurb: "Same shot. More foam.", price: 350, category: "coffee", image: "/images/iced-cappuccino.jpg" },
  { id: "iced-mocha", name: "Iced Mocha", blurb: "Chocolate coffee, over ice.", price: 350, category: "coffee", image: "/images/iced-mocha.jpg", promo: true },
  { id: "butterscotch-bliss", name: "Butterscotch Bliss", blurb: "Blended. Butterscotch all the way.", price: 499, category: "frappe", image: "/images/frappe.jpg", promo: true },
  { id: "coco-loco", name: "Coco Loco", blurb: "Coconut frappe. Cold and loud.", price: 499, category: "frappe", image: "/images/coco-loco.jpg" },
  { id: "cookies-n-cream", name: "Cookies 'n' Cream", blurb: "Cookie crumb, blended ice.", price: 499, category: "frappe", image: "/images/cookies-n-cream.jpg" },
  { id: "caramel-delight", name: "Caramel Delight", blurb: "Caramel drizzle, whipped top.", price: 499, category: "frappe", image: "/images/caramel-delight.jpg" },
  { id: "hazelnut-heaven", name: "Hazelnut Heaven", blurb: "Hazelnut frappe. Nutty, cold.", price: 499, category: "frappe", image: "/images/hazelnut-heaven.jpg" },
  { id: "special-chocolate-frappe", name: "Special Chocolate", blurb: "The chocolate frappe. Extra.", price: 499, category: "frappe", image: "/images/special-chocolate-frappe.jpg" },
  { id: "plain-tea", name: "Plain Tea Cup", blurb: "Doodh patti. The small cup.", price: 90, category: "tea", image: "/images/tea.jpg" },
  { id: "cardamom-tea", name: "Cardamom Tea", blurb: "Elaichi in the brew.", price: 100, category: "tea", image: "/images/cardamom-tea.jpg", promo: true },
  { id: "kulfa-shake", name: "Kulfa", blurb: "Ice cream shake. Pista, cardamom.", price: 300, category: "ice-cream-shake", image: "/images/kulfa.jpg" },
  { id: "vanilla-shake", name: "Vanilla", blurb: "Vanilla ice cream, blended.", price: 300, category: "ice-cream-shake", image: "/images/vanilla-shake.jpg" },
  { id: "chocolate-ice-shake", name: "Chocolate", blurb: "Chocolate ice cream shake.", price: 300, category: "ice-cream-shake", image: "/images/chocolate-ice-shake.jpg" },
  { id: "strawberry-ice-shake", name: "Strawberry", blurb: "Pink, cold, ice cream.", price: 300, category: "ice-cream-shake", image: "/images/strawberry-shake.jpg" },
  { id: "lime-italian-soda", name: "Lime Italian Soda", blurb: "Sparkling lime. Ice to the brim.", price: 370, category: "soda", image: "/images/italian-soda.jpg", promo: true },
  { id: "kiwi-italian-soda", name: "Kiwi Italian Soda", blurb: "Kiwi sparkle over ice.", price: 370, category: "soda", image: "/images/kiwi-soda.jpg" },
  { id: "green-apple-soda", name: "Green Apple Italian Soda", blurb: "Green apple fizz.", price: 370, category: "soda", image: "/images/green-apple-soda.jpg" },
  { id: "blueberry-soda", name: "Blue Berry Italian Soda", blurb: "Berry soda, extra ice.", price: 370, category: "soda", image: "/images/blueberry-soda.jpg" },
  { id: "mint-margaretta", name: "Mint Margaretta", blurb: "Mint slush. The house cooler.", price: 200, category: "soda", image: "/images/mint-soda.jpg" },
];

export function formatRs(amount: number) {
  return `Rs. ${amount.toLocaleString("en-PK")}`;
}

export function findItem(id: string) {
  return MENU.find((item) => item.id === id);
}

export function categoryLabel(id: CategoryId | "all") {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
