import { useEffect, useRef, useState, type ReactNode } from 'react'
import { FileUp, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAddFiles } from '@/hooks/use-files'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { MAX_FILE_MB, useStore } from '@/store'

/** Hidden file input + a function that opens the system file picker. */
function useFilePicker() {
  const addFiles = useAddFiles()
  const inputRef = useRef<HTMLInputElement>(null)

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="application/pdf,.pdf"
      multiple
      hidden
      // The programmatic click must not bubble back to a clickable parent.
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        void addFiles(Array.from(e.target.files ?? []))
        e.target.value = ''
      }}
    />
  )
  return { input, open: () => inputRef.current?.click() }
}

/** Large drop target shown while the workspace is empty. */
export function Dropzone() {
  const { t } = useI18n()
  const reading = useStore((s) => s.reading > 0)
  const { input, open } = useFilePicker()

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open()
        }
      }}
      className="group relative flex cursor-pointer flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-border bg-card/60 px-6 py-14 text-center shadow-sm outline-none backdrop-blur-sm transition-colors hover:border-primary/50 hover:bg-primary/[0.03] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring/30"
    >
      {input}
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:-translate-y-1">
        {reading ? <Loader2 className="size-6 animate-spin" /> : <FileUp className="size-6" />}
      </div>
      <div className="space-y-1">
        <p className="font-heading text-lg font-semibold tracking-tight">
          {reading ? t('drop.reading') : t('drop.title')}
        </p>
        <p className="text-sm text-muted-foreground">{t('drop.hint', { max: MAX_FILE_MB })}</p>
      </div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {t('drop.or')}
        {/* The whole area is clickable: this is only a visual affordance. */}
        <Button asChild size="lg" className="pointer-events-none h-9 px-4">
          <span>{t('drop.browse')}</span>
        </Button>
      </div>
    </div>
  )
}

/** Compact "add more" button used once files are loaded. */
export function AddFilesButton() {
  const { t } = useI18n()
  const reading = useStore((s) => s.reading > 0)
  const { input, open } = useFilePicker()

  return (
    <>
      {input}
      <Button variant="outline" onClick={open} disabled={reading}>
        {reading ? <Loader2 className="animate-spin" /> : <Plus />}
        {t('add')}
      </Button>
    </>
  )
}

const hasFiles = (event: DragEvent) => Boolean(event.dataTransfer?.types.includes('Files'))

/** Lets the user drop PDFs anywhere on the page. */
export function GlobalDrop({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const addFiles = useAddFiles()
  const [active, setActive] = useState(false)

  useEffect(() => {
    let depth = 0
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth++
      setActive(true)
    }
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault()
    }
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setActive(false)
    }
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setActive(false)
      void addFiles(Array.from(e.dataTransfer?.files ?? []))
    }

    window.addEventListener('dragenter', enter)
    window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  }, [addFiles])

  return (
    <>
      {children}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-6 opacity-0 backdrop-blur-sm transition-opacity duration-150',
          active && 'opacity-100',
        )}
      >
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-primary bg-primary/5">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30">
            <FileUp className="size-7" />
          </div>
          <p className="font-heading text-xl font-semibold tracking-tight">{t('drop.overlay')}</p>
        </div>
      </div>
    </>
  )
}
