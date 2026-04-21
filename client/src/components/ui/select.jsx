import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

export function Select({ className, children, ...props }) {
  return (
    <div className="relative">
      <select
        className={cn(
          'h-11 w-full appearance-none rounded-xl border border-border bg-white/70 dark:bg-slate-900/60 px-4 pr-10 text-sm outline-none focus:ring-2 focus:ring-ring',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
    </div>
  )
}
