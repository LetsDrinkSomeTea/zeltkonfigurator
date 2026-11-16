# Anforderungen – Zeltkonfigurator

Stand: 2026-11-16 · Status: Entwurf zur Abstimmung

## 1. Ziel

Eine OpenCloud-Web-App für den Stamm, die das Zeltmaterial (Jurtenland-Schwarzzelte und
Weißzelte) kennt und die Frage beantwortet:

> „Ich möchte 2 Hochkohten und eine Jurte aufstellen – was brauche ich dafür, und haben wir
> das alles?“

Ergebnis ist eine Materialliste pro Zelt und eine summierte, abhakbare Packliste, die im
OpenCloud-Space gespeichert und gedruckt werden kann.

## 2. Abgrenzung

Nicht Teil der App:

- Ein- und Auschecken, Ausleihe, Reservierung von Material über Zeiträume.
- Zubehör und Werkzeug (Bodenplanen, Hämmer, Spaten, Reparaturset). Solche Dinge können
  als freie Zeile auf einer Packliste ergänzt werden (F-34), werden aber nicht berechnet.
- Eigene Benutzer- und Rechteverwaltung – Rechte kommen ausschließlich aus dem Space.
- Offline-Betrieb.
- Bearbeitungsoberfläche für die Stücklisten der Zelttypen (siehe F-14).

## 3. Rollen

| Rolle        | Erkennung                         | Darf                                                         |
| ------------ | --------------------------------- | ------------------------------------------------------------ |
| Bearbeiter   | Schreibrecht im Material-Space    | Bestand pflegen, Packlisten anlegen, ändern, abhaken, löschen |
| Betrachter   | nur Leserecht im Material-Space   | Bestand und Packlisten ansehen und drucken                    |

## 4. Begriffe

| Begriff               | Bedeutung                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------- |
| Artikel               | Ein Materialtyp im Bestand, z. B. „Kohtenblatt“ oder „Seitenstange 180 cm“, mit Stückzahl.   |
| Zelttyp               | Kohte, Hochkohte, Jurte, Großjurte, Gigajurte 9 m, Gigajurte 12 m, Sudan, Yellowstone.       |
| Stückliste            | Regeln, welche Artikel ein Zelttyp in welcher Konfiguration braucht.                         |
| Normalbahn            | Seitenbahn in Standardhöhe.                                                                  |
| Superbahn             | Höhere Seitenbahn; ersetzt die Normalbahn.                                                   |
| Erweiterungsstreifen  | Streifen, der eine Normalbahn erhöht. Normalbahn + Streifen ist die Alternative zur Superbahn. |
| Ausführung            | Blanko, Fenster oder Gaze. Gibt es bei Superbahnen und Erweiterungsstreifen.                 |
| Wandsegment           | Ein Feld der Seitenwand eines Zeltes (zwischen zwei Seitenstangen).                          |
| Packliste             | Gespeicherte Zeltzusammenstellung für ein Lager samt berechnetem Material und Abhak-Stand.   |

## 5. Funktionale Anforderungen

### 5.1 Material und Bestand

| ID   | Anforderung                                                                                                                             |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------- |
| F-01 | Die App zeigt den Bestand als Liste, gruppiert nach Kategorie: Planen, Stangen und Gestänge, Heringe und Abspannung, Kleinteile.         |
| F-02 | Bearbeiter können je Artikel Stückzahl und Notiz ändern.                                                                                |
| F-03 | Bearbeiter können Artikel anlegen, umbenennen und löschen. Löschen ist gesperrt, solange eine Stückliste den Artikel verwendet.          |
| F-04 | Der Bestand liegt als Datei im Space. Beim ersten Start wird er aus mitgelieferten Vorgabedaten (Stückzahl 0) angelegt.                  |
| F-05 | Betrachter sehen den Bestand ohne Bearbeitungselemente.                                                                                 |
| F-06 | Die Bestandsliste ist durchsuchbar.                                                                                                     |

### 5.2 Zelttypen und Stücklisten

| ID   | Anforderung                                                                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F-10 | Die App kennt die acht Zelttypen aus Abschnitt 4.                                                                                                            |
| F-11 | Jeder Zelttyp hat eine Stückliste mit festen Positionen (z. B. Dachplanen, Kreuz, Mast) und Positionen, die von der Seitenwand-Auswahl abhängen.              |
| F-12 | Jeder Zelttyp legt fest, welche Seitenwand-Optionen er anbietet. Zelte ohne wählbare Seitenwand (voraussichtlich Kohte und beide Weißzelte) haben keine Auswahl. |
| F-13 | Stücklisten sind Daten, kein Programmcode. Sie liegen als Datei im Space und werden beim ersten Start aus Vorgabedaten angelegt.                              |
| F-14 | Stücklisten werden in Version 1 direkt in der Datei gepflegt, nicht über eine Oberfläche. Die App prüft die Datei beim Laden und meldet Fehler verständlich.   |

### 5.3 Konfigurator

