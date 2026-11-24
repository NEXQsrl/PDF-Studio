import { createStore, del, get, keys, set, clear } from 'idb-keyval'

/**
 * Crash-safe local cache. Everything lives in the user's browser (IndexedDB):
 * the PDFs themselves plus the session describing what the user was doing.
 */
const db = createStore('pdf-studio', 'cache')

const SESSION_KEY = 'session'
const fileKey = (id: string) => `file:${id}`

export async function saveFile(id: string, blob: Blob): Promise<boolean> {
  try {
    await set(fileKey(id), blob, db)
    return true
  } catch {
    // Quota exceeded or storage disabled (e.g. private browsing).
    return false
  }
}

export async function loadFile(id: string): Promise<Blob | undefined> {
  try {
    const value = await get<Blob>(fileKey(id), db)
    return value instanceof Blob ? value : undefined
  } catch {
    return undefined
  }
}

export function deleteFile(id: string) {
  return del(fileKey(id), db).catch(() => undefined)
}

export function saveSession(session: unknown) {
  return set(SESSION_KEY, session, db).catch(() => undefined)
}

export async function loadSession<T>(): Promise<T | undefined> {
  try {
    return await get<T>(SESSION_KEY, db)
  } catch {
    return undefined
  }
}

/** Removes cached files that no session references any more. */
export async function pruneFiles(keepIds: Iterable<string>) {
  try {
    const keep = new Set([...keepIds].map(fileKey))
    for (const key of await keys(db)) {
      if (typeof key === 'string' && key.startsWith('file:') && !keep.has(key)) await del(key, db)
    }
  } catch {
    // best effort
  }
}

export function clearAll() {
  return clear(db).catch(() => undefined)
}
