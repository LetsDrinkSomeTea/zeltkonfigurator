import { NotConfiguredError } from './DataStore'

export interface StorageConfig {
  /** Name oder ID des Space */
  space: string
  /** Ordner innerhalb des Space (ohne führenden/abschließenden Schrägstrich) */
  folder: string
}

export const DEFAULT_CONFIG: StorageConfig = { space: 'Material Team', folder: 'Zeltkonfigurator' }

export interface SpaceLike {
  id: string
  name?: string
  driveType?: string
}

export interface ResolvedLocation<S extends SpaceLike = SpaceLike> {
  space: S
  folder: string
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** Liest `{ space, folder }` aus der rohen App-Konfiguration; fehlende Werte ergeben die Vorgabe. */
export function readStorageConfig(raw: unknown): StorageConfig {
  const obj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  const folder = str(obj.folder).replace(/^\/+|\/+$/g, '')
  if (folder.split('/').some((part) => part === '..' || part === '.')) {
    throw new NotConfiguredError(
      `Der konfigurierte Ordner „${folder}“ ist ungültig (kein „.“ oder „..“ erlaubt).`
    )
  }
  return {
    space: str(obj.space) || DEFAULT_CONFIG.space,
    folder: folder || DEFAULT_CONFIG.folder
  }
}

/** Sucht zuerst nach der Space-ID, dann nach dem Namen (Groß-/Kleinschreibung egal), Projekt-Spaces zuerst. */
export function findSpace<S extends SpaceLike>(spaces: S[], wanted: string): S | undefined {
  const key = wanted.trim().toLowerCase()
  if (!key) return undefined
  const byId = spaces.find((s) => s.id.toLowerCase() === key)
  if (byId) return byId
  const byName = spaces.filter((s) => (s.name ?? '').trim().toLowerCase() === key)
  return byName.find((s) => s.driveType === 'project') ?? byName[0]
}

export function resolveLocation<S extends SpaceLike>(
  config: StorageConfig,
  spaces: S[]
): ResolvedLocation<S> {
  const space = findSpace(spaces, config.space)
  if (!space) {
    throw new NotConfiguredError(
      `Der Space „${config.space}“ wurde nicht gefunden oder ist für dich nicht sichtbar. ` +
        'Bitte den Ablageort in der App-Konfiguration des Servers prüfen.'
    )
  }
  return { space, folder: config.folder }
}
