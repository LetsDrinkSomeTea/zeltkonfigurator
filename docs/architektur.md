# Architektur-Entwurf – Zeltkonfigurator

Stand: 2026-11-16 · Status: Entwurf 3 zur Abstimmung · Bezug: [anforderungen.md](anforderungen.md)

## 1. Überblick

Die App ist eine OpenCloud-Web-Erweiterung auf Basis des `web-app-skeleton`
(Vue 3, TypeScript, Vite, `@opencloud-eu/extension-sdk`). Sie hat kein eigenes Backend.

```
┌──────────────────────────── Browser (OpenCloud Web) ────────────────────────────┐
│                                                                                  │
│  views/ + components/      Oberfläche (Vue, OpenCloud-Design-System)             │
│        │                                                                         │
│  composables/              Zustand: geladene Daten, Speichern, Rechte            │
│        │            │                                                            │
│  domain/                  storage/                                               │
│  ├ catalog/  Artikel und Zelttypen (Code)      Dateizugriff hinter               │
│  └ Rechenkern (rein, ohne Vue/OpenCloud)       einer Schnittstelle               │
└──────────────────────────────────────────────────────┼───────────────────────────┘
                                                       │ WebDAV (Client aus web-pkg)
                                              ┌────────▼─────────┐
                                              │ Space            │  Zeltmaterial.bestand (fester Ort)
                                              │ „Material-Team“  │  *.packliste (beliebiger Ort, auch andere Spaces)
                                              └──────────────────┘
```

Was wo liegt:

| Inhalt                                       | Ort               | Ändert sich durch |
| -------------------------------------------- | ----------------- | ----------------- |
| Artikelliste, Zelttypen, Dachkonfigurationen | Code (`catalog/`) | App-Update        |
| Zuweisungs- und Ausweichlogik                | Code (`domain/`)  | App-Update        |
| Stückzahlen und Notizen                      | Space             | Bestandseditor    |
| Packlisten mit Abhak-Stand                   | Space             | Nutzer            |

Leitlinien:

- **Ein Zelttyp ist eine kurze, deklarative Datei.** Sie nennt Dachkonfigurationen,
  Wandoptionen und feste Teile – keine Logik.
- **Die Wandzuweisung steht genau einmal** und arbeitet nur mit Rollen, nicht mit
  konkreten Zelttypen.
- **Rechenkern ohne Abhängigkeiten**, dadurch vollständig testbar.
- **Dateizugriff hinter einer Schnittstelle**; nur eine Klasse kennt WebDAV.

## 2. Verzeichnisstruktur

```
src/
  index.ts                  App-Registrierung, Routen, Menüeintrag
  domain/
    types.ts                alle Datentypen (Vertrag zwischen den Schichten)
    catalog/
      articles.ts           Artikelliste
      walls.ts              wiederverwendbare Wandoptionen (keine, normal, hoch, …)
      tents/
        kohte.ts  hochkohte.ts  jurte.ts  grossjurte.ts  gigajurte9.ts
        gigajurte12.ts  ovaljurte.ts  dreierjurtenburg.ts  sudan.ts  yellowstone.ts
        index.ts            Liste aller Zelttypen
    roof.ts                 Dachkonfiguration wählen (mit Ausweichen)
    walls.ts                Wandsegmente decken (Rollen, Einzel/Doppel, Ausweichen)
    allocation.ts           alles zusammen gegen den Bestand
    packlist.ts             Packliste erzeugen, neu berechnen, Haken übernehmen
    schema.ts               Prüfung geladener Dateien
  storage/
    DataStore.ts            Schnittstelle + Fehlerklassen
    WebDavDataStore.ts      Umsetzung über den WebDAV-Client von web-pkg
    MemoryDataStore.ts      Umsetzung im Speicher für Tests und Entwicklung
    location.ts             Space und Pfad der Bestandsdatei aus der App-Konfiguration
  composables/
    useStore.ts  useStock.ts  usePacklist.ts
  views/
    PacklistEditor.vue      /liste/<Space und Pfad der Datei>   (Reiter: Zelte · Material pro Zelt · Packliste)
    InventoryView.vue       /bestand
  components/               TentCard, TentOptions, ItemRow, StatusBanner, PrintLayout …
tests/unit/                 spiegelt src/
docs/zelttyp-anlegen.md     Anleitung (N-09)
```

## 3. Katalog (Code)

### 3.1 Artikel

