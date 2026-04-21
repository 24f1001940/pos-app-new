import { createContext, useEffect, useMemo, useState } from 'react'

import { getStoredThemeSettings, setStoredThemeSettings } from '@/lib/storage'

export const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const storedSettings = getStoredThemeSettings()
  const [mode, setMode] = useState(storedSettings.mode)
  const [accent, setAccent] = useState(storedSettings.accent)
  const [systemTheme, setSystemTheme] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (event) => {
      setSystemTheme(event.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const resolvedTheme = mode === 'system' ? systemTheme : mode

  useEffect(() => {
    const root = document.documentElement

    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.dataset.themeMode = mode
    root.dataset.themeResolved = resolvedTheme
    root.dataset.accent = accent

    setStoredThemeSettings({ mode, accent })
  }, [accent, mode, resolvedTheme])

  const value = useMemo(
    () => ({
      mode,
      theme: resolvedTheme,
      resolvedTheme,
      accent,
      setTheme: setMode,
      setMode,
      setAccent,
      toggleTheme: () =>
        setMode((currentMode) =>
          currentMode === 'dark' || (currentMode === 'system' && resolvedTheme === 'dark')
            ? 'light'
            : 'dark',
        ),
    }),
    [accent, mode, resolvedTheme],
  )

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}
