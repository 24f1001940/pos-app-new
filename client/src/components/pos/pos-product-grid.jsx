import { Search, Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'

export function POSProductGrid({
  search,
  setSearch,
  products,
  onAdd,
  quickSuggestions = [],
  onQuickPick,
}) {
  const topCategories = Array.from(new Set(products.map((product) => product.category))).slice(0, 6)

  return (
    <div className="space-y-4">
      <div className="rounded-[1.75rem] border border-white/40 bg-white/70 p-4 shadow-lg shadow-slate-950/5 dark:border-white/10 dark:bg-slate-950/35">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Find products by name, SKU, or barcode"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {topCategories.map((category) => (
            <button
              key={category}
              type="button"
              className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/35 hover:text-foreground"
              onClick={() => setSearch(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {quickSuggestions.length ? (
        <div className="rounded-[1.75rem] border border-primary/30 bg-primary/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            Smart suggestions
          </div>
          <div className="flex flex-wrap gap-2">
            {quickSuggestions.map((product) => (
              <button
                key={product.id}
                type="button"
                className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold transition hover:bg-accent"
                onClick={() => (onQuickPick ? onQuickPick(product) : onAdd(product))}
              >
                {product.name} · {formatCurrency(product.sp)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!products.length ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No products match this search.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => {
          const stockProgress = Math.min(100, Math.round((product.stock / Math.max(product.lowStockLimit * 4, 1)) * 100))

          return (
            <Card key={product.id} className="overflow-hidden">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold leading-tight">{product.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{product.category}</p>
                  </div>
                  <Badge variant={product.isLowStock ? 'warning' : 'success'}>
                    {product.stock} left
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Stock health</span>
                    <span>{stockProgress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        product.isLowStock ? 'bg-warning' : 'bg-success',
                      )}
                      style={{ width: `${stockProgress}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
                  <p className="text-sm text-muted-foreground">Selling price</p>
                  <p className="mt-1 text-xl font-bold">{formatCurrency(product.sp)}</p>
                </div>

                <Button
                  type="button"
                  className="h-12 w-full text-base"
                  onClick={() => onAdd(product)}
                  disabled={product.stock <= 0}
                >
                  {product.stock <= 0 ? 'Out of stock' : 'Tap to add'}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
