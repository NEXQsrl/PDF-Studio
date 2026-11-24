export function formatSize(bytes: number, locale: string) {
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1
  return `${value.toLocaleString(locale, { maximumFractionDigits: digits })} ${units[unit]}`
}

/** File name without its .pdf extension. */
export const baseName = (name: string) => name.replace(/\.pdf$/i, '')
