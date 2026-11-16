/**
 * Zentrale Datentypen des Zeltkonfigurators.
 * Diese Datei ist der Vertrag zwischen Katalog, Rechenkern, Speicherung und Oberfläche.
 * Siehe docs/architektur.md.
 */

// ---------------------------------------------------------------- Katalog (Code)

export type Category = 'dach' | 'wand' | 'stange' | 'abspannung' | 'kleinteil' | 'boden'

export const CATEGORIES: Category[] = ['dach', 'wand', 'stange', 'abspannung', 'kleinteil', 'boden']

export type Finish = 'blanko' | 'fenster' | 'gaze'

export const DEFAULT_FINISH_ORDER: Finish[] = ['gaze', 'fenster', 'blanko']

export type WallRole = 'normalbahn' | 'superbahn' | 'erweiterungsstreifen' | 'erdstreifen'

/** Rollen, bei denen die Ausführung wählbar ist. Alle anderen gibt es nur in 'blanko'. */
export const FINISH_ROLES: WallRole[] = ['superbahn', 'erweiterungsstreifen']

export interface Article {
  /** stabil, z. B. "superbahn-doppel-gaze" */
  id: string
  name: string
  category: Category
  /** Stange darf vor Ort geschlagen werden: Fehlbestand zählt als "toCut", nicht als "missing". */
  cuttable?: boolean
  /** Nur Wandmaterial. span = Zahl der Wandsegmente, die ein Stück deckt. */
  wall?: { role: WallRole; span: 1 | 2; finish: Finish }
}

export interface Part {
  articleId: string
  quantity: number
}

export interface RoofConfig {
  id: string
  label: string
  parts: Part[]
}

export interface WallBuild {
  id: string
  label: string
  /** Alle Lagen zusammen ergeben die Wand; jede Lage deckt alle Segmente. */
  layers: WallRole[]
}

export interface WallOption {
  id: string
  label: string
  /** 0 = keine Wand */
  segments: number
  /** Reihenfolge = Vorgabe. Leer, wenn segments = 0. */
  builds: WallBuild[]
  /** Was diese Option zusätzlich braucht, z. B. Bodennägel. */
  parts: Part[]
}

export interface TentType {
  id: string
  name: string
  /** mindestens eine; erste = Vorgabe */
  roofs: RoofConfig[]
  /** mindestens eine; erste = Vorgabe, sofern `defaults` nichts anderes sagt */
  walls: WallOption[]
  fixed: Part[]
  /**
   * Standardkonfiguration eines neuen Zeltes. Fehlende Angaben: erstes Dach, erste Wandoption,
   * erste Bauart der Wandoption, Ausführung 'blanko'.
   */
  defaults?: TentDefaults
}

export interface TentDefaults {
  roofId?: string
  wallId?: string
  buildId?: string
  finish?: Finish
}

export interface Catalog {
  articles: Article[]
  tentTypes: TentType[]
}

/** articleId → verfügbare Stückzahl. Fehlende Einträge gelten als 0. */
export type Stock = Record<string, number>

// ---------------------------------------------------------------- Dateien im Space

export interface StockFile {
  schemaVersion: 1
  stock: Record<string, { quantity: number; note?: string }>
}

export interface TentConfig {
  /** eindeutig innerhalb der Packliste */
  id: string
  typeId: string
  label?: string
  /** bevorzugte Dachkonfiguration */
  roofId: string
  /** gewählte Wandoption */
  wallId: string
  /** bevorzugte Bauart innerhalb der Wandoption; '' wenn die Option keine Bauarten hat */
  buildId: string
  finish: Finish
}

export interface PackItem {
  articleId: string
  /** Name zum Zeitpunkt der Berechnung */
  name: string
  category: Category
  /** aus dem Bestand zu packen */
  quantity: number
  /** nicht gedeckt */
  missing: number
  /** vor Ort zu schlagen (nur cuttable-Artikel) */
  toCut: number
  /** TentConfig.id → Bedarf dieses Zeltes. Summe = quantity + missing + toCut. */
  perTent: Record<string, number>
  checked: boolean
}

export interface Deviation {
  tentId: string
  kind: 'dach' | 'wand'
  /** lesbar, z. B. "Superbahn Fenster" */
  wanted: string
  /** lesbar; null = fehlt */
  got: string | null
  /** nur bei kind = 'wand' */
  segments?: number
}

export interface ExtraItem {
  id: string
  text: string
  quantity: number
  checked: boolean
}

export interface PacklistFile {
  schemaVersion: 1
  /** Kennung aus der Zeit, als die App die Dateien selbst benannt hat; ohne Bedeutung. */
  id: string
  /** Beim Laden durch den Dateinamen ersetzt: die Liste heißt wie ihre Datei. */
  name: string
  /** Lagerdatum, frei (ISO-Datum empfohlen) */
  date?: string
  tents: TentConfig[]
  /** Ausweichreihenfolge der Ausführungen (F-2B) */
  finishOrder: Finish[]
  /** festgeschriebenes Rechenergebnis (F-37) */
  items: PackItem[]
  deviations: Deviation[]
  extraItems: ExtraItem[]
  /** Hash aus Katalog + Bestand zum Zeitpunkt der Berechnung */
  fingerprint: string
  /** ISO-Zeitstempel */
  updatedAt: string
}

// ---------------------------------------------------------------- Rechenergebnis

export type AllocationStatus = 'ok' | 'mit-ausweichmaterial' | 'fehlt'

export interface AllocationResult {
  items: Omit<PackItem, 'checked'>[]
  deviations: Deviation[]
  status: AllocationStatus
}
