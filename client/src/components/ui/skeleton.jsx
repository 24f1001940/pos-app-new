import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('rounded-2xl bg-muted/70 skeleton-shimmer', className)}
      {...props}
    />
  )
}
