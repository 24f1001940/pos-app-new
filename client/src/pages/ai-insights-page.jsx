import { useQuery } from '@tanstack/react-query'
import { ChartSpline, Download, HandCoins, TrendingDown, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader } from '@/components/ui/loader'
import { cachedGet } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { downloadFinancePack } from '@/lib/export'
import { cacheKeys } from '@/lib/storage'
import { formatDateTime } from '@/lib/utils'

export default function AiInsightsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: () => cachedGet('/ai/insights', { cacheKey: cacheKeys.aiInsights }),
  })

  const { data: financeSummary } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: async () => {
      try {
        return await cachedGet('/finance/summary')
      } catch {
        return null
      }
    },
  })

  const { data: salesData } = useQuery({
    queryKey: ['sales-analytics-snapshot'],
    queryFn: async () => {
      try {
        return await cachedGet('/sales')
      } catch {
        return { sales: [] }
      }
    },
  })

  const { data: expensesData } = useQuery({
    queryKey: ['expenses-analytics-snapshot'],
    queryFn: async () => {
      try {
        return await cachedGet('/finance/expenses')
      } catch {
        return { expenses: [] }
      }
    },
  })

  const { data: poData } = useQuery({
    queryKey: ['po-analytics-snapshot'],
    queryFn: async () => {
      try {
        return await cachedGet('/finance/purchase-orders')
      } catch {
        return { orders: [] }
      }
    },
  })

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-analytics-snapshot'],
    queryFn: async () => {
      try {
        return await cachedGet('/finance/suppliers')
      } catch {
        return { suppliers: [] }
      }
    },
  })

  const financePulse = {
    revenue: Number(financeSummary?.totals?.revenue || 0),
    expenses: Number(financeSummary?.totals?.expenses || 0),
    profit: Number(financeSummary?.totals?.profit || 0),
    payable: Number(financeSummary?.totals?.supplierPayable || 0),
  }

  const netBurn = financePulse.expenses + financePulse.payable
  const healthRatio = netBurn ? ((financePulse.revenue / netBurn) * 100).toFixed(1) : '0.0'

  const recentSales = (salesData?.sales || []).slice(0, 10)
  const recentExpenses = (expensesData?.expenses || []).slice(0, 10)
  const recentOrders = (poData?.orders || []).slice(0, 10)

  async function handleDownloadFinancePack() {
    try {
      await downloadFinancePack({
        fileName: `finance-pack-${Date.now()}.zip`,
        suppliers: suppliersData?.suppliers || [],
        expenses: expensesData?.expenses || [],
        purchaseOrders: poData?.orders || [],
        generatedAt: new Date().toLocaleString('en-IN'),
        metrics: financePulse,
      })
      toast.success('Finance pack downloaded')
    } catch {
      toast.error('Unable to generate finance pack right now')
    }
  }

  if (isLoading) {
    return <Loader label="Loading AI insights" />
  }

  return (
    <div className="space-y-6">
      {data?._cached ? <Badge variant="warning">Showing cached AI insights</Badge> : null}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Next day forecast</p>
            <p className="mt-2 text-2xl font-bold">
              {formatCurrency(data?.demandForecast?.nextDayEstimate || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Weekly trend delta</p>
            <p className="mt-2 text-2xl font-bold">
              {formatCurrency(data?.demandForecast?.weeklyTrend || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Fraud signals</p>
            <p className="mt-2 text-2xl font-bold">{data?.fraudSignals?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Low stock hotspots</p>
            <p className="mt-2 text-2xl font-bold">{data?.lowStockHotspots?.length || 0}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Smart recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.recommendations || []).map((item) => (
              <div key={`${item.productId}-${item.name}`} className="rounded-xl border border-border p-3">
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.quantity} units sold</p>
                <p className="text-sm font-medium">{formatCurrency(item.revenue)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fraud detection signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.fraudSignals || []).length ? (
              data.fraudSignals.map((signal) => (
                <div key={signal.id} className="rounded-xl border border-rose-400/30 bg-rose-50/50 p-3 dark:bg-rose-950/20">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{signal.invoiceNumber}</p>
                    <Badge variant="danger">Review</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDateTime(signal.date)}</p>
                  <p className="mt-1 text-sm">{signal.reason}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No suspicious sales detected.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Finance intelligence</h2>
          <div className="flex items-center gap-2">
            <Badge variant="default">Health score {healthRatio}%</Badge>
            <Button type="button" variant="outline" onClick={handleDownloadFinancePack}>
              <Download className="h-4 w-4" />
              Finance pack
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Revenue
              </p>
              <p className="mt-2 text-2xl font-bold">{formatCurrency(financePulse.revenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingDown className="h-4 w-4" />
                Expenses
              </p>
              <p className="mt-2 text-2xl font-bold">{formatCurrency(financePulse.expenses)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <ChartSpline className="h-4 w-4" />
                Net profit
              </p>
              <p className="mt-2 text-2xl font-bold">{formatCurrency(financePulse.profit)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <HandCoins className="h-4 w-4" />
                Supplier payable
              </p>
              <p className="mt-2 text-2xl font-bold">{formatCurrency(financePulse.payable)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Latest sales pulse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
                  <span>{sale.invoiceNumber}</span>
                  <span className="font-semibold">{formatCurrency(sale.total || 0)}</span>
                </div>
              ))}
              {!recentSales.length ? <p className="text-sm text-muted-foreground">No sales data</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Latest expenses pulse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
                  <span>{expense.title}</span>
                  <span className="font-semibold">{formatCurrency(expense.amount || 0)}</span>
                </div>
              ))}
              {!recentExpenses.length ? <p className="text-sm text-muted-foreground">No expense data</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Open purchase orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
                  <span>{order.poNumber}</span>
                  <span className="font-semibold">{formatCurrency(order.amountDue || 0)}</span>
                </div>
              ))}
              {!recentOrders.length ? <p className="text-sm text-muted-foreground">No purchase order data</p> : null}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
