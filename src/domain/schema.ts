// Platzhalter für den Merge: wird durch die vollständige Schema-Prüfung ersetzt.
import { InvalidFileError } from '../storage/DataStore'
import type { PacklistFile, StockFile } from './types'

function basicCheck(json: unknown, what: string): Record<string, unknown> {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    throw new InvalidFileError(`${what} ist kein JSON-Objekt.`)
  }
  if ((json as Record<string, unknown>).schemaVersion !== 1) {
    throw new InvalidFileError(`${what} hat eine unbekannte Schema-Version.`)
  }
  return json as Record<string, unknown>
}

export function parseStockFile(json: unknown): StockFile {
  return basicCheck(json, 'Die Bestandsdatei') as unknown as StockFile
}

export function parsePacklistFile(json: unknown): PacklistFile {
  return basicCheck(json, 'Die Packliste') as unknown as PacklistFile
}
