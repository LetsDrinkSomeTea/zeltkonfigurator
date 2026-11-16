import { coverWalls, hasFinishLayer, variantLabel } from './walls'
import { chooseRoof } from './roof'
import {
  type AllocationResult,
  type AllocationStatus,
  type Article,
  type Catalog,
  type Deviation,
  type Finish,
  type PackItem,
  type Part,
  type Stock,
  type TentConfig,
  type WallBuild
} from './types'

/** Zelt-Konfiguration verweist auf Zelttyp, Dach, Wandoption oder Bauart, die es nicht gibt. */
export class UnknownConfigError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = new.target.name
  }
}

type Row = Omit<PackItem, 'checked'>

/** Schlüssel in perTent/missingPerTent für das weitere Material der Packliste. */
export const MATERIAL_KEY = '_material'

/** Berechnet Bedarf und Zuteilung aller Zelte gegen den Bestand. */
export function allocate(
  tents: TentConfig[],
  finishOrder: Finish[],
  catalog: Catalog,
  stock: Stock,
  /** weiteres Material der Packliste (nach den Zelten gebucht) */
  materials: Part[] = []
): AllocationResult {
  const work: Stock = { ...stock }
  const articles = new Map<string, Article>(catalog.articles.map((a) => [a.id, a]))
  const rows = new Map<string, Row>()
  const deviations: Deviation[] = []

  const row = (tent: TentConfig, articleId: string): Row => {
    let r = rows.get(articleId)
    if (!r) {
      const a = articles.get(articleId)
      if (!a) {
        throw new UnknownConfigError(`Zelt "${tent.id}": unbekannter Artikel "${articleId}".`)
      }
      r = {
        articleId,
        name: a.name,
        category: a.category,
        quantity: 0,
        missing: 0,
        perTent: {},
        missingPerTent: {}
      }
      rows.set(articleId, r)
    }
    return r
  }

  const addDemand = (tent: TentConfig, r: Row, n: number) => {
    r.perTent[tent.id] = (r.perTent[tent.id] ?? 0) + n
  }

  const addMissing = (tent: TentConfig, r: Row, n: number) => {
    r.missing += n
    r.missingPerTent[tent.id] = (r.missingPerTent[tent.id] ?? 0) + n
  }

  /** Bucht aus dem Bestand; Fehlendes wird missing. */
  const book = (tent: TentConfig, part: Part) => {
    if (part.quantity <= 0) return
    const r = row(tent, part.articleId)
    const got = Math.min(part.quantity, Math.max(0, work[part.articleId] ?? 0))
    work[part.articleId] = (work[part.articleId] ?? 0) - got
    r.quantity += got
    const short = part.quantity - got
    if (short > 0) addMissing(tent, r, short)
    addDemand(tent, r, part.quantity)
  }

  for (const tent of tents) {
    const type = catalog.tentTypes.find((t) => t.id === tent.typeId)
    if (!type) {
      throw new UnknownConfigError(`Zelt "${tent.id}": unbekannter Zelttyp "${tent.typeId}".`)
    }
    const roofs = type.modules.map((module, index) => {
      const pick = tent.roofs[index] ?? { roofId: module.roofs[0].id, setupId: module.setups[0].id }
      const roof = module.roofs.find((r) => r.id === pick.roofId)
      if (!roof) {
        throw new UnknownConfigError(
          `Zelt "${tent.id}": unbekannte Dachkonfiguration "${pick.roofId}" bei Zelttyp "${type.id}".`
        )
      }
      const setup = module.setups.find((s) => s.id === pick.setupId)
      if (!setup) {
        throw new UnknownConfigError(
          `Zelt "${tent.id}": unbekannter Aufbau "${pick.setupId}" bei Zelttyp "${type.id}".`
        )
      }
      return { module, roof, setup }
    })
    const wall = type.walls.find((w) => w.id === tent.wallId)
    if (!wall) {
      throw new UnknownConfigError(
        `Zelt "${tent.id}": unbekannte Wandoption "${tent.wallId}" bei Zelttyp "${type.id}".`
      )
    }
    let preferredBuild: WallBuild | undefined
    if (wall.builds.length > 0) {
      preferredBuild =
        tent.buildId === '' ? wall.builds[0] : wall.builds.find((b) => b.id === tent.buildId)
      if (!preferredBuild) {
        throw new UnknownConfigError(
          `Zelt "${tent.id}": unbekannte Bauart "${tent.buildId}" bei Wandoption "${wall.id}".`
        )
      }
    }

    // 1. Dächer: je Baustein Dach (mit Ausweichen), Aufbau und feste Teile des Bausteins
    for (const [index, { module, roof: preferredRoof, setup }] of roofs.entries()) {
      // Bei mehreren Dächern sagt die Abweichung, welches gemeint ist.
      const prefix = roofs.length > 1 ? `${module.name} ${index + 1}: ` : ''
      const choice = chooseRoof(module.roofs, preferredRoof, work)
      for (const part of choice.roof.parts) book(tent, part)
      if (choice.fallback) {
        deviations.push({
          tentId: tent.id,
          kind: 'dach',
          wanted: prefix + preferredRoof.label,
          got: choice.roof.label
        })
      } else if (!choice.complete) {
        deviations.push({
          tentId: tent.id,
          kind: 'dach',
          wanted: prefix + preferredRoof.label,
          got: null
        })
      }
      for (const part of module.parts) book(tent, part)
      for (const part of setup.parts) book(tent, part)
    }

    // 2. feste Teile und Teile der Wandoption
    for (const part of type.fixed) book(tent, part)
    for (const part of wall.parts) book(tent, part)

    // 3. Wand
    if (wall.segments > 0 && preferredBuild) {
      const plan = coverWalls(
        wall.segments,
        wall.builds,
        preferredBuild,
        tent.finish,
        finishOrder,
        catalog.articles,
        work
      )
      for (const part of plan.taken) {
        const r = row(tent, part.articleId)
        r.quantity += part.quantity
        addDemand(tent, r, part.quantity)
      }
      for (const part of plan.missing) {
        const r = row(tent, part.articleId)
        addMissing(tent, r, part.quantity)
        addDemand(tent, r, part.quantity)
      }

      const wanted = variantLabel({ build: preferredBuild, finish: tent.finish })
      for (const c of plan.covered) {
        const isWanted =
          c.variant.build.id === preferredBuild.id &&
          (!hasFinishLayer(preferredBuild) || c.variant.finish === tent.finish)
        if (!isWanted) {
          deviations.push({
            tentId: tent.id,
            kind: 'wand',
            wanted,
            got: variantLabel(c.variant),
            segments: c.segments
          })
        }
      }
      if (plan.uncovered > 0) {
        deviations.push({
          tentId: tent.id,
          kind: 'wand',
          wanted,
          got: null,
          segments: plan.uncovered
        })
      }
    }
  }

  // Weiteres Material nach den Zelten; perTent führt es unter MATERIAL_KEY.
  const materialOwner = { id: MATERIAL_KEY } as TentConfig
  for (const part of materials) book(materialOwner, part)

  // Kategorien in Katalog-Reihenfolge, unbekannte am Ende
  const order = new Map(catalog.categories.map((c, i) => [c.id, i]))
  const categoryRank = (c: string) => order.get(c) ?? order.size
  const items = [...rows.values()].sort(
    (a, b) =>
      categoryRank(a.category) - categoryRank(b.category) || a.name.localeCompare(b.name, 'de')
  )
  let status: AllocationStatus = 'ok'
  if (items.some((i) => i.missing > 0)) status = 'fehlt'
  else if (deviations.length > 0) status = 'mit-ausweichmaterial'
  return { items, deviations, status }
}
