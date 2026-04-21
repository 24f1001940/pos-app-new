import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/auth-context.jsx'
import { DataSyncProvider } from './context/data-sync-context.jsx'
import { NotificationProvider } from './context/notification-context.jsx'
import { ThemeProvider } from './context/theme-context.jsx'
import { registerServiceWorker } from './lib/pwa.js'
import { queryClient } from './lib/query-client.js'
import { initSentry } from './lib/sentry.js'

registerServiceWorker()
initSentry()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <DataSyncProvider>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </DataSyncProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
