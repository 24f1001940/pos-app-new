import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Command, Search, Sparkles, SunMoon } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea, ScrollAreaViewport } from '@/components/ui/scroll-area'
import { useTheme } from '@/hooks/use-theme'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const commandGroups = [
  {
    label: 'Navigate',
    items: [
      { label: 'Dashboard', to: '/dashboard', hint: 'Overview' },
      { label: 'Products', to: '/products', hint: 'Catalog' },
      { label: 'POS Billing', to: '/pos', hint: 'Checkout' },
      { label: 'Customers', to: '/customers', hint: 'Profiles' },
      { label: 'Sales', to: '/sales', hint: 'Ledger' },
      { label: 'Settings', to: '/settings', hint: 'Control center' },
    ],
  },
  {
    label: 'Actions',
    items: [
      { label: 'Toggle theme', action: 'theme', hint: 'Switch light or dark' },
      { label: 'Open AI insights', to: '/ai-insights', hint: 'Smart helpers' },
      { label: 'Open procurement', to: '/procurement', hint: 'Purchases' },
      { label: 'Logout', action: 'logout', hint: 'End session' },
    ],
  },
]

export function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate()
  const { toggleTheme } = useTheme()
  const { logout } = useAuth()
  const [query, setQuery] = useState('')

  function handleOpenChange(nextOpen) {
    if (!nextOpen) {
      setQuery('')
    }

    onOpenChange(nextOpen)
  }

  const commands = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    return commandGroups.flatMap((group) =>
      group.items
        .filter((item) =>
          !normalized ||
          item.label.toLowerCase().includes(normalized) ||
          item.hint.toLowerCase().includes(normalized),
        )
        .map((item) => ({ ...item, group: group.label })),
    )
  }, [query])

  function runCommand(command) {
    if (command.action === 'theme') {
      toggleTheme()
    } else if (command.action === 'logout') {
      logout()
    } else if (command.to) {
      navigate(command.to)
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 p-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Command className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Command Palette</DialogTitle>
              <DialogDescription>
                Search pages, switch themes, or jump straight to an action.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="border-b border-border/60 p-4">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-white/70 px-4 py-3 dark:bg-slate-950/60">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search anything..."
              className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
            />
            <Button type="button" variant="ghost" size="sm" onClick={() => setQuery('')}>
              Clear
            </Button>
          </div>
        </div>

        <ScrollArea className="max-h-[420px]">
          <ScrollAreaViewport className="p-3">
            <div className="space-y-4">
              {commands.length ? (
                commands.map((command) => (
                  <button
                    key={`${command.group}-${command.label}`}
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between rounded-2xl border border-transparent px-4 py-3 text-left transition hover:border-primary/30 hover:bg-primary/5',
                    )}
                    onClick={() => runCommand(command)}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{command.label}</p>
                        {command.to ? <ArrowRight className="h-4 w-4 text-muted-foreground" /> : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{command.hint}</p>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                      {command.group}
                    </span>
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center gap-3 px-4 py-12 text-center text-sm text-muted-foreground">
                  <Sparkles className="h-6 w-6 text-primary" />
                  No commands match your search.
                </div>
              )}
            </div>
          </ScrollAreaViewport>
        </ScrollArea>

        <div className="flex items-center justify-between gap-3 border-t border-border/60 p-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <SunMoon className="h-4 w-4" /> Premium workspace shortcuts
          </span>
          <span>Ctrl+K</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
