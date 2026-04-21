import { useMemo, useState } from 'react'
import { ArrowUpDown, Check, Pencil, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'

export function ProductTableView({
  products,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  sortBy,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
  onInlineSave,
  allSelected,
}) {
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState({ sp: '', stock: '' })

  const sortIcon = useMemo(
    () => (sortDirection === 'asc' ? '↑' : '↓'),
    [sortDirection],
  )

  function startInlineEdit(product) {
    setEditingId(product.id)
    setDraft({ sp: String(product.sp ?? ''), stock: String(product.stock ?? '') })
  }

  async function saveInlineEdit(productId) {
    await onInlineSave(productId, {
      sp: Number(draft.sp),
      stock: Number(draft.stock),
    })
    setEditingId(null)
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/40 bg-white/70 shadow-lg shadow-slate-950/5 dark:border-white/10 dark:bg-slate-950/35">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-background/90 backdrop-blur-xl">
            <tr className="border-b border-border/60 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <th className="px-4 py-3">
                <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} />
              </th>
              <th className="px-4 py-3">
                <button type="button" className="inline-flex items-center gap-2" onClick={() => onSort('name')}>
                  Product {sortBy === 'name' ? sortIcon : <ArrowUpDown className="h-3.5 w-3.5" />}
                </button>
              </th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">
                <button type="button" className="inline-flex items-center gap-2" onClick={() => onSort('sp')}>
                  Selling Price {sortBy === 'sp' ? sortIcon : <ArrowUpDown className="h-3.5 w-3.5" />}
                </button>
              </th>
              <th className="px-4 py-3">
                <button type="button" className="inline-flex items-center gap-2" onClick={() => onSort('stock')}>
                  Stock {sortBy === 'stock' ? sortIcon : <ArrowUpDown className="h-3.5 w-3.5" />}
                </button>
              </th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const isEditing = editingId === product.id

              return (
                <tr key={product.id} className="border-b border-border/50 last:border-0 hover:bg-background/50">
                  <td className="px-4 py-3 align-middle">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.id)}
                      onChange={() => onToggleSelect(product.id)}
                    />
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-xl bg-muted">
                        {product.image?.url ? (
                          <img src={product.image.url} alt={product.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-semibold text-muted-foreground">
                            {product.name.slice(0, 1)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.sku || 'No SKU'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle">{product.category}</td>
                  <td className="px-4 py-3 align-middle">
                    {isEditing ? (
                      <Input
                        type="number"
                        className="h-9 w-28"
                        value={draft.sp}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, sp: event.target.value }))
                        }
                      />
                    ) : (
                      formatCurrency(product.sp)
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {isEditing ? (
                      <Input
                        type="number"
                        className="h-9 w-24"
                        value={draft.stock}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, stock: event.target.value }))
                        }
                      />
                    ) : (
                      <span className="font-semibold">{product.stock}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <Badge variant={product.isLowStock ? 'danger' : 'success'}>
                      {product.isLowStock ? 'Low' : 'Healthy'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 align-middle text-right">
                    <div className="inline-flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <Button type="button" variant="outline" size="sm" onClick={() => saveInlineEdit(product.id)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={cn('h-9 px-3')}
                            onClick={() => startInlineEdit(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => onEdit(product)}>
                            Edit
                          </Button>
                          <Button type="button" variant="danger" size="sm" onClick={() => onDelete(product)}>
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
