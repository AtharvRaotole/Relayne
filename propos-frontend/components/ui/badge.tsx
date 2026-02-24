import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden border-transparent",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
        blue: "bg-blue-50 text-blue-700 border-blue-100 [a&]:hover:bg-blue-100",
        red: "bg-red-50 text-red-700 border-red-100 [a&]:hover:bg-red-100",
        orange:
          "bg-orange-50 text-orange-700 border-orange-100 [a&]:hover:bg-orange-100",
        gray: "bg-gray-50 text-gray-600 border-gray-100 [a&]:hover:bg-gray-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const badgeSizeVariants = cva("", {
  variants: {
    size: {
      default: "text-xs px-2 py-0.5",
      xs: "text-[10px] px-1.5 py-0",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

function Badge({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> &
  VariantProps<typeof badgeSizeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      data-size={size}
      className={cn(
        badgeVariants({ variant }),
        badgeSizeVariants({ size }),
        className
      )}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
