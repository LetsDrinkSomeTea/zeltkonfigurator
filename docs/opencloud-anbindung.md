# OpenCloud-Anbindung (AP 1)

Ergebnis der Recherche in den installierten Paketen (`@opencloud-eu/web-pkg`, `web-client`,
`extension-sdk`, jeweils **8.2.2**) und Beschreibung der Umsetzung. Gelesen wurden die
Typdeklarationen (`dist/src/**/*.d.ts`) und die gebündelten Quellen (`dist/*.js`). Es lief
kein OpenCloud-Server; alles Unbelegte steht im Abschnitt „Nicht verifiziert“.

## 1. App-Konfiguration

- `defineWebApplication({ setup(options) })` bekommt `options: { applicationConfig: AppConfigObject; appName?: string }`
  (`web-pkg/dist/src/apps/types.d.ts`). `AppConfigObject = Record<string, any>`.
- Herkunft: Der `apps`-Store hat `externalAppConfig: Record<appId, AppConfigObject>` und
  `loadExternalAppConfig({ appId, config })`; `useAppConfig({ appsStore, applicationId })`
  liefert `externalAppConfig[applicationId] || {}`. Die `config.json` des Web-Clients kennt
  `external_apps: { id, path, version?, config?: Record<string, unknown> }[]`
  (`RawConfigSchema`, `composables/piniaStores/config/types.d.ts`). Der Server-seitige Weg dorthin
  (`apps.yaml` im Verzeichnis `WEB_ASSET_APPS_PATH`) ist **nicht** in den Paketen enthalten (siehe unten).
- `extension-sdk` erzeugt `manifest.json` im Build (`plugins/manifest.ts`): Es liest, falls vorhanden,
  `src/manifest.json` (relativ zum Projektwurzel-`src/`), setzt darüber `name`, `version`,
  `description`, `license`, `author` aus der `package.json` und `entrypoint`. Zusätzliche Schlüssel
  (also auch ein `config`) aus `src/manifest.json` werden unverändert übernommen. Es gibt dafür
  keine Option in `defineConfig` (nur `name`, `opencloudWebHostUrl` und Vite-Optionen).
- Umsetzung: `src/index.ts` ruft `setAppConfig(applicationConfig)` (neues Modul
  `src/storage/appConfig.ts`); `createStore()` liest `{ space, folder }` daraus mit den Vorgaben
  `Material Team` / `Zeltkonfigurator`.

Beispiel `apps.yaml` (Schema aus dem Gedächtnis, nicht belegt):

```yaml
zeltkonfigurator:
  config:
    space: Material Team
    folder: Zeltkonfigurator
```

## 2. WebDAV (`useClientService().webdav`)

`ClientService.webdav: WebDAV` (`web-client/dist/src/webdav/types.d.ts`). Alle Aufrufe nehmen ein
`SpaceResource`; Pfade sind relativ zum Space-Wurzelordner (`urlJoin(space.webDavPath, path)`).

