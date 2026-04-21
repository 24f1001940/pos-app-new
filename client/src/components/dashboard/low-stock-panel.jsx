import { AlertTriangle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function LowStockPanel({ items = [] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Low Stock Alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <div
              key={item.id || item._id}
              className="flex items-center justify-between rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-rose-500/15 p-2 text-rose-600 dark:text-rose-300">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.category}</p>
                </div>
              </div>
              <Badge variant="danger">
                {item.stock} / {item.lowStockLimit}
              </Badge>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Inventory levels look healthy right now.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
