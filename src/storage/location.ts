import { STOCK_FILE } from '../domain/fileNames'
import { NotConfiguredError } from './DataStore'

/** Wo die Bestandsdatei liegt. */
export interface StorageConfig {
  /** Name oder ID des Space */
  space: string
  /** Pfad der Bestandsdatei im Space, ohne führenden Schrägstrich, z. B. "Lager/Zeltmaterial.bestand" */
  path: string
}

/** Vorgabe: Space „Material-Team“, Datei auf oberster Ebene. */
export const DEFAULT_CONFIG: StorageConfig = { space: 'Material-Team', path: STOCK_FILE }

export interface SpaceLike {
  id: string
  name?: string
  driveType?: string
}

export interface ResolvedLocation<S extends SpaceLike = SpaceLike> {
  space: S
  path: string
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** Liest `{ space, path }` aus der rohen App-Konfiguration; fehlende Werte ergeben die Vorgabe. */
export function readStorageConfig(raw: unknown): StorageConfig {
  const obj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  const path = str(obj.path).replace(/^\/+|\/+$/g, '')
  if (path && path.split('/').some((part) => part === '..' || part === '.' || part === '')) {
    throw new NotConfiguredError(
      `Der konfigurierte Pfad „${path}“ ist ungültig (kein „.“, „..“ oder leerer Abschnitt erlaubt).`
    )
  }
  return {
    space: str(obj.space) || DEFAULT_CONFIG.space,
    path: path || DEFAULT_CONFIG.path
  }
}

/** Vergleichsform eines Space-Namens: „Material-Team“, „Material Team“ und „material_team“ sind gleich. */
function nameKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
}

/**
 * Sucht zuerst nach der Space-ID, dann nach dem Namen. Beim Namen sind Groß-/Kleinschreibung
 * sowie Leerzeichen, Binde- und Unterstriche egal; ein exakt gleich geschriebener Space und
 * Projekt-Spaces haben Vorrang.
 */
export function findSpace<S extends SpaceLike>(spaces: S[], wanted: string): S | undefined {
  const key = wanted.trim().toLowerCase()
  if (!key) return undefined
  const byId = spaces.find((s) => s.id.toLowerCase() === key)
  if (byId) return byId
  const exact = spaces.filter((s) => (s.name ?? '').trim().toLowerCase() === key)
  const loose = spaces.filter((s) => nameKey(s.name ?? '') === nameKey(wanted))
  const byName = exact.length > 0 ? exact : loose
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
  return { space, path: config.path }
}