| ID   | Anforderung                                                                                                                                                                                         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-20 | In einer Packliste lassen sich beliebig viele Zelte hinzufügen, entfernen und duplizieren. Jedes Zelt kann eine Bezeichnung bekommen (z. B. „Küchenjurte“).                                          |
| F-21 | Pro Zelt wird die Seitenwand einheitlich gewählt: **keine**, **normal** oder **hoch**.                                                                                                              |
| F-22 | Bei „hoch“ wird die bevorzugte Bauart gewählt: **Superbahn** (Vorgabe) oder **Normalbahn + Erweiterungsstreifen**.                                                                                   |
| F-23 | Pro Zelt wird die Wunsch-Ausführung gewählt: **Blanko**, **Fenster** oder **Gaze**. Sie gilt für die Superbahnen bzw. Erweiterungsstreifen dieses Zeltes.                                            |
| F-24 | Die App berechnet sofort nach jeder Änderung die Materialliste pro Zelt und die Gesamtliste.                                                                                                         |
| F-25 | Die App gleicht den Bedarf mit dem Bestand ab und zeigt je Artikel: benötigt, vorhanden, fehlend.                                                                                                    |
| F-26 | Reicht der Bestand für den Wunsch nicht, weicht die App je Wandsegment in fester Reihenfolge aus (siehe 5.4) und kennzeichnet jede Abweichung am betroffenen Zelt.                                   |
| F-27 | Kann ein Wandsegment auf keinem Weg gedeckt werden, wird es als fehlend ausgewiesen – gezählt in der Wunsch-Bauart und Wunsch-Ausführung.                                                            |
| F-28 | Zelte werden in Listenreihenfolge bedient: Das erste Zelt bekommt seine Wünsche zuerst. Die Reihenfolge ist per Ziehen oder Pfeilen änderbar.                                                        |
| F-29 | Eine Zusammenfassung oben zeigt auf einen Blick: „alles vorhanden“, „mit Ausweichmaterial machbar“ oder „es fehlt Material“.                                                                         |

### 5.4 Ausweichreihenfolge für Wandsegmente

Für ein Zelt mit Seitenwand „hoch“, Wunsch-Bauart B und Wunsch-Ausführung A wird jedes
Wandsegment mit der ersten verfügbaren Möglichkeit gedeckt:

1. Bauart B in Ausführung A
2. andere Bauart in Ausführung A
3. Bauart B in anderer Ausführung (Reihenfolge: Blanko, Fenster, Gaze)
4. andere Bauart in anderer Ausführung

Die Höhe wird nie automatisch geändert: Ein Zelt mit „hoch“ bekommt keine Normalbahnen ohne
Streifen und umgekehrt. Bei Seitenwand „normal“ gibt es nur dann Ausweichmöglichkeiten,
wenn Normalbahnen in mehreren Ausführungen existieren (offener Punkt O-2).

### 5.5 Packlisten

| ID   | Anforderung                                                                                                                                                      |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-30 | Eine Übersicht zeigt alle gespeicherten Packlisten mit Name, Datum, Anzahl Zelte und Abhak-Fortschritt.                                                          |
| F-31 | Packlisten können angelegt, umbenannt, dupliziert und gelöscht werden. Löschen verlangt eine Bestätigung.                                                         |
| F-32 | Jede Packliste ist eine eigene Datei im Space und enthält Zelte, berechnetes Material und Abhak-Stand.                                                           |
| F-33 | Jede Zeile der Packliste ist abhakbar. Der Stand wird automatisch gespeichert und ist für alle mit Zugriff derselbe.                                             |
| F-34 | Bearbeiter können freie Zeilen ergänzen (Text, Stückzahl), die ebenfalls abhakbar sind.                                                                          |
| F-35 | Die Packliste lässt sich umschalten zwischen „Gesamt“ (summiert, nach Kategorie) und „Pro Zelt“.                                                                 |
| F-36 | Wird die Zeltzusammenstellung geändert, bleibt ein Haken erhalten, wenn Artikel und Stückzahl der Zeile gleich bleiben; sonst wird er entfernt.                  |
| F-37 | Die Packliste speichert das berechnete Material fest. Ändert sich später der Bestand, weist die App darauf hin und bietet „Neu berechnen“ an.                    |
| F-38 | Bearbeiten zwei Personen gleichzeitig dieselbe Packliste, geht kein Haken verloren: Bei einem Speicherkonflikt lädt die App neu und wendet die eigene Änderung erneut an. |
| F-39 | Eine Druckansicht gibt die Packliste mit Kästchen zum Abhaken aus (Gesamt und pro Zelt, bereits gesetzte Haken sichtbar). PDF entsteht über den Druckdialog des Browsers. |

### 5.6 Einbindung in OpenCloud

