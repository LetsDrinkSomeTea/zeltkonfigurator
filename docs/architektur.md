# Architektur-Entwurf – Zeltkonfigurator

Stand: 2026-11-16 · Status: Entwurf zur Abstimmung · Bezug: [anforderungen.md](anforderungen.md)

## 1. Überblick

Die App ist eine OpenCloud-Web-Erweiterung auf Basis des `web-app-skeleton`
(Vue 3, TypeScript, Vite, `@opencloud-eu/extension-sdk`). Sie hat kein eigenes Backend:
Alle Daten sind JSON-Dateien in einem Space und werden über WebDAV gelesen und geschrieben.

```
┌──────────────────────────── Browser (OpenCloud Web) ────────────────────────────┐
│                                                                                  │
│  views/ + components/      Oberfläche (Vue, OpenCloud-Design-System)             │
│        │                                                                         │
│  composables/              Zustand: geladene Daten, Speichern, Rechte            │
│        │            │                                                            │
│  domain/                  storage/                                               │
│  reine Berechnung         Dateizugriff hinter einer Schnittstelle                │
│  (kein Vue, kein OC)             │                                               │
└──────────────────────────────────┼───────────────────────────────────────────────┘
                                   │ WebDAV (Client aus web-pkg)
                          ┌────────▼─────────┐
                          │ OpenCloud-Space  │  material.json · zelte.json ·
                          │ Ordner der App   │  packlisten/*.json
                          └──────────────────┘
```

Leitlinien:

- **Rechenkern ohne Abhängigkeiten.** `domain/` kennt weder Vue noch OpenCloud und ist
  dadurch vollständig testbar (N-06).
- **Stücklisten sind Daten.** Neue Zelttypen oder geänderte Stücklisten brauchen keinen
  neuen Build (F-13).
- **Dateizugriff hinter einer Schnittstelle.** Oberfläche und Tests arbeiten gegen
  `DataStore`; nur eine Klasse kennt WebDAV.

## 2. Verzeichnisstruktur

```
src/
  index.ts                  App-Registrierung, Routen, Menüeintrag
  domain/
    types.ts                alle Datentypen (Vertrag zwischen den Schichten)
    schema.ts               Prüfung und Migration geladener Dateien
    bom.ts                  Bedarf eines Zeltes aus Stückliste + Konfiguration
    allocation.ts           Abgleich mit Bestand, Ausweichlogik
    packlist.ts             Packliste erzeugen, neu berechnen, Haken übernehmen
    defaults/               mitgelieferte Vorgabedaten (material, zelte)
  storage/
    DataStore.ts            Schnittstelle + Fehlerklassen
    WebDavDataStore.ts      Umsetzung über den WebDAV-Client von web-pkg
    MemoryDataStore.ts      Umsetzung im Speicher für Tests und Entwicklung
    location.ts             Space und Ordner aus der App-Konfiguration auflösen
  composables/
    useStore.ts             liefert den DataStore, kennt Schreibrecht
    useMaterial.ts          Bestand und Zelttypen laden, speichern
    usePacklist.ts          eine Packliste laden, ändern, automatisch speichern
  views/
    PacklistOverview.vue    /listen
    PacklistEditor.vue      /listen/:id   (Reiter: Zelte · Material pro Zelt · Packliste)
    InventoryView.vue       /bestand
  components/               TentCard, WallOptions, ItemRow, StatusBanner, PrintLayout …
tests/unit/                 spiegelt src/
```

## 3. Datenmodell

Alle Typen stehen in `src/domain/types.ts`. Jede Datei hat `schemaVersion`.

### 3.1 `material.json` – Artikel und Bestand

```ts
type Category = 'plane' | 'stange' | 'abspannung' | 'kleinteil'
type Finish = 'blanko' | 'fenster' | 'gaze'

interface Article {
  id: string // stabil, z. B. "superbahn-fenster"
  name: string
  category: Category
  stock: number
  note?: string
  role?: WallRole // nur für Wandmaterial, siehe 3.2
  finish?: Finish // nur für Wandmaterial mit Ausführung
}

interface MaterialFile {
  schemaVersion: 1
  articles: Article[]
}
```

### 3.2 `zelte.json` – Zelttypen und Stücklisten

