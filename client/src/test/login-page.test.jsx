import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import LoginPage from '@/pages/login-page'

const mockNavigate = vi.fn()
const mockLogin = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    login: mockLogin,
    bootstrap: vi.fn(),
    isAuthenticated: false,
  }),
}))

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(async () => ({ data: { setupRequired: false } })),
  },
}))

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockLogin.mockReset()
  })

  test('submits login credentials', async () => {
    mockLogin.mockResolvedValueOnce({})

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    const emailInput = await screen.findByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')

    fireEvent.change(emailInput, { target: { value: 'admin@test.com' } })
    fireEvent.change(passwordInput, { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'admin@test.com',
        password: 'secret123',
      })
    })
  })
})
