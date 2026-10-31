import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
export const buttonVariants = cva("ui-button", {
  variants: {
    variant: {
      default: "ui-button--primary",
      outline: "ui-button--outline",
      ghost: "ui-button--ghost",
    },
    size: { default: "ui-button--default", sm: "ui-button--small" },
  },
  defaultVariants: { variant: "default", size: "default" },
});
export function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