Feste Positionen verweisen direkt auf Artikel. Wandmaterial wird nicht je Zelttyp
ausformuliert, sondern über **Rollen** beschrieben: Der Zelttyp nennt nur die Zahl der
Wandsegmente, und `allocation.ts` deckt jedes Segment aus Artikeln der passenden Rolle.

```ts
type WallHeight = 'keine' | 'normal' | 'hoch'
type WallRole = 'normalbahn' | 'superbahn' | 'erweiterungsstreifen'

interface BomLine {
  articleId: string
  quantity: number
  when?: { wall: WallHeight[] } // Position gilt nur bei diesen Seitenwänden
}

interface TentType {
  id: string // "hochkohte"
  name: string
  wallOptions: WallHeight[] // leer oder ['keine'] = keine Auswahl
  wallSegments: number // 0 bei Zelten ohne Seitenwand
  lines: BomLine[] // Dach, Mast, Seitenstangen je Höhe, Heringe, Kleinteile
}

interface TentsFile {
  schemaVersion: 1
  tentTypes: TentType[]
}
```

Seitenstangen unterschiedlicher Länge sind normale `BomLine`s mit `when`, z. B.
`{ articleId: 'seitenstange-lang', quantity: 12, when: { wall: ['hoch'] } }`.

### 3.3 `packlisten/<id>.json` – Packliste

```ts
type HighBuild = 'super' | 'normal+streifen'

interface TentConfig {
  id: string // eindeutig in der Packliste
  typeId: string
  label?: string
  wall: WallHeight
  build: HighBuild // nur bei wall = 'hoch' relevant
  finish: Finish
}

interface PackItem {
  articleId: string
  name: string // Name zum Zeitpunkt der Berechnung
  category: Category
  quantity: number // aus dem Bestand zu packen
  missing: number // nicht gedeckt
  perTent: Record<string, number> // TentConfig.id → Stückzahl
  checked: boolean
}

interface Deviation {
  tentId: string
  segments: number
  wanted: { build: HighBuild | 'normal'; finish: Finish }
  got: { build: HighBuild | 'normal'; finish: Finish } | null // null = fehlt
}

interface PacklistFile {
  schemaVersion: 1
  id: string
  name: string
  date?: string // Lagerdatum, frei
  tents: TentConfig[]
  items: PackItem[] // festgeschriebenes Rechenergebnis (F-37)
  deviations: Deviation[]
  extraItems: { id: string; text: string; quantity: number; checked: boolean }[]
  materialFingerprint: string // Hash von Bestand + Stücklisten bei Berechnung
  updatedAt: string
}
```

`materialFingerprint` erlaubt den Hinweis „Bestand hat sich geändert – neu berechnen?“,
ohne dass alte Packlisten stillschweigend ihren Inhalt ändern.

## 4. Rechenkern

Alle Funktionen sind rein: gleiche Eingabe, gleiche Ausgabe, keine Seiteneffekte.

```ts
// bom.ts – feste Positionen eines Zeltes
fixedDemand(type: TentType, config: TentConfig): Map<articleId, number>

// allocation.ts – alles zusammen gegen den Bestand
allocate(tents: TentConfig[], types: TentType[], articles: Article[]): AllocationResult
//   → items: PackItem[] (ohne checked), deviations: Deviation[],
//     status: 'ok' | 'mit-ausweichmaterial' | 'fehlt'

// packlist.ts
recalculate(list: PacklistFile, types, articles): PacklistFile   // übernimmt Haken (F-36)
fingerprint(types, articles): string
```

Ablauf von `allocate`:

1. Bestand in eine Arbeitskopie übernehmen (`articleId → frei`).
2. Zelte in Listenreihenfolge durchgehen (F-28).
3. Feste Positionen abbuchen. Reicht der Bestand nicht, wird der Rest als `missing`
   gezählt; für feste Positionen gibt es keine Alternativen.
4. Wandsegmente einzeln decken. Jede Möglichkeit ist ein **Rezept** – eine Menge von
   Artikeln, die gemeinsam ein Segment ergeben:
   - `super[A]` → 1 Artikel mit Rolle `superbahn`, Ausführung A
   - `normal+streifen[A]` → 1 `normalbahn` + 1 `erweiterungsstreifen` in Ausführung A
   - `normal` → 1 `normalbahn`

   Die Rezepte werden in der Reihenfolge aus Abschnitt 5.4 der Anforderungen versucht.
   Ein Rezept gilt nur, wenn alle seine Artikel noch frei sind. Trifft keines zu, wird
   das Segment im Wunschrezept als fehlend gebucht.
