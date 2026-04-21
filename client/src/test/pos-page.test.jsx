import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

import POSPage from '@/pages/pos-page'

const postMock = vi.fn(async (url) => {
  if (url === '/sales') {
    return {
      data: {
        id: 's-1',
        invoiceNumber: 'MEG-INV-001',
        total: 1180,
        items: [],
      },
    }
  }

  return { data: {} }
})

const cachedGetMock = vi.fn(async (url) => {
  if (url === '/products') {
    return {
      products: [
        {
          id: 'p-1',
          name: 'Bluetooth Headset',
          category: 'Audio',
          stock: 10,
          lowStockLimit: 2,
          cp: 800,
          sp: 1000,
          isLowStock: false,
        },
      ],
    }
  }

  if (url === '/customers') {
    return { customers: [] }
  }

  if (url === '/settings') {
    return { taxRate: 18 }
  }

  return {}
})

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'u-1', role: 'admin' },
  }),
}))

vi.mock('@/lib/api', () => ({
  api: {
    post: (...args) => postMock(...args),
    delete: vi.fn(async () => ({ data: {} })),
  },
  cachedGet: (...args) => cachedGetMock(...args),
}))

vi.mock('@/lib/receipt', () => ({
  downloadReceiptPdf: vi.fn(),
  printReceipt: vi.fn(),
}))

describe('POSPage', () => {
  test('adds item to cart and submits checkout', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <POSPage />
      </QueryClientProvider>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Tap to add' }))
    fireEvent.click(screen.getByRole('button', { name: 'Complete Checkout' }))

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith(
        '/sales',
        expect.objectContaining({
          items: [
            expect.objectContaining({
              productId: 'p-1',
              qty: 1,
              price: 1000,
            }),
          ],
        }),
      )
    })
  })
})
