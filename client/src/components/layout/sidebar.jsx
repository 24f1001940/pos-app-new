import {
  Brain,
  BarChart3,
  Boxes,
  CreditCard,
  HandCoins,
  Command,
  PackagePlus,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Truck,
  Users,
  Settings,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollAreaViewport } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const navigation = [
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/products', label: 'Products', icon: Boxes },
  { to: '/pos', label: 'POS Billing', icon: CreditCard },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/suppliers', label: 'Suppliers', icon: Truck },
  { to: '/expenses', label: 'Expenses', icon: HandCoins },
  { to: '/procurement', label: 'Procurement', icon: PackagePlus },
  { to: '/ai-insights', label: 'AI Insights', icon: Brain },
  { to: '/sales', label: 'Sales', icon: ReceiptText },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ open, onClose, user, collapsed, onToggleCollapsed }) {
  return (
    <TooltipProvider delayDuration={120}>
      <>
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className={cn(
            'fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-sm transition lg:hidden',
            open ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        />
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/15 bg-slate-950/95 text-white shadow-2xl shadow-slate-950/40 transition-all duration-300 lg:static lg:translate-x-0',
            open ? 'translate-x-0' : '-translate-x-full',
            collapsed ? 'lg:w-24' : 'lg:w-80',
          )}
        >
          <div className="border-b border-white/10 p-4 lg:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className={cn('transition-all duration-300', collapsed && 'lg:opacity-0 lg:scale-95')}>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">
                  Retail Control
                </p>
                <h1 className="mt-2 text-xl font-bold tracking-tight">
                  Mujahid Electronic Goods
                </h1>
                <p className="mt-2 text-xs text-slate-400">
                  Premium commerce operations hub
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="hidden rounded-full border border-white/10 text-white hover:bg-white/10 lg:inline-flex"
                  onClick={onToggleCollapsed}
                >
                  {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </Button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-white/10 p-2 text-slate-300 lg:hidden"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className={cn('mt-4 rounded-[1.4rem] border border-white/10 bg-white/5 p-4', collapsed && 'lg:p-3')}>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <Command className="h-5 w-5" />
                </div>
                <div className={cn('min-w-0', collapsed && 'lg:hidden')}>
                  <p className="truncate text-sm font-semibold">{user?.name}</p>
                  <p className="truncate text-xs text-slate-400">{user?.email}</p>
                </div>
              </div>
              <Badge className={cn('mt-3 bg-orange-500/15 text-orange-200', collapsed && 'lg:hidden')}>
                {user?.role}
              </Badge>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <ScrollAreaViewport className="p-3 lg:p-4">
              <nav className="space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon

                  const link = (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white',
                          isActive && 'bg-white text-slate-950 shadow-[0_18px_40px_rgba(0,0,0,0.22)]',
                          collapsed && 'lg:justify-center lg:px-0',
                        )
                      }
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className={cn('transition-all duration-300', collapsed && 'lg:hidden')}>
                        {item.label}
                      </span>
                    </NavLink>
                  )

                  if (!collapsed) {
                    return link
                  }

                  return (
                    <Tooltip key={item.to}>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  )
                })}
              </nav>
            </ScrollAreaViewport>
          </ScrollArea>

          <div className="border-t border-white/10 p-4 text-xs text-slate-400">
            <div className={cn('rounded-[1.25rem] bg-white/5 p-3', collapsed && 'lg:text-center')}>
              <p className="font-semibold text-white">Operational focus</p>
              <p className={cn('mt-1 leading-5', collapsed && 'lg:hidden')}>
                Fast POS, low-stock tracking, and analytics in one workflow.
              </p>
            </div>
          </div>
        </aside>
      </>
    </TooltipProvider>
  )
}
