import type { CatalogData, Part } from './types'

/** Kennung aus einem Namen: klein, Umlaute ausgeschrieben, sonst nur a–z, 0–9 und Bindestriche. */
export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'eintrag'
}

/** Eindeutige Kennung aus einem Namen; bei Bedarf mit angehängter Zahl. */
export function uniqueId(name: string, existing: string[]): string {
  const taken = new Set(existing)
  const base = slugify(name)
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) {
    if (!taken.has(`${base}-${n}`)) return `${base}-${n}`
  }
}

const uses = (parts: Part[], articleId: string) => parts.some((p) => p.articleId === articleId)

/** Wo ein Artikel verwendet wird: Namen der Dächer und Zelttypen. */
export function articleUsage(data: CatalogData, articleId: string): string[] {
  const modules = data.modules
    .filter(
      (m) =>
        uses(m.parts, articleId) ||
        m.roofs.some((r) => uses(r.parts, articleId)) ||
        m.setups.some((s) => uses(s.parts, articleId))
    )
    .map((m) => `Dach „${m.name}“`)
  const tents = data.tentTypes
    .filter((t) => uses(t.fixed, articleId))
    .map((t) => `Zelttyp „${t.name}“`)
  return [...modules, ...tents]
}

/** Zelttypen, die einen Dach-Baustein verwenden. */
export function moduleUsage(data: CatalogData, moduleId: string): string[] {
  return data.tentTypes
    .filter((t) => t.modules.some((m) => m.moduleId === moduleId))
    .map((t) => `Zelttyp „${t.name}“`)
}
