# Zeltkonfigurator

OpenCloud-Web-App für das Zeltmaterial des Stammes: Zelte zusammenstellen, Materialbedarf
gegen den Bestand prüfen, Packlisten speichern, abhaken und drucken.

- [Anforderungen](docs/anforderungen.md)
- [Architektur](docs/architektur.md)
- [Zelttyp, Dach oder Artikel anlegen](docs/zelttyp-anlegen.md)
- [OpenCloud-Anbindung: Befunde und offene Prüfungen](docs/opencloud-anbindung.md)

## Was die App kann

- **Packlisten:** je Lager eine Liste mit beliebig vielen Zelten. Jede Packliste ist eine Datei,
  die über „Neu → Packliste“ in jedem beliebigen Ordner angelegt wird.
- **Konfigurator:** Jedes Zelt startet in der Standardkonfiguration seines Typs; über „Anpassen“
  lassen sich Dach, Seitenwand, Bauart und Ausführung ändern. Reicht der Bestand
  nicht, weicht die App in einstellbarer Reihenfolge aus und zeigt die Abweichung am Zelt.
- **Material:** Bedarf pro Zelt und gesamt, abgeglichen mit dem Bestand (vorhanden, fehlt,
  vor Ort schlagen).
- **Abhaken und Drucken:** gemeinsamer Abhak-Stand für alle mit Zugriff, Druckansicht mit Kästchen.
- **Bestand:** Stückzahlen und Notizen je Artikel bearbeiten.

Zelttypen, Dachkonfigurationen und Artikel sind Code (`src/domain/catalog/`) und kommen mit
einem App-Update. Im Space liegen nur Stückzahlen und Packlisten.

## Installation in OpenCloud

1. Paket bauen:

   ```bash
   pnpm install
   pnpm package
   ```

   Das erzeugt `package/zeltkonfigurator.zip` mit dem Ordner `zeltkonfigurator/`.

2. Den Ordner `zeltkonfigurator` in das Web-App-Verzeichnis der Instanz kopieren
   (Vorgabe `$OC_DATA_DIR/web/assets/apps`, bei opencloud-compose `config/opencloud/apps`).
   Der Ordner muss genau so heißen.
3. OpenCloud neu starten. Die App hat keinen Eintrag im App-Umschalter; sie öffnet sich über
   ihre Dateien (siehe unten).
4. Einen Projekt-Space **„Material Team“** anlegen bzw. verwenden. Wer dort schreiben darf,
   kann Bestand und Packlisten bearbeiten; alle anderen Mitglieder sehen sie nur.

### Bedienung über die Dateiansicht

- **Packliste anlegen:** in einem beliebigen Ordner (auch in einem anderen Space) „Neu →
  Packliste“ wählen und einen Namen vergeben. Die Datei `<Name>.packliste` öffnet sich im
  Zeltkonfigurator. Die Liste heißt wie die Datei; umbenennen, verschieben, kopieren und löschen
  läuft über die Dateiansicht.
- **Packliste öffnen:** Klick auf die Datei.
- **Bestand:** liegt immer am selben Ort und wird beim ersten Speichern angelegt. Geöffnet wird
  er über die Datei `Zeltmaterial.bestand` oder über den Link „Bestand“ in jeder Packliste.

```
Material Team/
  Zeltkonfigurator/
    Zeltmaterial.bestand
```

Der Inhalt beider Dateiarten ist YAML. Wer eine Packliste bearbeiten will, braucht Schreibrecht
auf die Datei und Leserecht auf den Space mit dem Bestand.

### Anderer Space oder Ordner für den Bestand

In `$OC_CONFIG_DIR/apps.yaml`:

```yaml
zeltkonfigurator:
  config:
    space: 'Material Team'
    folder: 'Zeltkonfigurator'
```

## Entwicklung

```bash
pnpm install
pnpm preview            # Vorschau ohne OpenCloud, mit Beispielbestand im Arbeitsspeicher
pnpm test:unit --run
pnpm lint
pnpm check:types
pnpm build
```

Die Vorschau läuft auf <http://127.0.0.1:9230/> und zeigt eine Beispiel-Packliste. Mit `?readonly` in der Adresse zeigt sie den
Nur-Lese-Modus. Daten der Vorschau gehen beim Neuladen verloren.

Gegen eine lokale OpenCloud-Instanz: `pnpm build:w` und `docker compose up`, dann
<https://host.docker.internal:9200> (admin / admin).

## Prüfung und Release

Die Workflows für die automatische Prüfung und den Release-Bau liegen unter
[`ci/workflows/`](ci/README.md) und müssen einmalig nach `.github/workflows/` verschoben werden.
Danach baut ein Tag `vX.Y.Z` automatisch `zeltkonfigurator-X.Y.Z.zip` als GitHub-Release.

## Stand

Rechenkern, Katalog und Oberfläche sind durch automatische Tests abgedeckt und in der Vorschau
im Browser geprüft. **Nicht** geprüft ist der Betrieb gegen einen echten OpenCloud-Server
(Speichern mit Konflikterkennung, Rechteprüfung, Space-Suche); die Liste steht in
[docs/opencloud-anbindung.md](docs/opencloud-anbindung.md). Stücklisten-Werte, die noch
Annahmen sind, sind im Code mit `// PLATZHALTER` markiert und in
[docs/zelttyp-anlegen.md](docs/zelttyp-anlegen.md) aufgelistet.

Basiert auf dem [web-app-skeleton](https://github.com/opencloud-eu/web-app-skeleton) von OpenCloud.
