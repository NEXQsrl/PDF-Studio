import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/App'
import { ErrorBoundary } from '@/components/error-boundary'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { I18nProvider } from '@/lib/i18n'
import { ThemeProvider } from '@/lib/theme'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <TooltipProvider delayDuration={300}>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
          <Toaster position="top-center" offset={68} richColors />
        </TooltipProvider>
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>,
)
