import { InvalidFileError } from '../storage/DataStore'
import {
  DEFAULT_FINISH_ORDER,
  type Article,
  type CatalogData,
  type CategoryDef,
  type Deviation,
  type ExtraItem,
  type Finish,
  type PackItem,
  type PacklistFile,
  type Part,
  type RoofConfig,
  type RoofModule,
  type RoofSetup,
  type StockFile,
  type TentConfig,
  type TentTypeData,
  type WallOptionId
} from './types'

const WALL_OPTIONS: WallOptionId[] = ['keine', 'normal', 'hoch', 'nur-streifen', 'erdstreifen']

const FINISHES: Finish[] = ['blanko', 'fenster', 'gaze']

function fail(path: string, problem: string): never {
  throw new InvalidFileError(`Ungültige Datei: Feld "${path}" ${problem}.`)
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function obj(v: unknown, path: string): Record<string, unknown> {
  if (!isObject(v)) fail(path, 'muss ein Objekt sein')
  return v
}

function arr(v: unknown, path: string): unknown[] {
  if (!Array.isArray(v)) fail(path, 'muss eine Liste sein')
  return v
}

function str(v: unknown, path: string): string {
  if (typeof v !== 'string') fail(path, 'muss ein Text sein')
  return v
}

function nonEmptyStr(v: unknown, path: string): string {
  if (str(v, path) === '') fail(path, 'darf nicht leer sein')
  return v as string
}

function optStr(v: unknown, path: string): string | undefined {
  return v === undefined ? undefined : str(v, path)
}

function bool(v: unknown, path: string): boolean {
  if (typeof v !== 'boolean') fail(path, 'muss wahr oder falsch sein')
  return v
}

function count(v: unknown, path: string): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
    fail(path, 'muss eine ganze Zahl ≥ 0 sein')
  }
  return v
}

function finish(v: unknown, path: string): Finish {
  if (!FINISHES.includes(v as Finish)) {
    fail(path, `muss einer von ${FINISHES.join(', ')} sein`)
  }
  return v as Finish
}

function schemaVersion(o: Record<string, unknown>): void {
  if (o.schemaVersion !== 1) fail('schemaVersion', 'muss 1 sein')
}

export function parseStockFile(json: unknown): StockFile {
  const o = obj(json, 'Datei')
  schemaVersion(o)
  const raw = obj(o.stock, 'stock')
  const stock: StockFile['stock'] = {}
  for (const [id, entryRaw] of Object.entries(raw)) {
    const path = `stock.${id}`
    const e = obj(entryRaw, path)
    const note = optStr(e.note, `${path}.note`)
    stock[id] = {
      quantity: count(e.quantity, `${path}.quantity`),
      ...(note !== undefined && { note })
    }
  }
  return {
    schemaVersion: 1,
    stock,
    ...(o.catalog !== undefined && { catalog: parseCatalogData(o.catalog, 'catalog') })
  }
}

function positive(v: unknown, path: string): number {
  if (count(v, path) === 0) fail(path, 'muss mindestens 1 sein')
  return v as number
}

function parseParts(v: unknown, path: string): Part[] {
  return arr(v, path).map((raw, i) => {
    const p = obj(raw, `${path}[${i}]`)
    return {
      articleId: nonEmptyStr(p.articleId, `${path}[${i}].articleId`),
      quantity: positive(p.quantity, `${path}[${i}].quantity`)
    }
  })
}

function parseNamedParts(v: unknown, path: string): RoofConfig | RoofSetup {
  const o = obj(v, path)
  return {
    id: nonEmptyStr(o.id, `${path}.id`),
    label: nonEmptyStr(o.label, `${path}.label`),
    parts: parseParts(o.parts, `${path}.parts`)
  }
}

function nonEmptyList<T>(v: unknown, path: string, item: (x: unknown, p: string) => T): T[] {
  const list = arr(v, path)
  if (list.length === 0) fail(path, 'braucht mindestens einen Eintrag')
  return list.map((x, i) => item(x, `${path}[${i}]`))
}

function parseCategory(v: unknown, path: string): CategoryDef {
  const o = obj(v, path)
  return { id: nonEmptyStr(o.id, `${path}.id`), name: nonEmptyStr(o.name, `${path}.name`) }
}

