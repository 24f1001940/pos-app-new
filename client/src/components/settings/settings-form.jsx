import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

export function SettingsForm({
  values,
  setValues,
  onSubmit,
  saving,
  isAdmin,
}) {
  function updateField(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shop Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <Input
            placeholder="Shop name"
            value={values.shopName || ''}
            onChange={(event) => updateField('shopName', event.target.value)}
            disabled={!isAdmin}
          />
          <Input
            placeholder="Contact phone"
            value={values.contactPhone || ''}
            onChange={(event) => updateField('contactPhone', event.target.value)}
            disabled={!isAdmin}
          />
          <Input
            placeholder="Contact email"
            value={values.contactEmail || ''}
            onChange={(event) => updateField('contactEmail', event.target.value)}
            disabled={!isAdmin}
          />
          <Input
            placeholder="Tax rate"
            type="number"
            value={values.taxRate || 0}
            onChange={(event) => updateField('taxRate', Number(event.target.value))}
            disabled={!isAdmin}
          />
          <div className="md:col-span-2">
            <Textarea
              placeholder="Address"
              value={values.address || ''}
              onChange={(event) => updateField('address', event.target.value)}
              disabled={!isAdmin}
            />
          </div>
          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Dark mode</p>
                <p className="text-sm text-muted-foreground">
                  Keep the POS interface comfortable at night.
                </p>
              </div>
              <Switch
                checked={Boolean(values.darkMode)}
                onCheckedChange={(checked) => updateField('darkMode', checked)}
                disabled={!isAdmin}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Low stock popup</p>
                <p className="text-sm text-muted-foreground">
                  Highlight inventory risks inside the dashboard.
                </p>
              </div>
              <Switch
                checked={Boolean(values.enableLowStockPopup)}
                onCheckedChange={(checked) =>
                  updateField('enableLowStockPopup', checked)
                }
                disabled={!isAdmin}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Email alerts</p>
                <p className="text-sm text-muted-foreground">
                  Send critical stock warnings by email.
                </p>
              </div>
              <Switch
                checked={Boolean(values.enableEmailAlerts)}
                onCheckedChange={(checked) =>
                  updateField('enableEmailAlerts', checked)
                }
                disabled={!isAdmin}
              />
            </div>
          </div>
          <Input
            placeholder="Low stock alert email"
            value={values.lowStockEmail || ''}
            onChange={(event) => updateField('lowStockEmail', event.target.value)}
            disabled={!isAdmin}
          />
          <div className="md:col-span-2">
            <Textarea
              placeholder="Receipt footer"
              value={values.receiptFooter || ''}
              onChange={(event) => updateField('receiptFooter', event.target.value)}
              disabled={!isAdmin}
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={!isAdmin || saving}>
              {saving ? 'Saving...' : 'Save settings'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
