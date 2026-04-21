import { useMemo, useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, CircleDollarSign, ReceiptText, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

import { SalesTable } from '@/components/sales/sales-table'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader } from '@/components/ui/loader'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import { Select } from '@/components/ui/select'
import { api, cachedGet } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { cacheKeys } from '@/lib/storage'
import { getErrorMessage } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'

export default function SalesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
  })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const pageSize = 30
  const sentinelRef = useRef(null)

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['sales', filters],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      cachedGet('/sales', {
        params: {
          ...filters,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          minAmount: filters.minAmount || undefined,
          maxAmount: filters.maxAmount || undefined,
          page: pageParam,
          limit: pageSize,
        },
        cacheKey: pageParam === 1 ? cacheKeys.sales : undefined,
      }),
    getNextPageParam: (lastPage) => {
      const page = Number(lastPage?.pagination?.page || 1)
      const totalPages = Number(lastPage?.pagination?.totalPages || 1)
      return page < totalPages ? page + 1 : undefined
    },
  })

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => cachedGet('/settings', { cacheKey: cacheKeys.settings }),
  })

  const deleteSaleMutation = useMutation({
    mutationFn: (saleId) => api.delete(`/sales/${saleId}`),
    onSuccess: () => {
      toast.success('Sale removed and stock restored')
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const sendSaleEmailMutation = useMutation({
    mutationFn: ({ saleId, email }) => api.post(`/sales/${saleId}/email`, { email }),
    onSuccess: (response) => {
      toast.success(response.data?.message || 'Invoice email sent')
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const sales = useMemo(
    () => (data?.pages || []).flatMap((page) => page.sales || []),
    [data?.pages],
  )
  const totalSales = Number(data?.pages?.[0]?.pagination?.total || sales.length)

  useInfiniteScroll({
    targetRef: sentinelRef,
    enabled: Boolean(hasNextPage) && !isFetchingNextPage,
    onLoadMore: () => {
      if (!hasNextPage || isFetchingNextPage) {
        return
      }

      fetchNextPage()
    },
  })

  const visibleSales = useMemo(() => {
    return sales.filter((sale) => {
      const matchesSearch = `${sale.invoiceNumber} ${sale.customer?.name || sale.customerName || ''}`
        .toLowerCase()
        .includes(search.toLowerCase())
      const matchesStatus =
        statusFilter === 'all' ? true : (sale.status || 'completed') === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [sales, search, statusFilter])

  const salesKpi = useMemo(() => {
    const totalRevenue = visibleSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0)
    const totalProfit = visibleSales.reduce((sum, sale) => sum + Number(sale.profit || 0), 0)
    const dueAmount = visibleSales.reduce((sum, sale) => sum + Number(sale.balanceDue || 0), 0)

    return {
      count: visibleSales.length,
      totalRevenue,
      totalProfit,
      dueAmount,
    }
  }, [visibleSales])

  function formatDateForInput(date) {
    return date.toISOString().split('T')[0]
  }

  function applyQuickRange(range) {
    const now = new Date()
    const endDate = formatDateForInput(now)

    if (range === 'today') {
      setFilters((current) => ({ ...current, startDate: endDate, endDate }))
      return
    }

    if (range === '7d') {
      const start = new Date(now)
      start.setDate(now.getDate() - 6)
      setFilters((current) => ({ ...current, startDate: formatDateForInput(start), endDate }))
      return
    }

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    setFilters((current) => ({ ...current, startDate: formatDateForInput(monthStart), endDate }))
  }

  if (isLoading) {
    return <Loader label="Loading transaction history" />
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-4">
          <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <ReceiptText className="h-3.5 w-3.5" />
              Transactions
            </p>
            <p className="mt-2 text-2xl font-semibold">{salesKpi.count}</p>
          </div>
          <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <CircleDollarSign className="h-3.5 w-3.5" />
              Revenue
            </p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(salesKpi.totalRevenue)}</p>
          </div>
          <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              Profit
            </p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(salesKpi.totalProfit)}</p>
          </div>
          <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Due amount
            </p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(salesKpi.dueAmount)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 rounded-[1.75rem] border border-white/40 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/35 md:grid-cols-5">
        <Input
          type="date"
          value={filters.startDate}
          onChange={(event) =>
            setFilters((current) => ({ ...current, startDate: event.target.value }))
          }
        />
        <Input
          type="date"
          value={filters.endDate}
          onChange={(event) =>
            setFilters((current) => ({ ...current, endDate: event.target.value }))
          }
        />
        <Input
          type="number"
          placeholder="Min amount"
          value={filters.minAmount}
          onChange={(event) =>
            setFilters((current) => ({ ...current, minAmount: event.target.value }))
          }
        />
        <Input
          type="number"
          placeholder="Max amount"
          value={filters.maxAmount}
          onChange={(event) =>
            setFilters((current) => ({ ...current, maxAmount: event.target.value }))
          }
        />
        <Button type="button" variant="outline" onClick={() => setFilters({
          startDate: '',
          endDate: '',
          minAmount: '',
          maxAmount: '',
        })}>
          Reset filters
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => applyQuickRange('today')}>
          Today
        </Button>
        <Button type="button" variant="outline" onClick={() => applyQuickRange('7d')}>
          Last 7 days
        </Button>
        <Button type="button" variant="outline" onClick={() => applyQuickRange('month')}>
          This month
        </Button>
      </div>
      <div className="grid gap-3 rounded-[1.75rem] border border-white/40 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/35 md:grid-cols-[1fr_220px]">
        <Input
          placeholder="Search invoice or customer"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>
      <SalesTable
        sales={visibleSales}
        canDelete={user?.role === 'admin'}
        emailSendingId={sendSaleEmailMutation.variables?.saleId}
        onDownload={(sale) =>
          import('@/lib/receipt').then(({ downloadReceiptPdf }) =>
            downloadReceiptPdf(sale, settingsData),
          )
        }
        onPrint={(sale) =>
          import('@/lib/receipt').then(({ printReceipt }) =>
            printReceipt(sale, settingsData),
          )
        }
        onDelete={(sale) => {
          const confirmed = window.confirm(`Delete ${sale.invoiceNumber}?`)
          if (confirmed) {
            deleteSaleMutation.mutate(sale.id)
          }
        }}
        onSendEmail={(sale) => {
          const email = sale.customerEmail || sale.customer?.email
          if (!email) {
            toast.error('Customer email is missing for this invoice')
            return
          }

          sendSaleEmailMutation.mutate({ saleId: sale.id, email })
        }}
      />

      <div className="flex justify-center">
        <div ref={sentinelRef} className="h-1 w-1" aria-hidden="true" />
        <Button
          type="button"
          variant="outline"
          disabled={!hasNextPage || isFetchingNextPage}
          onClick={() => fetchNextPage()}
        >
          {isFetchingNextPage
            ? 'Loading...'
            : hasNextPage
              ? `Load more (${sales.length}/${totalSales})`
              : 'All sales loaded'}
        </Button>
      </div>
    </div>
  )
}
