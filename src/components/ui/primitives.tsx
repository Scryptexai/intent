"use client";
import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

/* Input */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn("flex h-9 w-full rounded-md border border-white/10 bg-intent-surface px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", className)}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

/* Textarea */
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea
    className={cn("flex min-h-[60px] w-full rounded-md border border-white/10 bg-intent-surface px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", className)}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";

/* Progress */
export const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { indicatorClassName?: string }>(
  ({ className, value, indicatorClassName, ...props }, ref) => (
    <ProgressPrimitive.Root ref={ref} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-white/5", className)} {...props}>
      <ProgressPrimitive.Indicator className={cn("h-full w-full flex-1 bg-intent-teal transition-all", indicatorClassName)} style={{ transform: `translateX(-${100 - (value || 0)}%)` }} />
    </ProgressPrimitive.Root>
  ),
);
Progress.displayName = ProgressPrimitive.Root.displayName;

/* Switch */
export const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <SwitchPrimitive.Root
      className={cn("peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-intent-teal data-[state=unchecked]:bg-white/10", className)}
      {...props}
      ref={ref}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitive.Root>
  ),
);
Switch.displayName = SwitchPrimitive.Root.displayName;

/* Separator */
export const Separator = React.forwardRef<React.ElementRef<typeof SeparatorPrimitive.Root>, React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>>(
  ({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn("shrink-0 bg-white/10", orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]", className)}
      {...props}
    />
  ),
);
Separator.displayName = SeparatorPrimitive.Root.displayName;

/* Skeleton */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-white/5", className)} {...props} />;
}

/* Tooltip */
export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipContent = React.forwardRef<React.ElementRef<typeof TooltipPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>>(
  ({ className, sideOffset = 4, ...props }, ref) => (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn("z-50 overflow-hidden rounded-md bg-[#1c2129] px-3 py-1.5 text-xs text-foreground shadow-md border border-white/10 animate-in fade-in-0 zoom-in-95", className)}
      {...props}
    />
  ),
);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/* Label */
export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props} />;
}
