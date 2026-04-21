export function Loader({ label = 'Loading...' }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-[2rem] border border-white/30 bg-white/40 p-6 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary shadow-[0_0_40px_hsl(var(--primary)/0.25)]" />
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <div className="h-2 w-40 rounded-full bg-muted/70">
            <div className="h-full rounded-full bg-primary/80 skeleton-shimmer" />
          </div>
        </div>
      </div>
    </div>
  )
}