```ts
type Category = 'dach' | 'wand' | 'stange' | 'abspannung' | 'kleinteil' | 'boden'
type Finish = 'blanko' | 'fenster' | 'gaze'
type WallRole = 'normalbahn' | 'superbahn' | 'erweiterungsstreifen' | 'erdstreifen'

interface Article {
  id: string // stabil, z. B. "superbahn-doppel-gaze"
  name: string
  category: Category
  cuttable?: boolean // Stange darf vor Ort geschlagen werden (F-2A)
  wall?: { role: WallRole; span: 1 | 2; finish: Finish } // nur Wandmaterial
}
```

Wandmaterial ist allein über `wall` beschrieben. Eine neue Bahn (z. B. „Doppel-Superbahn
mit Folienfenster“) ist ein neuer Eintrag in `articles.ts` und wird von der Zuweisung
automatisch berücksichtigt.

### 3.2 Zelttyp

```ts
interface Part {
  articleId: string
  quantity: number
}

interface RoofConfig {
  id: string
  label: string
  parts: Part[]
}

interface WallBuild {
  id: string // 'super' | 'normal+streifen' | 'normal' | 'streifen' | 'erdstreifen'
  label: string
  layers: WallRole[] // alle Lagen zusammen ergeben die Wand
}

interface WallOption {
  id: string // 'keine' | 'normal' | 'hoch' | 'nur-streifen' | 'erdstreifen' …
  label: string
  segments: number // 0 = keine Wand
  builds: WallBuild[] // Reihenfolge = Vorgabe; mehrere = Nutzer wählt bevorzugte
  parts: Part[] // was diese Option zusätzlich braucht, z. B. Seitenstangen
}

interface TentType {
  id: string
  name: string
  roofs: RoofConfig[] // erste = Vorgabe
  walls: WallOption[] // erste = Vorgabe
  fixed: Part[] // Dächle, Kreuz, Mast, Heringe, Abspannung, Bodenplane
  // Standardkonfiguration neuer Zelte (F-2C); fehlende Angaben = jeweils die erste Möglichkeit
  defaults?: { roofId?: string; wallId?: string; buildId?: string; finish?: Finish }
}
```

Beispiel – die ganze Datei `tents/jurte.ts`:

```ts
export const jurte: TentType = {
  id: 'jurte',
  name: 'Jurte',
  roofs: [
    { id: 'jurtendach', label: 'Jurtendach', parts: [{ articleId: 'jurtendach', quantity: 1 }] },
    {
      id: 'kohtenblaetter',
      label: '6 Kohtenblätter',
      parts: [{ articleId: 'kohtenblatt', quantity: 6 }]
    }
  ],
  walls: [keineWand(), normaleWand({ segmente: 12 }), hoheWand({ segmente: 12 })],
  fixed: [
    { articleId: 'jurtendaechle', quantity: 1 },
    { articleId: 'jurtenspinne-6', quantity: 1 },
    { articleId: 'seitenstange', quantity: 12 },
    { articleId: 'mast-375', quantity: 3 }
    // Abspannseile, Heringe, Blockseilrolle …
  ]
}
```

`keineWand`, `normaleWand`, `hoheWand`, `nurStreifen`, `erdstreifen` sind kleine
Hilfsfunktionen in `catalog/walls.ts`; sie ergänzen auch die Bodennägel je Wandsegment. `hoheWand` liefert z. B.
`builds: [super, normal+streifen]`. Kohte und Hochkohte nutzen dieselben Bausteine:

- Kohte: `walls: [keineWand(), erdstreifen()]`
- Hochkohte: `walls: [nurStreifen({ segmente: 8 }), normaleWand({ segmente: 8 }), hoheWand({ segmente: 8 })]`

Ein Test prüft für alle Zelttypen: eindeutige IDs, alle `articleId`s existieren, jede
Wandrolle hat mindestens einen Artikel (F-17).

## 4. Dateien im Space

### 4.1 `Zeltmaterial.bestand`

```ts
interface StockFile {
  schemaVersion: 1
  stock: Record<string, { quantity: number; note?: string }> // articleId → Bestand
}
```

Einträge zu unbekannten Artikel-IDs bleiben beim Speichern erhalten (F-07).

### 4.2 `<Name>.packliste` (beliebiger Ort)

