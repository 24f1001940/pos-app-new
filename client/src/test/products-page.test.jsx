import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import ProductsPage from '@/pages/products-page'

const cachedGetMock = vi.fn(async () => ({
  products: [
    {
      id: 'p-1',
      name: 'Gaming Keyboard',
      category: 'Accessories',
      stock: 5,
      lowStockLimit: 1,
      cp: 1200,
      sp: 1800,
      isLowStock: false,
    },
  ],
  categories: ['Accessories'],
  pagination: { page: 1, totalPages: 1, total: 1, limit: 50 },
}))

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(async () => ({ data: {} })),
    put: vi.fn(async () => ({ data: {} })),
    delete: vi.fn(async () => ({ data: {} })),
  },
  cachedGet: (...args) => cachedGetMock(...args),
}))

describe('ProductsPage', () => {
  test('shows products and opens add product modal', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <ProductsPage />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Gaming Keyboard')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add Product' }))

    expect(await screen.findByText('Add new product')).toBeInTheDocument()
  })
})
