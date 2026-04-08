'use client'

import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium tracking-wide whitespace-nowrap transition-colors',
  {
    variants: {
      variant: {
        default: 'border-border bg-muted text-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border text-foreground',
        emerald:
          'border-emerald-500/20 bg-emerald-500/12 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/15 dark:text-emerald-200',
        red: 'border-red-500/20 bg-red-500/12 text-red-700 dark:border-red-400/20 dark:bg-red-400/15 dark:text-red-200',
        amber:
          'border-amber-500/20 bg-amber-500/12 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/15 dark:text-amber-200',
        blue: 'border-sky-500/20 bg-sky-500/12 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/15 dark:text-sky-200',
        violet:
          'border-violet-500/20 bg-violet-500/12 text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/15 dark:text-violet-200',
        slate:
          'border-slate-500/20 bg-slate-500/12 text-slate-700 dark:border-slate-400/20 dark:bg-slate-400/15 dark:text-slate-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
