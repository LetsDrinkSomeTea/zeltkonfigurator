/**
 * Zentrale Datentypen des Zeltkonfigurators.
 * Diese Datei ist der Vertrag zwischen Katalog, Rechenkern, Speicherung und Oberfläche.
 * Siehe docs/architektur.md.
 */

// ---------------------------------------------------------------- Katalog (Code)

/** Kennung einer Kategorie, z. B. "dach" oder eine eigene wie "kueche". */
export type Category = string

export interface CategoryDef {
  id: Category
  name: string
}

/** Kategorie des Wandmaterials; die Wandberechnung hängt daran, sie ist nicht löschbar. */
export const WALL_CATEGORY = 'wand'

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

/** Wie ein Dach aufgebaut wird, z. B. „Gestellt“ (Masten) oder „Gehängt“ (2 lange Mittelpfosten). */
export interface RoofSetup {
  id: string
  label: string
  /** Gestänge und Zubehör für diesen Aufbau */
  parts: Part[]
}

/**
 * Ein Dach als Baustein eines Zeltes, z. B. eine Jurte. Ein Zelttyp besteht aus einem oder
 * mehreren Bausteinen (Dreierjurtenburg: 3 × Jurte); jeder wird im Zelt einzeln eingestellt.
 */
export interface RoofModule {
  id: string
  name: string
  /** Dach-Varianten; mindestens eine, erste = Vorgabe */
  roofs: RoofConfig[]
  /** Aufbauten; mindestens einer, erster = Vorgabe */
  setups: RoofSetup[]
  /** immer nötig, z. B. das Dächle */
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
  /** Dächer des Zeltes; mindestens eins */
  modules: RoofModule[]
  /** mindestens eine; erste = Vorgabe, sofern `defaults` nichts anderes sagt */
  walls: WallOption[]
  fixed: Part[]
  /**
   * Standardkonfiguration eines neuen Zeltes. Fehlende Angaben: erste Wandoption, erste Bauart
   * der Wandoption, Ausführung 'blanko'. Dach und Aufbau: jeweils das erste des Bausteins.
   */
  defaults?: TentDefaults
}

export interface TentDefaults {
  wallId?: string
  buildId?: string
  finish?: Finish
}

/** Der aufgelöste Katalog, mit dem die App rechnet. */
export interface Catalog {
  /** Reihenfolge = Reihenfolge der Gruppen in Listen */
  categories: CategoryDef[]
  articles: Article[]
  /** Dach-Bausteine, aus denen Zelttypen bestehen */
  modules: RoofModule[]
  tentTypes: TentType[]
}

/** Wandoptionen, aus denen ein Zelttyp wählt. */
export type WallOptionId = 'keine' | 'normal' | 'hoch' | 'nur-streifen' | 'erdstreifen'

/** Zelttyp, wie er gespeichert und im Editor bearbeitet wird. */
export interface TentTypeData {
  id: string
  name: string
  /** Dächer: Baustein und die angebotenen Aufbauten (fehlt `setupIds`: alle des Bausteins) */
  modules: { moduleId: string; setupIds?: string[] }[]
  /** Wandsegmente und angebotene Wandoptionen (Reihenfolge = Anzeige) */
  wall: { segments: number; options: WallOptionId[] }
  fixed: Part[]
  defaults?: TentDefaults
}

/**
 * Katalog als Daten: wird in der Materialliste gespeichert und dort bearbeitet. Wandmaterial
 * (Normal-, Superbahn, Streifen …) gehört nicht dazu; es ist fest in der App.
 */
export interface CatalogData {
  categories: CategoryDef[]
  articles: Article[]
  modules: RoofModule[]
  tentTypes: TentTypeData[]
}

/** articleId → verfügbare Stückzahl. Fehlende Einträge gelten als 0. */
export type Stock = Record<string, number>

// ---------------------------------------------------------------- Dateien im Space

export interface TentRoof {
  roofId: string
  setupId: string
}

export interface StockFile {
  schemaVersion: 1
  stock: Record<string, { quantity: number; note?: string }>
  /** Eigener Katalog; fehlt er, gilt der mitgelieferte. */
  catalog?: CatalogData
}

export interface TentConfig {
  /** eindeutig innerhalb der Packliste */
  id: string
  typeId: string
  label?: string
  /** je Baustein des Zelttyps (gleiche Reihenfolge): bevorzugtes Dach und Aufbau */
  roofs: TentRoof[]
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
  /** TentConfig.id → Bedarf dieses Zeltes. Summe = quantity + missing. */
  perTent: Record<string, number>
  /** TentConfig.id → davon nicht gedeckt (nur Einträge > 0). Summe = missing. */
  missingPerTent: Record<string, number>
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
  /** weiteres Material aus der Materialliste, unabhängig von Zelten (z. B. Küche) */
  materials: Part[]
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
