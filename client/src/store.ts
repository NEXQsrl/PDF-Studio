import { create } from 'zustand'
import { inspect, registerBlob, release } from '@/lib/pdf'
import {
  clearAll,
  deleteFile,
  loadFile,
  loadSession,
  pruneFiles,
  saveFile,
  saveSession,
} from '@/lib/storage'

export const MAX_FILE_MB = 100

export type Tool = 'merge' | 'split' | 'organize'
export type SplitMode = 'each' | 'chunks' | 'ranges'

export interface PdfFile {
  id: string
  name: string
  size: number
  pageCount: number
  /** Index in the colour palette, used to tell files apart in the page grid. */
  color: number
}

export interface PageRef {
  id: string
  fileId: string
  /** 0-based page index inside its file */
  index: number
  rotation: number
}

export interface SplitSettings {
  fileId: string | null
  mode: SplitMode
  chunk: number
  ranges: string
  combine: boolean
}

export type RejectReason = 'not_pdf' | 'too_large' | 'encrypted' | 'invalid' | 'duplicate'

export interface AddResult {
  added: number
  rejected: { name: string; reason: RejectReason }[]
  /** False when the browser refused to cache at least one file. */
  persisted: boolean
}

interface Session {
  version: 1
  files: PdfFile[]
  pages: PageRef[]
  tool: Tool
  split: SplitSettings
  names: { merge: string; organize: string }
}

interface State extends Omit<Session, 'version'> {
  /** True once the cached session has been read. */
  ready: boolean
  /** Number of files currently being read. */
  reading: number

  hydrate: () => Promise<number>
  addFiles: (files: File[]) => Promise<AddResult>
  removeFile: (id: string) => void
  moveFile: (from: number, to: number) => void
  setTool: (tool: Tool) => void
  setSplit: (patch: Partial<SplitSettings>) => void
  setName: (tool: 'merge' | 'organize', name: string) => void
  movePage: (from: number, to: number) => void
  rotatePages: (ids: Iterable<string>, delta: number) => void
  removePages: (ids: Iterable<string>) => void
  resetPages: () => void
  clear: () => Promise<void>
}

export const FILE_COLORS = [
  'oklch(0.62 0.2 277)',
  'oklch(0.7 0.17 162)',
  'oklch(0.72 0.17 55)',
  'oklch(0.65 0.2 12)',
  'oklch(0.68 0.15 230)',
  'oklch(0.7 0.18 320)',
  'oklch(0.75 0.16 100)',
  'oklch(0.6 0.12 200)',
]

const uid = () => crypto.randomUUID()

const pagesOf = (file: PdfFile): PageRef[] =>
  Array.from({ length: file.pageCount }, (_, index) => ({
    id: uid(),
    fileId: file.id,
    index,
    rotation: 0,
  }))

function move<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const next = list.slice()
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}

const isPdf = (file: File) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name)

const initialSplit: SplitSettings = {
  fileId: null,
  mode: 'each',
  chunk: 2,
  ranges: '',
  combine: false,
}

let hydration: Promise<number> | undefined

