import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader } from '@/components/ui/loader'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'
import { getErrorMessage } from '@/lib/utils'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, bootstrap, isAuthenticated } = useAuth()
  const [setupRequired, setSetupRequired] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [bootstrapForm, setBootstrapForm] = useState({
    name: '',
    email: '',
    password: '',
  })

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    api
      .get('/auth/bootstrap')
      .then((response) => setSetupRequired(response.data.setupRequired))
      .catch(() => setSetupRequired(false))
  }, [])

  async function handleLogin(event) {
    event.preventDefault()
    setLoading(true)

    try {
      await login(loginForm)
      toast.success('Welcome back')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  async function handleBootstrap(event) {
    event.preventDefault()
    setLoading(true)

    try {
      await bootstrap(bootstrapForm)
      toast.success('Admin account created')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  if (setupRequired === null) {
    return <Loader label="Preparing storefront" />
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-hero-grid opacity-70" />
      <div className="relative grid w-full max-w-6xl gap-8 lg:grid-cols-[1.25fr_0.95fr]">
        <div className="rounded-[2rem] border border-white/50 bg-slate-950 p-10 text-white shadow-2xl shadow-slate-950/20">
          <p className="text-sm uppercase tracking-[0.36em] text-cyan-300/80">
            Retail OS
          </p>
          <h1 className="mt-4 text-5xl leading-tight">
            Electronics retail, POS, and analytics in one command center.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-300">
            Manage products, bill customers quickly, monitor stock risks, and
            review revenue without switching tools.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ['Fast POS', 'Grid-based billing with GST-ready totals'],
              ['Smart Inventory', 'Custom low-stock thresholds per product'],
              ['Actionable Analytics', 'Revenue, profit, and category insights'],
            ].map(([title, description]) => (
              <div key={title} className="rounded-3xl bg-white/5 p-5">
                <p className="font-semibold">{title}</p>
                <p className="mt-2 text-sm text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </div>
        <Card className="self-center">
          <CardContent className="space-y-6 p-8">
            <div>
              <p className="text-sm uppercase tracking-[0.32em] text-muted-foreground">
                {setupRequired ? 'First-time setup' : 'Secure sign in'}
              </p>
              <h2 className="mt-2 text-3xl">
                {setupRequired ? 'Create the admin account' : 'Access the dashboard'}
              </h2>
            </div>
            {setupRequired ? (
              <form className="space-y-4" onSubmit={handleBootstrap}>
                <Input
                  placeholder="Owner name"
                  value={bootstrapForm.name}
                  onChange={(event) =>
                    setBootstrapForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={bootstrapForm.email}
                  onChange={(event) =>
                    setBootstrapForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Password"
                  type="password"
                  value={bootstrapForm.password}
                  onChange={(event) =>
                    setBootstrapForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create admin account'}
                </Button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleLogin}>
                <Input
                  placeholder="Email"
                  type="email"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Password"
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Login'}
                </Button>
              </form>
            )}
            <div className="rounded-2xl bg-accent p-4 text-sm text-accent-foreground">
              Demo seed credentials:
              <br />
              Admin: `admin@mujahidgoods.com` / `Admin@123`
              <br />
              Staff: `staff@mujahidgoods.com` / `Staff@123`
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