```ts
interface TentConfig {
  id: string // eindeutig in der Packliste
  typeId: string
  label?: string
  roofId: string // bevorzugte Dachkonfiguration
  wallId: string // gewählte Wandoption
  buildId: string // bevorzugte Bauart innerhalb der Wandoption
  finish: Finish
}

interface PackItem {
  articleId: string
  name: string // Name zum Zeitpunkt der Berechnung
  category: Category
  quantity: number // aus dem Bestand zu packen
  missing: number // nicht gedeckt
  toCut: number // vor Ort zu schlagen (nur cuttable)
  perTent: Record<string, number> // TentConfig.id → Stückzahl
  checked: boolean
}

interface Deviation {
  tentId: string
  kind: 'dach' | 'wand'
  wanted: string // lesbare Beschreibung, z. B. "Superbahn Fenster"
  got: string | null // null = fehlt
  segments?: number
}

interface PacklistFile {
  schemaVersion: 1
  id: string
  name: string
  date?: string
  tents: TentConfig[]
  finishOrder: Finish[] // Ausweichreihenfolge, Vorgabe ['gaze', 'fenster', 'blanko'] (F-2B)
  items: PackItem[] // festgeschriebenes Rechenergebnis (F-37)
  deviations: Deviation[]
  extraItems: { id: string; text: string; quantity: number; checked: boolean }[]
  fingerprint: string // Hash aus Bestand + Katalog bei Berechnung
  updatedAt: string
}
```

Verweist eine gespeicherte Packliste auf einen Zelttyp oder eine Option, die es nach einem
App-Update nicht mehr gibt, bleibt die Liste lesbar (das Material ist festgeschrieben);
„Neu berechnen“ verlangt dann, das betroffene Zelt neu zu konfigurieren.

## 5. Rechenkern

Alle Funktionen sind rein. Eingaben: Zelte der Packliste, Katalog, Bestand.

```ts
allocate(tents: TentConfig[], finishOrder: Finish[], catalog: Catalog, stock: Stock): AllocationResult
//   → items: PackItem[] (ohne checked), deviations: Deviation[],
//     status: 'ok' | 'mit-ausweichmaterial' | 'fehlt'
recalculate(list: PacklistFile, catalog, stock): PacklistFile // übernimmt Haken (F-36)
fingerprint(catalog, stock): string
```

Ablauf von `allocate` – Zelte in Listenreihenfolge, Bestand als Arbeitskopie:

1. **Dach** (`roof.ts`): bevorzugte Dachkonfiguration nehmen, wenn alle Teile frei sind;
   sonst die nächste vollständig verfügbare; sonst die bevorzugte mit Fehlbestand.
2. **Feste Teile und Teile der Wandoption** abbuchen. Fehlendes wird `missing`, bei
   `cuttable`-Artikeln `toCut`.
3. **Wand** (`walls.ts`), siehe unten.
4. Abweichungen je Zelt zusammenfassen.

### 5.1 Wandzuweisung

Eingabe: Segmentzahl `n`, Bauarten der Wandoption, bevorzugte Bauart, Wunsch-Ausführung,
Ausweichreihenfolge der Ausführungen.

Daraus entsteht eine geordnete Liste von **Varianten** (Bauart × Ausführung) nach
Anforderungen 5.4. Für jede Variante der Reihe nach:

- Je Lage der Bauart die passenden Artikel bestimmen (Rolle, Ausführung; Rollen ohne
  Ausführungswahl wie `normalbahn` immer blanko).
- Eine Lage kann `k` Segmente decken, wenn es `d` Doppel- und `s` Einzelteile gibt mit
  `2d + s = k`, `d ≤ frei(doppel)`, `s ≤ frei(einzel)`; dabei `d` so groß wie möglich.
- Die Variante deckt das größte `k ≤ Rest`, das **alle** ihre Lagen decken können.
- Diese Teile abbuchen, `Rest -= k`, nächste Variante.

Bleibt ein Rest, wird er in der Wunsch-Variante als fehlend gebucht (Doppelteile zuerst
gezählt).

Eigenschaften: vorhersehbar, in einem Durchlauf, ohne Rückschritte. Bahn und Streifen einer
Bauart dürfen unabhängig einzel oder doppelt sein, weil jede Lage für sich gedeckt wird.
Eine globale Optimierung über alle Zelte ist bewusst nicht vorgesehen.

## 6. Speicherung

### 6.1 Schnittstelle

```ts
interface Versioned<T> {
  data: T
  etag: string | null // null = Datei existiert noch nicht
}

interface DataStore {
  canWrite(): Promise<boolean>
  loadStock(): Promise<Versioned<StockFile>>
  saveStock(file: StockFile, etag: string | null): Promise<string> // neuer ETag
}

// Eine geöffnete Packlisten-Datei; Ort und Name kommen von der Datei.
interface PacklistDocument {
  readonly name: string // Dateiname ohne Endung
  canWrite(): Promise<boolean>
  load(): Promise<Versioned<PacklistFile | null>> // null = leere Datei, frisch über „Neu“ angelegt
  save(file: PacklistFile, etag: string | null): Promise<string>
  close?(): void // zurück zur Dateiansicht
}
```

