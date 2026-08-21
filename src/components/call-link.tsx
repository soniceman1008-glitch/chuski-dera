import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useRestaurant } from "@/lib/catalog-store";
import { RESTAURANT } from "@/lib/menu";

export function CallLink({
  className,
  children,
  ...rest
}: { className?: string; children: ReactNode } & Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "aria-label"
>) {
  const shop = useRestaurant();
  const tel = (shop.callTel || RESTAURANT.callTel).replace(/^tel:/, "");
  const label = `Call ${shop.callDisplay || RESTAURANT.callDisplay}`;
  return (
    <a {...rest} href={`tel:${tel}`} aria-label={label} className={className}>
      {children}
    </a>
  );
}
