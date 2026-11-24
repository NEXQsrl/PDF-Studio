import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'
import { PageThumb } from '@/components/page-thumb'
import { ExportBar, Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useExport } from '@/hooks/use-files'
import { cleanFileName } from '@/lib/api'
import { formatSize } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useStore, type PdfFile } from '@/store'

export function useSortSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
}

function FileRow({ file, position }: { file: PdfFile; position: number }) {
  const { t, tn, lang } = useI18n()
  const removeFile = useStore((s) => s.removeFile)
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: file.id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl border bg-background p-2 pr-3 transition-shadow',
        isDragging && 'z-10 shadow-xl ring-1 ring-primary/40',
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={t('file.drag')}
        className="flex h-12 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/60 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <span className="w-5 shrink-0 text-center text-sm font-medium text-muted-foreground tabular-nums">
        {position}
      </span>

      <PageThumb fileId={file.id} index={0} className="w-10 shrink-0 rounded-md border" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={file.name}>
          {file.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {tn('pages', file.pageCount)} · {formatSize(file.size, lang)}
        </p>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('file.remove')}
            className="text-muted-foreground hover:text-destructive"
            onClick={() => removeFile(file.id)}
          >
            <X />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('file.remove')}</TooltipContent>
      </Tooltip>
    </li>
  )
}

export function MergePanel() {
  const { t, tn } = useI18n()
  const files = useStore((s) => s.files)
  const name = useStore((s) => s.names.merge)
  const setName = useStore((s) => s.setName)
  const moveFile = useStore((s) => s.moveFile)
  const sensors = useSortSensors()
  const { busy, run } = useExport()

  const totalPages = files.reduce((sum, f) => sum + f.pageCount, 0)

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    moveFile(
      files.findIndex((f) => f.id === active.id),
      files.findIndex((f) => f.id === over.id),
    )
  }

  const merge = () => {
    const outputName = cleanFileName(name, t('merge.defaultName'))
    void run(
      [
        {
          name: outputName,
          pages: files.flatMap((f) =>
            Array.from({ length: f.pageCount }, (_, page) => ({ fileId: f.id, page })),
          ),
        },
      ],
      outputName,
    )
  }

  return (
    <Panel
      title={t('merge.title')}
      description={t('merge.desc')}
      footer={
        <ExportBar
          name={name}
          onNameChange={(value) => setName('merge', value)}
          placeholder={t('merge.defaultName')}
          hint={
            files.length < 2
              ? t('merge.needTwo')
              : `${tn('files', files.length)} · ${tn('pages', totalPages)}`
          }
          label={t('merge.action')}
          busy={busy}
          disabled={files.length < 2}
          onExport={merge}
        />
      }
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={files.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {files.map((file, i) => (
              <FileRow key={file.id} file={file} position={i + 1} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </Panel>
  )
}
