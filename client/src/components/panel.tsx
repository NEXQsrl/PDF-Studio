import type { ReactNode } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/lib/i18n'

interface PanelProps {
  title: string
  description: string
  actions?: ReactNode
  footer?: ReactNode
  children: ReactNode
}

export function Panel({ title, description, actions, footer, children }: PanelProps) {
  return (
    <section className="rounded-2xl border bg-card shadow-sm shadow-black/[0.03]">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 p-5 sm:p-6">
        <div className="min-w-0 space-y-1">
          <h2 className="font-heading text-lg font-semibold tracking-tight">{title}</h2>
          <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
        </div>
        {actions}
      </header>
      <div className="px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
      {footer && (
        <footer className="bottom-0 z-20 sm:sticky rounded-b-2xl border-t bg-card/85 p-4 backdrop-blur-md sm:px-6">
          {footer}
        </footer>
      )}
    </section>
  )
}

interface ExportBarProps {
  /** Omit to hide the name field (e.g. when file names are derived). */
  name?: string
  onNameChange?: (name: string) => void
  placeholder?: string
  extension?: string
  hint?: ReactNode
  label: string
  busy: boolean
  disabled?: boolean
  onExport: () => void
}

/** Output name + the primary action of a tool. */
export function ExportBar({
  name,
  onNameChange,
  placeholder,
  extension = '.pdf',
  hint,
  label,
  busy,
  disabled,
  onExport,
}: ExportBarProps) {
  const { t } = useI18n()

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
      onSubmit={(e) => {
        e.preventDefault()
        if (!busy && !disabled) onExport()
      }}
    >
      {onNameChange ? (
        <div className="relative sm:w-72">
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={placeholder}
            aria-label={t('export.name')}
            maxLength={120}
            className="h-9 pr-12"
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            {extension}
          </span>
        </div>
      ) : null}
      <div className="min-w-0 flex-1 text-sm text-muted-foreground">{hint}</div>
      <Button type="submit" size="lg" disabled={busy || disabled} className="h-9 px-4">
        {busy ? <Loader2 className="animate-spin" /> : <Download />}
        {busy ? t('export.working') : label}
      </Button>
    </form>
  )
}
