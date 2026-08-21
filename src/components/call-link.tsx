import type { AnchorHTMLAttributes, ReactNode } from "react";
import { CALL_DISPLAY, CALL_HREF } from "@/lib/phone";

export function CallLink({
  className,
  children,
  ...rest
}: { className?: string; children: ReactNode } & Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "aria-label"
>) {
  return (
    <a
      {...rest}
      href={CALL_HREF}
      aria-label={`Call ${CALL_DISPLAY}`}
      className={className}
      onClick={(event) => {
        rest.onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        window.location.href = CALL_HREF;
      }}
    >
      {children}
    </a>
  );
}
