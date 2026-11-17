# Zelttypen, Dächer und Material pflegen

Material, Kategorien, Dächer und Zelttypen werden in der App gepflegt: **Materialliste**
(Knopf „Materialliste“ in jeder Packliste oder die Datei `Zeltmaterial.bestand` öffnen). Dafür
braucht es Schreibrecht auf diese Datei. Ein App-Update ist nicht nötig.

## Material

Reiter **Material**:

- **Neues Material:** „Material hinzufügen“, Name, Kategorie (oder „Neue Kategorie …“) und die
  vorhandene Anzahl eintragen. Das geht für alles, was der Stamm hat, nicht nur Zeltmaterial.
- **Ändern:** Stift neben dem Namen. Name und Kategorie lassen sich jederzeit ändern;
  Packlisten zeigen den neuen Namen nach dem nächsten Neuberechnen.
- **Löschen:** Papierkorb. Wird das Material noch von einem Dach oder Zelttyp gebraucht, sagt
  die App wo, und löscht nicht.
- **Kategorien:** unten „Kategorien verwalten“: anlegen, umbenennen, leere löschen. Die
  Reihenfolge der Kategorien ist auch die Reihenfolge in Packlisten und im Ausdruck.
- Das Wandmaterial (Normalbahnen, Superbahnen, Erweiterungsstreifen, Erdstreifen) ist fest in
  der App, weil die Wandberechnung davon abhängt. Stückzahlen und Notizen lassen sich ändern.

## Dächer

Ein **Dach** ist ein Baustein, aus dem Zelttypen bestehen, z. B. „Jurte“. Reiter **Dächer**:

- **Dach-Varianten:** woraus das Dach besteht, z. B. „Jurtendach“ oder „6 Kohtenblätter“.
  Die erste ist die Vorgabe; reicht der Bestand nicht, weicht die App auf die nächste aus.
- **Aufbauten:** wie das Dach steht und welches Gestänge dafür nötig ist, z. B. „Gestellt“
  (Spinne, 3 Masten), „Gehängt“ (2 lange Mittelpfosten, 4 × T-Profil 60 cm) oder
  „Holzgestänge“. Der erste ist die Vorgabe.
- **Immer dabei:** was das Dach in jedem Fall braucht, z. B. das Dächle.

## Zelttypen

Reiter **Zelttypen** → „Neuer Zelttyp“ (oder einen vorhandenen kopieren):

1. **Name.**
2. **Dächer:** ein oder mehrere Dächer. Bei jedem Dach lässt sich einschränken, welche Aufbauten
   angeboten werden (Cafélounge: Groß- und Kleinjurte nur auf dem Holzgestänge).
3. **Seitenwand:** Zahl der Wandsegmente rundherum und die wählbaren Wände (keine, normal,
   hoch, nur Erweiterungsstreifen, Erdstreifen der Kohte) sowie die Standard-Wand.
4. **Weiteres Material:** was das Zelt unabhängig vom Dach braucht, z. B. Seitenstangen,
   Abspannseile, T-Profile, PacMan, Bodenplane.

Ein neues Zelt in einer Packliste startet in der Standardkonfiguration: erste Dach-Variante,
erster Aufbau, Standard-Wand.

## Was gespeichert wird

Solange niemand etwas ändert, gilt der mitgelieferte Katalog (`src/domain/catalog/`). Mit der
ersten Änderung speichert die App den ganzen Katalog in der Materialliste (`catalog` in
`Zeltmaterial.bestand`). Ab dann gilt dieser; spätere App-Updates ändern ihn nicht mehr.
Packlisten merken sich, mit welchem Stand gerechnet wurde, und bieten nach Änderungen
„Neu berechnen“ an (oder rechnen still neu, solange nichts abgehakt ist).

## Mitgelieferter Katalog (für Entwickler)

Die Vorgaben stehen in `src/domain/catalog/`: `articles.ts` (Material und Kategorien),
`modules.ts` (Dächer) und `tentTypes.ts` (Zelttypen). Nach Änderungen:

```sh
pnpm test:unit --run tests/unit/domain/catalog.spec.ts
```

Unsichere Werte sind mit `// PLATZHALTER` markiert. Vor dem Einsatz mit dem echten Material
abgleichen; in der App lassen sie sich ebenfalls korrigieren:

| Wo                         | Wert                                                                 | Prüfen                                       |
| -------------------------- | -------------------------------------------------------------------- | -------------------------------------------- |
| Dach „Hochkohte“           | 2 × Mast 500 cm                                                      | Mastlänge                                    |
| Zelttyp „Hochkohte“        | 8 Abspannseile, 8 T-Profile                                          | Mengen                                       |
| Dächer „Gigajurte“         | Jurtenspinne 9er, 3 × Mast 500 cm, 8 × T-Profil 60 cm                | Spinne, Mastzahl und -länge                  |
| Zelttypen „Gigajurte“      | Abspannseile und T-Profile je Wandsegment                            | Mengen                                       |
| Dach „Theaterjurte“        | Variante „6 Kohtenblätter + 2 Zwischendachteile“                     | Variante vorhanden?                          |
| Zelttyp „Dreierjurtenburg“ | 27 Wandsegmente, 27 Seitenstangen, 27 Abspannseile, 27 T-Profile     | Geometrie, Mengen (O-3)                      |
| Zelttyp „Cafélounge“       | 24 Wandsegmente (16 + 12, je 2 an den Knüpfstellen), 24 Abspannseile | Geometrie, Abspannung                        |
| Dächer/Zelttypen Weißzelte | Zelthaut, Gestängesatz bzw. Mittelmast, 16 T-Profile, Bodenplane     | Gesamte Zelttypen (O-1, O-2)                 |
| `walls.ts` `erdstreifen()` | 1 Erdstreifen je Kohte                                               | Ein Streifen oder eigene Kohtenblätter (O-5) |
