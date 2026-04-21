import { Check, MoonStar, Palette, SunMedium, LaptopMinimal } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'

const accentOptions = [
  { key: 'amber', label: 'Amber' },
  { key: 'emerald', label: 'Emerald' },
  { key: 'sky', label: 'Sky' },
  { key: 'rose', label: 'Rose' },
  { key: 'violet', label: 'Violet' },
  { key: 'slate', label: 'Slate' },
]

export function ThemeSwitcher({ compact = false }) {
  const { mode, accent, setTheme, setAccent, resolvedTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size={compact ? 'icon' : 'default'} className={cn(compact && 'rounded-full')}>
          <Palette className="h-4 w-4" />
          {!compact ? 'Theme' : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => setTheme('light')}>
          <SunMedium className="mr-2 h-4 w-4" /> Light
          {mode === 'light' ? <Check className="ml-auto h-4 w-4" /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme('dark')}>
          <MoonStar className="mr-2 h-4 w-4" /> Dark
          {mode === 'dark' ? <Check className="ml-auto h-4 w-4" /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme('system')}>
          <LaptopMinimal className="mr-2 h-4 w-4" /> System
          {mode === 'system' ? <Check className="ml-auto h-4 w-4" /> : null}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Brand Accent</DropdownMenuLabel>
        <div className="grid grid-cols-3 gap-2 px-2 pb-2">
          {accentOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className={cn(
                'rounded-2xl border px-3 py-2 text-left text-xs font-semibold transition hover:-translate-y-0.5',
                accent === option.key
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-background/80 text-muted-foreground',
              )}
              onClick={() => setAccent(option.key)}
            >
              <span className="block h-2 w-8 rounded-full bg-primary" data-accent={option.key} />
              <span className="mt-2 block">{option.label}</span>
            </button>
          ))}
        </div>
        <DropdownMenuSeparator />
        <p className="px-3 pb-1 text-xs text-muted-foreground">
          Active theme: {resolvedTheme} / {accent}
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
