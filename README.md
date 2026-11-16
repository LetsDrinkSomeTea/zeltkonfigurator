# Zeltkonfigurator

OpenCloud-Web-App für das Zeltmaterial des Stammes: Zelte zusammenstellen, Materialbedarf
gegen den Bestand prüfen, Packlisten speichern, abhaken und drucken.

- [Anforderungen](docs/anforderungen.md)
- [Architektur](docs/architektur.md)
- [Zelttyp, Dach oder Artikel anlegen](docs/zelttyp-anlegen.md)
- [OpenCloud-Anbindung: Befunde und offene Prüfungen](docs/opencloud-anbindung.md)

## Was die App kann

- **Packlisten:** je Lager eine Liste mit beliebig vielen Zelten, gespeichert als Datei im Space.
- **Konfigurator:** pro Zelt Dach, Seitenwand, Bauart und Ausführung wählen. Reicht der Bestand
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
3. OpenCloud neu starten. Die App erscheint im App-Umschalter.
4. Einen Projekt-Space **„Material Team“** anlegen bzw. verwenden. Wer dort schreiben darf,
   kann Bestand und Packlisten bearbeiten; alle anderen Mitglieder sehen sie nur.

Die App legt ihre Dateien beim ersten Speichern selbst an. Der Inhalt ist YAML; die eigenen
Endungen sorgen dafür, dass ein Klick auf die Datei im Space direkt die Packliste bzw. den
Bestand in der App öffnet. Eine Packlisten-Datei heißt wie die Liste und wird beim Umbenennen
der Liste mit umbenannt.

```
Material Team/
  Zeltkonfigurator/
    Zeltmaterial.bestand
    packlisten/<Name>.packliste
```

### Anderer Space oder Ordner

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

Die Vorschau läuft auf <http://127.0.0.1:9230/>. Mit `?readonly` in der Adresse zeigt sie den
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
