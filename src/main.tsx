import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import L from 'leaflet'

import App from './App'
import './index.css'
import 'leaflet/dist/leaflet.css'
import { AuthProvider } from './providers/AuthProvider'

const iconRetinaUrl = new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString()
const iconUrl = new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString()
const shadowUrl = new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString()

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
})

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </AuthProvider>
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  </React.StrictMode>,
)