| ID   | Anforderung                                                                                                                               |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| F-40 | Die App erscheint im App-Umschalter von OpenCloud.                                                                                        |
| F-41 | Der Ablageort (Space und Ordner) wird einmal in der App-Konfiguration des Servers festgelegt.                                             |
| F-42 | Fehlt die Konfiguration, der Space oder der Zugriff, zeigt die App eine verständliche Meldung statt einer leeren Seite.                    |
| F-43 | Packlisten-Dateien lassen sich auch aus der Dateiansicht heraus mit der App öffnen. *(Wunsch, nicht für Version 1 zugesagt)*              |

## 6. Nichtfunktionale Anforderungen

| ID   | Anforderung                                                                                                                         |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------- |
| N-01 | Kein eigenes Backend. Alle Daten liegen als Dateien im Space; die App läuft vollständig im Browser.                                  |
| N-02 | Bedienbar auf dem Handy (ab 360 px Breite), insbesondere das Abhaken im Materiallager.                                               |
| N-03 | Oberfläche auf Deutsch. Texte sind übersetzbar angelegt.                                                                            |
| N-04 | Optik und Bedienelemente folgen dem OpenCloud-Design-System, inklusive Dunkelmodus.                                                  |
| N-05 | Alle Dateien tragen eine Schema-Version. Unbekannte oder defekte Dateien werden abgewiesen, nicht stillschweigend überschrieben.     |
| N-06 | Die Berechnungslogik ist vollständig durch automatische Tests abgedeckt.                                                             |
| N-07 | Die Dateien sind lesbares JSON, damit sie notfalls von Hand korrigiert werden können.                                                |
| N-08 | Bedienelemente sind per Tastatur erreichbar und beschriftet.                                                                        |

## 7. Vorgabedaten – Stücklisten (zu prüfen)

Die folgenden Werte sind **Annahmen aus üblichen Jurtenland-Aufbauten und nicht geprüft**.
Felder mit „?“ kenne ich nicht. Bitte korrigieren und ergänzen; daraus entstehen die
mitgelieferten Vorgabedaten.

| Zelttyp        | Dach                        | Wandsegmente | Seitenstangen | Mast / Gestänge                 | Kleinteile                         | Heringe / Abspannungen |
| -------------- | --------------------------- | ------------ | ------------- | ------------------------------- | ---------------------------------- | ---------------------- |
| Kohte          | 4 Kohtenblätter             | –            | –             | 2 Kohtenstangen (Zweibein)      | Kohtenkreuz, Rauchlochabdeckung    | 8 / –                  |
| Hochkohte      | 4 Kohtenblätter             | 8            | 8             | 2 Kohtenstangen, länger         | Kohtenkreuz, Rauchlochabdeckung    | 8–16 / 8               |
| Jurte          | 6 Jurtendachbahnen          | 12           | 12            | 2 Jurtenstangen (Zweibein)      | Jurtenkreuz, Rauchlochabdeckung    | 12–24 / 12             |
| Großjurte      | ?                           | ?            | ?             | ?                               | ?                                  | ?                      |
| Gigajurte 9 m  | ?                           | ?            | ?             | ?                               | ?                                  | ?                      |
| Gigajurte 12 m | ?                           | ?            | ?             | ?                               | ?                                  | ?                      |
| Sudan          | Zelthaut komplett           | –            | –             | Gestängesatz                    | ?                                  | ?                      |
| Yellowstone    | Zelthaut komplett           | –            | –             | Gestängesatz                    | ?                                  | ?                      |

Je Wandsegment bei „normal“: 1 Normalbahn. Bei „hoch“: 1 Superbahn oder 1 Normalbahn +
1 Erweiterungsstreifen, dazu die längere Seitenstange.

## 8. Offene Punkte

| ID  | Frage                                                                                                                                   | Annahme bis zur Klärung                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| O-1 | Ist Normalbahn + Erweiterungsstreifen gleich hoch wie eine Superbahn, also mit denselben Seitenstangen aufstellbar?                      | Ja, beides gilt als „hoch“.                      |
| O-2 | Gibt es Normalbahnen auch mit Fenster oder Gaze, oder nur blanko?                                                                       | Nur blanko.                                      |
| O-3 | Habt ihr Doppelbahnen (eine Plane über zwei Wandsegmente)?                                                                              | Nein. Das Datenmodell lässt es später zu.        |
| O-4 | Passt ein Erweiterungsstreifen an genau eine Normalbahn, oder gibt es Streifen über mehrere Segmente?                                    | Ein Streifen je Segment.                         |
| O-5 | Sollen Kohte, Sudan und Yellowstone wirklich ohne Auswahl sein? Haben die Weißzelte eigene Varianten (Innenzelt, Vordach)?               | Keine Auswahl.                                   |
| O-6 | Werden Mittelmasten und Seitenstangen komplett aus dem Bestand genommen, oder teils vor Ort geschlagen?                                  | Komplett aus dem Bestand.                        |
| O-7 | Stücklisten für Großjurte, Gigajurten und Weißzelte (Tabelle in Abschnitt 7).                                                            | –                                                |
| O-8 | In welchem Space und Ordner sollen die Daten liegen?                                                                                    | Projekt-Space „Material“, Ordner „Zeltmaterial“. |
