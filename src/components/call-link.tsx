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
  const href = `tel:${tel.startsWith("+") ? tel : `+${tel.replace(/\D/g, "")}`}`;
  const label = `Call ${shop.callDisplay || RESTAURANT.callDisplay}`;
  return (
    <a
      {...rest}
      href={href}
      aria-label={label}
      className={className}
      onClick={(event) => {
        rest.onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        window.location.href = href;
      }}
    >
      {children}
    </a>
  );
}
