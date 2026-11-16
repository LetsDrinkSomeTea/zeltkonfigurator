/** Dateiendungen der App. Der Inhalt ist YAML; die eigenen Endungen verknüpfen die Dateien mit der App. */
export const PACKLIST_EXT = '.packliste'
export const STOCK_EXT = '.zeltbestand'
export const STOCK_FILE = `bestand${STOCK_EXT}`
export const PACKLIST_DIR = 'packlisten'

const MAX_LENGTH = 80

/** Macht aus einem Listennamen einen Dateinamen (ohne Endung), der überall funktioniert. */
export function sanitizeFileName(name: string): string {
  const cleaned = name
    // in Dateinamen oder Adressen problematische Zeichen
    .replace(/[/\\:*?"<>|#%]/g, ' ')
    // Steuerzeichen
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, MAX_LENGTH)
    .trim()
  return cleaned || 'Packliste'
}

/**
 * Dateiname (= Kennung) für eine Packliste mit diesem Namen. Ist er schon vergeben, wird
 * „ (2)“, „ (3)“ … angehängt. Der Vergleich ignoriert Groß-/Kleinschreibung.
 */
export function packlistFileId(name: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map((t) => t.toLowerCase()))
  const base = sanitizeFileName(name)
  if (!used.has(base.toLowerCase())) return base
  for (let n = 2; ; n++) {
    const candidate = `${base} (${n})`
    if (!used.has(candidate.toLowerCase())) return candidate
  }
}

/** Gültige Kennung: ein einzelner Dateiname ohne Pfadanteile. */
export function isValidPacklistId(id: string): boolean {
  return id.length > 0 && id.length <= 120 && !/[/\\]/.test(id) && !id.startsWith('.')
}

export type AppFile = { kind: 'packliste'; id: string } | { kind: 'bestand' }

/**
 * Ordnet einen Pfad im Space einer Datei der App zu. `folder` ist der konfigurierte Ordner.
 * Liefert null, wenn die Datei nicht am erwarteten Ort liegt.
 */
export function matchAppFile(path: string, folder: string): AppFile | null {
  const segments = path.split('/').filter(Boolean)
  const base = folder.split('/').filter(Boolean)
  const tail = (n: number) => segments.slice(-n).join('/')
  const stock = [...base, STOCK_FILE]
  if (segments.length >= stock.length && tail(stock.length) === stock.join('/')) {
    return { kind: 'bestand' }
  }
  const file = segments.at(-1) ?? ''
  const dir = [...base, PACKLIST_DIR]
  if (
    file.endsWith(PACKLIST_EXT) &&
    segments.length > dir.length &&
    segments.slice(-dir.length - 1, -1).join('/') === dir.join('/')
  ) {
    const id = file.slice(0, -PACKLIST_EXT.length)
    return isValidPacklistId(id) ? { kind: 'packliste', id } : null
  }
  return null
}
