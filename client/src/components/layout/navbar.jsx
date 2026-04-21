import { useState } from 'react'
import { Bell, Command, Menu, MoreHorizontal, Power, Search, Sparkles } from 'lucide-react'
import { useLocation } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeSwitcher } from '@/components/ui/theme-switcher'
import { useAuth } from '@/hooks/use-auth'
import { useNotifications } from '@/hooks/use-notifications'
import { formatDateTime } from '@/lib/utils'

const titles = {
  '/dashboard': 'Business Overview',
  '/products': 'Inventory Manager',
  '/pos': 'Point of Sale',
  '/customers': 'Customer Profiles',
  '/suppliers': 'Supplier Directory',
  '/expenses': 'Expense Tracker',
  '/procurement': 'Purchase Orders',
  '/ai-insights': 'AI Insights',
  '/sales': 'Sales Ledger',
  '/settings': 'Store Settings',
}

export function Navbar({ onMenuClick, onCommandPaletteOpen }) {
  const location = useLocation()
  const { logout, user } = useAuth()
  const { notifications, unreadCount, markRead, markAllRead, connected } = useNotifications()
  const [showNotifications, setShowNotifications] = useState(false)

  const currentTitle = titles[location.pathname] || 'Mujahid Electronic Goods'

  return (
    <header className="sticky top-0 z-20 border-b border-white/40 bg-background/75 backdrop-blur-2xl dark:border-white/10">
      <div className="flex items-center justify-between gap-4 px-4 py-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="glass" className="hidden md:inline-flex">
                <Sparkles className="mr-1 h-3 w-3" /> Premium workspace
              </Badge>
              <Badge variant="default" className="md:hidden">
                Live
              </Badge>
            </div>
            <h2 className="mt-1 truncate text-xl font-semibold tracking-tight lg:text-2xl">
              {currentTitle}
            </h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              Smart operations, real-time insights, and polished controls.
            </p>
          </div>
        </div>
        <div className="relative flex items-center gap-2 lg:gap-3">
          <div className="hidden rounded-full border border-white/50 bg-white/80 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/50 md:block">
            {formatDateTime(new Date())}
          </div>

          <Button type="button" variant="outline" className="hidden md:inline-flex" onClick={onCommandPaletteOpen}>
            <Search className="h-4 w-4" />
            <span className="hidden lg:inline">Search</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
              Ctrl+K
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowNotifications((current) => !current)}
          >
            <Bell className="h-4 w-4" />
          </Button>
          {unreadCount ? (
            <span className="absolute -top-1 right-[9.5rem] flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white md:right-[12.4rem]">
              {unreadCount}
            </span>
          ) : null}
          {showNotifications ? (
            <div className="absolute right-0 top-14 z-50 w-[22rem] rounded-[1.75rem] border border-white/40 bg-card p-4 shadow-2xl dark:border-white/10">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    {connected ? 'Live connection active' : 'Reconnecting...'}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={markAllRead}>
                  Mark all read
                </Button>
              </div>
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {notifications.length ? (
                  notifications.slice(0, 20).map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className="w-full rounded-2xl border border-border/70 p-3 text-left transition hover:-translate-y-0.5 hover:bg-accent"
                      onClick={() => markRead(notification.id)}
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{notification.title}</p>
                        {!notification.read ? <Badge variant="warning">New</Badge> : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{notification.message}</p>
                    </button>
                  ))
                ) : (
                  <p className="rounded-2xl bg-white/60 p-3 text-xs text-muted-foreground dark:bg-slate-900/50">
                    No notifications yet.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          <ThemeSwitcher compact />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="hidden md:inline-flex">
                <Avatar className="h-8 w-8 rounded-xl">
                  <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                  <AvatarFallback>{user?.name?.slice(0, 2)?.toUpperCase() || 'MG'}</AvatarFallback>
                </Avatar>
                <div className="hidden text-left lg:block">
                  <p className="text-xs text-muted-foreground">Signed in as</p>
                  <p className="max-w-[10rem] truncate text-sm font-semibold">{user?.name}</p>
                </div>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                    <AvatarFallback>{user?.name?.slice(0, 2)?.toUpperCase() || 'MG'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold normal-case tracking-normal text-foreground">{user?.name}</p>
                    <p className="text-xs normal-case tracking-normal text-muted-foreground">{user?.role}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setShowNotifications(true)}>
                <Bell className="mr-2 h-4 w-4" /> Notifications
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onCommandPaletteOpen}>
                <Command className="mr-2 h-4 w-4" /> Command palette
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="danger" onSelect={logout}>
                <Power className="mr-2 h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button type="button" variant="outline" size="icon" className="md:hidden" onClick={logout}>
            <Power className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
