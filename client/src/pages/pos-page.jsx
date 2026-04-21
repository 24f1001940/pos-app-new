import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AudioLines, ShoppingCart, Volume2, VolumeX } from 'lucide-react'
import { toast } from 'sonner'

import { POSProductGrid } from '@/components/pos/pos-product-grid'
import { CartPanel } from '@/components/pos/cart-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader } from '@/components/ui/loader'
import { api, cachedGet } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { addUiBreadcrumb, captureUiException, startUiSpan } from '@/lib/sentry'
import { cacheKeys } from '@/lib/storage'
import { enqueueSale, getQueuedSales, syncQueuedSales } from '@/lib/offline-queue'
import { getErrorMessage } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'

function calculateDiscount(subtotal, discountType, discountValue) {
  const value = Number(discountValue || 0)
  if (!value || discountType === 'none') {
    return 0
  }

  if (discountType === 'flat') {
    return Math.min(subtotal, value)
  }

  if (discountType === 'percent') {
    return Math.min(subtotal, (subtotal * value) / 100)
  }

  return 0
}

export default function POSPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [cart, setCart] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [discountType, setDiscountType] = useState('none')
  const [discountValue, setDiscountValue] = useState('')
  const [notes, setNotes] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [draftTitle, setDraftTitle] = useState('Current cart')
  const [payments, setPayments] = useState([{ method: 'cash', amount: '', reference: '' }])
  const [lastSale, setLastSale] = useState(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [queuedSalesCount, setQueuedSalesCount] = useState(0)
  const [syncingQueuedSales, setSyncingQueuedSales] = useState(false)

  const { data: productData, isLoading: productsLoading } = useQuery({
    queryKey: ['pos-products'],
    queryFn: () => cachedGet('/products', { cacheKey: cacheKeys.products }),
  })

  const { data: customerData } = useQuery({
    queryKey: ['pos-customers', deferredSearch, customerSearch],
    queryFn: () =>
      cachedGet('/customers', {
        params: { search: customerSearch || undefined, limit: 12 },
        cacheKey: cacheKeys.customers,
      }),
  })

  const { data: draftData } = useQuery({
    queryKey: ['pos-drafts'],
    queryFn: () => api.get('/pos-drafts').then((response) => response.data),
  })

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => cachedGet('/settings', { cacheKey: cacheKeys.settings }),
  })

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.sp * item.quantity, 0),
    [cart],
  )

  const discountAmount = useMemo(
    () => calculateDiscount(subtotal, discountType, discountValue),
    [discountType, discountValue, subtotal],
  )

  const taxableSubtotal = Math.max(0, subtotal - discountAmount)
  const taxRate = Number(settingsData?.taxRate || 18)
  const tax = Number((taxableSubtotal * (taxRate / 100)).toFixed(2))
  const total = Number((taxableSubtotal + tax).toFixed(2))
  const amountPaid = Number(
    payments
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
      .toFixed(2),
  )
  const balanceDue = Number(Math.max(0, total - amountPaid).toFixed(2))
  const selectedCustomer = (customerData?.customers || []).find(
    (customer) => customer.id === selectedCustomerId,
  )

  const filteredProducts = (productData?.products || []).filter((product) =>
    [product.name, product.sku, product.barcode]
      .join(' ')
      .toLowerCase()
      .includes(deferredSearch.toLowerCase()),
  )

  const cartCategories = useMemo(
    () => new Set(cart.map((item) => item.category).filter(Boolean)),
    [cart],
  )

  const quickSuggestions = useMemo(
    () =>
      filteredProducts
        .filter(
          (product) =>
            product.stock > 0 &&
            !cart.some((item) => item.id === product.id) &&
            (cartCategories.size === 0 || cartCategories.has(product.category)),
        )
        .slice(0, 6),
    [cart, cartCategories, filteredProducts],
  )

  function playFeedbackTone(frequency = 720) {
    if (!soundEnabled || typeof window === 'undefined' || !window.AudioContext) {
      return
    }

    const context = new window.AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    gain.gain.value = 0.03
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.08)
    oscillator.onended = () => context.close()
  }

  function buildCheckoutPayload() {
    const normalizedPayments = payments
      .map((payment) => ({
        method: payment.method,
        amount: Number(payment.amount || 0),
        reference: payment.reference,
      }))
      .filter((payment) => Number.isFinite(payment.amount) && payment.amount > 0)

    const payload = {
      items: cart.map((item) => ({
        productId: item.id,
        qty: item.quantity,
        price: item.sp,
      })),
      subtotal,
      tax,
      total,
      taxRate,
      paymentMethod,
      payments: normalizedPayments,
      amountPaid,
      discountType,
      discountValue: Number(discountValue || 0),
      salespersonId: user?.id,
    }

    if (customerName.trim()) {
      payload.customerName = customerName.trim()
    }

    if (customerPhone.trim()) {
      payload.customerPhone = customerPhone.trim()
    }

    if (customerEmail.trim()) {
      payload.customerEmail = customerEmail.trim()
    }

    if (selectedCustomerId) {
      payload.customerId = selectedCustomerId
    }

    if (notes.trim()) {
      payload.notes = notes.trim()
    }

    return payload
  }

  async function flushQueuedSales({ silent = false } = {}) {
    if (syncingQueuedSales || !navigator.onLine) {
      return
    }

    setSyncingQueuedSales(true)
    try {
      const result = await syncQueuedSales(api)
      const nextCount = (await getQueuedSales()).length
      setQueuedSalesCount(nextCount)

      if (!silent && result.synced > 0) {
        toast.success(`Synced ${result.synced} offline sale(s)`)
      }

      if (result.synced > 0) {
        queryClient.invalidateQueries({ queryKey: ['products'] })
        queryClient.invalidateQueries({ queryKey: ['pos-products'] })
        queryClient.invalidateQueries({ queryKey: ['sales'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['customers'] })
      }
    } finally {
      setSyncingQueuedSales(false)
    }
  }

  useEffect(() => {
    getQueuedSales().then((queue) => {
      setQueuedSalesCount(queue.length)
    })

    const handleOnline = () => {
      flushQueuedSales()
    }

    window.addEventListener('online', handleOnline)
    flushQueuedSales({ silent: true })

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      addUiBreadcrumb('POS checkout initiated', 'checkout', 'info')
      const payload = buildCheckoutPayload()

      if (!navigator.onLine) {
        const queued = await enqueueSale(payload)
        return {
          data: {
            _queuedOffline: true,
            queuedId: queued.id,
          },
        }
      }

      try {
        return await startUiSpan('pos.checkout.submit', () => api.post('/sales', payload))
      } catch (error) {
        if (!error?.response) {
          const queued = await enqueueSale(payload)
          return {
            data: {
              _queuedOffline: true,
              queuedId: queued.id,
            },
          }
        }

        throw error
      }
    },
    onSuccess: (response) => {
      playFeedbackTone(940)
      const queuedOffline = Boolean(response?.data?._queuedOffline)
      setLastSale(queuedOffline ? null : response.data)
      setCart([])
      setCustomerName('')
      setCustomerPhone('')
      setCustomerEmail('')
      setPaymentMethod('cash')
      setDiscountType('none')
      setDiscountValue('')
      setNotes('')
      setCustomerSearch('')
      setSelectedCustomerId('')
      setPayments([{ method: 'cash', amount: '', reference: '' }])
      getQueuedSales().then((queue) => {
        setQueuedSalesCount(queue.length)
      })

      if (queuedOffline) {
        toast.warning('Offline mode: sale queued and will sync automatically when online')
        return
      }

      toast.success('Checkout complete')
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['pos-products'] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['pos-drafts'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      import('@/lib/receipt').then(({ downloadReceiptPdf }) =>
        downloadReceiptPdf(response.data, settingsData),
      )
    },
    onError: (error) => {
      captureUiException(error)
      toast.error(getErrorMessage(error))
    },
  })

  const saveDraftMutation = useMutation({
    mutationFn: () =>
      api.post('/pos-drafts', {
        title: draftTitle || 'Current cart',
        items: cart,
        customerName,
        customerPhone,
        paymentMethod,
        taxRate,
        discountType,
        discountValue: Number(discountValue || 0),
        notes,
      }),
    onSuccess: () => {
      toast.success('Draft order saved')
      queryClient.invalidateQueries({ queryKey: ['pos-drafts'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const sendInvoiceEmailMutation = useMutation({
    mutationFn: ({ saleId, email }) =>
      api.post(`/sales/${saleId}/email`, {
        email,
      }),
    onSuccess: (response) => {
      toast.success(response.data?.message || 'Invoice email sent')
      if (response.data?.sale) {
        setLastSale(response.data.sale)
      }
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const deleteDraftMutation = useMutation({
    mutationFn: (draftId) => api.delete(`/pos-drafts/${draftId}`),
    onSuccess: () => {
      toast.success('Draft deleted')
      queryClient.invalidateQueries({ queryKey: ['pos-drafts'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  function updatePaymentRow(index, field, value) {
    setPayments((current) =>
      current.map((payment, paymentIndex) =>
        paymentIndex === index ? { ...payment, [field]: value } : payment,
      ),
    )
  }

  function addPaymentRow() {
    setPayments((current) => [...current, { method: 'cash', amount: '', reference: '' }])
  }

  function removePaymentRow(index) {
    setPayments((current) => current.filter((_, paymentIndex) => paymentIndex !== index))
  }

  function resumeDraft(draft) {
    setCart(Array.isArray(draft.items) ? draft.items : [])
    setCustomerName(draft.customerName || '')
    setCustomerPhone(draft.customerPhone || '')
    setPaymentMethod(draft.paymentMethod || 'cash')
    setDiscountType(draft.discountType || 'none')
    setDiscountValue(String(draft.discountValue ?? ''))
    setNotes(draft.notes || '')
    toast.success('Draft loaded')
  }

  function saveCurrentDraft() {
    if (!cart.length) {
      toast.error('Add items before saving a draft')
      return
    }

    saveDraftMutation.mutate()
  }

  function addToCart(product) {
    playFeedbackTone(680)
    setCart((current) => {
      const existingItem = current.find((item) => item.id === product.id)
      if (!existingItem) {
        return [...current, { ...product, quantity: 1 }]
      }

      if (existingItem.quantity >= product.stock) {
        toast.error('Cannot exceed available stock')
        return current
      }

      return current.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
      )
    })
  }

  function updateQuantity(productId, quantity) {
    setCart((current) =>
      current
        .map((item) => {
          if (item.id !== productId) {
            return item
          }

          const nextQuantity = Math.max(1, Math.min(quantity || 1, item.stock))
          return { ...item, quantity: nextQuantity }
        })
        .filter(Boolean),
    )
  }

  function removeFromCart(productId) {
    setCart((current) => current.filter((item) => item.id !== productId))
  }

  function handleCheckout() {
    if (checkoutMutation.isPending || !cart.length) {
      return
    }

    checkoutMutation.mutate()
  }

  if (productsLoading) {
    return <Loader label="Preparing billing counter" />
  }

  return (
    <div className="grid gap-6 pb-20 xl:grid-cols-[1.5fr_0.8fr] md:pb-0">
      <div className="space-y-6">
        <Card>
          <CardContent className="grid gap-4 p-5 md:grid-cols-4">
            <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Cart items</p>
              <p className="mt-2 text-2xl font-semibold">{cart.length}</p>
            </div>
            <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Subtotal</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(subtotal)}</p>
            </div>
            <div className="rounded-2xl bg-white/60 p-3 dark:bg-slate-900/50">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Balance due</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(balanceDue)}</p>
            </div>
            <button
              type="button"
              className="rounded-2xl border border-border bg-background/70 p-3 text-left transition hover:bg-accent"
              onClick={() => setSoundEnabled((value) => !value)}
            >
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Counter sound</p>
              <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                {soundEnabled ? 'Enabled' : 'Muted'}
              </p>
            </button>
          </CardContent>
        </Card>

        {queuedSalesCount > 0 ? (
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-semibold">Offline sales queue</p>
                <p className="text-sm text-muted-foreground">
                  {queuedSalesCount} sale(s) waiting to sync.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => flushQueuedSales()}
                disabled={syncingQueuedSales || !navigator.onLine}
              >
                {syncingQueuedSales ? 'Syncing...' : 'Sync now'}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <POSProductGrid
          search={search}
          setSearch={setSearch}
          products={filteredProducts}
          onAdd={addToCart}
          quickSuggestions={quickSuggestions}
          onQuickPick={addToCart}
        />
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1 space-y-2">
                <p className="text-sm font-semibold">Customer lookup</p>
                <Input
                  placeholder="Search existing customer"
                  value={customerSearch}
                  onChange={(event) => setCustomerSearch(event.target.value)}
                />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-semibold">Customer name</p>
                <Input
                  placeholder="Walk-in customer"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                />
              </div>
              <Input
                className="md:w-48"
                placeholder="Phone"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
              />
              <Input
                className="md:w-64"
                placeholder="Email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
              />
            </div>
            {customerData?.customers?.length ? (
              <div className="flex flex-wrap gap-2">
                {customerData.customers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    className="rounded-full border border-border px-3 py-1 text-xs transition hover:bg-accent"
                    onClick={() => {
                      setSelectedCustomerId(customer.id)
                      setCustomerName(customer.name)
                      setCustomerPhone(customer.phone || '')
                      setCustomerEmail(customer.email || '')
                    }}
                  >
                    {customer.name}
                  </button>
                ))}
              </div>
            ) : null}
            {selectedCustomer ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Selected:</span>
                <Badge variant="success">{selectedCustomer.name}</Badge>
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline"
                  onClick={() => setSelectedCustomerId('')}
                >
                  Clear selection
                </button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-4 p-5 md:grid-cols-4">
            <Select value={discountType} onChange={(event) => setDiscountType(event.target.value)}>
              <option value="none">No discount</option>
              <option value="flat">Flat</option>
              <option value="percent">Percent</option>
            </Select>
            <Input
              type="number"
              placeholder="Discount value"
              value={discountValue}
              onChange={(event) => setDiscountValue(event.target.value)}
            />
            <Input
              placeholder="Draft title"
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={saveCurrentDraft}>
                Save draft
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCart([])
                  setCustomerName('')
                  setCustomerPhone('')
                  setCustomerEmail('')
                  setDiscountType('none')
                  setDiscountValue('')
                  setNotes('')
                  setPayments([{ method: 'cash', amount: '', reference: '' }])
                }}
              >
                Clear cart
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Split payments</p>
                <p className="text-xs text-muted-foreground">
                  Paid {formatCurrency(amountPaid)} of {formatCurrency(total)}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={addPaymentRow}>
                Add payment
              </Button>
            </div>
            <div className="space-y-3">
              {payments.map((payment, index) => (
                <div key={`${payment.method}-${index}`} className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
                  <Select
                    value={payment.method}
                    onChange={(event) => updatePaymentRow(index, 'method', event.target.value)}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="credit">Credit</option>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={payment.amount}
                    onChange={(event) => updatePaymentRow(index, 'amount', event.target.value)}
                  />
                  <Input
                    placeholder="Reference / txn id"
                    value={payment.reference}
                    onChange={(event) => updatePaymentRow(index, 'reference', event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removePaymentRow(index)}
                    disabled={payments.length === 1}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <Textarea
              placeholder="Order notes or special instructions"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant={balanceDue > 0 ? 'warning' : 'success'}>
                Balance due {formatCurrency(balanceDue)}
              </Badge>
              {draftData?.drafts?.length ? (
                <Badge variant="default">{draftData.drafts.length} held order(s)</Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Held orders</p>
              <Button type="button" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['pos-drafts'] })}>
                Refresh
              </Button>
            </div>
            <div className="grid gap-3">
              {(draftData?.drafts || []).map((draft) => (
                <div key={draft.id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{draft.title || 'Held cart'}</p>
                      <p className="text-xs text-muted-foreground">
                        {draft.customerName || 'No customer'} - {draft.items?.length || 0} items
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => resumeDraft(draft)}>
                        Resume
                      </Button>
                      <Button type="button" variant="danger" onClick={() => deleteDraftMutation.mutate(draft.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {lastSale ? (
          <Card>
            <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Last completed invoice</p>
                <p className="mt-1 text-xl font-semibold">{lastSale.invoiceNumber}</p>
                <p className="text-sm text-muted-foreground">
                  Total {formatCurrency(lastSale.total)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Customer email {lastSale.customerEmail || lastSale.customer?.email || 'Not provided'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(lastSale.invoiceNumber || '')}
                >
                  <AudioLines className="mr-2 h-4 w-4" />
                  Copy invoice no
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    sendInvoiceEmailMutation.isPending ||
                    !lastSale.id ||
                    !(lastSale.customerEmail || lastSale.customer?.email)
                  }
                  onClick={() =>
                    sendInvoiceEmailMutation.mutate({
                      saleId: lastSale.id,
                      email: lastSale.customerEmail || lastSale.customer?.email,
                    })
                  }
                >
                  Send invoice email
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    import('@/lib/receipt').then(({ printReceipt }) =>
                      printReceipt(lastSale, settingsData),
                    )
                  }
                >
                  Print receipt
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    import('@/lib/receipt').then(({ downloadReceiptPdf }) =>
                      downloadReceiptPdf(lastSale, settingsData),
                    )
                  }
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
      <CartPanel
        items={cart}
        customerName={customerName}
        paymentMethod={paymentMethod}
        setCustomerName={setCustomerName}
        setPaymentMethod={setPaymentMethod}
        subtotal={subtotal}
        tax={tax}
        total={total}
        taxRate={taxRate}
        balanceDue={balanceDue}
        onIncrement={(productId) => {
          const product = cart.find((item) => item.id === productId)
          if (product) {
            updateQuantity(productId, product.quantity + 1)
          }
        }}
        onDecrement={(productId) => {
          const product = cart.find((item) => item.id === productId)
          if (product) {
            if (product.quantity === 1) {
              removeFromCart(productId)
              return
            }

            updateQuantity(productId, product.quantity - 1)
          }
        }}
        onChangeQuantity={updateQuantity}
        onRemove={removeFromCart}
        onCheckout={handleCheckout}
        loading={checkoutMutation.isPending}
      />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-semibold">{formatCurrency(total)}</p>
          </div>
          <Button
            type="button"
            className="h-11 min-w-36"
            disabled={!cart.length || checkoutMutation.isPending}
            onClick={handleCheckout}
          >
            {checkoutMutation.isPending ? 'Processing...' : 'Checkout now'}
          </Button>
        </div>
      </div>
    </div>
  )
}

