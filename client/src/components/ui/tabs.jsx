import * as TabsPrimitive from '@radix-ui/react-tabs'

import { cn } from '@/lib/utils'

export const Tabs = TabsPrimitive.Root

export function TabsList({ className, ...props }) {
  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex items-center rounded-full border border-white/40 bg-white/70 p-1 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60',
        className,
      )}
      {...props}
    />
  )
}

export function TabsTrigger({ className, ...props }) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
        className,
      )}
      {...props}
    />
  )
}

export const TabsContent = TabsPrimitive.Content
