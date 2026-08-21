import type { ButtonHTMLAttributes, ReactNode } from "react";

const CALL_HREF = "tel:+923139235654";
const CALL_LABEL = "Call 03139235654";

export function CallLink({
  className,
  children,
  ...rest
}: { className?: string; children: ReactNode } & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "onClick" | "aria-label"
>) {
  return (
    <button
      {...rest}
      type="button"
      aria-label={CALL_LABEL}
      className={className}
      onClick={() => {
        window.location.href = CALL_HREF;
      }}
    >
      {children}
    </button>
  );
}
