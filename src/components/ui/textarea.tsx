import * as React from "react";
import { cn } from "@/lib/utils";
export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-72 w-full rounded-xl border border-border bg-white p-4 text-base leading-7 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10",
        className,
      )}
      {...props}
    />
  );
}
