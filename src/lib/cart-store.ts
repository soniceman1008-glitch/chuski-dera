import { create } from "zustand";
import { persist } from "zustand/middleware";
import { findItem } from "./menu";

export type CartLine = { id: string; qty: number };

export type Customer = {
  name: string;
  phone: string;
  address: string;
};

type CartState = {
  lines: CartLine[];
  customer: Customer;
  drawerOpen: boolean;
  add: (id: string) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  setCustomer: (patch: Partial<Customer>) => void;
  setDrawerOpen: (open: boolean) => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      customer: { name: "", phone: "", address: "" },
      drawerOpen: false,
      add: (id) =>
        set((state) =>
          state.lines.find((line) => line.id === id)
            ? {
                lines: state.lines.map((line) =>
                  line.id === id ? { ...line, qty: line.qty + 1 } : line,
                ),
              }
            : { lines: [...state.lines, { id, qty: 1 }] },
        ),
      remove: (id) =>
        set((state) => ({ lines: state.lines.filter((line) => line.id !== id) })),
      setQty: (id, qty) =>
        set((state) =>
          qty <= 0
            ? { lines: state.lines.filter((line) => line.id !== id) }
            : {
                lines: state.lines.map((line) =>
                  line.id === id ? { ...line, qty } : line,
                ),
              },
        ),
      clear: () => set({ lines: [] }),
      setCustomer: (patch) =>
        set((state) => ({ customer: { ...state.customer, ...patch } })),
      setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
    }),
    {
      name: "chuski-dera.cart",
      partialize: (state) => ({ lines: state.lines, customer: state.customer }),
    },
  ),
);

export function itemCount(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.qty, 0);
}

export function cartTotal(lines: CartLine[]) {
  return lines.reduce((sum, line) => {
    const item = findItem(line.id);
    return item ? sum + item.price * line.qty : sum;
  }, 0);
}

export function qtyOf(lines: CartLine[], id: string) {
  return lines.find((line) => line.id === id)?.qty ?? 0;
}
