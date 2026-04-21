import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, FileDown, HandCoins, PackageCheck, Search } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader } from '@/components/ui/loader'
import { api, cachedGet } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { downloadCsv, openPrintReport } from '@/lib/export'
import { cacheKeys } from '@/lib/storage'
import { formatDateTime, getErrorMessage } from '@/lib/utils'

function createLine() {
  return { productId: '', quantity: '1', unitCost: '' }
}

export default function ProcurementPage() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [reconciliationFilters, setReconciliationFilters] = useState({
    supplierId: '',
    lookbackDays: 'all',
  })
  const [form, setForm] = useState({
    supplierId: '',
    warehouseId: '',
    taxRate: '0',
    amountPaid: '0',
    expectedDate: '',
    notes: '',
  })
  const [lines, setLines] = useState([createLine()])

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['purchase-orders', status],
    queryFn: () =>
      cachedGet('/finance/purchase-orders', {
        params: { status: status === 'all' ? undefined : status },
        cacheKey: cacheKeys.purchaseOrders,
      }),
  })

  const { data: supplierData } = useQuery({
    queryKey: ['suppliers-options'],
    queryFn: () => cachedGet('/finance/suppliers', { cacheKey: cacheKeys.suppliers }),
  })

  const { data: warehouseData } = useQuery({
    queryKey: ['warehouses-options'],
    queryFn: () => cachedGet('/inventory/warehouses'),
  })

  const { data: productData } = useQuery({
    queryKey: ['products-options'],
    queryFn: () => cachedGet('/products', { cacheKey: cacheKeys.products }),
  })

  const { data: payablesAgingData } = useQuery({
    queryKey: ['payables-aging', reconciliationFilters],
    queryFn: () =>
      cachedGet('/finance/payables-aging', {
        params: {
          supplierId: reconciliationFilters.supplierId || undefined,
          lookbackDays:
            reconciliationFilters.lookbackDays === 'all'
              ? undefined
              : Number(reconciliationFilters.lookbackDays || 0),
        },
      }),
  })

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/finance/purchase-orders', payload),
    onSuccess: () => {
      toast.success('Purchase order created')
      setForm({
        supplierId: '',
        warehouseId: '',
        taxRate: '0',
        amountPaid: '0',
        expectedDate: '',
        notes: '',
      })
      setLines([createLine()])
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const statusMutation = useMutation({
    mutationFn: ({ orderId, nextStatus }) =>
      api.patch(`/finance/purchase-orders/${orderId}/status`, { status: nextStatus }),
    onSuccess: () => {
      toast.success('Purchase order status updated')
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const suppliers = supplierData?.suppliers || []
  const warehouses = warehouseData?.warehouses || []
  const products = productData?.products || []
  const orders = useMemo(() => ordersData?.orders || [], [ordersData?.orders])

  const visibleOrders = useMemo(() => {
    return orders.filter((order) => {
      const haystack = `${order.poNumber} ${order.supplier?.name || ''}`.toLowerCase()
      return haystack.includes(search.toLowerCase())
    })
  }, [orders, search])

  const orderKpi = useMemo(() => {
    return visibleOrders.reduce(
      (summary, order) => {
        summary.count += 1
        summary.total += Number(order.total || 0)
        summary.paid += Number(order.amountPaid || 0)
        summary.due += Number(order.amountDue || 0)
        return summary
      },
      { count: 0, total: 0, paid: 0, due: 0 },
    )
  }, [visibleOrders])

  const reconciliation = payablesAgingData || {
    buckets: {
      notDue: { count: 0, amount: 0 },
      days1To15: { count: 0, amount: 0 },
      days16To30: { count: 0, amount: 0 },
      days31Plus: { count: 0, amount: 0 },
    },
    overdueOrders: [],
    totalDue: 0,
    orderCount: 0,
  }

  const estimatedTotal = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => {
      const quantity = Number(line.quantity || 0)
      const unitCost = Number(line.unitCost || 0)
      return sum + quantity * unitCost
    }, 0)

    const taxRate = Number(form.taxRate || 0)
    return subtotal + (subtotal * taxRate) / 100
  }, [form.taxRate, lines])

  function submitPurchaseOrder(event) {
    event.preventDefault()

    createMutation.mutate({
      supplierId: form.supplierId,
      warehouseId: form.warehouseId,
      items: lines
        .filter((line) => line.productId)
        .map((line) => ({
          productId: line.productId,
          quantity: Number(line.quantity || 0),
          unitCost: Number(line.unitCost || 0),
        })),
      taxRate: Number(form.taxRate || 0),
      amountPaid: Number(form.amountPaid || 0),
      expectedDate: form.expectedDate || undefined,
      notes: form.notes,
      status: 'ordered',
    })
  }

  function exportOrdersCsv() {
    downloadCsv(
      `purchase-orders-${Date.now()}.csv`,
      [
        { label: 'PO Number', value: (order) => order.poNumber },
        { label: 'Supplier', value: (order) => order.supplier?.name || 'Unknown supplier' },
        { label: 'Status', value: (order) => order.status },
        { label: 'Ordered At', value: (order) => formatDateTime(order.orderedAt) },
        { label: 'Total', value: (order) => Number(order.total || 0).toFixed(2) },
        { label: 'Amount Paid', value: (order) => Number(order.amountPaid || 0).toFixed(2) },
        { label: 'Amount Due', value: (order) => Number(order.amountDue || 0).toFixed(2) },
      ],
      visibleOrders,
    )
    toast.success('Purchase order CSV exported')
  }

  function printOrdersReport() {
    openPrintReport({
      title: 'Purchase Orders Report',
      subtitle: `Generated on ${formatDateTime(new Date())}`,
      columns: [
        { label: 'PO Number', value: (order) => order.poNumber },
        { label: 'Supplier', value: (order) => order.supplier?.name || 'Unknown supplier' },
        { label: 'Status', value: (order) => order.status },
        { label: 'Total', value: (order) => formatCurrency(order.total || 0) },
        { label: 'Due', value: (order) => formatCurrency(order.amountDue || 0) },
      ],
      rows: visibleOrders,
    })
  }

  if (isLoading) {
    return <Loader label="Loading procurement data" />
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-4">
        <Card>
          <CardContent className="grid gap-3 p-5 md:grid-cols-4">
            <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <ClipboardList className="h-3.5 w-3.5" />
                POs
              </p>
              <p className="mt-2 text-2xl font-semibold">{orderKpi.count}</p>
            </div>
            <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <PackageCheck className="h-3.5 w-3.5" />
                Ordered value
              </p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(orderKpi.total)}</p>
            </div>
            <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <HandCoins className="h-3.5 w-3.5" />
                Paid
              </p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(orderKpi.paid)}</p>
            </div>
            <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <HandCoins className="h-3.5 w-3.5" />
                Due
              </p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(orderKpi.due)}</p>
            </div>
          </CardContent>
        </Card>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Search PO number or supplier"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={exportOrdersCsv}>
            <FileDown className="h-4 w-4" />
            Export CSV
          </Button>
          <Button type="button" variant="outline" onClick={printOrdersReport}>
            Print / Save PDF
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {['all', 'draft', 'ordered', 'received', 'cancelled'].map((value) => (
            <Button
              key={value}
              type="button"
              variant={status === value ? 'default' : 'outline'}
              onClick={() => setStatus(value)}
            >
              {value}
            </Button>
          ))}
        </div>
        {visibleOrders.map((order) => (
          <Card key={order.id}>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold">{order.poNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.supplier?.name || 'Unknown supplier'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ordered {formatDateTime(order.orderedAt)}
                  </p>
                </div>
                <Badge
                  variant={
                    order.status === 'received'
                      ? 'success'
                      : order.status === 'cancelled'
                        ? 'danger'
                        : 'warning'
                  }
                >
                  {order.status}
                </Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="mt-1 font-semibold">{formatCurrency(order.total || 0)}</p>
                </div>
                <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
                  <p className="text-sm text-muted-foreground">Paid</p>
                  <p className="mt-1 font-semibold">{formatCurrency(order.amountPaid || 0)}</p>
                </div>
                <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
                  <p className="text-sm text-muted-foreground">Due</p>
                  <p className="mt-1 font-semibold">{formatCurrency(order.amountDue || 0)}</p>
                </div>
              </div>
              {order.status === 'ordered' ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => statusMutation.mutate({ orderId: order.id, nextStatus: 'received' })}
                  >
                    Mark received
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => statusMutation.mutate({ orderId: order.id, nextStatus: 'cancelled' })}
                  >
                    Cancel
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {!visibleOrders.length ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No purchase orders match the current filters.
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="space-y-4">
      <Card className="h-fit">
        <CardContent className="p-5">
          <h2 className="text-lg font-semibold">Create purchase order</h2>
          <form className="mt-4 space-y-3" onSubmit={submitPurchaseOrder}>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.supplierId}
              onChange={(event) =>
                setForm((current) => ({ ...current, supplierId: event.target.value }))
              }
              required
            >
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.warehouseId}
              onChange={(event) =>
                setForm((current) => ({ ...current, warehouseId: event.target.value }))
              }
              required
            >
              <option value="">Select warehouse</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>

            {lines.map((line, index) => (
              <div key={`${line.productId}-${index}`} className="grid gap-2 md:grid-cols-4">
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={line.productId}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, productId: event.target.value } : entry,
                      ),
                    )
                  }
                  required
                >
                  <option value="">Product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={line.quantity}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, quantity: event.target.value } : entry,
                      ),
                    )
                  }
                  required
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Unit cost"
                  value={line.unitCost}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, unitCost: event.target.value } : entry,
                      ),
                    )
                  }
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setLines((current) =>
                      current.length === 1
                        ? [createLine()]
                        : current.filter((_, entryIndex) => entryIndex !== index),
                    )
                  }
                >
                  Remove
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() => setLines((current) => [...current, createLine()])}
            >
              Add line
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Tax rate %"
                value={form.taxRate}
                onChange={(event) => setForm((current) => ({ ...current, taxRate: event.target.value }))}
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount paid"
                value={form.amountPaid}
                onChange={(event) =>
                  setForm((current) => ({ ...current, amountPaid: event.target.value }))
                }
              />
            </div>
            <Input
              type="date"
              value={form.expectedDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, expectedDate: event.target.value }))
              }
            />
            <Input
              placeholder="Notes"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />
            <div className="rounded-2xl bg-white/60 p-3 text-sm dark:bg-slate-900/50">
              <p className="text-muted-foreground">Estimated total</p>
              <p className="mt-1 text-xl font-semibold">{formatCurrency(estimatedTotal)}</p>
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              Create purchase order
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h3 className="text-lg font-semibold">Payables reconciliation</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={reconciliationFilters.supplierId}
              onChange={(event) =>
                setReconciliationFilters((current) => ({
                  ...current,
                  supplierId: event.target.value,
                }))
              }
            >
              <option value="">All suppliers</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={reconciliationFilters.lookbackDays}
              onChange={(event) =>
                setReconciliationFilters((current) => ({
                  ...current,
                  lookbackDays: event.target.value,
                }))
              }
            >
              <option value="all">All time</option>
              <option value="30">Last 30 days</option>
              <option value="60">Last 60 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-white/60 p-3 text-sm dark:bg-slate-900/50">
              <p className="text-muted-foreground">Not due</p>
              <p className="mt-1 text-xl font-semibold">{reconciliation.buckets.notDue.count}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(reconciliation.buckets.notDue.amount)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/60 p-3 text-sm dark:bg-slate-900/50">
              <p className="text-muted-foreground">1-15 days overdue</p>
              <p className="mt-1 text-xl font-semibold">{reconciliation.buckets.days1To15.count}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(reconciliation.buckets.days1To15.amount)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/60 p-3 text-sm dark:bg-slate-900/50">
              <p className="text-muted-foreground">16-30 days overdue</p>
              <p className="mt-1 text-xl font-semibold">{reconciliation.buckets.days16To30.count}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(reconciliation.buckets.days16To30.amount)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/60 p-3 text-sm dark:bg-slate-900/50">
              <p className="text-muted-foreground">31+ days overdue</p>
              <p className="mt-1 text-xl font-semibold">{reconciliation.buckets.days31Plus.count}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(reconciliation.buckets.days31Plus.amount)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white/60 p-3 text-sm dark:bg-slate-900/50">
            <p className="text-muted-foreground">Total open payable</p>
            <p className="mt-1 text-xl font-semibold">{formatCurrency(reconciliation.totalDue || 0)}</p>
            <p className="text-xs text-muted-foreground">
              Across {reconciliation.orderCount || 0} order(s)
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Top overdue purchase orders</p>
            {reconciliation.overdueOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="rounded-xl border border-border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{order.poNumber}</p>
                  <Badge variant="danger">{order.daysLate} day(s)</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{order.supplier?.name || 'Unknown supplier'}</p>
                <p className="mt-1 font-medium">Due {formatCurrency(order.amountDue || 0)}</p>
              </div>
            ))}
            {!reconciliation.overdueOrders.length ? (
              <p className="text-sm text-muted-foreground">No overdue payables in current view.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
