import { cn } from '@/lib/utils'

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'flex h-11 w-full rounded-2xl border border-border bg-white/70 dark:bg-slate-900/60 px-4 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-ring',
        className,
      )}
      {...props}
    />
  )
}