| Aufruf                                                                                                                                                  | Verhalten                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getFileContents(space, { path }, { responseType = 'text', noCache = true, headers? }) → { body, response, headers: { ETag, 'OC-ETag', 'OC-FileId' } }` | GET. Der ETag steht in `headers.ETag` (so wie der Server ihn sendet, meist in Anführungszeichen). Bei `responseType: 'text'` ist `body` ein String.                                                                                                                   |
| `putFileContents(space, { path, content, previousEntityTag?, overwrite?, onUploadProgress? }) → Resource`                                               | PUT. `previousEntityTag` gesetzt → Header `If-Match: <Wert>` (Wert unverändert, also **mit Anführungszeichen** übergeben). Sonst, wenn `overwrite` falsy → `If-None-Match: *` (Anlegen). Danach ein PROPFIND (`getFileInfo`); der neue ETag steht in `resource.etag`. |
| `listFiles(space, { path }, { depth, davProperties }) → { resource, children? }`                                                                        | PROPFIND. `children` enthält bei `depth: 1` die Kinder (`name`, `isFolder`, `etag` …). Fehlender Ordner → 404.                                                                                                                                                        |
| `createFolder(space, { path, fetchFolder = true }) → FolderResource \| undefined`                                                                       | MKCOL (legt nur eine Ebene an). Existiert der Ordner, kommt vermutlich 405.                                                                                                                                                                                           |
| `deleteFile(space, { path }) → DavResult`                                                                                                               | DELETE.                                                                                                                                                                                                                                                               |

Fehler: `getFileContents` wirft `HttpError(message, response, status)`, die übrigen Aufrufe (über
`DAV.request`) `DavHttpError extends HttpError` mit `errorCode`, `errorType` (`web-client/dist/src/errors.d.ts`).
Beide haben `statusCode: number`. Das mappt `WebDavDataStore` (`statusOf()` liest `statusCode`, ersatzweise `response.status`):
404 → `NotFoundError`, 401/403 → `ForbiddenError`, 412 → `ConflictError`.

ETag-Behandlung: GET-Header und PROPFIND-Eigenschaft liefern den ETag evtl. unterschiedlich
(mit/ohne Anführungszeichen, `W/`). Der Adapter `createWebDavFiles` normalisiert ihn auf den „nackten“ Wert
(`normalizeEtag`) und setzt beim Schreiben die Anführungszeichen wieder davor. Der `DataStore` reicht
ETags nur als undurchsichtige Zeichenketten weiter.

Anlegen ohne Überschreiben: `saveX(file, null)` ruft `putFileContents` ohne `previousEntityTag` und mit
`overwrite: false` → `If-None-Match: *`; existiert die Datei, erwartet man 412 → `ConflictError`.

## 3. Spaces und Schreibrecht

- `useSpacesStore()` (`web-pkg`, Store-ID `spaces`): `spaces: SpaceResource[]` (persönlich, Projekt, Shares,
  Mountpoints), `allProjectSpaces`, `spacesInitialized`, `spacesLoading`, `getSpace(id)`,
  `loadSpaces({ graphClient })`, `loadGraphPermissions({ ids, graphClient, useCache? })`.
- `useSpacesLoading()` → `{ areSpacesLoading, waitForSpaces() }` wartet, bis `spacesInitialized && !spacesLoading`.
- Der Name steht in `space.name`, die ID in `space.id`, die Art in `space.driveType` (`'project'` usw.).
- Schreibrecht: `space.canUpload({ user })` (gibt `true` für den Besitzer des persönlichen Space, sonst
  `graphPermissions.includes('libre.graph/driveItem/upload/create')`). **`graphPermissions` ist anfangs `undefined`** und wird
  nur beim Öffnen des Space in der Dateiansicht geladen; deshalb ruft `createStore` vorher
  `spacesStore.loadGraphPermissions({ ids: [space.id], graphClient: clientService.graphAuthenticated })` auf.
- Der Nutzer: `useUserStore().user` (Graph-`User`).

## 4. Umsetzung

| Datei                            | Inhalt                                                                                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/storage/location.ts`        | `readStorageConfig`, `findSpace` (ID, dann Name ohne Groß-/Kleinschreibung und Leerraum, Projekt-Spaces bevorzugt), `resolveLocation` (`NotConfiguredError`).       |
| `src/storage/WebDavDataStore.ts` | `WebDavDataStore` (kennt nur das schmale Interface `WebDavFiles`), Adapter `createWebDavFiles(clientService.webdav, space)`.                                        |
| `src/storage/createStore.ts`     | Verdrahtung in `setup()`. Space-Suche erst beim ersten Zugriff (`loadSpaces` falls nötig, dann `waitForSpaces`), Ergebnis wird gemerkt, bei Fehler erneut versucht. |
| `src/storage/appConfig.ts`       | Hält `applicationConfig` zwischen `setup()` der App und `createStore()`.                                                                                            |
| `src/domain/schema.ts`           | Platzhalter (Objekt + `schemaVersion === 1`), wird beim Merge ersetzt.                                                                                              |

Verhalten: Der Bestand liegt in `<folder>/Zeltmaterial.bestand`; fehlende Ordner werden vor dem
ersten Schreiben per MKCOL angelegt (405 = existiert schon). Packlisten (`<Name>.packliste`)
liegen an beliebiger Stelle: `src/storage/createDocument.ts` löst Space und Pfad über
`useAppDefaults` aus der Adresse auf und liest und schreibt die Datei an Ort und Stelle
(`WebDavPacklistDocument`). Schreibrecht einer Packliste = DAV-Berechtigung der Datei. Beide
Dateiarten sind YAML. Eine leere Datei (frisch über „Neu“ angelegt) gilt als neue Packliste.

