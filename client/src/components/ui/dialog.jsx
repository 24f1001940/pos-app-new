import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

export function Dialog(props) {
  return <DialogPrimitive.Root {...props} />
}

export function DialogTrigger(props) {
  return <DialogPrimitive.Trigger {...props} />
}

export function DialogPortal(props) {
  return <DialogPrimitive.Portal {...props} />
}

export function DialogContent({ className, children, ...props }) {
  return (
    <DialogPortal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-[1.75rem] border border-white/10 bg-card p-6 shadow-2xl outline-none animate-scale-in',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground">
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

export function DialogHeader({ className, ...props }) {
  return <div className={cn('mb-6 space-y-1', className)} {...props} />
}

export function DialogTitle(props) {
  return <DialogPrimitive.Title className="text-xl font-semibold tracking-tight" {...props} />
}

export function DialogDescription(props) {
  return (
    <DialogPrimitive.Description
      className="text-sm text-muted-foreground"
      {...props}
    />
  )
}
