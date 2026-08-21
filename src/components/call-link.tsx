import type { AnchorHTMLAttributes, ReactNode } from "react";

/** Only number allowed for the phone/call icon dialer. */
const CALL_TEL = "+923139235654";
const CALL_DISPLAY = "+923139235654";
const CALL_HREF = `tel:${CALL_TEL}`;

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