`DataStore` ist der Bestand am festen Ablageort. Eine Packliste ist dagegen ein
`PacklistDocument`: In OpenCloud baut `createDocument()` es aus Space und Datei, die der
App-Rahmen (`AppWrapperRoute`) der Ansicht übergibt, in Tests und Vorschau liefert `MemoryDataStore.document(id)` eines. Eine
leere Datei füllt `usePacklist` beim ersten Laden mit einer leeren Packliste.

Fehlerklassen: `NotConfiguredError`, `NotFoundError`, `ForbiddenError`, `ConflictError`,
`InvalidFileError`. Die Oberfläche übersetzt sie in Meldungen (F-42, N-05).

### 6.2 Gleichzeitiges Bearbeiten

Jedes Schreiben schickt den zuletzt gelesenen ETag als `If-Match`. Lehnt der Server ab,
wirft der Store `ConflictError`. `usePacklist` lädt neu, wendet die anstehende Änderung auf
den frischen Stand an und speichert erneut (F-38). Änderungen werden dafür als kleine
Operationen geführt (`toggle(itemId)`, `setTents(...)`), nicht als ganzer Dateizustand.
Haken werden gebündelt gespeichert (ca. 1 s Verzögerung).

### 6.3 Ablageort

Aus der App-Konfiguration des Servers (F-41), mit Vorgabe:

```json
{ "space": "Material-Team", "path": "Zeltmaterial.bestand" }
```

`location.ts` sucht den Space unter den Spaces des Nutzers und liefert die WebDAV-Basis.
Schreibrecht wird aus den Berechtigungen des Space abgeleitet. Das gilt nur für den Bestand;
Packlisten liegen dort, wo ihre Datei liegt, und ihr Schreibrecht kommt von der Datei.

**Zu klären im ersten Arbeitspaket:** wie die Konfiguration die App erreicht
(`manifest.json` / `apps.yaml` → `applicationConfig`) und welche Aufrufe von
`useClientService()` für Lesen, Schreiben mit `If-Match`, Auflisten und Rechteabfrage in
der eingesetzten `web-pkg`-Version gelten. Das ist die einzige Stelle mit echtem
technischem Risiko und wird deshalb zuerst und einzeln geklärt.

## 7. Oberfläche

| Route      | Ansicht        | Inhalt                                                                                        |
| ---------- | -------------- | --------------------------------------------------------------------------------------------- |
| `/liste/…` | PacklistEditor | Statusbanner; Reiter **Zelte** (Konfigurator), **Material pro Zelt**, **Packliste** (abhaken) |
| `/bestand` | InventoryView  | Artikel nach Kategorie, Suche, Stückzahlen bearbeiten                                         |

- Einstieg ist die Dateiansicht: `appInfo.extensions` verknüpft `.packliste` und `.bestand` mit
  den Routen und trägt „Packliste“ ins „Neu“-Menü ein (`newFileMenu`). Einen Eintrag im
  App-Umschalter und eine Seitenleiste gibt es nicht.
- Die Zeltkarte zeigt die Konfiguration in einer Zeile; die Auswahlfelder stehen hinter
  „Anpassen“ (F-2C). Sie baut ihre Auswahlfelder aus dem Zelttyp: Dach nur bei mehreren
  Dachkonfigurationen, Bauart nur bei mehreren Bauarten, Ausführung nur, wenn die gewählte
  Bauart eine Lage mit Ausführungen hat. Neue Zelttypen brauchen keine Änderung an der
  Oberfläche.
- Bedienelemente aus dem OpenCloud-Design-System, Abstände über die Tailwind-Klassen des
  SDK (Präfix `ext:`). Handy zuerst.
- Druck (F-39): Komponente `PrintLayout`, sichtbar nur unter `@media print`, Aufruf über
  `window.print()`. Keine PDF-Bibliothek.
- Texte deutsch als Quellsprache, durchgehend über `$gettext`.

## 8. Tests und Qualität

- `domain/`: Unit-Tests für jede Regel aus Anforderungen 5.3–5.5, mit Grenzfällen:
  Bestand 0, zwei Zelte konkurrieren um dieselben Bahnen, ungerade Segmentreste mit nur
  Doppelteilen, gemischte Einzel-/Doppellagen, Dach-Ausweichen, `cuttable`, Haken-Übernahme.
