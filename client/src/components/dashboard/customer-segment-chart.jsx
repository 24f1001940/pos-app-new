import { useLayoutEffect, useRef, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { TopCustomersList } from '@/components/dashboard/top-customers-list'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function CustomerSegmentChart({
  data = [],
  topCustomers = [],
  pagination = null,
  onPrevious,
  onNext,
}) {
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
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Customer Segments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div ref={containerRef} className="h-[320px] min-w-0">
          {containerSize.width > 0 && containerSize.height > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0891b2" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </div>

        <TopCustomersList
          customers={topCustomers}
          pagination={pagination}
          onPrevious={onPrevious}
          onNext={onNext}
        />
      </CardContent>
    </Card>
  )
}
