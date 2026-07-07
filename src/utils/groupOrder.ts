// Sorting for the Guruhlar lists (main page + AI panel). Each group's title carries
// its number like "#001 …" or "001 …"; sorting by that number makes both lists read
// #001, #002, #003…. A "#N" marker wins over a plain leading number, and a leading
// number wins over any later number in the name (e.g. a year). Titles with no number
// sink to the bottom, then ties break alphabetically so the order stays stable.
export function groupNumber(title: string | null | undefined): number {
  const t = (title || '').trim()
  const hash = t.match(/#\s*(\d+)/)
  if (hash) return parseInt(hash[1], 10)
  const lead = t.match(/^(\d+)/)
  if (lead) return parseInt(lead[1], 10)
  return Number.POSITIVE_INFINITY
}

export function byGroupNumber(
  a: { title: string | null },
  b: { title: string | null },
): number {
  const na = groupNumber(a.title)
  const nb = groupNumber(b.title)
  if (na !== nb) return na - nb
  return (a.title || '').localeCompare(b.title || '')
}
