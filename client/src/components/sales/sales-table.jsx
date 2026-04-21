import { Copy, Download, Mail, Printer, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/currency'
import { formatDateTime } from '@/lib/utils'

export function SalesTable({ sales, canDelete, onDownload, onPrint, onDelete, onSendEmail, emailSendingId }) {
  if (!sales.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No sales found for the selected filters.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {sales.map((sale) => (
        <Card key={sale.id}>
          <CardContent className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="font-semibold">{sale.invoiceNumber}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDateTime(sale.date)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:w-[42rem]">
              <div className="rounded-2xl bg-white/60 p-3 text-sm dark:bg-slate-900/50">
                <p className="text-muted-foreground">Items sold</p>
                <p className="mt-1 font-semibold">{sale.itemCount}</p>
              </div>
              <div className="rounded-2xl bg-white/60 p-3 text-sm dark:bg-slate-900/50">
                <p className="text-muted-foreground">Tax</p>
                <p className="mt-1 font-semibold">{formatCurrency(sale.tax)}</p>
              </div>
              <div className="rounded-2xl bg-white/60 p-3 text-sm dark:bg-slate-900/50">
                <p className="text-muted-foreground">Total</p>
                <p className="mt-1 font-semibold">{formatCurrency(sale.total)}</p>
              </div>
              <div className="rounded-2xl bg-white/60 p-3 text-sm dark:bg-slate-900/50">
                <p className="text-muted-foreground">Profit</p>
                <p className="mt-1 font-semibold">{formatCurrency(sale.profit || 0)}</p>
              </div>
              <div className="rounded-2xl bg-white/60 p-3 text-sm dark:bg-slate-900/50">
                <p className="text-muted-foreground">Operator</p>
                <p className="mt-1 font-semibold">{sale.createdBy?.name || 'System'}</p>
              </div>
              <div className="rounded-2xl bg-white/60 p-3 text-sm dark:bg-slate-900/50">
                <p className="text-muted-foreground">Customer</p>
                <p className="mt-1 font-semibold">{sale.customer?.name || sale.customerName || 'Walk-in'}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant={sale.status === 'completed' ? 'success' : 'warning'}>{sale.status || 'completed'}</Badge>
              <Badge variant="default">{sale.paymentMethod}</Badge>
              <Badge variant={sale.invoiceEmailedAt ? 'success' : 'warning'}>
                {sale.invoiceEmailedAt ? `Emailed ${formatDateTime(sale.invoiceEmailedAt)}` : 'Not emailed'}
              </Badge>
              {sale.discountAmount ? (
                <Badge variant="warning">Discount {formatCurrency(sale.discountAmount)}</Badge>
              ) : null}
              {sale.balanceDue ? <Badge variant="danger">Due {formatCurrency(sale.balanceDue)}</Badge> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(sale.invoiceNumber || '')}
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button type="button" variant="outline" onClick={() => onDownload(sale)}>
                <Download className="h-4 w-4" />
                PDF
              </Button>
              <Button type="button" variant="outline" onClick={() => onPrint(sale)}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!onSendEmail || emailSendingId === sale.id || !(sale.customerEmail || sale.customer?.email)}
                onClick={() => onSendEmail?.(sale)}
              >
                <Mail className="h-4 w-4" />
                {emailSendingId === sale.id ? 'Sending...' : 'Email'}
              </Button>
              {canDelete ? (
                <Button type="button" variant="danger" onClick={() => onDelete(sale)}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
