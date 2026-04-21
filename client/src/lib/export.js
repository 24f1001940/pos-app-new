import JSZip from 'jszip'

function normalizeValue(value) {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value)
}

function escapeCsvCell(value) {
  const normalized = normalizeValue(value)
  const escaped = normalized.replaceAll('"', '""')
  return `"${escaped}"`
}

export function buildCsv(columns, rows) {
  const header = columns.map((column) => escapeCsvCell(column.label)).join(',')
  const body = rows
    .map((row) =>
      columns
        .map((column) => escapeCsvCell(typeof column.value === 'function' ? column.value(row) : row[column.key]))
        .join(','),
    )
    .join('\n')

  return `${header}\n${body}`
}

export function downloadCsv(fileName, columns, rows) {
  const csv = buildCsv(columns, rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function openPrintReport({ title, subtitle = '', columns, rows }) {
  const tableHead = columns
    .map((column) => `<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">${normalizeValue(column.label)}</th>`)
    .join('')

  const tableRows = rows
    .map((row) => {
      const cells = columns
        .map((column) => {
          const value = typeof column.value === 'function' ? column.value(row) : row[column.key]
          return `<td style="padding:8px;border-bottom:1px solid #eee;">${normalizeValue(value)}</td>`
        })
        .join('')
      return `<tr>${cells}</tr>`
    })
    .join('')

  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720')
  if (!printWindow) {
    return
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>${normalizeValue(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
          h1 { margin: 0 0 6px; }
          p { margin: 0 0 16px; color: #444; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>${normalizeValue(title)}</h1>
        <p>${normalizeValue(subtitle)}</p>
        <table>
          <thead><tr>${tableHead}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

export async function downloadFinancePack({
  fileName,
  suppliers = [],
  expenses = [],
  purchaseOrders = [],
  generatedAt,
  metrics,
}) {
  const zip = new JSZip()

  const suppliersCsv = buildCsv(
    [
      { label: 'Name', value: (supplier) => supplier.name },
      { label: 'Phone', value: (supplier) => supplier.phone || '' },
      { label: 'Email', value: (supplier) => supplier.email || '' },
      { label: 'Payment Terms (days)', value: (supplier) => supplier.paymentTermsDays || 0 },
      { label: 'Opening Balance', value: (supplier) => Number(supplier.openingBalance || 0).toFixed(2) },
      { label: 'Status', value: (supplier) => (supplier.active ? 'active' : 'inactive') },
    ],
    suppliers,
  )

  const expensesCsv = buildCsv(
    [
      { label: 'Title', value: (expense) => expense.title },
      { label: 'Category', value: (expense) => expense.category },
      { label: 'Amount', value: (expense) => Number(expense.amount || 0).toFixed(2) },
      { label: 'Payment Method', value: (expense) => expense.paymentMethod || '' },
      { label: 'Paid To', value: (expense) => expense.paidTo || '' },
      { label: 'Date', value: (expense) => normalizeValue(expense.expenseDate) },
    ],
    expenses,
  )

  const purchaseOrdersCsv = buildCsv(
    [
      { label: 'PO Number', value: (order) => order.poNumber },
      { label: 'Supplier', value: (order) => order.supplier?.name || '' },
      { label: 'Status', value: (order) => order.status || '' },
      { label: 'Total', value: (order) => Number(order.total || 0).toFixed(2) },
      { label: 'Amount Paid', value: (order) => Number(order.amountPaid || 0).toFixed(2) },
      { label: 'Amount Due', value: (order) => Number(order.amountDue || 0).toFixed(2) },
      { label: 'Ordered At', value: (order) => normalizeValue(order.orderedAt) },
    ],
    purchaseOrders,
  )

  const summaryText = [
    'Finance Pack Summary',
    `Generated At: ${normalizeValue(generatedAt)}`,
    '',
    `Suppliers Included: ${suppliers.length}`,
    `Expenses Included: ${expenses.length}`,
    `Purchase Orders Included: ${purchaseOrders.length}`,
    '',
    `Revenue: ${metrics?.revenue ?? 0}`,
    `Expenses: ${metrics?.expenses ?? 0}`,
    `Profit: ${metrics?.profit ?? 0}`,
    `Supplier Payable: ${metrics?.payable ?? 0}`,
  ].join('\n')

  const printTemplate = `
<html>
  <head>
    <title>Finance Pack Report</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
      h1 { margin: 0 0 8px; }
      p { margin: 0 0 10px; color: #444; }
      ul { margin: 0; padding-left: 18px; }
      li { margin: 4px 0; }
    </style>
  </head>
  <body>
    <h1>Finance Pack Report</h1>
    <p>Generated at ${normalizeValue(generatedAt)}</p>
    <ul>
      <li>Revenue: ${metrics?.revenue ?? 0}</li>
      <li>Expenses: ${metrics?.expenses ?? 0}</li>
      <li>Profit: ${metrics?.profit ?? 0}</li>
      <li>Supplier payable: ${metrics?.payable ?? 0}</li>
    </ul>
    <p>Use browser Print to save this template as PDF.</p>
  </body>
</html>
`.trim()

  zip.file('suppliers.csv', suppliersCsv)
  zip.file('expenses.csv', expensesCsv)
  zip.file('purchase-orders.csv', purchaseOrdersCsv)
  zip.file('summary.txt', summaryText)
  zip.file('report-template.html', printTemplate)

  const content = await zip.generateAsync({ type: 'blob' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(content)
  link.href = url
  link.download = fileName.endsWith('.zip') ? fileName : `${fileName}.zip`
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
