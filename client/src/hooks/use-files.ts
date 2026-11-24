import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { ApiError, downloadBlob, runPlan, type PlanOutput } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { MAX_FILE_MB, useStore } from '@/store'

/** Adds PDFs to the workspace and reports whatever had to be skipped. */
export function useAddFiles() {
  const { t } = useI18n()
  const addFiles = useStore((s) => s.addFiles)

  return useCallback(
    async (files: File[]) => {
      if (files.length === 0) return
      const result = await addFiles(files)

      for (const { name, reason } of result.rejected.slice(0, 4)) {
        toast.error(t(`err.${reason}`, { file: name, max: MAX_FILE_MB }))
      }
      if (!result.persisted) toast.warning(t('err.storage'))
    },
    [addFiles, t],
  )
}

/** Sends a plan to the server and downloads the result. */
export function useExport() {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)

  const run = useCallback(
    async (outputs: PlanOutput[], archiveName: string) => {
      if (outputs.length === 0) return
      setBusy(true)
      try {
        const names = new Map(useStore.getState().files.map((f) => [f.id, f.name]))
        const blob = await runPlan(outputs, names)
        downloadBlob(blob, outputs.length === 1 ? `${outputs[0].name}.pdf` : `${archiveName}.zip`)
        toast.success(t('export.done'))
      } catch (err) {
        const { code, file = 'PDF', maxFileMb = MAX_FILE_MB } =
          err instanceof ApiError ? err : new ApiError('server_error')
        if (code === 'encrypted' || code === 'invalid_pdf') toast.error(t(`err.${code}`, { file }))
        else if (code === 'too_large') toast.error(t('err.upload_too_large', { max: maxFileMb }))
        else if (code === 'network') toast.error(t('err.network'))
        else toast.error(t('err.server'))
      } finally {
        setBusy(false)
      }
    },
    [t],
  )

  return { busy, run }
}
