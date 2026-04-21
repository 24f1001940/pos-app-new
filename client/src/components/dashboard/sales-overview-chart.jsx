import { useLayoutEffect, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { formatCurrency } from '@/lib/currency'

export function SalesOverviewChart({ data, valueKey = 'total' }) {
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

  return (
    <div ref={containerRef} className="h-[320px] min-w-0">
      {containerSize.width > 0 && containerSize.height > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="salesFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              contentStyle={{
                borderRadius: '16px',
                border: '1px solid rgba(148, 163, 184, 0.24)',
              }}
            />
            <Area
              type="monotone"
              dataKey={valueKey}
              stroke="#f59e0b"
              strokeWidth={3}
              fill="url(#salesFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : null}
    </div>
  )
}