export const useStore = create<State>((set, get) => ({
  ready: false,
  reading: 0,
  files: [],
  pages: [],
  tool: 'merge',
  split: initialSplit,
  names: { merge: '', organize: '' },

  hydrate: () => {
    hydration ??= (async () => {
      const session = await loadSession<Session>()
      if (session?.version !== 1 || !Array.isArray(session.files)) {
        set({ ready: true })
        return 0
      }

      // Keep only the files whose content is still in the cache.
      const files: PdfFile[] = []
      for (const file of session.files) {
        const blob = await loadFile(file.id)
        if (blob) {
          registerBlob(file.id, blob)
          files.push(file)
        }
      }
      const alive = new Set(files.map((f) => f.id))
      const split = { ...initialSplit, ...session.split }
      if (!split.fileId || !alive.has(split.fileId)) split.fileId = files[0]?.id ?? null

      set({
        ready: true,
        files,
        pages: (session.pages ?? []).filter((p) => alive.has(p.fileId)),
        tool: session.tool ?? 'merge',
        split,
        names: session.names ?? { merge: '', organize: '' },
      })
      void pruneFiles(alive)
      return files.length
    })()
    return hydration
  },

  addFiles: async (incoming) => {
    const result: AddResult = { added: 0, rejected: [], persisted: true }
    set((s) => ({ reading: s.reading + incoming.length }))

    for (const file of incoming) {
      try {
        const reject = (reason: RejectReason) => result.rejected.push({ name: file.name, reason })

        if (!isPdf(file)) {
          reject('not_pdf')
          continue
        }
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
          reject('too_large')
          continue
        }
        if (get().files.some((f) => f.name === file.name && f.size === file.size)) {
          reject('duplicate')
          continue
        }

        const id = uid()
        registerBlob(id, file)
        const info = await inspect(id)
        if (!info.ok) {
          release(id)
          reject(info.reason)
          continue
        }

        if (!(await saveFile(id, file))) result.persisted = false

        set((s) => {
          const used = new Set(s.files.map((f) => f.color))
          const free = FILE_COLORS.findIndex((_, i) => !used.has(i))
          const entry: PdfFile = {
            id,
            name: file.name,
            size: file.size,
            pageCount: info.pageCount,
            color: free === -1 ? s.files.length % FILE_COLORS.length : free,
          }
          return {
            files: [...s.files, entry],
            pages: [...s.pages, ...pagesOf(entry)],
            split: s.split.fileId ? s.split : { ...s.split, fileId: id },
          }
        })
        result.added++
      } finally {
        set((s) => ({ reading: s.reading - 1 }))
      }
    }
    return result
  },

  removeFile: (id) => {
    release(id)
    void deleteFile(id)
    set((s) => {
      const files = s.files.filter((f) => f.id !== id)
      return {
        files,
        pages: s.pages.filter((p) => p.fileId !== id),
        split: s.split.fileId === id ? { ...s.split, fileId: files[0]?.id ?? null } : s.split,
      }
    })
  },

  moveFile: (from, to) => set((s) => ({ files: move(s.files, from, to) })),
  setTool: (tool) => set({ tool }),
  setSplit: (patch) => set((s) => ({ split: { ...s.split, ...patch } })),
  setName: (tool, name) => set((s) => ({ names: { ...s.names, [tool]: name } })),

  movePage: (from, to) => set((s) => ({ pages: move(s.pages, from, to) })),

  rotatePages: (ids, delta) => {
    const target = new Set(ids)
    set((s) => ({
      pages: s.pages.map((p) =>
        target.has(p.id) ? { ...p, rotation: (((p.rotation + delta) % 360) + 360) % 360 } : p,
      ),
    }))
  },

  removePages: (ids) => {
    const target = new Set(ids)
    set((s) => ({ pages: s.pages.filter((p) => !target.has(p.id)) }))
  },

  resetPages: () => set((s) => ({ pages: s.files.flatMap(pagesOf) })),

  clear: async () => {
    for (const file of get().files) release(file.id)
    set({ files: [], pages: [], tool: 'merge', split: initialSplit, names: { merge: '', organize: '' } })
    await clearAll()
  },
}))

// Persist the session (not the PDFs, which are cached when added) shortly after every change.
let saveTimer: ReturnType<typeof setTimeout> | undefined

function snapshot(): Session {
  const { files, pages, tool, split, names } = useStore.getState()
  return { version: 1, files, pages, tool, split, names }
}

useStore.subscribe((state, previous) => {
  if (!state.ready) return
  const changed =
    state.files !== previous.files ||
    state.pages !== previous.pages ||
    state.tool !== previous.tool ||
    state.split !== previous.split ||
    state.names !== previous.names
  if (!changed) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void saveSession(snapshot()), 200)
})

// Don't lose the last edits if the tab is closed within the debounce window.
window.addEventListener('pagehide', () => {
  if (useStore.getState().ready) void saveSession(snapshot())
})
