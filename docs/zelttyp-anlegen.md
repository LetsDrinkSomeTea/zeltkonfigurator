# Zelttyp, Dachkonfiguration oder Artikel ergänzen

Der Katalog liegt als Code unter `src/domain/catalog/`. Eine Änderung kommt mit einem
App-Update. Nach jeder Änderung läuft der Konsistenztest:

```sh
pnpm test:unit --run tests/unit/domain/catalog.spec.ts
```

Er prüft eindeutige IDs, bekannte Artikel, positive Mengen und passende Wandrollen (F-17).

## Neuen Artikel anlegen

1. In `src/domain/catalog/articles.ts` einen Eintrag in `articles` ergänzen:
   stabile `id` in kebab-case (z. B. `jurtenspinne-12`), deutscher `name`, `category`.
2. Wandmaterial (Kategorie `wand`): zusätzlich `wall: { role, span, finish }`. Ein neuer
   Eintrag in der Liste `wand` genügt, die Zuweisung berücksichtigt ihn automatisch.
3. IDs nie umbenennen: Bestandsdateien im Space verweisen darauf (F-07).

## Neuen Zelttyp anlegen

1. Neue Datei `src/domain/catalog/tents/<id>.ts` nach dem Muster von `jurte.ts` anlegen:
   `id`, `name`, `roofs`, `walls`, `fixed`.
2. Wände mit den Helfern aus `walls.ts` bauen: `keineWand()`, `normaleWand({ segmente })`,
   `hoheWand({ segmente })`, `nurStreifen({ segmente })`, `erdstreifen()`.
3. Feste Teile (Dächle, Spinne, Masten, Seitenstangen, Abspannseile, …) in `fixed`. Heringe über
   `heringe({ seitenwand, masten })`: 30-cm-T-Profile für Seitenwand und Abspannung, 60-cm-T-Profile
   je Mast, dazu je T-Profil ein PacMan. Feste Teile gelten auch ohne Seitenwand.
4. Den Zelttyp in `src/domain/catalog/tents/index.ts` importieren und in `tentTypes` einreihen.
5. Unsichere Werte mit einem Kommentar `// PLATZHALTER` am Ende der Zeile kennzeichnen und
   in die Tabelle unten eintragen.
6. Test ausführen (siehe oben), ggf. eine Stichprobe in `tests/unit/domain/catalog.spec.ts` ergänzen.

## Neue Dachkonfiguration

In der Datei des Zelttyps einen weiteren Eintrag in `roofs` ergänzen: eindeutige `id`,
`label` und `parts` (Artikel-ID und Menge). Die erste Konfiguration ist die Vorgabe; die
Reihenfolge der übrigen bestimmt, in welcher Folge ausgewichen wird (5.4).

## Neue Wandoption

1. Bevorzugt einen vorhandenen Helfer aus `walls.ts` verwenden.
2. Für eine neue Form in `walls.ts` eine Funktion ergänzen, die eine `WallOption` liefert:
   stabile `id`, `label`, `segments`, `builds` (jeweils `layers` mit Wandrollen) und `parts`
   (z. B. Bodennägel, 2 je Segment).
3. Die Option in `walls` des Zelttyps eintragen. Die erste Option ist die Vorgabe, sofern
   `defaults` nichts anderes festlegt.
4. Bei `segments: 0` darf es keine `builds` geben, sonst muss es mindestens eine geben.

## Standardkonfiguration

Ein neues Zelt startet in der Standardkonfiguration seines Typs. Ohne weitere Angabe ist das
jeweils die erste Möglichkeit (erstes Dach, erste Wandoption, erste Bauart) in Blanko. Mit
`defaults` im Zelttyp lässt sich das festlegen, z. B. für eine Jurte:

```ts
defaults: { wallId: 'hoch', buildId: 'super', finish: 'gaze' }
```

Alle Angaben sind optional (`roofId`, `wallId`, `buildId`, `finish`). Der Katalog-Test prüft,
dass sie auf vorhandene Dächer, Wandoptionen und Bauarten verweisen.

## Platzhalter

Alle Werte, die in `docs/anforderungen.md` mit (A) markiert sind, stehen im Code mit
`// PLATZHALTER`. Vor dem ersten Einsatz mit dem echten Material abgleichen:

| Datei                        | Wert                                                                                                                                                                                  | Prüfen                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `tents/hochkohte.ts`         | 2 × Mast 500 cm, 8 Abspannseile, 8 Heringe                                                                                                                                            | Mengen und Mastlänge                          |
| `tents/gigajurte9.ts`        | 3 × Mast 500 cm, 18 Abspannseile, 18 Heringe                                                                                                                                          | Mengen und Mastlänge                          |
| `tents/gigajurte12.ts`       | Jurtenspinne 9er, 3 × Mast 500 cm, 24 Abspannseile, 24 Heringe                                                                                                                        | Spinne, Mastzahl und -länge, Mengen           |
| `tents/theaterjurte.ts`      | Dach „6 Kohtenblätter + 2 Zwischendachteile“                                                                                                                                          | Dachvariante vorhanden?                       |
| `tents/dreierjurtenburg.ts`  | 27 Wandsegmente; Dach „18 Kohtenblätter + 1 Dreiecksdachteil“; 3 Jurtendächle, 3 Jurtenspinnen 6er, 9 × Mast 375 cm, 27 Seitenstangen, 27 Abspannseile, 27 Heringe, 3 Blockseilrollen | Geometrie, alle Mengen (O-3)                  |
| `tents/cafelounge.ts`        | 24 Wandsegmente (16 + 12, je 2 an den Knüpfstellen abgezogen); 2 × Holzgestänge; 24 Abspannseile; 32 Heringe; Aufzugseil                                                              | Geometrie, Holzgestänge je Jurte, Abspannung  |
| `tents/sudan.ts`             | Zelthaut, Gestängesatz, 16 Heringe, Bodenplane rund                                                                                                                                   | Gesamter Zelttyp (O-1)                        |
| `tents/yellowstone.ts`       | 1 Mittelmast, 16 Heringe, Bodenplane eckig                                                                                                                                            | Mittelmast, Heringe, Bodenplane (O-2)         |
| `walls.ts` (`erdstreifen()`) | 1 Erdstreifen je Kohte (`segments: 1`)                                                                                                                                                | Ein Streifen oder eigene Kohtenblätter? (O-5) |

Die Bodennägel (2 je Wandsegment, `walls.ts`) und die Annahme, dass Seitenstangen,
Abspannseile und Heringe auch ohne Wand gebraucht werden, ergeben sich aus 7.2 und sind
dort nur für die Zelttypen mit (A) hochgerechnet.
