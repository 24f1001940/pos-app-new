import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-foreground',
        success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
        warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
        danger: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
        glass:
          'border border-white/30 bg-white/40 text-foreground backdrop-blur-xl dark:border-white/10 dark:bg-white/5',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export function Badge({ className, variant, ...props }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}
