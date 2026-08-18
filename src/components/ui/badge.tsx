import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-intent-teal/15 text-blue-300 border-intent-teal/30",
        amber: "border-intent-gold/30 bg-intent-gold/10 text-amber-300",
        success: "border-intent-lime/30 bg-intent-lime/10 text-intent-lime",
        danger: "border-intent-rose/30 bg-intent-rose/10 text-intent-rose",
        muted: "border-white/10 bg-white/5 text-muted-foreground",
        outline: "border-white/15 text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
