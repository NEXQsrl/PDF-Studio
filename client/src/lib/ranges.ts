export type RangeResult =
  | { ok: true; groups: number[][] }
  | { ok: false; error: 'empty' }
  | { ok: false; error: 'syntax' | 'range'; token: string }

/**
 * Parses "1-3, 5, 8-" into groups of 0-based page indexes.
 * An open range ("8-") runs to the last page.
 */
export function parseRanges(input: string, pageCount: number): RangeResult {
  const tokens = input
    .split(/[,;]/)
    .map((token) => token.trim())
    .filter(Boolean)
  if (tokens.length === 0) return { ok: false, error: 'empty' }

  const groups: number[][] = []
  for (const token of tokens) {
    const match = /^(\d+)(?:\s*[-–]\s*(\d+)?)?$/.exec(token)
    if (!match) return { ok: false, error: 'syntax', token }

    const start = Number(match[1])
    const isRange = /[-–]/.test(token)
    const end = match[2] ? Number(match[2]) : isRange ? pageCount : start
    if (start < 1 || end > pageCount || start > end) return { ok: false, error: 'range', token }

    groups.push(Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i))
  }
  return { ok: true, groups }
}

/** Splits `pageCount` pages into consecutive groups of `size`. */
export function chunkPages(pageCount: number, size: number): number[][] {
  const step = Math.max(1, Math.floor(size) || 1)
  const groups: number[][] = []
  for (let start = 0; start < pageCount; start += step) {
    groups.push(Array.from({ length: Math.min(step, pageCount - start) }, (_, i) => start + i))
  }
  return groups
}

/** "3" or "3-7" (1-based) for a contiguous group of 0-based indexes. */
export function groupLabel(group: number[]) {
  const first = group[0] + 1
  const last = group[group.length - 1] + 1
  return first === last ? String(first) : `${first}-${last}`
}
