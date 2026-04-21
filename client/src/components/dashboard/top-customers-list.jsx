import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/currency'

export function TopCustomersList({ customers = [], pagination = null, onPrevious, onNext }) {
  const currentPage = Number(pagination?.page || 1)
  const totalPages = Number(pagination?.totalPages || 1)
  const hasPrevious = currentPage > 1
  const hasNext = currentPage < totalPages

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top Customers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {customers.length ? (
          customers.map((customer, index) => (
            <div
              key={customer.id || customer._id || `${customer.name}-${index}`}
              className="flex items-center justify-between rounded-2xl bg-white/60 p-4 dark:bg-slate-900/50"
            >
              <div>
                <p className="font-semibold">{customer.name}</p>
                <p className="text-sm text-muted-foreground">
                  {customer.totalPurchases || 0} purchases
                </p>
              </div>
              <p className="font-semibold">{formatCurrency(customer.totalSpent)}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No customer spending recorded yet.</p>
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
