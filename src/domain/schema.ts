import { InvalidFileError } from '../storage/DataStore'
import {
  CATEGORIES,
  DEFAULT_FINISH_ORDER,
  type Deviation,
  type ExtraItem,
  type Finish,
  type PackItem,
  type PacklistFile,
  type StockFile,
  type TentConfig
} from './types'

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
  return { schemaVersion: 1, stock }
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
  if (!CATEGORIES.includes(category as PackItem['category'])) {
    fail(`${path}.category`, `muss einer von ${CATEGORIES.join(', ')} sein`)
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
    extraItems: arr(o.extraItems, 'extraItems').map((e, n) => parseExtra(e, `extraItems[${n}]`)),
    fingerprint: str(o.fingerprint, 'fingerprint'),
    updatedAt: str(o.updatedAt, 'updatedAt')
  }
}