function parseArticle(v: unknown, path: string): Article {
  const o = obj(v, path)
  return {
    id: nonEmptyStr(o.id, `${path}.id`),
    name: nonEmptyStr(o.name, `${path}.name`),
    category: nonEmptyStr(o.category, `${path}.category`)
  }
}

function parseModule(v: unknown, path: string): RoofModule {
  const o = obj(v, path)
  return {
    id: nonEmptyStr(o.id, `${path}.id`),
    name: nonEmptyStr(o.name, `${path}.name`),
    roofs: nonEmptyList(o.roofs, `${path}.roofs`, parseNamedParts),
    setups: nonEmptyList(o.setups, `${path}.setups`, parseNamedParts),
    parts: parseParts(o.parts, `${path}.parts`)
  }
}

function parseTentType(v: unknown, path: string): TentTypeData {
  const o = obj(v, path)
  const wall = obj(o.wall, `${path}.wall`)
  const options = nonEmptyList(wall.options, `${path}.wall.options`, (x, p) => {
    if (!WALL_OPTIONS.includes(x as WallOptionId)) {
      fail(p, `muss einer von ${WALL_OPTIONS.join(', ')} sein`)
    }
    return x as WallOptionId
  })
  const defaults = o.defaults === undefined ? undefined : obj(o.defaults, `${path}.defaults`)
  return {
    id: nonEmptyStr(o.id, `${path}.id`),
    name: nonEmptyStr(o.name, `${path}.name`),
    modules: nonEmptyList(o.modules, `${path}.modules`, (x, p) => {
      const m = obj(x, p)
      return {
        moduleId: nonEmptyStr(m.moduleId, `${p}.moduleId`),
        ...(m.setupIds !== undefined && {
          setupIds: arr(m.setupIds, `${p}.setupIds`).map((x, i) =>
            nonEmptyStr(x, `${p}.setupIds[${i}]`)
          )
        })
      }
    }),
    wall: { segments: count(wall.segments, `${path}.wall.segments`), options },
    fixed: parseParts(o.fixed, `${path}.fixed`),
    ...(defaults && {
      defaults: {
        ...(defaults.wallId !== undefined && {
          wallId: str(defaults.wallId, `${path}.defaults.wallId`)
        }),
        ...(defaults.buildId !== undefined && {
          buildId: str(defaults.buildId, `${path}.defaults.buildId`)
        }),
        ...(defaults.finish !== undefined && {
          finish: finish(defaults.finish, `${path}.defaults.finish`)
        })
      }
    })
  }
}

function uniqueIds(list: { id: string }[], path: string): void {
  const seen = new Set<string>()
  for (const { id } of list) {
    if (seen.has(id)) fail(path, `enthält die Kennung „${id}“ doppelt`)
    seen.add(id)
  }
}

/** Katalog-Daten einer Materialliste prüfen. */
export function parseCatalogData(v: unknown, path: string): CatalogData {
  const o = obj(v, path)
  const data: CatalogData = {
    categories: arr(o.categories, `${path}.categories`).map((x, i) =>
      parseCategory(x, `${path}.categories[${i}]`)
    ),
    articles: arr(o.articles, `${path}.articles`).map((x, i) =>
      parseArticle(x, `${path}.articles[${i}]`)
    ),
    modules: arr(o.modules, `${path}.modules`).map((x, i) =>
      parseModule(x, `${path}.modules[${i}]`)
    ),
    tentTypes: arr(o.tentTypes, `${path}.tentTypes`).map((x, i) =>
      parseTentType(x, `${path}.tentTypes[${i}]`)
    )
  }
  uniqueIds(data.categories, `${path}.categories`)
  uniqueIds(data.articles, `${path}.articles`)
  uniqueIds(data.modules, `${path}.modules`)
  uniqueIds(data.tentTypes, `${path}.tentTypes`)
  return data
}

function parseTent(v: unknown, path: string): TentConfig {
  const t = obj(v, path)
  const label = optStr(t.label, `${path}.label`)
  return {
    id: nonEmptyStr(t.id, `${path}.id`),
    typeId: nonEmptyStr(t.typeId, `${path}.typeId`),
    ...(label !== undefined && { label }),
    roofs: arr(t.roofs, `${path}.roofs`).map((r, i) => {
      const roof = obj(r, `${path}.roofs[${i}]`)
      return {
        roofId: nonEmptyStr(roof.roofId, `${path}.roofs[${i}].roofId`),
        setupId: nonEmptyStr(roof.setupId, `${path}.roofs[${i}].setupId`)
      }
    }),
    wallId: nonEmptyStr(t.wallId, `${path}.wallId`),
    buildId: str(t.buildId, `${path}.buildId`),
    finish: finish(t.finish, `${path}.finish`)
  }
}

