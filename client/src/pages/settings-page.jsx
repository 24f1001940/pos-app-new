import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, FileClock, ShieldCheck, Store } from 'lucide-react'
import { toast } from 'sonner'

import { BackupRestoreCard } from '@/components/settings/backup-restore-card'
import { SettingsForm } from '@/components/settings/settings-form'
import { Loader } from '@/components/ui/loader'
import { api, cachedGet } from '@/lib/api'
import { cacheKeys } from '@/lib/storage'
import { useAuth } from '@/hooks/use-auth'
import { useTheme } from '@/hooks/use-theme'
import { getErrorMessage } from '@/lib/utils'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { setTheme } = useTheme()
  const [draftValues, setDraftValues] = useState({})

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => cachedGet('/settings', { cacheKey: cacheKeys.settings }),
  })

  const formValues = useMemo(
    () => ({ ...(data || {}), ...draftValues }),
    [data, draftValues],
  )

  const settingsSummary = useMemo(() => {
    return {
      shopName: formValues.shopName || 'Not configured',
      alertsEnabled: Boolean(formValues.enableEmailAlerts),
      lowStockPopup: Boolean(formValues.enableLowStockPopup),
      lastUpdated: formValues.updatedAt,
    }
  }, [formValues])

  const saveMutation = useMutation({
    mutationFn: (payload) => api.put('/settings', payload),
    onSuccess: (response) => {
      toast.success('Settings saved')
      setTheme(response.data.darkMode ? 'dark' : 'light')
      setDraftValues({})
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  async function handleBackup() {
    try {
      const response = await api.get('/settings/backup')
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `meg-backup-${Date.now()}.json`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  async function handleRestore(file) {
    if (!file) {
      return
    }

    try {
      const payload = JSON.parse(await file.text())
      await api.post('/settings/restore', payload)
      toast.success('Backup restored')
      queryClient.invalidateQueries()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  async function handleReset() {
    const confirmation = window.prompt(
      'Type RESET MUJAHID ELECTRONIC GOODS to confirm the reset.',
    )

    if (!confirmation) {
      return
    }

    try {
      await api.post('/settings/reset', { confirmation })
      toast.success('Business data reset')
      queryClient.invalidateQueries()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  if (isLoading) {
    return <Loader label="Loading shop settings" />
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/40 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/35">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <Store className="h-3.5 w-3.5" />
            Store
          </p>
          <p className="mt-2 text-base font-semibold">{settingsSummary.shopName}</p>
        </div>
        <div className="rounded-2xl border border-white/40 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/35">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <Bell className="h-3.5 w-3.5" />
            Email alerts
          </p>
          <p className="mt-2 text-base font-semibold">
            {settingsSummary.alertsEnabled ? 'Enabled' : 'Disabled'}
          </p>
        </div>
        <div className="rounded-2xl border border-white/40 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/35">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Stock alerts
          </p>
          <p className="mt-2 text-base font-semibold">
            {settingsSummary.lowStockPopup ? 'Popup enabled' : 'Popup disabled'}
          </p>
        </div>
        <div className="rounded-2xl border border-white/40 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/35">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <FileClock className="h-3.5 w-3.5" />
            Last update
          </p>
          <p className="mt-2 text-base font-semibold">
            {settingsSummary.lastUpdated
              ? new Date(settingsSummary.lastUpdated).toLocaleString()
              : 'Not available'}
          </p>
        </div>
      </div>

      <SettingsForm
        values={formValues}
        setValues={setDraftValues}
        onSubmit={(event) => {
          event.preventDefault()
          saveMutation.mutate(formValues)
        }}
        saving={saveMutation.isPending}
        isAdmin={user?.role === 'admin'}
      />
      <BackupRestoreCard
        isAdmin={user?.role === 'admin'}
        onBackup={handleBackup}
        onRestore={handleRestore}
        onReset={handleReset}
        loading={saveMutation.isPending}
        lastUpdated={settingsSummary.lastUpdated}
      />
    </div>
  )
}
