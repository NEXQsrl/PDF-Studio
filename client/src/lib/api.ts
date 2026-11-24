import { getBlob } from '@/lib/pdf'

export interface PlanPage {
  fileId: string
  /** 0-based page index */
  page: number
  rotate?: number
}

export interface PlanOutput {
  /** File name without extension */
  name: string
  pages: PlanPage[]
}

export class ApiError extends Error {
  code: string
  file?: string
  maxFileMb?: number

  constructor(code: string, details: { file?: string; maxFileMb?: number } = {}) {
    super(code)
    this.code = code
    this.file = details.file
    this.maxFileMb = details.maxFileMb
  }
}

/**
 * Asks the server to build the given PDFs. Only the files the plan actually
 * uses are uploaded. Resolves with a PDF (one output) or a ZIP (several).
 */
export async function runPlan(outputs: PlanOutput[], fileNames: Map<string, string>): Promise<Blob> {
  const usedIds = [...new Set(outputs.flatMap((output) => output.pages.map((p) => p.fileId)))]
  const indexOf = new Map(usedIds.map((id, index) => [id, index]))

  const form = new FormData()
  for (const id of usedIds) {
    const blob = getBlob(id)
    if (!blob) throw new ApiError('server_error')
    form.append('files', blob, fileNames.get(id) ?? 'file.pdf')
  }
  form.append(
    'plan',
    JSON.stringify({
      outputs: outputs.map((output) => ({
        name: output.name,
        pages: output.pages.map((p) => ({
          file: indexOf.get(p.fileId),
          page: p.page,
          rotate: p.rotate ?? 0,
        })),
      })),
    }),
  )

  let response: Response
  try {
    response = await fetch('/api/process', { method: 'POST', body: form })
  } catch {
    throw new ApiError('network')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(body?.code ?? 'server_error', body ?? {})
  }
  return response.blob()
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Makes user input safe to use as a file name (without extension). */
export function cleanFileName(name: string, fallback: string) {
  const cleaned = name
    .replace(/\.(pdf|zip)$/i, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || fallback
}
