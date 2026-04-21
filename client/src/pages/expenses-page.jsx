import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarRange, FileDown, HandCoins, ReceiptIndianRupee, Search } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader } from '@/components/ui/loader'
import { Select } from '@/components/ui/select'
import { api, cachedGet } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { downloadCsv, openPrintReport } from '@/lib/export'
import { cacheKeys } from '@/lib/storage'
import { formatDateTime, getErrorMessage } from '@/lib/utils'

const initialForm = {
  title: '',
  category: '',
  amount: '',
  paymentMethod: 'cash',
  paidTo: '',
  notes: '',
  expenseDate: '',
}

export default function ExpensesPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({
    category: '',
    startDate: '',
    endDate: '',
  })
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [form, setForm] = useState(initialForm)

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', filters],
    queryFn: () =>
      cachedGet('/finance/expenses', {
        params: {
          category: filters.category || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
        },
        cacheKey: cacheKeys.expenses,
      }),
  })

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/finance/expenses', payload),
    onSuccess: () => {
      toast.success('Expense recorded')
      setForm(initialForm)
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const expenses = useMemo(() => data?.expenses || [], [data?.expenses])

  const visibleExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesSearch = `${expense.title} ${expense.category} ${expense.paidTo || ''}`
        .toLowerCase()
        .includes(search.toLowerCase())
      const matchesPayment =
        paymentFilter === 'all' ? true : expense.paymentMethod === paymentFilter
      return matchesSearch && matchesPayment
    })
  }, [expenses, paymentFilter, search])

  const expenseKpi = useMemo(() => {
    return visibleExpenses.reduce(
      (summary, expense) => {
        summary.count += 1
        summary.total += Number(expense.amount || 0)
        return summary
      },
      { count: 0, total: 0 },
    )
  }, [visibleExpenses])

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

    const start = new Date(now)
    start.setDate(now.getDate() - 6)
    setFilters((current) => ({ ...current, startDate: formatDateForInput(start), endDate }))
  }

  function onSubmit(event) {
    event.preventDefault()
    createMutation.mutate({
      title: form.title,
      category: form.category,
      amount: Number(form.amount || 0),
      paymentMethod: form.paymentMethod,
      paidTo: form.paidTo,
      notes: form.notes,
      expenseDate: form.expenseDate || undefined,
    })
  }

  function exportExpensesCsv() {
    downloadCsv(
      `expenses-${Date.now()}.csv`,
      [
        { label: 'Title', value: (expense) => expense.title },
        { label: 'Category', value: (expense) => expense.category },
        { label: 'Amount', value: (expense) => Number(expense.amount || 0).toFixed(2) },
        { label: 'Payment Method', value: (expense) => expense.paymentMethod },
        { label: 'Paid To', value: (expense) => expense.paidTo || '' },
        { label: 'Date', value: (expense) => formatDateTime(expense.expenseDate) },
      ],
      visibleExpenses,
    )
    toast.success('Expense CSV exported')
  }

  function printExpensesReport() {
    openPrintReport({
      title: 'Expenses Report',
      subtitle: `Generated on ${new Date().toLocaleString('en-IN')}`,
      columns: [
        { label: 'Title', value: (expense) => expense.title },
        { label: 'Category', value: (expense) => expense.category },
        { label: 'Amount', value: (expense) => formatCurrency(expense.amount || 0) },
        { label: 'Payment', value: (expense) => expense.paymentMethod },
        { label: 'Date', value: (expense) => formatDateTime(expense.expenseDate) },
      ],
      rows: visibleExpenses,
    })
  }

  if (isLoading) {
    return <Loader label="Loading expenses" />
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        <Card>
          <CardContent className="grid gap-3 p-5 md:grid-cols-3">
            <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <ReceiptIndianRupee className="h-3.5 w-3.5" />
                Entries
              </p>
              <p className="mt-2 text-2xl font-semibold">{expenseKpi.count}</p>
            </div>
            <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <HandCoins className="h-3.5 w-3.5" />
                Total spent
              </p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(expenseKpi.total)}</p>
            </div>
            <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <CalendarRange className="h-3.5 w-3.5" />
                Filtered range
              </p>
              <p className="mt-2 text-sm font-semibold">
                {filters.startDate || 'Any'} to {filters.endDate || 'Any'}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 rounded-[1.75rem] border border-white/40 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/35 md:grid-cols-4">
          <Input
            placeholder="Category"
            value={filters.category}
            onChange={(event) =>
              setFilters((current) => ({ ...current, category: event.target.value }))
            }
          />
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
          <Button
            type="button"
            variant="outline"
            onClick={() => setFilters({ category: '', startDate: '', endDate: '' })}
          >
            Reset
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => applyQuickRange('today')}>
            Today
          </Button>
          <Button type="button" variant="outline" onClick={() => applyQuickRange('7d')}>
            Last 7 days
          </Button>
        </div>

        <div className="grid gap-3 rounded-[1.75rem] border border-white/40 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/35 md:grid-cols-[1fr_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search title, category, or paid to"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
            <option value="all">All payments</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bank">Bank</option>
            <option value="upi">UPI</option>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={exportExpensesCsv}>
            <FileDown className="h-4 w-4" />
            Export CSV
          </Button>
          <Button type="button" variant="outline" onClick={printExpensesReport}>
            Print / Save PDF
          </Button>
        </div>

        {visibleExpenses.map((expense) => (
          <Card key={expense.id}>
            <CardContent className="space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{expense.title}</p>
                  <p className="text-sm text-muted-foreground">{expense.category}</p>
                </div>
                <Badge variant="warning">{expense.paymentMethod}</Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="mt-1 font-semibold">{formatCurrency(expense.amount || 0)}</p>
                </div>
                <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="mt-1 font-semibold">{formatDateTime(expense.expenseDate)}</p>
                </div>
              </div>
              {expense.paidTo ? (
                <p className="text-sm text-muted-foreground">Paid to: {expense.paidTo}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {!visibleExpenses.length ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No expenses found for the current filters.
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card className="h-fit">
        <CardContent className="p-5">
          <h2 className="text-lg font-semibold">Record expense</h2>
          <form className="mt-4 space-y-3" onSubmit={onSubmit}>
            <Input
              placeholder="Expense title"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              required
            />
            <Input
              placeholder="Category"
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({ ...current, category: event.target.value }))
              }
              required
            />
            <Input
              placeholder="Amount"
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              required
            />
            <Input
              placeholder="Payment method"
              value={form.paymentMethod}
              onChange={(event) =>
                setForm((current) => ({ ...current, paymentMethod: event.target.value }))
              }
            />
            <Input
              placeholder="Paid to"
              value={form.paidTo}
              onChange={(event) => setForm((current) => ({ ...current, paidTo: event.target.value }))}
            />
            <Input
              type="date"
              value={form.expenseDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, expenseDate: event.target.value }))
              }
            />
            <Input
              placeholder="Notes"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />
            <Button type="submit" disabled={createMutation.isPending}>
              Save expense
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
