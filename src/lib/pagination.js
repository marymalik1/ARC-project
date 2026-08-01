/**
 * Builds the windowed page list the designs call for — 1 2 3 … 250 — collapsing
 * runs of skipped pages into ellipsis markers.
 */
export function buildPageItems(current, last) {
  const pages = new Set([1, last, current - 1, current, current + 1])

  if (current <= 3) {
    pages.add(2)
    pages.add(3)
  }

  if (current >= last - 2) {
    pages.add(last - 1)
    pages.add(last - 2)
  }

  const sorted = [...pages].filter((page) => page >= 1 && page <= last).sort((a, b) => a - b)
  const items = []
  let previous = 0

  for (const page of sorted) {
    if (previous && page - previous > 1) {
      items.push({ key: `gap-${page}`, ellipsis: true })
    }

    items.push({ key: page, page })
    previous = page
  }

  return items
}
