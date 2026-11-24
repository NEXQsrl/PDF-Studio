import { PDFDocument, degrees } from 'pdf-lib'
import JSZip from 'jszip'

export const LIMITS = {
  maxOutputs: 2000,
  maxPages: 10000,
}

/** Error carrying a machine-readable code the client translates. */
export class PdfError extends Error {
  constructor(code, status = 400, extra = {}) {
    super(code)
    this.code = code
    this.status = status
    this.extra = extra
  }
}

const ROTATIONS = new Set([0, 90, 180, 270])

/**
 * A plan describes the PDFs to build:
 * { outputs: [{ name, pages: [{ file, page, rotate }] }] }
 * `file` is the index of an uploaded file, `page` is 0-based.
 */
export function validatePlan(plan, fileCount) {
  if (!plan || !Array.isArray(plan.outputs) || plan.outputs.length === 0) {
    throw new PdfError('invalid_plan')
  }
  if (plan.outputs.length > LIMITS.maxOutputs) throw new PdfError('too_many_outputs')

  let total = 0
  for (const output of plan.outputs) {
    if (!output || !Array.isArray(output.pages) || output.pages.length === 0) {
      throw new PdfError('invalid_plan')
    }
    for (const p of output.pages) {
      const ok =
        p &&
        Number.isInteger(p.file) &&
        p.file >= 0 &&
        p.file < fileCount &&
        Number.isInteger(p.page) &&
        p.page >= 0 &&
        ROTATIONS.has(p.rotate ?? 0)
      if (!ok) throw new PdfError('invalid_plan')
    }
    total += output.pages.length
    if (total > LIMITS.maxPages) throw new PdfError('too_many_pages')
  }
}

export function safeName(name, fallback = 'document') {
  const base = String(name ?? '')
    .replace(/\.pdf$/i, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .split(/\s+/)
    .filter((part) => part && !/^\.+$/.test(part))
    .join(' ')
    .slice(0, 120)
    .trim()
  return base || fallback
}

async function loadSource(file) {
  try {
    return await PDFDocument.load(file.buffer, { updateMetadata: false })
  } catch (err) {
    const encrypted = /encrypted/i.test(String(err?.message))
    throw new PdfError(encrypted ? 'encrypted' : 'invalid_pdf', 422, {
      file: file.originalname,
    })
  }
}

/**
 * Builds every output of the plan.
 * @param {{ buffer: Uint8Array, originalname: string }[]} files
 * @returns {Promise<{ name: string, bytes: Uint8Array }[]>}
 */
export async function buildOutputs(files, plan) {
  validatePlan(plan, files.length)

  // Sources are parsed lazily and only once, however many outputs use them.
  const sources = new Map()
  const source = (index) => {
    if (!sources.has(index)) sources.set(index, loadSource(files[index]))
    return sources.get(index)
  }

  const results = []
  const usedNames = new Set()

  for (const output of plan.outputs) {
    const doc = await PDFDocument.create()

    // Copy consecutive pages of the same file in a single call.
    let i = 0
    while (i < output.pages.length) {
      const fileIndex = output.pages[i].file
      let j = i
      while (j < output.pages.length && output.pages[j].file === fileIndex) j++
      const run = output.pages.slice(i, j)

      const src = await source(fileIndex)
      const pageCount = src.getPageCount()
      if (run.some((p) => p.page >= pageCount)) {
        throw new PdfError('page_out_of_range', 422, { file: files[fileIndex].originalname })
      }

      const copied = await doc.copyPages(
        src,
        run.map((p) => p.page),
      )
      copied.forEach((page, k) => {
        const extra = run[k].rotate ?? 0
        if (extra) page.setRotation(degrees((page.getRotation().angle + extra) % 360))
        doc.addPage(page)
      })
      i = j
    }

    doc.setProducer('PDF Studio')
    const bytes = await doc.save()

    // Keep names unique so nothing is overwritten inside the zip.
    const base = safeName(output.name)
    let name = base
    for (let n = 2; usedNames.has(name.toLowerCase()); n++) name = `${base} (${n})`
    usedNames.add(name.toLowerCase())

    results.push({ name: `${name}.pdf`, bytes })
  }

  return results
}

export async function zipOutputs(outputs) {
  const zip = new JSZip()
  for (const out of outputs) zip.file(out.name, out.bytes)
  // PDFs are already compressed: storing them is faster and barely larger.
  return zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' })
}