5. Abweichungen vom Wunsch je Zelt zu `Deviation`-Einträgen zusammenfassen.

Das Verfahren ist bewusst einfach und vorhersehbar (wer zuerst in der Liste steht, bekommt
seinen Wunsch) statt optimal. Eine globale Optimierung wäre für Nutzer schwerer
nachvollziehbar.

Weil Rezepte Artikelmengen sind, lassen sich Doppelbahnen (O-3) später als Rezept über
zwei Segmente ergänzen, ohne das Modell zu ändern.

## 5. Speicherung

### 5.1 Schnittstelle

```ts
interface Versioned<T> {
  data: T
  etag: string
}

interface DataStore {
  canWrite(): Promise<boolean>
  loadMaterial(): Promise<Versioned<MaterialFile>> // legt Vorgabedaten an, falls nicht vorhanden
  saveMaterial(file: MaterialFile, etag: string): Promise<string> // neuer ETag
  loadTents(): Promise<Versioned<TentsFile>>
  listPacklists(): Promise<PacklistSummary[]>
  loadPacklist(id: string): Promise<Versioned<PacklistFile>>
  savePacklist(file: PacklistFile, etag: string | null): Promise<string> // null = neu anlegen
  deletePacklist(id: string): Promise<void>
}
```

Fehlerklassen: `NotConfiguredError`, `NotFoundError`, `ForbiddenError`, `ConflictError`,
`InvalidFileError`. Die Oberfläche übersetzt sie in Meldungen (F-42, N-05).

### 5.2 Gleichzeitiges Bearbeiten

Jedes Schreiben schickt den zuletzt gelesenen ETag als `If-Match`. Lehnt der Server ab,
wirft der Store `ConflictError`. `usePacklist` lädt dann neu, wendet die anstehende
Änderung (z. B. einen Haken) auf den frischen Stand an und speichert erneut (F-38).
Änderungen werden als kleine Operationen geführt (`toggle(itemId)`, `setTents(...)`),
nicht als ganzer Dateizustand – nur so ist das erneute Anwenden verlustfrei.

Haken werden verzögert gebündelt gespeichert (ca. 1 s), damit schnelles Abhaken nicht
jede Sekunde eine Dateiversion erzeugt.

### 5.3 Ablageort

Der Ort kommt aus der App-Konfiguration des Servers (F-41):

```json
{ "space": "Material", "folder": "Zeltmaterial" }
```

`location.ts` sucht den Space unter den Spaces des Nutzers und liefert die WebDAV-Basis.
Schreibrecht wird aus den Berechtigungen des Space bzw. Ordners abgeleitet.

**Zu prüfen im ersten Arbeitspaket:** wie die Konfiguration die App genau erreicht
(`manifest.json` / `apps.yaml` → `applicationConfig`) und welche Aufrufe von
`useClientService()` für Lesen, Schreiben mit `If-Match`, Auflisten und Rechteabfrage
in der eingesetzten `web-pkg`-Version gelten. Das ist die einzige Stelle mit echtem
technischem Risiko; sie wird deshalb zuerst und einzeln geklärt.

## 6. Oberfläche

| Route          | Ansicht           | Inhalt                                                                                           |
| -------------- | ----------------- | ------------------------------------------------------------------------------------------------ |
| `/listen`      | PacklistOverview  | Karten der Packlisten mit Fortschritt; anlegen, duplizieren, löschen                             |
| `/listen/:id`  | PacklistEditor    | Statusbanner; Reiter **Zelte** (Konfigurator), **Material pro Zelt**, **Packliste** (abhaken)    |
| `/bestand`     | InventoryView     | Artikel nach Kategorie, Suche, Stückzahlen bearbeiten                                            |

- Bedienelemente aus dem OpenCloud-Design-System, Abstände über die Tailwind-Klassen des
  SDK (Präfix `ext:`).
- Handy zuerst: Zeltkarten untereinander, Abhakzeilen mit großer Trefferfläche.
- Druck (F-39): eigene Komponente `PrintLayout`, sichtbar nur unter `@media print`,
  Aufruf über `window.print()`. Keine PDF-Bibliothek.
