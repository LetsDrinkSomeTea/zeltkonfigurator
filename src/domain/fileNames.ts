/** Dateiendungen der App. Der Inhalt ist YAML; die eigenen Endungen verknüpfen die Dateien mit der App. */
export const PACKLIST_EXT = '.packliste'
export const STOCK_EXT = '.bestand'
export const STOCK_FILE = `Zeltmaterial${STOCK_EXT}`

/** Name einer Packliste = Dateiname ohne Pfad und ohne Endung. */
export function packlistName(path: string): string {
  const file = path.split('/').filter(Boolean).at(-1) ?? ''
  const name = file.toLowerCase().endsWith(PACKLIST_EXT)
    ? file.slice(0, -PACKLIST_EXT.length)
    : file
  return name.trim() || 'Packliste'
}
