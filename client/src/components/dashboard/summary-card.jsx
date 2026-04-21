import { Card, CardContent } from '@/components/ui/card'
import { formatCompactNumber } from '@/lib/utils'

export function SummaryCard({ label, value, helper, icon, tone = 'orange' }) {
  const Icon = icon
  const toneClasses = {
    orange: 'from-orange-500/25 to-orange-500/5 text-orange-600 dark:text-orange-300',
    cyan: 'from-cyan-500/25 to-cyan-500/5 text-cyan-700 dark:text-cyan-300',
    emerald: 'from-emerald-500/25 to-emerald-500/5 text-emerald-700 dark:text-emerald-300',
    rose: 'from-rose-500/25 to-rose-500/5 text-rose-700 dark:text-rose-300',
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-start justify-between gap-4 p-6">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-bold">{value}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {helper || formatCompactNumber(Number(value) || 0)}
          </p>
        </div>
        <div
          className={`rounded-2xl bg-gradient-to-br p-4 ${toneClasses[tone] || toneClasses.orange}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  )
}
