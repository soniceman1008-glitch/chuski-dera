import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export function QtyStepper({
  qty,
  onDec,
  onInc,
  label,
  wide = false,
}: {
  qty: number;
  onDec: () => void;
  onInc: () => void;
  label: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex h-11 items-center rounded-md bg-elevated ring-1 ring-border",
        wide && "w-full justify-between",
      )}
    >
      <button
        type="button"
        onClick={onDec}
        className="grid size-11 place-items-center text-fg transition-colors hover:text-primary"
        aria-label={`Fewer ${label}`}
      >
        <Minus className="size-4" />
      </button>
      <span className="w-6 text-center text-sm font-medium tabular-nums">{qty}</span>
      <button
        type="button"
        onClick={onInc}
        className="grid size-11 place-items-center text-fg transition-colors hover:text-primary"
        aria-label={`More ${label}`}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
