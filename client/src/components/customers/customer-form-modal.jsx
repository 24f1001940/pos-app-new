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
  email: '',
  phone: '',
  address: '',
  notes: '',
  tags: '',
  active: true,
}

export function CustomerFormModal({ open, onOpenChange, initialCustomer, onSubmit, loading }) {
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (initialCustomer) {
      setForm({
        ...emptyForm,
        ...initialCustomer,
        tags: Array.isArray(initialCustomer.tags) ? initialCustomer.tags.join(', ') : '',
      })
      return
    }

    setForm(emptyForm)
  }, [initialCustomer, open])

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const values = {
      ...form,
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    }
    await onSubmit(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialCustomer ? 'Edit customer' : 'Add customer'}</DialogTitle>
          <DialogDescription>
            Store customer contact details, notes, and loyalty-related information.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <Input
            placeholder="Customer name"
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
          />
          <Input
            placeholder="Email"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
          />
          <Input
            placeholder="Phone"
            value={form.phone}
            onChange={(event) => updateField('phone', event.target.value)}
          />
          <Input
            placeholder="Address"
            value={form.address}
            onChange={(event) => updateField('address', event.target.value)}
          />
          <div className="md:col-span-2">
            <Input
              placeholder="Tags, comma separated"
              value={form.tags}
              onChange={(event) => updateField('tags', event.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Textarea
              placeholder="Customer notes"
              value={form.notes}
              onChange={(event) => updateField('notes', event.target.value)}
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialCustomer ? 'Update customer' : 'Create customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
