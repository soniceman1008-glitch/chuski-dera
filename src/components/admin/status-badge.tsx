import type { OrderStatus } from "@/lib/types";

const STYLES: Record<OrderStatus, string> = {
  new: "bg-primary text-primary-fg",
  pending: "bg-elevated text-fg ring-1 ring-border",
  confirmed: "bg-elevated text-fg ring-1 ring-primary/40",
  preparing: "bg-primary/20 text-primary ring-1 ring-primary/30",
  delivered: "bg-fg text-bg",
  cancelled: "bg-elevated text-muted",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold capitalize ${STYLES[status]}`}>
      {status}
    </span>
  );
}
