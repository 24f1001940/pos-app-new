import { Minus, Plus, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/currency'

export function CartPanel({
  items,
  customerName,
  paymentMethod,
  setCustomerName,
  setPaymentMethod,
  subtotal,
  tax,
  total,
  taxRate,
  balanceDue,
  onIncrement,
  onDecrement,
  onChangeQuantity,
  onRemove,
  onCheckout,
  loading,
}) {
  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle>Current Cart</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Customer name (optional)"
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
        />
        <Select
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value)}
        >
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="upi">UPI</option>
        </Select>
        <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
          {items.length ? (
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-2xl border border-border bg-white/60 p-4 dark:bg-slate-900/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.sp)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-full p-2 text-rose-500 transition hover:bg-rose-500/10"
                      onClick={() => onRemove(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => onDecrement(item.id)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      max={item.stock}
                      value={item.quantity}
                      onChange={(event) =>
                        onChangeQuantity(item.id, Number(event.target.value))
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => onIncrement(item.id)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <p className="rounded-2xl bg-white/60 p-4 text-sm text-muted-foreground dark:bg-slate-900/50">
              Add products from the catalog to start billing.
            </p>
          )}
        </div>
        <Separator />
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">GST ({taxRate}%)</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Balance due</span>
            <span className={balanceDue > 0 ? 'font-semibold text-warning' : 'font-semibold text-success'}>
              {formatCurrency(balanceDue || 0)}
            </span>
          </div>
        </div>
        <Button
          type="button"
          className="h-12 w-full text-base"
          disabled={!items.length || loading}
          onClick={onCheckout}
        >
          {loading ? 'Processing...' : 'Complete Checkout'}
        </Button>
      </CardContent>
    </Card>
  )
}
