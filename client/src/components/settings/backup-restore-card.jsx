import { Download, RotateCcw, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function BackupRestoreCard({
  isAdmin,
  onBackup,
  onRestore,
  onReset,
  loading,
  lastUpdated,
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup & Restore</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Last settings update:{' '}
          {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Not available'}
        </p>
        <div className="grid gap-4 md:grid-cols-3">
        <Button type="button" variant="outline" onClick={onBackup} disabled={!isAdmin}>
          <Download className="h-4 w-4" />
          Export backup
        </Button>
        <label>
          <input
            type="file"
            accept="application/json"
            className="hidden"
            disabled={!isAdmin || loading}
            onChange={(event) => onRestore(event.target.files?.[0])}
          />
          <span className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-white/60 px-4 text-sm font-semibold dark:bg-slate-900/50">
            <Upload className="h-4 w-4" />
            Restore backup
          </span>
        </label>
        <Button type="button" variant="danger" onClick={onReset} disabled={!isAdmin}>
          <RotateCcw className="h-4 w-4" />
          Reset system
        </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Reset will remove business data. Keep a backup before running reset.
        </p>
      </CardContent>
    </Card>
  )
}
