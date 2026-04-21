import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'

import { AppShell } from '@/components/layout/app-shell'
import { Loader } from '@/components/ui/loader'
import { useAuth } from '@/hooks/use-auth'

const DashboardPage = lazy(() => import('@/pages/dashboard-page'))
const LoginPage = lazy(() => import('@/pages/login-page'))
const POSPage = lazy(() => import('@/pages/pos-page'))
const CustomersPage = lazy(() => import('@/pages/customers-page'))
const SuppliersPage = lazy(() => import('@/pages/suppliers-page'))
const ExpensesPage = lazy(() => import('@/pages/expenses-page'))
const ProcurementPage = lazy(() => import('@/pages/procurement-page'))
const AiInsightsPage = lazy(() => import('@/pages/ai-insights-page'))
const ProductsPage = lazy(() => import('@/pages/products-page'))
const SalesPage = lazy(() => import('@/pages/sales-page'))
const SettingsPage = lazy(() => import('@/pages/settings-page'))

function ProtectedRoute() {
  const { loading, isAuthenticated } = useAuth()

  if (loading) {
    return <Loader label="Checking session" />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader label="Loading workspace" />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/pos" element={<POSPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/procurement" element={<ProcurementPage />} />
              <Route path="/ai-insights" element={<AiInsightsPage />} />
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  )
}
