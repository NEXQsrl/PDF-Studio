import { Component, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import { clearAll } from '@/lib/storage'

function CrashScreen() {
  const { t } = useI18n()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <TriangleAlert className="size-6" />
      </div>
      <div className="space-y-1.5">
        <h1 className="font-heading text-xl font-semibold tracking-tight">{t('crash.title')}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{t('crash.desc')}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="lg" onClick={() => location.reload()}>
          {t('crash.reload')}
        </Button>
        {/* Escape hatch in case the cached session itself is what breaks the app. */}
        <Button
          size="lg"
          variant="ghost"
          onClick={() => void clearAll().then(() => location.reload())}
        >
          {t('crash.reset')}
        </Button>
      </div>
    </div>
  )
}

/** The session is cached in the browser, so after a crash a reload restores everything. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false }

  static getDerivedStateFromError() {
    return { crashed: true }
  }

  componentDidCatch(error: unknown) {
    console.error(error)
  }

  render() {
    return this.state.crashed ? <CrashScreen /> : this.props.children
  }
}
