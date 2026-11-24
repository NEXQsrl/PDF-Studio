import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl

/**
 * In-memory registry of the loaded PDFs. Blobs are kept out of React state:
 * components only ever deal with file ids.
 */
const blobs = new Map<string, Blob>()
const docs = new Map<string, Promise<PDFDocumentProxy>>()
const thumbs = new Map<string, Promise<string>>()

const THUMB_WIDTH = 360

export function registerBlob(id: string, blob: Blob) {
  blobs.set(id, blob)
}

export function getBlob(id: string) {
  return blobs.get(id)
}

function getDoc(id: string) {
  let doc = docs.get(id)
  if (!doc) {
    const blob = blobs.get(id)
    if (!blob) return Promise.reject(new Error(`Unknown file ${id}`))
    // pdf.js transfers the buffer to its worker, so it always gets a fresh copy.
    doc = blob.arrayBuffer().then((buffer) => getDocument({ data: new Uint8Array(buffer) }).promise)
    docs.set(id, doc)
    doc.catch(() => docs.delete(id))
  }
  return doc
}

export type InspectResult =
  | { ok: true; pageCount: number }
  | { ok: false; reason: 'encrypted' | 'invalid' }

/** Opens a registered file to validate it and count its pages. */
export async function inspect(id: string): Promise<InspectResult> {
  try {
    const doc = await getDoc(id)
    const { info } = await doc.getMetadata()
    // Even without an open password, encrypted PDFs cannot be rewritten by the server.
    if ((info as { EncryptFilterName?: string | null }).EncryptFilterName) {
      return { ok: false, reason: 'encrypted' }
    }
    return { ok: true, pageCount: doc.numPages }
  } catch (err) {
    const encrypted = (err as { name?: string })?.name === 'PasswordException'
    return { ok: false, reason: encrypted ? 'encrypted' : 'invalid' }
  }
}

// Thumbnails render one at a time so a large document never floods the worker.
let queue: Promise<unknown> = Promise.resolve()

async function renderThumb(id: string, index: number): Promise<string> {
  const doc = await getDoc(id)
  const page = await doc.getPage(index + 1)
  const base = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: THUMB_WIDTH / base.width })

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  await page.render({ canvas, viewport }).promise
  page.cleanup()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.8))
  canvas.width = canvas.height = 0
  if (!blob) throw new Error('Thumbnail rendering failed')
  return URL.createObjectURL(blob)
}

/** Object URL of a page preview (0-based index), rendered once and cached. */
export function getThumb(id: string, index: number): Promise<string> {
  const key = `${id}:${index}`
  let thumb = thumbs.get(key)
  if (!thumb) {
    thumb = queue.then(() => renderThumb(id, index))
    queue = thumb.catch(() => undefined)
    thumbs.set(key, thumb)
    thumb.catch(() => thumbs.delete(key))
  }
  return thumb
}

/** Frees everything held for a file. */
export function release(id: string) {
  blobs.delete(id)
  for (const [key, thumb] of thumbs) {
    if (key.startsWith(`${id}:`)) {
      thumbs.delete(key)
      thumb.then((url) => URL.revokeObjectURL(url)).catch(() => undefined)
    }
  }
  const doc = docs.get(id)
  docs.delete(id)
  // Wait for queued renders before tearing the document down.
  doc?.then((d) => queue.then(() => d.loadingTask.destroy())).catch(() => undefined)
}
