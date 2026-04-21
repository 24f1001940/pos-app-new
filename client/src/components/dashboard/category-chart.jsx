import { useLayoutEffect, useRef, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader } from '@/components/ui/loader'

const colors = ['#f59e0b', '#0891b2', '#10b981', '#8b5cf6', '#ef4444', '#64748b']

export function CategoryChart({ data = [], loading = false, pagination = null, onPrevious, onNext }) {
  const containerRef = useRef(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const node = containerRef.current

    if (!node) {
      return undefined
    }

    const updateSize = () => {
      setContainerSize({
        width: node.clientWidth,
        height: node.clientHeight,
      })
    }

    updateSize()

    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(node)

    return () => resizeObserver.disconnect()
  }, [])

  const safeData = Array.isArray(data)
    ? data
        .map((entry) => ({
          name: entry.name || 'Uncategorized',
          value: Number(entry.value || 0),
        }))
        .filter((entry) => entry.value > 0)
    : []

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Category Distribution</CardTitle>
      </CardHeader>
      <CardContent ref={containerRef} className="h-[320px] min-w-0">
        {loading ? <Loader label="Loading category distribution" /> : null}
        {!loading && !safeData.length ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
            No data available
          </div>
        ) : null}
        {!loading && safeData.length && containerSize.width > 0 && containerSize.height > 0 ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={safeData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={4}
                >
                  {safeData.map((entry, index) => (
                    <Cell key={entry.name} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {pagination ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3">
                <p className="text-xs text-muted-foreground">
                  Page {Number(pagination.page || 1)} of {Number(pagination.totalPages || 1)}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={Number(pagination.page || 1) <= 1}
                    onClick={onPrevious}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={Number(pagination.page || 1) >= Number(pagination.totalPages || 1)}
                    onClick={onNext}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
        {!loading && safeData.length && (containerSize.width <= 0 || containerSize.height <= 0) ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
            Preparing chart...
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
