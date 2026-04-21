import { useEffect, useState } from 'react'
import { Command, Sparkles } from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { CommandPalette } from '@/components/ui/command-palette'
import { Navbar } from '@/components/layout/navbar'
import { PageTransition } from '@/components/layout/page-transition'
import { Sidebar } from '@/components/layout/sidebar'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

export function AppShell() {
  const { user } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(event) {
      const isCommandShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'

      if (isCommandShortcut) {
        event.preventDefault()
        setCommandPaletteOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden lg:grid lg:grid-cols-[auto_1fr]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.08),transparent_20%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.08),transparent_24%)]" />
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
      />
      <div className="relative min-w-0">
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebarCollapse={() => setSidebarCollapsed((current) => !current)}
        />
        <main className="space-y-6 p-4 pb-24 lg:p-8">
          <PageTransition routeKey={location.pathname}>
            <Outlet />
          </PageTransition>
        </main>

        <div className="fixed bottom-4 right-4 z-30 lg:hidden">
          <Button
            type="button"
            className="h-14 w-14 rounded-full shadow-2xl"
            onClick={() => setCommandPaletteOpen(true)}
          >
            <Command className="h-5 w-5" />
          </Button>
        </div>

        <div className={cn('pointer-events-none fixed bottom-5 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-white/40 bg-white/80 px-4 py-2 text-xs font-semibold text-muted-foreground shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70 lg:flex')}>
          <Sparkles className="h-4 w-4 text-primary" />
          Command palette ready. Press Ctrl+K.
        </div>
      </div>

      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
    </div>
  )
}
