import { Pencil, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/currency'

export function ProductCard({ product, onEdit, onDelete }) {
  return (
    <Card className="overflow-hidden">
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-orange-100 via-amber-50 to-cyan-100 dark:from-orange-900/30 dark:via-slate-900 dark:to-cyan-900/20">
        {product.image?.url ? (
          <img
            src={product.image.url}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl font-bold text-slate-500/30">
            {product.name.slice(0, 1)}
          </div>
        )}
      </div>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{product.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{product.category}</p>
          </div>
          <Badge variant={product.isLowStock ? 'danger' : 'success'}>
            {product.isLowStock ? 'Low stock' : 'In stock'}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
            <p className="text-muted-foreground">SP</p>
            <p className="mt-1 font-semibold">{formatCurrency(product.sp)}</p>
          </div>
          <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
            <p className="text-muted-foreground">CP</p>
            <p className="mt-1 font-semibold">{formatCurrency(product.cp)}</p>
          </div>
          <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
            <p className="text-muted-foreground">Margin</p>
            <p className="mt-1 font-semibold">{product.profitMargin}%</p>
          </div>
          <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
            <p className="text-muted-foreground">Stock</p>
            <p className="mt-1 font-semibold">
              {product.stock} / {product.lowStockLimit}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button type="button" variant="danger" className="flex-1" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