- Texte deutsch als Quellsprache, durchgehend über `$gettext`.

## 7. Tests und Qualität

- `domain/`: Unit-Tests mit Vitest für jede Regel aus Anforderungen 5.3–5.5, inklusive
  Grenzfälle (Bestand 0, zwei Zelte konkurrieren um dieselben Bahnen, alle Rezepte
  erschöpft, Haken-Übernahme).
- `storage/`: Tests gegen `MemoryDataStore`; `WebDavDataStore` mit nachgebildetem Client
  (Konflikt, fehlende Datei, defekte Datei).
- Ansichten: Komponententests für die Kernabläufe (Zelt hinzufügen, abhaken, Nur-Lese-Modus).
- Manuell: einmal gegen die OpenCloud-Instanz aus `docker-compose.yml`.
- Vor jedem Zusammenführen: `pnpm lint`, `pnpm check:types`, `pnpm test:unit`, `pnpm build`.

## 8. Umsetzungsplan

Die Arbeitspakete werden von Subagenten umgesetzt, je Paket in einem eigenen Arbeitsbaum.
Review, Zusammenführen und die Verträge (AP 0) liegen beim Hauptagenten.

| AP | Inhalt                                                                                                   | Hängt ab von | Parallel |
| -- | -------------------------------------------------------------------------------------------------------- | ------------ | -------- |
| 0  | Grundgerüst: Skeleton umbenennen, Routen, `types.ts`, `DataStore`-Schnittstelle, leere Ansichten          | –            | –        |
| 1  | Klärung OpenCloud-Anbindung (Konfiguration, WebDAV, ETag, Rechte) und `WebDavDataStore`, `location.ts`    | 0            | ja       |
| 2  | Rechenkern: `bom.ts`, `allocation.ts`, `packlist.ts`, `schema.ts` mit Tests                               | 0            | ja       |
| 3  | `MemoryDataStore` und Composables (`useStore`, `useMaterial`, `usePacklist` mit Konfliktbehandlung)       | 0            | ja       |
| 4  | Bestandsansicht                                                                                          | 3            | ja       |
| 5  | Packlisten-Übersicht und Konfigurator (Reiter „Zelte“, „Material pro Zelt“, Statusbanner)                 | 2, 3         | ja       |
| 6  | Packliste abhaken, freie Zeilen, Druckansicht                                                            | 2, 3         | ja       |
| 7  | Vorgabedaten (Artikel, Stücklisten) – nach Klärung der offenen Punkte aus den Anforderungen               | 0            | ja       |
| 8  | Zusammenbau, Test gegen OpenCloud im Container, README mit Installationsanleitung                         | alle         | –        |

AP 4–6 arbeiten gegen `MemoryDataStore` und sind dadurch nicht von AP 1 blockiert.

## 9. Entscheidungen

| Entscheidung                                        | Begründung                                                                                             | Verworfen                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| JSON-Dateien im Space statt Datenbank               | Kein Backend zu betreiben; Rechte, Versionen und Sicherung kommen von OpenCloud.                        | Eigener Dienst mit Datenbank                                 |
| Wandmaterial über Rollen und Rezepte                | Ausweichlogik steht einmal im Code statt in jeder Stückliste; neue Ausführungen sind nur neue Artikel.  | Alternativen je Zelttyp in der Stückliste ausformulieren     |
| Zuteilung in Listenreihenfolge                      | Vorhersehbar und erklärbar.                                                                             | Globale Optimierung                                          |
| Packliste speichert das Rechenergebnis              | Eine abgehakte Liste ändert sich nicht unbemerkt, wenn jemand den Bestand korrigiert.                   | Immer live berechnen                                         |
| ETag + erneutes Anwenden kleiner Operationen        | Gleichzeitiges Abhaken ohne Server-Logik.                                                               | Sperren; „letzter gewinnt“                                   |
| Druck über Browser                                  | Keine zusätzliche Abhängigkeit, PDF kann jeder Browser.                                                 | PDF-Bibliothek                                               |
| Kein zentraler Store (Pinia) für App-Zustand        | Drei Ansichten mit wenig geteiltem Zustand; Composables genügen.                                        | Pinia-Module                                                 |
| Stücklisten in Version 1 ohne Editor                | Ändern sich fast nie; ein Editor wäre der größte Einzelaufwand.                                         | Stücklisten-Editor                                           |