- Katalog: Konsistenztest über alle Zelttypen (F-17).
- `storage/`: Tests gegen `MemoryDataStore`; `WebDavDataStore` mit nachgebildetem Client
  (Konflikt, fehlende Datei, defekte Datei).
- Ansichten: Komponententests für die Kernabläufe (Zelt hinzufügen, abhaken, Nur-Lese-Modus).
- Manuell: einmal gegen die OpenCloud-Instanz aus `docker-compose.yml`.
- Vor jedem Zusammenführen: `pnpm lint`, `pnpm check:types`, `pnpm test:unit`, `pnpm build`.

## 9. Umsetzungsplan

Die Arbeitspakete werden von Subagenten umgesetzt, je Paket in einem eigenen Arbeitsbaum.
Verträge (AP 0), Review und Zusammenführen liegen beim Hauptagenten.

| AP  | Inhalt                                                                                              | Hängt ab von | Parallel |
| --- | --------------------------------------------------------------------------------------------------- | ------------ | -------- |
| 0   | Grundgerüst: Skeleton umbenennen, Routen, `types.ts`, `DataStore`-Schnittstelle, leere Ansichten    | –            | –        |
| 1   | Klärung OpenCloud-Anbindung (Konfiguration, WebDAV, ETag, Rechte), `WebDavDataStore`, `location.ts` | 0            | ja       |
| 2   | Rechenkern: `roof.ts`, `walls.ts`, `allocation.ts`, `packlist.ts`, `schema.ts` mit Tests            | 0            | ja       |
| 3   | Katalog: `articles.ts`, `walls.ts`, alle Zelttypen, Konsistenztest, `docs/zelttyp-anlegen.md`       | 0            | ja       |
| 4   | `MemoryDataStore` und Composables (`useStore`, `useStock`, `usePacklist` mit Konfliktbehandlung)    | 0            | ja       |
| 5   | Bestandsansicht                                                                                     | 4            | ja       |
| 6   | Packlisten-Übersicht und Konfigurator (Reiter „Zelte“, „Material pro Zelt“, Statusbanner)           | 2, 4         | ja       |
| 7   | Packliste abhaken, freie Zeilen, Druckansicht                                                       | 2, 4         | ja       |
| 8   | Zusammenbau, Test gegen OpenCloud im Container, README mit Installationsanleitung                   | alle         | –        |

AP 5–7 arbeiten gegen `MemoryDataStore` und einen kleinen Testkatalog und sind dadurch
weder von AP 1 noch von AP 3 blockiert. AP 3 setzt Abschnitt 7 der Anforderungen um; angenommene Werte werden im Code mit
`// PLATZHALTER` markiert und in `docs/zelttyp-anlegen.md` aufgelistet.

## 10. Entscheidungen

| Entscheidung                                      | Begründung                                                                                                 | Verworfen                              |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Zelttypen und Artikel im Code                     | Vom Stamm so gewünscht; typgeprüft, testbar, keine Fehler durch defekte Dateien im Space.                  | Stücklisten als Datei im Space         |
| Im Space nur Stückzahlen und Packlisten           | Kein Backend zu betreiben; Rechte, Versionen und Sicherung kommen von OpenCloud.                           | Eigener Dienst mit Datenbank           |
| Wandmaterial über Rollen, Lagen und Einzel/Doppel | Zuweisung steht einmal im Code; neue Bahnen sind nur neue Artikel, neue Zelte nur neue Segmentzahlen.      | Alternativen je Zelttyp ausformulieren |
| Dach als wählbare Konfiguration je Zelttyp        | Deckt „Jurtendach oder 6 Kohtenblätter“ und zusammengesetzte Dächer (Gigajurte 12 m) mit demselben Modell. | Dach als feste Stücklistenzeile        |
| Zuteilung in Listenreihenfolge                    | Vorhersehbar und erklärbar.                                                                                | Globale Optimierung                    |
| Packliste speichert das Rechenergebnis            | Eine abgehakte Liste ändert sich nicht unbemerkt durch Bestandskorrektur oder App-Update.                  | Immer live berechnen                   |
| ETag + erneutes Anwenden kleiner Operationen      | Gleichzeitiges Abhaken ohne Server-Logik.                                                                  | Sperren; „letzter gewinnt“             |
| Druck über Browser                                | Keine zusätzliche Abhängigkeit.                                                                            | PDF-Bibliothek                         |
| Kein zentraler Store (Pinia) für App-Zustand      | Drei Ansichten mit wenig geteiltem Zustand; Composables genügen.                                           | Pinia-Module                           |
