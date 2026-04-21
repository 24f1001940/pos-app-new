import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/currency'

export function TopProductsList({ products = [], pagination = null, onPrevious, onNext }) {
  const currentPage = Number(pagination?.page || 1)
  const totalPages = Number(pagination?.totalPages || 1)
  const hasPrevious = currentPage > 1
  const hasNext = currentPage < totalPages

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top Selling Products</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {products.length ? (
          products.map((product) => (
            <div
              key={product.name}
              className="flex items-center justify-between rounded-2xl bg-white/60 p-4 dark:bg-slate-900/50"
            >
              <div>
                <p className="font-semibold">{product.name}</p>
                <p className="text-sm text-muted-foreground">
                  {product.quantity} units sold
                </p>
              </div>
              <p className="font-semibold">{formatCurrency(product.revenue)}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No sales recorded yet.</p>
        )}

        {pagination ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3">
            <p className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" disabled={!hasPrevious} onClick={onPrevious}>
                Previous
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={!hasNext} onClick={onNext}>
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
