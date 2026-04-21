import { useDeferredValue, useMemo, useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, Phone, UserPlus, Wallet } from 'lucide-react'
import { toast } from 'sonner'

import { CustomerFormModal } from '@/components/customers/customer-form-modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader } from '@/components/ui/loader'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import { api, cachedGet } from '@/lib/api'
import { cacheKeys } from '@/lib/storage'
import { formatCurrency } from '@/lib/currency'
import { formatDateTime, getErrorMessage } from '@/lib/utils'

function getInitials(name = '') {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function CustomersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [profileId, setProfileId] = useState(null)
  const pageSize = 30
  const sentinelRef = useRef(null)

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['customers', deferredSearch],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      cachedGet('/customers', {
        params: {
          search: deferredSearch || undefined,
          page: pageParam,
          limit: pageSize,
        },
        cacheKey: pageParam === 1 ? cacheKeys.customers : undefined,
      }),
    getNextPageParam: (lastPage) => {
      const page = Number(lastPage?.pagination?.page || 1)
      const totalPages = Number(lastPage?.pagination?.totalPages || 1)
      return page < totalPages ? page + 1 : undefined
    },
  })

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['customer-profile', profileId],
    queryFn: () => api.get(`/customers/${profileId}`).then((response) => response.data),
    enabled: Boolean(profileId),
  })

  const saveMutation = useMutation({
    mutationFn: async (values) => {
      if (selectedCustomer) {
        await api.put(`/customers/${selectedCustomer.id}`, values)
        return
      }

      await api.post('/customers', values)
    },
    onSuccess: () => {
      toast.success(selectedCustomer ? 'Customer updated' : 'Customer created')
      setDialogOpen(false)
      setSelectedCustomer(null)
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      if (profileId) {
        queryClient.invalidateQueries({ queryKey: ['customer-profile', profileId] })
      }
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const customerList = useMemo(
    () => (data?.pages || []).flatMap((page) => page.customers || []),
    [data?.pages],
  )
  const totalCustomers = Number(data?.pages?.[0]?.pagination?.total || customerList.length)

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

  const customerMetrics = useMemo(() => {
    const totalCustomers = customerList.length
    const totalSpend = customerList.reduce((sum, customer) => sum + Number(customer.totalSpent || 0), 0)
    const activeCredit = customerList.filter((customer) => Number(customer.creditBalance || 0) > 0).length
    const vipCount = customerList.filter((customer) => Number(customer.totalSpent || 0) >= 50000).length

    return {
      totalCustomers,
      totalSpend,
      activeCredit,
      vipCount,
    }
  }, [customerList])

  const segmentBreakdown = useMemo(() => {
    const tiers = {
      New: 0,
      Repeat: 0,
      VIP: 0,
    }

    customerList.forEach((customer) => {
      const spend = Number(customer.totalSpent || 0)
      if (spend >= 50000) {
        tiers.VIP += 1
        return
      }

      if ((customer.totalPurchases || 0) >= 3) {
        tiers.Repeat += 1
        return
      }

      tiers.New += 1
    })

    const total = Math.max(customerList.length, 1)
    return Object.entries(tiers).map(([label, value]) => ({
      label,
      value,
      percent: Math.round((value / total) * 100),
    }))
  }, [customerList])

  function openCreate() {
    setSelectedCustomer(null)
    setDialogOpen(true)
  }

  function openEdit(customer) {
    setSelectedCustomer(customer)
    setDialogOpen(true)
  }

  if (isLoading) {
    return <Loader label="Loading customers" />
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <Card>
          <CardContent className="grid gap-3 p-5 md:grid-cols-4">
            <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Customers</p>
              <p className="mt-2 text-2xl font-semibold">{customerMetrics.totalCustomers}</p>
            </div>
            <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Lifetime spend</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(customerMetrics.totalSpend)}</p>
            </div>
            <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Active credit</p>
              <p className="mt-2 text-2xl font-semibold">{customerMetrics.activeCredit}</p>
            </div>
            <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">VIP base</p>
              <p className="mt-2 text-2xl font-semibold">{customerMetrics.vipCount}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 rounded-[1.75rem] border border-white/40 bg-white/70 p-4 shadow-lg shadow-slate-950/5 dark:border-white/10 dark:bg-slate-950/35 md:grid-cols-[1fr_auto]">
          <Input
            placeholder="Search by name, email, or phone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button type="button" onClick={openCreate}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add customer
          </Button>
        </div>

        {data?._cached ? (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Network unavailable. Showing cached customer data.
          </p>
        ) : null}

        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="text-sm font-semibold">Customer segments</p>
            {segmentBreakdown.map((segment) => (
              <div key={segment.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{segment.label}</span>
                  <span>{segment.value} customers · {segment.percent}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${segment.percent}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {customerList.map((customer) => (
            <Card key={customer.id} className="overflow-hidden">
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                      {getInitials(customer.name)}
                    </div>
                    <div>
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => setProfileId(customer.id)}
                      >
                        <p className="text-lg font-semibold">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {customer.phone || customer.email || 'No contact details'}
                        </p>
                      </button>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {customer.tags?.map((tag) => (
                          <Badge key={tag} variant="default">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
                      <p className="text-muted-foreground">Spent</p>
                      <p className="mt-1 font-semibold">{formatCurrency(customer.totalSpent || 0)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
                      <p className="text-muted-foreground">Credit</p>
                      <p className="mt-1 font-semibold">{formatCurrency(customer.creditBalance || 0)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
                      <p className="text-muted-foreground">Visits</p>
                      <p className="mt-1 font-semibold">{customer.totalPurchases || 0}</p>
                    </div>
                    <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
                      <p className="text-muted-foreground">Points</p>
                      <p className="mt-1 font-semibold">{customer.loyaltyPoints || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => openEdit(customer)}>
                    Edit
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setProfileId(customer.id)}>
                    View profile
                  </Button>
                  {customer.phone ? (
                    <a href={`tel:${customer.phone}`} className="inline-flex">
                      <Button type="button" variant="outline">
                        <Phone className="mr-2 h-4 w-4" />
                        Call
                      </Button>
                    </a>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

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
                ? `Load more (${customerList.length}/${totalCustomers})`
                : 'All customers loaded'}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="sticky top-24">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Customer profile</p>
                <h2 className="mt-1 text-xl font-semibold">
                  {profileData?.customer?.name || 'Select a customer'}
                </h2>
              </div>
            </div>

            {profileLoading ? <Loader label="Loading profile" /> : null}

            {profileData?.customer ? (
              <>
                <div className="grid gap-3 text-sm">
                  <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
                    <p className="text-muted-foreground">Last purchase</p>
                    <p className="mt-1 font-semibold">
                      {profileData.stats?.lastPurchaseAt ? formatDateTime(profileData.stats.lastPurchaseAt) : 'Never'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
                    <p className="text-muted-foreground">Purchase history</p>
                    <p className="mt-1 font-semibold">{profileData.stats?.totalPurchases || 0}</p>
                  </div>
                  <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
                    <p className="text-muted-foreground">Lifetime spend</p>
                    <p className="mt-1 font-semibold">{formatCurrency(profileData.stats?.totalSpent || 0)}</p>
                  </div>
                  <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
                    <p className="text-muted-foreground">Current credit</p>
                    <p className="mt-1 flex items-center gap-2 font-semibold">
                      <Wallet className="h-4 w-4 text-primary" />
                      {formatCurrency(profileData.customer.creditBalance || 0)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
                    <p className="text-muted-foreground">Loyalty score</p>
                    <p className="mt-1 flex items-center gap-2 font-semibold">
                      <Award className="h-4 w-4 text-warning" />
                      {profileData.customer.loyaltyPoints || 0} pts
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold">Recent sales timeline</p>
                  {(profileData.sales || []).map((sale) => (
                    <div key={sale.id} className="rounded-2xl border border-border p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{sale.invoiceNumber}</p>
                        <Badge variant={sale.status === 'completed' ? 'success' : 'warning'}>
                          {sale.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">{formatDateTime(sale.date)}</p>
                      <p className="mt-2 font-medium">{formatCurrency(sale.total)}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a customer to view purchase history, credit balance, and loyalty data.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <CustomerFormModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialCustomer={selectedCustomer}
        loading={saveMutation.isPending}
        onSubmit={(values) => saveMutation.mutateAsync(values)}
      />
    </div>
  )
}

