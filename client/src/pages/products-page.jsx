import { useDeferredValue, useMemo, useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LayoutGrid, List, PackageSearch, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { ProductCard } from '@/components/products/product-card'
import { ProductFilters } from '@/components/products/product-filters'
import { ProductFormModal } from '@/components/products/product-form-modal'
import { ProductTableView } from '@/components/products/product-table-view'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader } from '@/components/ui/loader'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import { api, cachedGet } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { cacheKeys } from '@/lib/storage'
import { formatCompactNumber } from '@/lib/utils'
import { getErrorMessage } from '@/lib/utils'

const initialFilters = {
  search: '',
  category: 'all',
  minPrice: '',
  maxPrice: '',
  stockStatus: 'all',
}

export default function ProductsPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState(initialFilters)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const [sortBy, setSortBy] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const deferredSearch = useDeferredValue(filters.search)
  const pageSize = 24
  const sentinelRef = useRef(null)

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['products', filters.category, filters.minPrice, filters.maxPrice, filters.stockStatus, deferredSearch],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      cachedGet('/products', {
        params: {
          search: deferredSearch || undefined,
          category: filters.category,
          minPrice: filters.minPrice || undefined,
          maxPrice: filters.maxPrice || undefined,
          stockStatus: filters.stockStatus !== 'all' ? filters.stockStatus : undefined,
          page: pageParam,
          limit: pageSize,
        },
        cacheKey: pageParam === 1 ? cacheKeys.products : undefined,
      }),
    getNextPageParam: (lastPage) => {
      const page = Number(lastPage?.pagination?.page || 1)
      const totalPages = Number(lastPage?.pagination?.totalPages || 1)
      return page < totalPages ? page + 1 : undefined
    },
  })

  const saveProductMutation = useMutation({
    mutationFn: async ({ values, file }) => {
      let image = values.image

      if (file) {
        const formData = new FormData()
        formData.append('image', file)
        const uploadResponse = await api.post('/uploads/image', formData)
        image = {
          url: uploadResponse.data.url,
          publicId: uploadResponse.data.publicId,
        }
      }

      const payload = { ...values, image }

      if (selectedProduct) {
        await api.put(`/products/${selectedProduct.id}`, payload)
      } else {
        await api.post('/products', payload)
      }
    },
    onSuccess: () => {
      toast.success(selectedProduct ? 'Product updated' : 'Product created')
      setDialogOpen(false)
      setSelectedProduct(null)
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const deleteProductMutation = useMutation({
    mutationFn: (productId) => api.delete(`/products/${productId}`),
    onSuccess: () => {
      toast.success('Product deleted')
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const inlineEditMutation = useMutation({
    mutationFn: ({ productId, payload }) => api.put(`/products/${productId}`, payload),
    onSuccess: () => {
      toast.success('Product updated inline')
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map((id) => api.delete(`/products/${id}`)))
    },
    onSuccess: () => {
      toast.success('Selected products deleted')
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  function openCreateDialog() {
    setSelectedProduct(null)
    setDialogOpen(true)
  }

  function openEditDialog(product) {
    setSelectedProduct(product)
    setDialogOpen(true)
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(`Delete ${product.name}?`)
    if (!confirmed) {
      return
    }

    deleteProductMutation.mutate(product.id)
  }

  const products = (data?.pages || []).flatMap((page) => page.products || [])
  const categories = data?.pages?.[0]?.categories || []
  const totalProducts = Number(data?.pages?.[0]?.pagination?.total || products.length)
  const sortedProducts = [...products].sort((left, right) => {
    const leftValue = left[sortBy]
    const rightValue = right[sortBy]

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return sortDirection === 'asc' ? leftValue - rightValue : rightValue - leftValue
    }

    return sortDirection === 'asc'
      ? String(leftValue || '').localeCompare(String(rightValue || ''))
      : String(rightValue || '').localeCompare(String(leftValue || ''))
  })

  const currentProducts = sortedProducts
  const selectedCount = selectedIds.size
  const totalInventoryValue = products.reduce(
    (sum, product) => sum + Number(product.sp || 0) * Number(product.stock || 0),
    0,
  )
  const lowStockCount = products.filter((product) => product.isLowStock).length

  const handleLoadMore = useMemo(
    () => () => {
      if (!hasNextPage || isFetchingNextPage) {
        return
      }

      fetchNextPage()
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  )

  useInfiniteScroll({
    targetRef: sentinelRef,
    enabled: Boolean(hasNextPage) && !isFetchingNextPage,
    onLoadMore: handleLoadMore,
  })

  if (isLoading) {
    return <Loader label="Loading inventory" />
  }

  function toggleSort(column) {
    if (sortBy === column) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortBy(column)
    setSortDirection('asc')
  }

  function toggleSelect(productId) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

  function toggleSelectAll() {
    if (currentProducts.every((product) => selectedIds.has(product.id))) {
      const next = new Set(selectedIds)
      currentProducts.forEach((product) => next.delete(product.id))
      setSelectedIds(next)
      return
    }

    const next = new Set(selectedIds)
    currentProducts.forEach((product) => next.add(product.id))
    setSelectedIds(next)
  }

  async function handleBulkDelete() {
    if (!selectedCount) {
      return
    }

    const confirmed = window.confirm(`Delete ${selectedCount} selected products?`)

    if (!confirmed) {
      return
    }

    bulkDeleteMutation.mutate(Array.from(selectedIds))
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total SKUs</p>
            <p className="mt-2 text-3xl font-bold">{formatCompactNumber(products.length)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Inventory Value (SP)</p>
            <p className="mt-2 text-3xl font-bold">{formatCurrency(totalInventoryValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Low Stock Alerts</p>
            <p className="mt-2 text-3xl font-bold">{lowStockCount}</p>
          </CardContent>
        </Card>
      </section>

      <ProductFilters
        filters={filters}
        setFilters={setFilters}
        categories={categories}
        onAddClick={openCreateDialog}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-white/35 bg-white/65 px-4 py-3 dark:border-white/10 dark:bg-slate-950/35">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" /> Grid
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'table' ? 'default' : 'outline'}
            onClick={() => setViewMode('table')}
          >
            <List className="h-4 w-4" /> Table
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <PackageSearch className="h-4 w-4" />
          Showing {currentProducts.length} of {totalProducts} products
        </div>
      </div>

      {selectedCount ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Badge>{selectedCount} selected</Badge>
            Use bulk actions for faster catalog maintenance.
          </div>
          <Button type="button" variant="danger" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="h-4 w-4" /> Delete selected
          </Button>
        </div>
      ) : null}

      {data?._cached ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Network unavailable. Showing cached inventory data.
        </p>
      ) : null}

      {viewMode === 'grid' ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {currentProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => openEditDialog(product)}
              onDelete={() => handleDelete(product)}
            />
          ))}
        </div>
      ) : (
        <ProductTableView
          products={currentProducts}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={toggleSort}
          onEdit={openEditDialog}
          onDelete={handleDelete}
          onInlineSave={(productId, payload) => inlineEditMutation.mutateAsync({ productId, payload })}
          allSelected={
            currentProducts.length > 0 &&
            currentProducts.every((product) => selectedIds.has(product.id))
          }
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Loaded {currentProducts.length} of {totalProducts} products
        </p>
        <div className="flex items-center gap-2">
          <div ref={sentinelRef} className="h-1 w-1" aria-hidden="true" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasNextPage || isFetchingNextPage}
            onClick={handleLoadMore}
          >
            {isFetchingNextPage ? 'Loading...' : hasNextPage ? 'Load more' : 'All loaded'}
          </Button>
        </div>
      </div>

      <ProductFormModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialProduct={selectedProduct}
        categories={categories}
        loading={saveProductMutation.isPending}
        onSubmit={(values, file) => saveProductMutation.mutateAsync({ values, file })}
      />
    </div>
  )
}
