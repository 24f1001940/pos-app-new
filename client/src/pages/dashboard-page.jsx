import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Boxes,
  IndianRupee,
  LayoutGrid,
  Maximize,
  Minimize,
  Move,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { CategoryChart } from '@/components/dashboard/category-chart'
import { CustomerSegmentChart } from '@/components/dashboard/customer-segment-chart'
import { LowStockPanel } from '@/components/dashboard/low-stock-panel'
import { SalesOverviewChart } from '@/components/dashboard/sales-overview-chart'
import { SummaryCard } from '@/components/dashboard/summary-card'
import { TopCustomersList } from '@/components/dashboard/top-customers-list'
import { TopProductsList } from '@/components/dashboard/top-products-list'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api, cachedGet } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { captureUiException, startUiSpan } from '@/lib/sentry'
import { cacheKeys } from '@/lib/storage'
import { cn } from '@/lib/utils'

const defaultWidgetOrder = [
  'trend',
  'category',
  'topProducts',
  'lowStock',
  'profit',
  'customerSegments',
  'actions',
]

export default function DashboardPage() {
  const MotionDiv = motion.div
  const [period, setPeriod] = useState('monthly')
  const [categoryPage, setCategoryPage] = useState(1)
  const [bestSellingPage, setBestSellingPage] = useState(1)
  const [topCustomersPage, setTopCustomersPage] = useState(1)
  const [widgetOrder, setWidgetOrder] = useState(defaultWidgetOrder)
  const [draggingWidget, setDraggingWidget] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const dashboardRef = useRef(null)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () =>
      startUiSpan('dashboard.fetch', () =>
        cachedGet('/dashboard', { cacheKey: cacheKeys.dashboard }),
      ),
    onError: (error) => captureUiException(error),
  })

  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['analytics-overview', categoryPage, bestSellingPage, topCustomersPage],
    queryFn: () =>
      startUiSpan('analytics.overview.fetch', () =>
        cachedGet('/analytics/overview', {
          cacheKey: `analytics-overview-${categoryPage}-${bestSellingPage}-${topCustomersPage}`,
          params: {
            categoryPage,
            categoryLimit: 6,
            bestSellingPage,
            bestSellingLimit: 5,
            topCustomersPage,
            topCustomersLimit: 5,
            worstPerformingLimit: 10,
          },
        }),
      ),
    onError: (error) => captureUiException(error),
  })

  async function handleExport(reportType) {
    try {
      const response = await api.get('/analytics/export', {
        params: { report: reportType },
        responseType: 'blob',
      })

      const blobUrl = window.URL.createObjectURL(response.data)
      const anchor = document.createElement('a')
      const disposition = response.headers['content-disposition'] || ''
      const fileName =
        disposition.split('filename=')[1]?.replaceAll('"', '') ||
        `${reportType}-report.csv`

      anchor.href = blobUrl
      anchor.download = fileName
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(blobUrl)
      toast.success('Report export started')
    } catch {
      toast.error('Unable to export report right now')
    }
  }

  if (isLoading && loadingAnalytics) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
        <Skeleton className="h-[22rem] w-full" />
        <div className="grid gap-6 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-[18rem] w-full" />
          ))}
        </div>
      </div>
    )
  }

  const resolvedDashboard = data || {
    summary: {
      totalProducts: 0,
      todaysSales: 0,
      todaysOrders: 0,
      totalRevenue: 0,
      totalProfit: 0,
      totalSalesCount: 0,
      lowStockCount: 0,
    },
    lowStockItems: [],
    charts: {
      categoryDistribution: [],
      topSellingProducts: [],
    },
    reports: {
      profitAnalysis: {
        revenue: 0,
        costs: 0,
        profit: 0,
      },
    },
  }

  const resolvedAnalytics = analytics || {
    profitAndLoss: {
      revenue: resolvedDashboard?.reports?.profitAnalysis?.revenue || 0,
      costs: resolvedDashboard?.reports?.profitAnalysis?.costs || 0,
      profit: resolvedDashboard?.reports?.profitAnalysis?.profit || 0,
    },
    revenueGrowth: { percentage: 0 },
    revenueByPeriod: { monthly: [], weekly: [], daily: [], yearly: [] },
    customerAnalytics: { totalCustomers: 0, activeCustomers: 0, segments: [], topCustomers: [] },
    categoryRevenue: [],
    bestSelling: resolvedDashboard?.charts?.topSellingProducts || [],
    inventoryTurnover: { turnoverRatio: 0 },
  }
  const categoryPagination = analytics?.pagination?.categoryRevenue || null
  const bestSellingPagination = analytics?.pagination?.bestSelling || null
  const topCustomersPagination = analytics?.pagination?.topCustomers || null

  const categoryChartData =
    resolvedDashboard?.charts?.categoryDistribution?.length > 0
      ? resolvedDashboard.charts.categoryDistribution.map((entry) => ({
          name: entry.name,
          value: Number(entry.value || 0),
        }))
      : (resolvedAnalytics.categoryRevenue || []).map((entry) => ({
          name: entry.name,
          value: Number(entry.quantity || 0),
        }))

  const periodSeries = resolvedAnalytics.revenueByPeriod[period] || []
  const latest = Number(periodSeries.at(-1)?.revenue || 0)
  const previous = Number(periodSeries.at(-2)?.revenue || 0)
  const delta = previous ? ((latest - previous) / previous) * 100 : 0

  function moveWidget(fromId, toId) {
    if (!fromId || !toId || fromId === toId) {
      return
    }

    setWidgetOrder((currentOrder) => {
      const fromIndex = currentOrder.indexOf(fromId)
      const toIndex = currentOrder.indexOf(toId)

      if (fromIndex < 0 || toIndex < 0) {
        return currentOrder
      }

      const nextOrder = [...currentOrder]
      const [movedWidget] = nextOrder.splice(fromIndex, 1)
      nextOrder.splice(toIndex, 0, movedWidget)
      return nextOrder
    })
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement && dashboardRef.current) {
      await dashboardRef.current.requestFullscreen()
      setIsFullscreen(true)
      return
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  function renderWidget(widgetId) {
    if (widgetId === 'trend') {
      return (
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Revenue Trend Explorer</CardTitle>
            <Tabs value={period} onValueChange={setPeriod}>
              <TabsList>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <SalesOverviewChart
              data={resolvedAnalytics.revenueByPeriod[period]}
              valueKey="revenue"
            />
          </CardContent>
        </Card>
      )
    }

    if (widgetId === 'category') {
      return (
        <CategoryChart
          data={categoryChartData}
          loading={isLoading || loadingAnalytics}
          pagination={categoryPagination}
          onPrevious={() => setCategoryPage((current) => Math.max(1, current - 1))}
          onNext={() => setCategoryPage((current) => current + 1)}
        />
      )
    }

    if (widgetId === 'topProducts') {
      return (
        <TopProductsList
          products={resolvedAnalytics.bestSelling}
          pagination={bestSellingPagination}
          onPrevious={() => setBestSellingPage((current) => Math.max(1, current - 1))}
          onNext={() => setBestSellingPage((current) => current + 1)}
        />
      )
    }

    if (widgetId === 'lowStock') {
      return <LowStockPanel items={resolvedDashboard.lowStockItems} />
    }

    if (widgetId === 'profit') {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Profit Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-white/60 p-4 dark:bg-slate-900/50">
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="mt-1 text-2xl font-bold">
                {formatCurrency(resolvedAnalytics.profitAndLoss.revenue)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/60 p-4 dark:bg-slate-900/50">
              <p className="text-sm text-muted-foreground">Estimated Costs</p>
              <p className="mt-1 text-2xl font-bold">
                {formatCurrency(resolvedAnalytics.profitAndLoss.costs)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/60 p-4 dark:bg-slate-900/50">
              <p className="text-sm text-muted-foreground">Gross Profit</p>
              <p className="mt-1 text-2xl font-bold">
                {formatCurrency(resolvedAnalytics.profitAndLoss.profit)}
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (widgetId === 'customerSegments') {
      return (
        <CustomerSegmentChart
          data={resolvedAnalytics.customerAnalytics.segments}
          topCustomers={resolvedAnalytics.customerAnalytics.topCustomers}
          pagination={topCustomersPagination}
          onPrevious={() => setTopCustomersPage((current) => Math.max(1, current - 1))}
          onNext={() => setTopCustomersPage((current) => current + 1)}
        />
      )
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl bg-white/60 p-4 text-sm dark:bg-slate-900/50">
            <p className="text-muted-foreground">Inventory Turnover Ratio</p>
            <p className="mt-1 text-2xl font-bold">
              {resolvedAnalytics.inventoryTurnover.turnoverRatio}
            </p>
          </div>
          <div className="rounded-2xl bg-white/60 p-4 text-sm dark:bg-slate-900/50">
            <p className="text-muted-foreground">Week-over-week change</p>
            <p
              className={cn(
                'mt-1 flex items-center gap-2 text-2xl font-bold',
                delta >= 0
                  ? 'text-emerald-600 dark:text-emerald-300'
                  : 'text-rose-600 dark:text-rose-300',
              )}
            >
              {delta >= 0 ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
              {delta.toFixed(1)}%
            </p>
          </div>
          <div className="grid gap-3">
            <Button type="button" onClick={() => handleExport('sales')}>
              Export Sales CSV
            </Button>
            <Button type="button" variant="outline" onClick={() => handleExport('summary')}>
              Export Summary CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div ref={dashboardRef} className="space-y-6">
      {resolvedDashboard?._cached ? (
        <Badge variant="warning">Showing cached dashboard data</Badge>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LayoutGrid className="h-4 w-4" />
            Drag cards to customize dashboard widget order.
          </div>
          <Button type="button" variant="outline" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </Button>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Total Products',
            value: resolvedDashboard.summary.totalProducts,
            helper: 'Active inventory items',
            icon: Boxes,
            tone: 'orange',
          },
          {
            label: 'Net Profit',
            value: formatCurrency(resolvedAnalytics.profitAndLoss.profit),
            helper: `${resolvedAnalytics.revenueGrowth.percentage}% monthly growth`,
            icon: TrendingUp,
            tone: 'cyan',
          },
          {
            label: 'Total Revenue',
            value: formatCurrency(resolvedDashboard.summary.totalRevenue),
            helper: `Profit ${formatCurrency(resolvedDashboard.summary.totalProfit)}`,
            icon: IndianRupee,
            tone: 'emerald',
          },
          {
            label: 'Total Customers',
            value: resolvedAnalytics.customerAnalytics.totalCustomers,
            helper: `${resolvedAnalytics.customerAnalytics.activeCustomers} active buyers`,
            icon: Users,
            tone: 'rose',
          },
        ].map((item, index) => (
          <MotionDiv
            key={item.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <SummaryCard {...item} />
          </MotionDiv>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        {widgetOrder.map((widgetId) => (
          <MotionDiv
            key={widgetId}
            draggable
            onDragStart={() => setDraggingWidget(widgetId)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              moveWidget(draggingWidget, widgetId)
              setDraggingWidget(null)
            }}
            whileHover={{ y: -2 }}
            className={cn(
              'relative min-w-0 rounded-[1.75rem] border border-transparent transition',
              draggingWidget === widgetId && 'opacity-50',
              widgetId === 'trend' && 'xl:col-span-2',
            )}
          >
            <div className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full border border-border bg-background/80 px-2 py-1 text-[11px] font-semibold text-muted-foreground">
              <Move className="h-3 w-3" />
              Widget
            </div>
            {renderWidget(widgetId)}
          </MotionDiv>
        ))}
      </section>
    </div>
  )
}
