import { useDeferredValue, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, CircleDollarSign, FileDown, Search, UserCheck } from 'lucide-react'
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
import { getErrorMessage } from '@/lib/utils'

const initialForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
  paymentTermsDays: '30',
  openingBalance: '0',
  notes: '',
}

export default function SuppliersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [form, setForm] = useState(initialForm)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const deferredSearch = useDeferredValue(search)

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', deferredSearch],
    queryFn: () =>
      cachedGet('/finance/suppliers', {
        params: { search: deferredSearch || undefined },
        cacheKey: cacheKeys.suppliers,
      }),
  })

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingSupplier) {
        await api.put(`/finance/suppliers/${editingSupplier.id}`, payload)
        return
      }

      await api.post('/finance/suppliers', payload)
    },
    onSuccess: () => {
      toast.success(editingSupplier ? 'Supplier updated' : 'Supplier created')
      setForm(initialForm)
      setEditingSupplier(null)
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  function onSubmit(event) {
    event.preventDefault()
    saveMutation.mutate({
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: form.address,
      paymentTermsDays: Number(form.paymentTermsDays || 0),
      openingBalance: Number(form.openingBalance || 0),
      notes: form.notes,
    })
  }

  function onEdit(supplier) {
    setEditingSupplier(supplier)
    setForm({
      name: supplier.name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      paymentTermsDays: String(supplier.paymentTermsDays || 0),
      openingBalance: String(supplier.openingBalance || 0),
      notes: supplier.notes || '',
    })
  }

  const suppliers = useMemo(() => data?.suppliers || [], [data?.suppliers])

  const visibleSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      if (activeFilter === 'all') {
        return true
      }

      return activeFilter === 'active' ? supplier.active : !supplier.active
    })
  }, [activeFilter, suppliers])

  const supplierKpi = useMemo(() => {
    return visibleSuppliers.reduce(
      (summary, supplier) => {
        summary.count += 1
        summary.active += supplier.active ? 1 : 0
        summary.openingBalance += Number(supplier.openingBalance || 0)
        return summary
      },
      { count: 0, active: 0, openingBalance: 0 },
    )
  }, [visibleSuppliers])

  function exportSuppliersCsv() {
    downloadCsv(
      `suppliers-${Date.now()}.csv`,
      [
        { label: 'Name', value: (supplier) => supplier.name },
        { label: 'Phone', value: (supplier) => supplier.phone || '' },
        { label: 'Email', value: (supplier) => supplier.email || '' },
        { label: 'Payment Terms (days)', value: (supplier) => supplier.paymentTermsDays || 0 },
        { label: 'Opening Balance', value: (supplier) => Number(supplier.openingBalance || 0).toFixed(2) },
        { label: 'Status', value: (supplier) => (supplier.active ? 'active' : 'inactive') },
      ],
      visibleSuppliers,
    )
    toast.success('Supplier CSV exported')
  }

  function printSuppliersReport() {
    openPrintReport({
      title: 'Suppliers Report',
      subtitle: `Generated on ${new Date().toLocaleString('en-IN')}`,
      columns: [
        { label: 'Name', value: (supplier) => supplier.name },
        { label: 'Contact', value: (supplier) => supplier.phone || supplier.email || '-' },
        { label: 'Terms', value: (supplier) => `${supplier.paymentTermsDays || 0} days` },
        { label: 'Opening Balance', value: (supplier) => formatCurrency(supplier.openingBalance || 0) },
        { label: 'Status', value: (supplier) => (supplier.active ? 'active' : 'inactive') },
      ],
      rows: visibleSuppliers,
    })
  }

  if (isLoading) {
    return <Loader label="Loading suppliers" />
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        <Card>
          <CardContent className="grid gap-3 p-5 md:grid-cols-3">
            <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                Suppliers
              </p>
              <p className="mt-2 text-2xl font-semibold">{supplierKpi.count}</p>
            </div>
            <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <UserCheck className="h-3.5 w-3.5" />
                Active
              </p>
              <p className="mt-2 text-2xl font-semibold">{supplierKpi.active}</p>
            </div>
            <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <CircleDollarSign className="h-3.5 w-3.5" />
                Opening balance
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {formatCurrency(supplierKpi.openingBalance)}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 rounded-[1.75rem] border border-white/40 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/35 md:grid-cols-[1fr_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search supplier by name, phone, or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={exportSuppliersCsv}>
            <FileDown className="h-4 w-4" />
            Export CSV
          </Button>
          <Button type="button" variant="outline" onClick={printSuppliersReport}>
            Print / Save PDF
          </Button>
        </div>
        {data?._cached ? (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Network unavailable. Showing cached suppliers.
          </p>
        ) : null}
        <div className="grid gap-4">
          {visibleSuppliers.map((supplier) => (
            <Card key={supplier.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold">{supplier.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {supplier.phone || supplier.email || 'No contact details'}
                    </p>
                  </div>
                  <Badge variant={supplier.active ? 'success' : 'warning'}>
                    {supplier.active ? 'active' : 'inactive'}
                  </Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
                    <p className="text-sm text-muted-foreground">Payment terms</p>
                    <p className="mt-1 font-semibold">{supplier.paymentTermsDays || 0} days</p>
                  </div>
                  <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
                    <p className="text-sm text-muted-foreground">Opening balance</p>
                    <p className="mt-1 font-semibold">{formatCurrency(supplier.openingBalance || 0)}</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  {supplier.phone ? (
                    <a href={`tel:${supplier.phone}`} className="mr-2">
                      <Button type="button" variant="outline">
                        Call
                      </Button>
                    </a>
                  ) : null}
                  <Button type="button" variant="outline" onClick={() => onEdit(supplier)}>
                    Edit supplier
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!visibleSuppliers.length ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                No suppliers match the current search and status filters.
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <Card className="h-fit">
        <CardContent className="p-5">
          <h2 className="text-lg font-semibold">
            {editingSupplier ? 'Update supplier' : 'Add supplier'}
          </h2>
          <form className="mt-4 space-y-3" onSubmit={onSubmit}>
            <Input
              placeholder="Supplier name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
            <Input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
            <Input
              placeholder="Phone"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            />
            <Input
              placeholder="Address"
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Terms days"
                type="number"
                min="0"
                value={form.paymentTermsDays}
                onChange={(event) =>
                  setForm((current) => ({ ...current, paymentTermsDays: event.target.value }))
                }
              />
              <Input
                placeholder="Opening balance"
                type="number"
                min="0"
                step="0.01"
                value={form.openingBalance}
                onChange={(event) =>
                  setForm((current) => ({ ...current, openingBalance: event.target.value }))
                }
              />
            </div>
            <Input
              placeholder="Notes"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={saveMutation.isPending}>
                {editingSupplier ? 'Update' : 'Create'}
              </Button>
              {editingSupplier ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingSupplier(null)
                    setForm(initialForm)
                  }}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
