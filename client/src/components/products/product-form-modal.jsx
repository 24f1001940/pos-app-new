import { useEffect, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const emptyForm = {
  name: '',
  category: '',
  sku: '',
  barcode: '',
  stock: 0,
  lowStockLimit: 2,
  cp: 0,
  sp: 0,
  image: { url: '', publicId: '' },
}

export function ProductFormModal({
  open,
  onOpenChange,
  initialProduct,
  categories,
  onSubmit,
  loading,
}) {
  const [form, setForm] = useState(emptyForm)
  const [file, setFile] = useState(null)

  useEffect(() => {
    setForm(initialProduct || emptyForm)
    setFile(null)
  }, [initialProduct, open])

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    await onSubmit(form, file)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialProduct ? 'Edit product' : 'Add new product'}
          </DialogTitle>
          <DialogDescription>
            Manage inventory details, pricing, and low-stock limits.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <Input
            placeholder="Product name"
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
          />
          <div>
            <Input
              list="category-options"
              placeholder="Category"
              value={form.category}
              onChange={(event) => updateField('category', event.target.value)}
            />
            <datalist id="category-options">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>
          <Input
            placeholder="SKU"
            value={form.sku || ''}
            onChange={(event) => updateField('sku', event.target.value)}
          />
          <Input
            placeholder="Barcode"
            value={form.barcode || ''}
            onChange={(event) => updateField('barcode', event.target.value)}
          />
          <Input
            type="number"
            placeholder="Stock quantity"
            value={form.stock}
            onChange={(event) => updateField('stock', Number(event.target.value))}
          />
          <Input
            type="number"
            placeholder="Low stock limit"
            value={form.lowStockLimit}
            onChange={(event) =>
              updateField('lowStockLimit', Number(event.target.value))
            }
          />
          <Input
            type="number"
            placeholder="Cost price"
            value={form.cp}
            onChange={(event) => updateField('cp', Number(event.target.value))}
          />
          <Input
            type="number"
            placeholder="Selling price"
            value={form.sp}
            onChange={(event) => updateField('sp', Number(event.target.value))}
          />
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Product image
            </label>
            <Input
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Notes
            </label>
            <Textarea
              placeholder="Optional internal notes about bundle details or warranty."
              value={form.notes || ''}
              onChange={(event) => updateField('notes', event.target.value)}
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialProduct ? 'Update product' : 'Create product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