function parseItem(v: unknown, path: string): PackItem {
  const i = obj(v, path)
  const category = i.category
  if (typeof category !== 'string' || category === '') {
    fail(`${path}.category`, 'muss eine Kategorie-Kennung sein')
  }
  const perTentRaw = obj(i.perTent, `${path}.perTent`)
  const perTent: Record<string, number> = {}
  for (const [k, n] of Object.entries(perTentRaw)) perTent[k] = count(n, `${path}.perTent.${k}`)
  const missingPerTent: Record<string, number> = {}
  for (const [k, n] of Object.entries(obj(i.missingPerTent, `${path}.missingPerTent`))) {
    missingPerTent[k] = count(n, `${path}.missingPerTent.${k}`)
  }
  return {
    articleId: nonEmptyStr(i.articleId, `${path}.articleId`),
    name: str(i.name, `${path}.name`),
    category: category as PackItem['category'],
    quantity: count(i.quantity, `${path}.quantity`),
    missing: count(i.missing, `${path}.missing`),
    perTent,
    missingPerTent,
    checked: bool(i.checked, `${path}.checked`)
  }
}

function parseDeviation(v: unknown, path: string): Deviation {
  const d = obj(v, path)
  if (d.kind !== 'dach' && d.kind !== 'wand') fail(`${path}.kind`, 'muss "dach" oder "wand" sein')
  const got = d.got === null ? null : str(d.got, `${path}.got`)
  return {
    tentId: str(d.tentId, `${path}.tentId`),
    kind: d.kind,
    wanted: str(d.wanted, `${path}.wanted`),
    got,
    ...(d.segments !== undefined && { segments: count(d.segments, `${path}.segments`) })
  }
}

function parseExtra(v: unknown, path: string): ExtraItem {
  const e = obj(v, path)
  return {
    id: nonEmptyStr(e.id, `${path}.id`),
    text: str(e.text, `${path}.text`),
    quantity: count(e.quantity, `${path}.quantity`),
    checked: bool(e.checked, `${path}.checked`)
  }
}

function parseFinishOrder(v: unknown): Finish[] {
  if (v === undefined) return [...DEFAULT_FINISH_ORDER]
  const list = arr(v, 'finishOrder').map((f, i) => finish(f, `finishOrder[${i}]`))
  if (list.length !== FINISHES.length || new Set(list).size !== FINISHES.length) {
    fail('finishOrder', 'muss jede Ausführung (blanko, fenster, gaze) genau einmal enthalten')
  }
  return list
}

export function parsePacklistFile(json: unknown): PacklistFile {
  const o = obj(json, 'Datei')
  schemaVersion(o)
  const tents = arr(o.tents, 'tents').map((t, i) => parseTent(t, `tents[${i}]`))
  if (new Set(tents.map((t) => t.id)).size !== tents.length) {
    fail('tents', 'enthält doppelte Zelt-IDs')
  }
  const date = optStr(o.date, 'date')
  return {
    schemaVersion: 1,
    id: nonEmptyStr(o.id, 'id'),
    name: str(o.name, 'name'),
    ...(date !== undefined && { date }),
    tents,
    finishOrder: parseFinishOrder(o.finishOrder),
    items: arr(o.items, 'items').map((i, n) => parseItem(i, `items[${n}]`)),
    deviations: arr(o.deviations, 'deviations').map((d, n) =>
      parseDeviation(d, `deviations[${n}]`)
    ),
    materials:
      o.materials === undefined
        ? []
        : arr(o.materials, 'materials').map((m, n) => {
            const p = obj(m, `materials[${n}]`)
            return {
              articleId: nonEmptyStr(p.articleId, `materials[${n}].articleId`),
              quantity: positive(p.quantity, `materials[${n}].quantity`)
            }
          }),
    extraItems: arr(o.extraItems, 'extraItems').map((e, n) => parseExtra(e, `extraItems[${n}]`)),
    fingerprint: str(o.fingerprint, 'fingerprint'),
    updatedAt: str(o.updatedAt, 'updatedAt')
  }
}
