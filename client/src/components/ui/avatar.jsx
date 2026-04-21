import * as AvatarPrimitive from '@radix-ui/react-avatar'

import { cn } from '@/lib/utils'

export function Avatar({ className, ...props }) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative flex h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-white/40 bg-muted dark:border-white/10',
        className,
      )}
      {...props}
    />
  )
}

export function AvatarImage({ className, ...props }) {
  return (
    <AvatarPrimitive.Image
      className={cn('h-full w-full object-cover', className)}
      {...props}
    />
  )
}

export function AvatarFallback({ className, ...props }) {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        'flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/25 to-secondary/40 text-sm font-semibold text-foreground',
        className,
      )}
      {...props}
    />
  )
}
