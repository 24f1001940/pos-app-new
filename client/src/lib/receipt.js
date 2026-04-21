import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { formatCurrency } from './currency'
import { printInvoiceHtml } from './desktop'
import { formatDateTime } from './utils'

function getReceiptMeta(sale, settings) {
  return sale.receiptMeta || settings || {}
}

function sanitizeInvoiceText(value) {
  const input = String(value || '')

  // Repair known corruption pattern where each character is prefixed with '&', e.g. &S&u&b...
  if (/^(?:&[^&\s]){4,}/.test(input)) {
    return input.replace(/&/g, '')
  }

  // Keep printable content only and normalize unicode representation.
  return input
    .normalize('NFKC')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
}

function safeValue(value, fallback = '-') {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  return sanitizeInvoiceText(String(value))
}

function formatCurrencyForPdf(value) {
  // jsPDF built-in fonts can render INR inconsistently, use stable ASCII currency text.
  return `Rs ${Number(value || 0).toFixed(2)}`
}

function getPaymentSummary(sale) {
  if (!Array.isArray(sale.payments) || !sale.payments.length) {
    return [{ method: sale.paymentMethod || 'cash', amount: sale.amountPaid || 0, reference: '' }]
  }

  return sale.payments
}

export function downloadReceiptPdf(sale, settings) {
  const receipt = new jsPDF({ unit: 'pt', format: 'a4' })
  const meta = getReceiptMeta(sale, settings)
  const paymentSummary = getPaymentSummary(sale)
  const pageWidth = receipt.internal.pageSize.getWidth()
  receipt.setFont('helvetica', 'normal')

  receipt.setFillColor(16, 24, 40)
  receipt.rect(0, 0, pageWidth, 96, 'F')
  receipt.setTextColor(255, 255, 255)
  receipt.setFontSize(20)
  receipt.text(safeValue(meta.shopName || 'Mujahid Electronic Goods'), 36, 40)
  receipt.setFontSize(10)
  receipt.text(safeValue(meta.address, ''), 36, 58)
  receipt.text(
    safeValue([meta.contactPhone, meta.contactEmail].filter(Boolean).join(' | '), ''),
    36,
    74,
  )

  receipt.setFontSize(11)
  receipt.text(`Invoice: ${safeValue(sale.invoiceNumber)}`, pageWidth - 210, 36)
  receipt.text(`Date: ${safeValue(formatDateTime(sale.date), '-')}`, pageWidth - 210, 52)
  receipt.text(`Payment: ${safeValue(sale.paymentMethod).toUpperCase()}`, pageWidth - 210, 68)

  receipt.setTextColor(17, 24, 39)
  receipt.setDrawColor(229, 231, 235)
  receipt.roundedRect(36, 116, pageWidth - 72, 84, 8, 8)
  receipt.setFontSize(11)
  receipt.text('Bill To', 50, 138)
  receipt.setFontSize(10)
  receipt.text(`Name: ${safeValue(sale.customerName || sale.customer?.name, 'Walk-in customer')}`, 50, 156)
  receipt.text(`Phone: ${safeValue(sale.customerPhone || sale.customer?.phone)}`, 50, 172)
  receipt.text(`Email: ${safeValue(sale.customerEmail || sale.customer?.email)}`, 50, 188)

  autoTable(receipt, {
    startY: 224,
    head: [['Item', 'SKU', 'Qty', 'Unit Price', 'Subtotal']],
    body: sale.items.map((item) => [
      safeValue(item.name),
      safeValue(item.sku),
      item.quantity,
      formatCurrencyForPdf(item.price),
      formatCurrencyForPdf(item.subtotal),
    ]),
    theme: 'striped',
    styles: { fontSize: 10, cellPadding: 6, font: 'helvetica' },
    headStyles: {
      fillColor: [17, 24, 39],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
  })

  const finalY = receipt.lastAutoTable.finalY + 18
  const totalsX = pageWidth - 236

  receipt.setFontSize(10)
  receipt.text(`Subtotal: ${formatCurrencyForPdf(sale.subtotal)}`, totalsX, finalY)
  receipt.text(`Discount: -${formatCurrencyForPdf(sale.discountAmount || 0)}`, totalsX, finalY + 16)
  receipt.text(`GST (${sale.taxRate}%): ${formatCurrencyForPdf(sale.tax)}`, totalsX, finalY + 32)
  receipt.setFontSize(12)
  receipt.setFont(undefined, 'bold')
  receipt.text(`Grand Total: ${formatCurrencyForPdf(sale.total)}`, totalsX, finalY + 52)
  receipt.setFont(undefined, 'normal')
  receipt.setFontSize(10)
  receipt.text(`Amount Paid: ${formatCurrencyForPdf(sale.amountPaid || 0)}`, totalsX, finalY + 70)
  receipt.text(`Balance Due: ${formatCurrencyForPdf(sale.balanceDue || 0)}`, totalsX, finalY + 86)

  let paymentsY = finalY
  receipt.text('Payment Breakdown', 36, paymentsY)
  paymentsY += 14
  paymentSummary.forEach((payment) => {
    receipt.text(
      `${safeValue(payment.method).toUpperCase()}  ${formatCurrencyForPdf(payment.amount || 0)}  ${safeValue(payment.reference, '')}`,
      36,
      paymentsY,
    )
    paymentsY += 14
  })

  if (sale.notes) {
    paymentsY += 8
    receipt.text(`Notes: ${safeValue(sale.notes)}`, 36, paymentsY)
  }

  const footerY = Math.max(paymentsY + 20, receipt.internal.pageSize.getHeight() - 46)
  receipt.setDrawColor(209, 213, 219)
  receipt.line(36, footerY - 12, pageWidth - 36, footerY - 12)
  receipt.setFontSize(9)
  receipt.text(
    safeValue(
      meta.receiptFooter || 'Thank you for choosing us. Warranty terms apply as per product category.',
    ),
    36,
    footerY,
  )

  receipt.save(`${sale.invoiceNumber}.pdf`)
}

export function printReceipt(sale, settings) {
  const meta = getReceiptMeta(sale, settings)
  const rows = sale.items
    .map(
      (item) => `
        <tr>
          <td>${safeValue(item.name)}</td>
          <td>${safeValue(item.sku, '')}</td>
          <td>${item.quantity}</td>
          <td>${formatCurrency(item.price)}</td>
          <td>${formatCurrency(item.subtotal)}</td>
        </tr>
      `,
    )
    .join('')

  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>${sale.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 22px; color: #111827; }
          .hero { background: #101828; color: #fff; padding: 14px 16px; border-radius: 10px; }
          .hero h1 { font-size: 20px; margin: 0 0 4px 0; }
          .meta { margin: 12px 0 0 0; font-size: 12px; color: #d1d5db; }
          .customer { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; margin-top: 14px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 0; text-align: left; font-size: 12px; }
          th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #4b5563; }
          .totals { margin-left: auto; width: 280px; font-size: 12px; }
          .totals p { display: flex; justify-content: space-between; margin: 4px 0; }
          .totals .grand { font-size: 14px; font-weight: 700; border-top: 1px solid #d1d5db; padding-top: 8px; margin-top: 8px; }
          .footer { margin-top: 18px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 11px; color: #4b5563; }
          p { margin: 2px 0; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="hero">
          <h1>${safeValue(meta.shopName || 'Mujahid Electronic Goods')}</h1>
          <p>${safeValue(meta.address || '', '')}</p>
          <p>${safeValue([meta.contactPhone, meta.contactEmail].filter(Boolean).join(' | '), '')}</p>
          <p class="meta">Invoice ${safeValue(sale.invoiceNumber)} | ${safeValue(formatDateTime(sale.date), '-')}</p>
        </div>
        <div class="customer">
          <p><strong>Customer:</strong> ${safeValue(sale.customerName || sale.customer?.name, 'Walk-in customer')}</p>
          <p><strong>Phone:</strong> ${safeValue(sale.customerPhone || sale.customer?.phone)}</p>
          <p><strong>Email:</strong> ${safeValue(sale.customerEmail || sale.customer?.email)}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>SKU</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="totals">
          <p><span>Subtotal</span><span>${formatCurrency(sale.subtotal)}</span></p>
          <p><span>Discount</span><span>-${formatCurrency(sale.discountAmount || 0)}</span></p>
          <p><span>GST (${sale.taxRate}%)</span><span>${formatCurrency(sale.tax)}</span></p>
          <p><span>Paid</span><span>${formatCurrency(sale.amountPaid || 0)}</span></p>
          <p><span>Balance Due</span><span>${formatCurrency(sale.balanceDue || 0)}</span></p>
          <p class="grand"><span>Total</span><span>${formatCurrency(sale.total)}</span></p>
        </div>
        ${sale.notes ? `<p><strong>Notes:</strong> ${safeValue(sale.notes)}</p>` : ''}
        <div class="footer">${safeValue(meta.receiptFooter || 'Thank you for your purchase.')}</div>
      </body>
    </html>
  `

  printInvoiceHtml(html).then((result) => {
    if (result?.ok) {
      return
    }

    const printWindow = window.open('', '_blank', 'width=420,height=800')
    if (!printWindow) {
      return
    }

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  })
}
