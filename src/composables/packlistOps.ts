import { recalculate } from '../domain/packlist'
import type { Catalog, ExtraItem, Finish, PacklistFile, Stock, TentConfig } from '../domain/types'

/**
 * Kleine, wiederholbare Änderungen an einer Packliste (siehe docs/architektur.md 6.2).
 * Alle Operationen sind idempotent, damit sie nach einem Konflikt erneut angewendet werden
 * können. Haken tragen den Zielwert, nicht "umschalten".
 */
export type PacklistOp =
  | { type: 'setName'; name: string }
  | { type: 'setDate'; date: string | undefined }
  | { type: 'setFinishOrder'; order: Finish[] }
  | { type: 'addTent'; tent: TentConfig }
  | { type: 'updateTent'; tentId: string; patch: Partial<Omit<TentConfig, 'id' | 'typeId'>> }
  | { type: 'removeTent'; tentId: string }
  | { type: 'duplicateTent'; tentId: string; newId: string }
  | { type: 'moveTent'; tentId: string; direction: -1 | 1 }
  | { type: 'setItemChecked'; articleId: string; checked: boolean }
  | { type: 'setExtraChecked'; extraId: string; checked: boolean }
  | { type: 'addExtra'; extra: ExtraItem }
  | { type: 'removeExtra'; extraId: string }
  | { type: 'recalc' }

export interface OpContext {
  catalog: Catalog
  stock: Stock
  /** ISO-Zeitstempel; Vorgabe: jetzt */
  now?: () => string
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/** Wendet eine Operation an und liefert eine neue Packliste (die Eingabe bleibt unverändert). */
export function applyOp(list: PacklistFile, op: PacklistOp, ctx: OpContext): PacklistFile {
  const next = clone(list)
  const recalc = () => recalculate(next, ctx.catalog, ctx.stock)
  let result: PacklistFile

  switch (op.type) {
    case 'setName':
      next.name = op.name
      result = next
      break
    case 'setDate':
      if (op.date === undefined || op.date === '') {
        delete next.date
      } else {
        next.date = op.date
      }
      result = next
      break
    case 'setFinishOrder':
      next.finishOrder = [...op.order]
      result = recalc()
      break
    case 'addTent':
      if (!next.tents.some((t) => t.id === op.tent.id)) {
        next.tents.push(clone(op.tent))
      }
      result = recalc()
      break
    case 'updateTent': {
      const tent = next.tents.find((t) => t.id === op.tentId)
      if (!tent) {
        return list
      }
      const patch = { ...op.patch }
      if (
        patch.wallId !== undefined &&
        patch.wallId !== tent.wallId &&
        patch.buildId === undefined
      ) {
        const type = ctx.catalog.tentTypes.find((t) => t.id === tent.typeId)
        const wall = type?.walls.find((w) => w.id === patch.wallId)
        patch.buildId = wall?.builds[0]?.id ?? ''
      }
      Object.assign(tent, patch)
      result = recalc()
      break
    }
    case 'removeTent':
      if (!next.tents.some((t) => t.id === op.tentId)) {
        return list
      }
      next.tents = next.tents.filter((t) => t.id !== op.tentId)
      result = recalc()
      break
    case 'duplicateTent': {
      const index = next.tents.findIndex((t) => t.id === op.tentId)
      if (index < 0 || next.tents.some((t) => t.id === op.newId)) {
        return list
      }
      next.tents.splice(index + 1, 0, { ...clone(next.tents[index]), id: op.newId })
      result = recalc()
      break
    }
    case 'moveTent': {
      const index = next.tents.findIndex((t) => t.id === op.tentId)
      const target = index + op.direction
      if (index < 0 || target < 0 || target >= next.tents.length) {
        return list
      }
      const [tent] = next.tents.splice(index, 1)
      next.tents.splice(target, 0, tent)
      result = recalc()
      break
    }
    case 'setItemChecked': {
      const item = next.items.find((i) => i.articleId === op.articleId)
      if (item) {
        item.checked = op.checked
      }
      result = next
      break
    }
    case 'setExtraChecked': {
      const extra = next.extraItems.find((e) => e.id === op.extraId)
      if (extra) {
        extra.checked = op.checked
      }
      result = next
      break
    }
    case 'addExtra':
      if (!next.extraItems.some((e) => e.id === op.extra.id)) {
        next.extraItems.push(clone(op.extra))
      }
      result = next
      break
    case 'removeExtra':
      next.extraItems = next.extraItems.filter((e) => e.id !== op.extraId)
      result = next
      break
    case 'recalc':
      result = recalc()
      break
  }

  return { ...result, updatedAt: ctx.now ? ctx.now() : new Date().toISOString() }
}
