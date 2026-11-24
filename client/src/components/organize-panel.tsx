import { useMemo, useState } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, RotateCcw, RotateCw, Trash2, Undo2 } from 'lucide-react'
import { useSortSensors } from '@/components/merge-panel'
import { PageThumb } from '@/components/page-thumb'
import { ExportBar, Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useExport } from '@/hooks/use-files'
import { cleanFileName } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FILE_COLORS, useStore, type PageRef, type PdfFile } from '@/store'

interface TileProps {
  page: PageRef
  file: PdfFile | undefined
  position: number
  selected: boolean
  onToggle: () => void
}

function PageTile({ page, file, position, selected, onToggle }: TileProps) {
  const { t } = useI18n()
  const rotatePages = useStore((s) => s.rotatePages)
  const removePages = useStore((s) => s.removePages)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
  })

  const origin = t('page.from', { file: file?.name ?? '', n: page.index + 1 })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('group relative', isDragging && 'z-10')}
      {...attributes}
      {...listeners}
      aria-label={origin}
    >
      <div
        onClick={onToggle}
        className={cn(
          'cursor-grab overflow-hidden rounded-xl border bg-background ring-offset-2 ring-offset-card transition-shadow active:cursor-grabbing',
          selected && 'ring-2 ring-primary',
          isDragging && 'shadow-2xl',
        )}
      >
        <PageThumb fileId={page.fileId} index={page.index} rotation={page.rotation} />
        <div className="flex items-center gap-1.5 border-t px-2 py-1.5 text-xs" title={origin}>
          <span className="font-medium tabular-nums">{position}</span>
          <span
            className="ml-auto size-2 shrink-0 rounded-full"
            style={{ backgroundColor: FILE_COLORS[(file?.color ?? 0) % FILE_COLORS.length] }}
          />
          <span className="truncate text-muted-foreground">
            {file?.name.replace(/\.pdf$/i, '')} · {page.index + 1}
          </span>
        </div>
      </div>

      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        aria-label={t('page.label', { n: position })}
        onClick={onToggle}
        className={cn(
          'absolute top-2 left-2 flex size-5 items-center justify-center rounded-md border bg-background/90 text-primary-foreground shadow-sm outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring',
          selected
            ? 'border-primary bg-primary'
            : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100',
        )}
      >
        {selected && <Check className="size-3.5" strokeWidth={3} />}
      </button>

      <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">
        <Button
          variant="secondary"
          size="icon-xs"
          className="shadow-sm"
          aria-label={t('organize.rotateRight')}
          onClick={() => rotatePages([page.id], 90)}
        >
          <RotateCw />
        </Button>
        <Button
          variant="secondary"
          size="icon-xs"
          className="shadow-sm hover:text-destructive"
          aria-label={t('organize.delete')}
          onClick={() => removePages([page.id])}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  )
}

export function OrganizePanel() {
  const { t, tn } = useI18n()
  const files = useStore((s) => s.files)
  const pages = useStore((s) => s.pages)
  const name = useStore((s) => s.names.organize)
  const setName = useStore((s) => s.setName)
  const movePage = useStore((s) => s.movePage)
  const rotatePages = useStore((s) => s.rotatePages)
  const removePages = useStore((s) => s.removePages)
  const resetPages = useStore((s) => s.resetPages)
  const sensors = useSortSensors()
  const { busy, run } = useExport()

  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())
  // Pages can disappear (deleted, file removed): only count the ones still there.
  const selected = useMemo(() => pages.filter((p) => picked.has(p.id)).map((p) => p.id), [pages, picked])
  const fileById = useMemo(() => new Map(files.map((f) => [f.id, f])), [files])

  const toggle = (id: string) =>
    setPicked((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    movePage(
      pages.findIndex((p) => p.id === active.id),
      pages.findIndex((p) => p.id === over.id),
    )
  }

  const exportPdf = () => {
    const outputName = cleanFileName(name, t('organize.defaultName'))
    void run(
      [
        {
          name: outputName,
          pages: pages.map((p) => ({ fileId: p.fileId, page: p.index, rotate: p.rotation })),
        },
      ],
      outputName,
    )
  }

  const hasSelection = selected.length > 0

  return (
    <Panel
      title={t('organize.title')}
      description={t('organize.desc')}
      actions={
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            disabled={pages.length === 0}
            onClick={() => setPicked(hasSelection ? new Set() : new Set(pages.map((p) => p.id)))}
          >
            {hasSelection ? t('organize.deselect') : t('organize.selectAll')}
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={!hasSelection}
                aria-label={t('organize.rotateLeft')}
                onClick={() => rotatePages(selected, -90)}
              >
                <RotateCcw />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('organize.rotateLeft')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={!hasSelection}
                aria-label={t('organize.rotateRight')}
                onClick={() => rotatePages(selected, 90)}
              >
                <RotateCw />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('organize.rotateRight')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={!hasSelection}
                aria-label={t('organize.delete')}
                className="hover:text-destructive"
                onClick={() => removePages(selected)}
              >
                <Trash2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('organize.delete')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  resetPages()
                  setPicked(new Set())
                }}
              >
                <Undo2 />
                {t('organize.reset')}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('organize.reset.tip')}</TooltipContent>
          </Tooltip>
        </div>
      }
      footer={
        <ExportBar
          name={name}
          onNameChange={(value) => setName('organize', value)}
          placeholder={t('organize.defaultName')}
          hint={
            <>
              {tn('pages', pages.length)}
              {hasSelection && ` · ${tn('selected', selected.length)}`}
            </>
          }
          label={t('organize.action')}
          busy={busy}
          disabled={pages.length === 0}
          onExport={exportPdf}
        />
      }
    >
      {pages.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-14 text-sm text-muted-foreground">
          {t('organize.empty')}
          <Button variant="outline" size="sm" onClick={resetPages}>
            <Undo2 />
            {t('organize.reset')}
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-4">
              {pages.map((page, i) => (
                <PageTile
                  key={page.id}
                  page={page}
                  file={fileById.get(page.fileId)}
                  position={i + 1}
                  selected={picked.has(page.id)}
                  onToggle={() => toggle(page.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </Panel>
  )
}
