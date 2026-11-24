import { useMemo } from 'react'
import { PageThumb } from '@/components/page-thumb'
import { ExportBar, Panel } from '@/components/panel'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useExport } from '@/hooks/use-files'
import type { PlanOutput } from '@/lib/api'
import { baseName } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { chunkPages, groupLabel, parseRanges } from '@/lib/ranges'
import { cn } from '@/lib/utils'
import { FILE_COLORS, useStore, type SplitMode } from '@/store'

const MODES: SplitMode[] = ['each', 'chunks', 'ranges']

export function SplitPanel() {
  const { t, tn } = useI18n()
  const files = useStore((s) => s.files)
  const split = useStore((s) => s.split)
  const setSplit = useStore((s) => s.setSplit)
  const { busy, run } = useExport()

  const file = files.find((f) => f.id === split.fileId) ?? files[0]
  const pageCount = file?.pageCount ?? 0

  const parsed = useMemo(() => {
    if (split.mode === 'each') return { ok: true as const, groups: chunkPages(pageCount, 1) }
    if (split.mode === 'chunks') return { ok: true as const, groups: chunkPages(pageCount, split.chunk) }
    return parseRanges(split.ranges, pageCount)
  }, [split.mode, split.chunk, split.ranges, pageCount])

  const groups = parsed.ok ? parsed.groups : []
  const combine = split.mode === 'ranges' && split.combine

  /** For the preview: which output (1-based) each page ends up in. */
  const groupOfPage = useMemo(() => {
    const map = new Map<number, number>()
    groups.forEach((group, g) => {
      for (const page of group) if (!map.has(page)) map.set(page, combine ? 1 : g + 1)
    })
    return map
  }, [groups, combine])

  if (!file) return null

  const outputs: PlanOutput[] = (() => {
    if (groups.length === 0) return []
    const base = baseName(file.name)
    const toPages = (group: number[]) => group.map((page) => ({ fileId: file.id, page }))
    if (combine) {
      const label = groups.map(groupLabel).join(', ')
      const suffix = label.length <= 40 ? ` (${label})` : '_extract'
      return [{ name: `${base}${suffix}`, pages: toPages(groups.flat()) }]
    }
    // Zero-padded so the files sort in page order.
    const width = String(pageCount).length
    const pad = (group: number[]) =>
      groupLabel(group)
        .split('-')
        .map((n) => n.padStart(width, '0'))
        .join('-')
    return groups.map((group) => ({ name: `${base}_${pad(group)}`, pages: toPages(group) }))
  })()

  const error =
    split.mode === 'ranges' && !parsed.ok && split.ranges.trim()
      ? parsed.error === 'empty'
        ? t('split.err.empty')
        : t(`split.err.${parsed.error}`, { token: parsed.token, pages: pageCount })
      : null

  return (
    <Panel
      title={t('split.title')}
      description={t('split.desc')}
      footer={
        <ExportBar
          hint={
            error ? (
              <span className="text-destructive">{error}</span>
            ) : outputs.length > 0 ? (
              tn('willCreate', outputs.length)
            ) : pageCount === 1 ? (
              t('split.single')
            ) : null
          }
          label={t('split.action')}
          busy={busy}
          disabled={outputs.length === 0}
          onExport={() => void run(outputs, `${baseName(file.name)}_split`)}
        />
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="split-file">{t('split.file')}</Label>
          <Select value={file.id} onValueChange={(fileId) => setSplit({ fileId })}>
            <SelectTrigger id="split-file" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {files.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  <span className="truncate">{f.name}</span>
                  <span className="text-muted-foreground">· {tn('pages', f.pageCount)}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>&nbsp;</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={0}
            value={split.mode}
            onValueChange={(mode) => mode && setSplit({ mode: mode as SplitMode })}
            className="w-full"
          >
            {MODES.map((mode) => (
              <ToggleGroupItem key={mode} value={mode} className="flex-1">
                {t(`split.mode.${mode}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {split.mode === 'chunks' && (
          <div className="space-y-2">
            <Label htmlFor="split-chunk">{t('split.chunk')}</Label>
            <Input
              id="split-chunk"
              type="number"
              inputMode="numeric"
              min={1}
              max={Math.max(1, pageCount)}
              value={split.chunk}
              onChange={(e) => setSplit({ chunk: Math.max(1, Math.floor(Number(e.target.value)) || 1) })}
              className="w-32"
            />
          </div>
        )}

        {split.mode === 'ranges' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="split-ranges">{t('split.ranges')}</Label>
              <Input
                id="split-ranges"
                value={split.ranges}
                onChange={(e) => setSplit({ ranges: e.target.value })}
                placeholder={t('split.ranges.placeholder')}
                aria-invalid={Boolean(error)}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">{t('split.ranges.help')}</p>
            </div>
            <div className="flex items-center gap-2.5 sm:pt-7">
              <Switch
                id="split-combine"
                checked={split.combine}
                onCheckedChange={(combine) => setSplit({ combine })}
              />
              <Label htmlFor="split-combine" className="font-normal">
                {t('split.combine')}
              </Label>
            </div>
          </>
        )}
      </div>

      <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-3">
        {Array.from({ length: pageCount }, (_, page) => {
          const group = groupOfPage.get(page)
          const color = group ? FILE_COLORS[(group - 1) % FILE_COLORS.length] : undefined
          return (
            <li
              key={`${file.id}:${page}`}
              className={cn('transition-opacity', !group && 'opacity-35')}
              title={t('page.label', { n: page + 1 })}
            >
              <div
                className="overflow-hidden rounded-lg border-2 border-transparent"
                style={{ borderColor: color }}
              >
                <PageThumb fileId={file.id} index={page} />
              </div>
              <div className="mt-1 flex items-center justify-between gap-1 px-0.5 text-xs">
                <span className="text-muted-foreground tabular-nums">{page + 1}</span>
                {group && (
                  <span
                    className="rounded-full px-1.5 py-px font-medium text-white tabular-nums"
                    style={{ backgroundColor: color }}
                  >
                    PDF {group}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