## 5. Nicht verifiziert (ohne laufenden Server)

1. **Wie die Server-Konfiguration ankommt.** Belegt ist nur die Client-Seite (`external_apps[].config` →
   `applicationConfig`). Offen: ob/wie `apps.yaml` bzw. `manifest.json` des OpenCloud-Servers `config` an die Web-App
   weiterreicht, und unter welchem Schlüssel (`appId`) sie ankommt. Zu prüfen: `applicationConfig` in `setup()` per
   `console.log`. Ohne Konfiguration greifen die Vorgaben.
2. **`If-None-Match: *`** beim Anlegen: Wird es vom OpenCloud-WebDAV mit 412 beantwortet, wenn die Datei existiert?
   Falls nicht, überschreibt ein gleichzeitiges Anlegen still.
3. **If-Match** mit dem aus GET gelesenen ETag: Passt dieser Wert (inklusive Anführungszeichen) zu dem, was PUT
   erwartet, und liefert ein PUT mit altem ETag wirklich 412?
4. **ETag nach PUT:** `putFileContents` holt `resource.etag` per PROPFIND mit der `Oc-Fileid` aus der PUT-Antwort. Fehlt der ETag, liest
   der Store die Datei erneut (GET).
5. **PUT in fehlenden Ordner:** Der Store legt die Ordner vorher an; MKCOL auf einen vorhandenen Ordner soll 405 liefern
   (andere Antwort → Fehler beim Speichern).
6. **Statuscode bei fehlendem Ordner** beim Auflisten (404 angenommen).
7. **`graphPermissions`/`canUpload`:** Funktioniert `loadGraphPermissions` für den Space des Nutzers wie beschrieben und
   liefert `canUpload` danach den richtigen Wert (Rolle „Betrachter“ → `false`)?
8. **`waitForSpaces`:** Es wird angenommen, dass die Runtime die Spaces beim Login lädt; sonst lädt `createStore` selbst. Ob
   `loadSpaces` `spacesInitialized` setzt, wurde nicht geprüft.
9. **Typkompatibilität zur Laufzeit:** `getFileContents` mit `responseType: 'text'` liefert den Text, nicht bereits geparstes JSON
   (der Store akzeptiert beides).

## Nachtrag: Abgleich mit der OpenCloud-Dokumentation

Geprüft gegen <https://docs.opencloud.eu/docs/next/dev/web/extension-system/> und die
Admin-Dokumentation „Web Applications“:

- **Vorgaben:** stehen unter `config` in `src/manifest.json` und landen im `manifest.json` des Builds.
- **Entwicklung:** `src/config.json` (nicht eingecheckt) wird über die Vorgaben gelegt.
- **Betrieb:** Admins überschreiben in `$OC_CONFIG_DIR/apps.yaml`, Schlüssel ist die App-ID:

  ```yaml
  zeltkonfigurator:
    config:
      space: 'Material Team'
      folder: 'Zeltkonfigurator'
  ```

  Alternativ über eine `config.json` im App-Ordner (`{ "config": { … } }`).

- **Lesen:** Die zusammengeführte Konfiguration kommt als `applicationConfig` in `setup()` an –
  so ist es in `src/index.ts` umgesetzt. Punkt 1 der offenen Prüfungen ist damit laut
  Dokumentation geklärt, aber nicht gegen einen laufenden Server getestet.
- **Installation:** Der Ordner im Web-App-Verzeichnis muss wie die App-ID heißen
  (`zeltkonfigurator`) und den Inhalt von `dist/` enthalten.
- **Navigation:** Die App registriert weder `navItems` noch einen Eintrag im App-Umschalter.
  Sie hängt über `appInfo.extensions` an den Endungen `.packliste` (mit `newFileMenu`) und
  `.bestand`. Im Browser gegen OpenCloud 9.0.0 geprüft: „Neu → Packliste“, Öffnen per Klick,
  Schließen zurück in den Ordner, Nur-Lese-Ansicht für Mitglieder mit Leserecht.
- **Neustart nötig:** OpenCloud liest das `manifest.json` einer App nur beim Start. Da der
  Dateiname des Einstiegspunkts bei jedem Build wechselt, muss der Server nach jedem Build neu
  gestartet werden, sonst lädt die App nicht (404 auf `remoteEntry-….mjs`).
  Eintrag gibt; die App nutzt das für „Packlisten“ und „Bestand“.
