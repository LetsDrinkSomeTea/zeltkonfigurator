import type {
  Catalog,
  CatalogData,
  TentType,
  TentTypeData,
  WallOption,
  WallOptionId
} from '../types'
import { defaultArticles, defaultCategories, wallArticles } from './articles'
import { defaultModules } from './modules'
import { defaultTentTypes } from './tentTypes'
import { erdstreifen, hoheWand, keineWand, normaleWand, nurStreifen } from './walls'

/** Der mitgelieferte Katalog als Daten: Ausgangspunkt einer neuen Materialliste. */
export const defaultCatalogData: CatalogData = {
  categories: defaultCategories,
  articles: defaultArticles,
  modules: defaultModules,
  tentTypes: defaultTentTypes
}

/** Wandoptionen eines Zelttyps aus seinen Angaben bauen. */
export function buildWalls(wall: TentTypeData['wall']): WallOption[] {
  const segmente = wall.segments
  const build: Record<WallOptionId, () => WallOption> = {
    // Bei der Kohte heißt „keine“ „Ohne Erdstreifen“.
    keine: () =>
      wall.options.includes('erdstreifen') ? keineWand('Ohne Erdstreifen') : keineWand(),
    normal: () => normaleWand({ segmente }),
    hoch: () => hoheWand({ segmente }),
    'nur-streifen': () => nurStreifen({ segmente }),
    erdstreifen: () => erdstreifen()
  }
  return wall.options.map((id) => build[id]())
}

/**
 * Löst Katalog-Daten in den Rechen-Katalog auf: Wandmaterial ergänzen, Bausteine und Wände
 * einsetzen. Zelttypen mit unbekannten Bausteinen oder ohne Wandoption entfallen; `problems`
 * nennt sie.
 */
export function resolveCatalog(data: CatalogData): Catalog & { problems: string[] } {
  const problems: string[] = []
  const modules = new Map(data.modules.map((m) => [m.id, m]))
  const tentTypes: TentType[] = []
  for (const t of data.tentTypes) {
    const missing = t.modules.filter((ref) => !modules.has(ref.moduleId))
    if (missing.length > 0 || t.modules.length === 0 || t.wall.options.length === 0) {
      problems.push(
        missing.length > 0
          ? `Zelttyp „${t.name}“: unbekanntes Dach „${missing[0].moduleId}“`
          : `Zelttyp „${t.name}“ ist unvollständig`
      )
      continue
    }
    tentTypes.push({
      id: t.id,
      name: t.name,
      modules: t.modules.map((ref) => {
        const m = modules.get(ref.moduleId)!
        if (!ref.setupIds || ref.setupIds.length === 0) return m
        // Angebotene Aufbauten in der Reihenfolge der Auswahl; unbekannte entfallen.
        const setups = ref.setupIds.flatMap((id) => m.setups.filter((s) => s.id === id))
        return setups.length > 0 ? { ...m, setups } : m
      }),
      walls: buildWalls(t.wall),
      fixed: t.fixed,
      ...(t.defaults && { defaults: t.defaults })
    })
  }
  const categories = data.categories.some((c) => c.id === 'wand')
    ? data.categories
    : [...data.categories, { id: 'wand', name: 'Seitenwand' }]
  return {
    categories,
    articles: [...data.articles.filter((a) => !a.wall), ...wallArticles],
    modules: data.modules,
    tentTypes,
    problems
  }
}

/** Der mitgelieferte Katalog. */
export const catalog: Catalog = resolveCatalog(defaultCatalogData)

/** Katalog einer Materialliste: der eigene, sonst der mitgelieferte. */
export function catalogOf(file: { catalog?: CatalogData }): Catalog {
  return file.catalog ? resolveCatalog(file.catalog) : catalog
}
