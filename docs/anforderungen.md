# Anforderungen – Zeltkonfigurator

Stand: 2026-11-16 · Status: Entwurf 3 zur Abstimmung

## 1. Ziel

Eine OpenCloud-Web-App für den Stamm, die das Zeltmaterial (Schwarzzelte und Weißzelte von
Tortuga) kennt und die Frage beantwortet:

> „Ich möchte 2 Hochkohten und eine Jurte aufstellen – was brauche ich dafür, und haben wir
> das alles?“

Ergebnis ist eine Materialliste pro Zelt und eine summierte, abhakbare Packliste, die im
OpenCloud-Space gespeichert und gedruckt werden kann.

## 2. Abgrenzung

Nicht Teil der App:

- Ein- und Auschecken, Ausleihe, Reservierung von Material über Zeiträume.
- Werkzeug und sonstiges Zubehör (Hämmer, Spaten, Reparaturset). Solche Dinge können als
  freie Zeile auf einer Packliste ergänzt werden (F-34), werden aber nicht berechnet.
  Ausnahme: Bodenplanen der Weißzelte gehören zur Stückliste (F-16).
- Eigene Benutzer- und Rechteverwaltung – Rechte kommen ausschließlich aus dem Space.
- Offline-Betrieb.
- Zelttypen, Dachkonfigurationen und Artikel in der Oberfläche anlegen. Das geschieht im
  Code und kommt mit einem App-Update (F-13).

## 3. Rollen

| Rolle      | Erkennung                              | Darf                                                          |
| ---------- | -------------------------------------- | ------------------------------------------------------------- |
| Bearbeiter | Schreibrecht im Space „Material-Team“  | Bestand pflegen, Packlisten anlegen, ändern, abhaken, löschen |
| Betrachter | nur Leserecht im Space „Material-Team“ | Bestand und Packlisten ansehen und drucken                    |

## 4. Begriffe

| Begriff              | Bedeutung                                                                                       | Tortuga-Artikel                                     |
| -------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Artikel              | Ein Materialtyp mit Stückzahl im Bestand.                                                       |                                                     |
| Zelttyp              | Ein aufbaubares Zelt, siehe Abschnitt 7.                                                        |                                                     |
| Dachkonfiguration    | Eine Möglichkeit, das Dach eines Zelttyps zu bauen. Ein Zelttyp kann mehrere haben.             | z. B. Jurtendach **oder** 6 Kohtenblätter           |
| Wandsegment          | Ein Feld der Seitenwand, 165 cm breit, zwischen zwei Seitenstangen.                             |                                                     |
| Normalbahn           | Seitenbahn in Standardhöhe (165 cm). Nur blanko.                                                | Viereckzeltbahn 165 × 165, Doppelzeltbahn 323 × 165 |
| Superbahn            | Hohe Seitenbahn (209 cm); ersetzt die Normalbahn. Blanko, Fenster oder Gaze.                    | Viereckzeltbahn XL, Doppelzeltbahn XL               |
| Erweiterungsstreifen | 51 cm hoher Streifen, der eine Normalbahn auf Superbahn-Höhe bringt. Blanko, Fenster oder Gaze. | Fensterstück (Folie / Tüll), Doppel-Fenster, blind  |
| Erdstreifen          | Streifen unter den Kohtenblättern.                                                              | Kohten-Seitenwand 45 cm                             |
| Einzel / Doppel      | Bahnen und Streifen gibt es für ein Wandsegment (einzel) und für zwei benachbarte (doppel).     |                                                     |
| Ausführung           | Blanko, Fenster oder Gaze.                                                                      |                                                     |
| Dächle               | Abdeckung für das Mittelloch, eines pro Zelt, passend zur Zeltklasse.                           | Kohten-, Jurten-, Großjurten-, Gigajurtendächle     |
| Packliste            | Gespeicherte Zeltzusammenstellung für ein Lager samt berechnetem Material und Abhak-Stand.      |                                                     |

## 5. Funktionale Anforderungen

### 5.1 Material und Bestand

| ID   | Anforderung                                                                                                                                                          |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01 | Die App zeigt den Bestand als Liste, gruppiert nach Kategorie: Dächer und Planen, Seitenwand, Stangen und Gestänge, Heringe und Abspannung, Kleinteile, Bodenplanen. |
| F-02 | Bearbeiter können je Artikel Stückzahl und Notiz ändern.                                                                                                             |
| F-03 | Die Artikelliste selbst ist Teil der App und kommt mit dem App-Update. Im Space gespeichert werden nur Stückzahlen und Notizen.                                      |
| F-04 | Fehlt die Bestandsdatei, legt die App sie beim ersten Speichern an; bis dahin gilt Stückzahl 0.                                                                      |
| F-05 | Betrachter sehen den Bestand ohne Bearbeitungselemente.                                                                                                              |
| F-06 | Die Bestandsliste ist durchsuchbar.                                                                                                                                  |
| F-07 | Enthält die Bestandsdatei Einträge zu Artikeln, die die App nicht (mehr) kennt, bleiben sie beim Speichern erhalten und werden als „unbekannt“ angezeigt.            |

### 5.2 Zelttypen und Stücklisten

| ID   | Anforderung                                                                                                                                                                              |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-10 | Die App kennt die Zelttypen aus Abschnitt 7.                                                                                                                                             |
| F-11 | Ein Zelttyp besteht aus: einer oder mehreren **Dachkonfigurationen**, einer oder mehreren **Wandoptionen** und **festen Teilen** (Dächle, Kreuz, Mast, Heringe, Abspannung, Bodenplane). |
| F-12 | Eine Wandoption legt fest: Zahl der Wandsegmente, erlaubte Bauarten, dazugehörige Teile (z. B. Seitenstangen in passender Länge).                                                        |
| F-13 | Zelttypen sind im Code beschrieben, je Zelttyp in einer eigenen, kurzen Datei. Ein neuer Zelttyp oder eine neue Dachkonfiguration braucht nur eine solche Datei und ein App-Update.      |
| F-14 | Die Zuweisung von Bahnen und Streifen auf Wandsegmente ist einmal zentral umgesetzt und gilt für alle Zelttypen.                                                                         |
| F-15 | Jedes Zelt bekommt automatisch ein Dächle seiner Klasse.                                                                                                                                 |
| F-16 | Weißzelte bekommen automatisch die passende Bodenplane (rund oder eckig).                                                                                                                |
| F-17 | Die App prüft beim Start, dass alle Zelttypen nur bekannte Artikel verwenden (automatischer Test, kein Laufzeitfehler beim Nutzer).                                                      |

### 5.3 Konfigurator

| ID   | Anforderung                                                                                                                                                                                                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-20 | In einer Packliste lassen sich beliebig viele Zelte hinzufügen, entfernen und duplizieren. Jedes Zelt kann eine Bezeichnung bekommen (z. B. „Küchenjurte“).                                                                                                                     |
| F-21 | Hat ein Zelttyp mehrere Dachkonfigurationen, wird die bevorzugte gewählt (Vorgabe: die Standardkonfiguration des Zelttyps, sonst die erste).                                                                                                                                    |
| F-22 | Pro Zelt wird eine Wandoption gewählt, einheitlich für das ganze Zelt. Welche es gibt, bestimmt der Zelttyp (Abschnitt 7).                                                                                                                                                      |
| F-23 | Lässt eine Wandoption mehrere Bauarten zu („hoch“: Superbahn oder Normalbahn + Erweiterungsstreifen), wird die bevorzugte gewählt (Vorgabe: Superbahn).                                                                                                                         |
| F-2C | Jeder Zelttyp hat eine Standardkonfiguration (Jurten: hohe Wand aus Superbahnen mit Gaze; Kohte: mit Erdstreifen; Hochkohte: normale Wand). Neue Zelte starten darin und zeigen sie in einer Zeile; die Auswahlfelder erscheinen erst über „Anpassen“, „Standard“ setzt zurück. |
| F-24 | Pro Zelt wird die Wunsch-Ausführung gewählt: Blanko, Fenster oder Gaze. Sie gilt für Superbahnen und Erweiterungsstreifen dieses Zeltes.                                                                                                                                        |
| F-25 | Die App berechnet sofort nach jeder Änderung die Materialliste pro Zelt und die Gesamtliste und gleicht sie mit dem Bestand ab: benötigt, vorhanden, fehlend.                                                                                                                   |
| F-26 | Reicht der Bestand für den Wunsch nicht, weicht die App in fester Reihenfolge aus (5.4) und kennzeichnet jede Abweichung am betroffenen Zelt.                                                                                                                                   |
| F-27 | Was auf keinem Weg gedeckt werden kann, wird als fehlend ausgewiesen – gezählt in der Wunsch-Variante.                                                                                                                                                                          |
| F-28 | Zelte werden in Listenreihenfolge bedient: Das erste Zelt bekommt seine Wünsche zuerst. Die Reihenfolge ist änderbar.                                                                                                                                                           |
| F-29 | Eine Zusammenfassung oben zeigt: „alles vorhanden“, „mit Ausweichmaterial machbar“ oder „es fehlt Material“.                                                                                                                                                                    |
| F-2A | Entfällt. Stangen, die der Bestand nicht deckt, zählen wie jedes andere Material als fehlend.                                                                                                                                                                                   |
| F-2B | Die Ausweichreihenfolge der Ausführungen ist je Packliste einstellbar (drei Einträge umsortieren). Vorgabe: Gaze, Fenster, Blanko.                                                                                                                                              |

### 5.4 Ausweichregeln

**Dach.** Ein Dach wird immer vollständig aus einer Dachkonfiguration gebaut. Reicht der
Bestand für die bevorzugte nicht, nimmt die App die nächste Dachkonfiguration des Zelttyps,
die vollständig vorhanden ist. Ist keine vollständig vorhanden, bleibt es bei der
bevorzugten, und der Fehlbestand wird ausgewiesen.

**Wand.** Für Wunsch-Bauart B und Wunsch-Ausführung A werden die Wandsegmente eines Zeltes
in dieser Reihenfolge gedeckt, jeweils so viele Segmente wie möglich:

1. Bauart B in Ausführung A
2. andere Bauart in Ausführung A
3. Bauart B in anderer Ausführung, in der Ausweichreihenfolge der Packliste (F-2B)
4. andere Bauart in anderer Ausführung, in derselben Ausweichreihenfolge

Dabei gilt:

- Die Wandoption (und damit die Höhe) wird nie automatisch geändert.
- Innerhalb jedes Schritts werden zuerst Doppelteile verwendet, dann Einzelteile.
  Ein Doppelteil deckt immer genau zwei Segmente.
- Bei „Normalbahn + Erweiterungsstreifen“ dürfen Bahn und Streifen unabhängig einzel oder
  doppelt sein (z. B. eine Doppelbahn mit zwei Einzelstreifen).
- Normalbahnen gibt es nur blanko; die Ausführung betrifft dort nur den Streifen.

### 5.5 Packlisten

| ID   | Anforderung                                                                                                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-30 | Entfällt: Es gibt keine eigene Übersicht. Packlisten werden in der Dateiansicht von OpenCloud gefunden.                                                                   |
| F-31 | Packlisten werden über „Neu → Packliste“ in einem beliebigen Ordner angelegt. Umbenennen, Duplizieren, Verschieben und Löschen übernimmt die Dateiansicht.                |
| F-32 | Jede Packliste ist eine eigene Datei an beliebiger Stelle und enthält Zelte, berechnetes Material und Abhak-Stand. Die Liste heißt wie die Datei.                         |
| F-33 | Jede Zeile der Packliste ist abhakbar. Der Stand wird automatisch gespeichert und ist für alle mit Zugriff derselbe.                                                      |
| F-34 | Bearbeiter können freie Zeilen ergänzen (Text, Stückzahl), die ebenfalls abhakbar sind.                                                                                   |
| F-35 | Die Packliste lässt sich umschalten zwischen „Gesamt“ (summiert, nach Kategorie) und „Pro Zelt“.                                                                          |
| F-36 | Wird die Zeltzusammenstellung geändert, bleibt ein Haken erhalten, wenn Artikel und Stückzahl der Zeile gleich bleiben; sonst wird er entfernt.                           |
| F-37 | Die Packliste speichert das berechnete Material fest. Ändern sich später Bestand oder App-Version, weist die App darauf hin und bietet „Neu berechnen“ an.                |
| F-38 | Bearbeiten zwei Personen gleichzeitig dieselbe Packliste, geht kein Haken verloren: Bei einem Speicherkonflikt lädt die App neu und wendet die eigene Änderung erneut an. |
| F-39 | Eine Druckansicht gibt die Packliste mit Kästchen zum Abhaken aus (Gesamt und pro Zelt, gesetzte Haken sichtbar). PDF entsteht über den Druckdialog des Browsers.         |

### 5.6 Einbindung in OpenCloud

| ID   | Anforderung                                                                                                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F-40 | Die App hat keinen Eintrag im App-Umschalter. Sie wird über ihre Dateien und den Eintrag „Packliste“ im „Neu“-Menü geöffnet.                                                                     |
| F-41 | Der Ablageort des Bestands (Space und Pfad der Datei) wird einmal in der App-Konfiguration des Servers festgelegt. Vorgabe: `Zeltmaterial.bestand` auf oberster Ebene des Space „Material-Team“. |
| F-42 | Fehlt die Konfiguration, der Space oder der Zugriff, zeigt die App eine verständliche Meldung statt einer leeren Seite.                                                                          |
| F-43 | Packlisten (`.packliste`) und der Bestand (`.bestand`) lassen sich aus der Dateiansicht heraus mit der App öffnen. Jede Packliste verlinkt auf den Bestand.                                      |

## 6. Nichtfunktionale Anforderungen

| ID   | Anforderung                                                                                                                      |
| ---- | -------------------------------------------------------------------------------------------------------------------------------- |
| N-01 | Kein eigenes Backend. Alle Daten liegen als Dateien im Space; die App läuft vollständig im Browser.                              |
| N-02 | Bedienbar auf dem Handy (ab 360 px Breite), insbesondere das Abhaken im Materiallager.                                           |
| N-03 | Oberfläche auf Deutsch. Texte sind übersetzbar angelegt.                                                                         |
| N-04 | Optik und Bedienelemente folgen dem OpenCloud-Design-System, inklusive Dunkelmodus.                                              |
| N-05 | Alle Dateien tragen eine Schema-Version. Unbekannte oder defekte Dateien werden abgewiesen, nicht stillschweigend überschrieben. |
| N-06 | Die Berechnungslogik ist vollständig durch automatische Tests abgedeckt.                                                         |
| N-07 | Die Dateien sind lesbares YAML, damit sie notfalls von Hand korrigiert werden können.                                            |
| N-08 | Bedienelemente sind per Tastatur erreichbar und beschriftet.                                                                     |
| N-09 | Eine Anleitung im Repo beschreibt in wenigen Schritten, wie ein Zelttyp oder eine Dachkonfiguration ergänzt wird.                |

## 7. Zelttypen und Stücklisten

Herkunft: **S** = vom Stamm genannt · **T** = Tortuga-Webseite bzw. Komplettangebote auf
kohten.com · **A** = abgeleitet oder angenommen, als Platzhalter markiert.

### 7.1 Dach, Wand, Dächle

| Zelttyp          | Dachkonfigurationen                                                                             | Wandsegmente | Wandoptionen                             | Dächle             |
| ---------------- | ----------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------- | ------------------ |
| Kohte            | 4 Kohtenblätter (T)                                                                             | –            | ohne Erdstreifen · mit Erdstreifen (S)   | Kohtendächle       |
| Hochkohte        | 4 Kohtenblätter (T)                                                                             | 8 (T)        | nur Erweiterungsstreifen · normal · hoch | Kohtendächle       |
| Jurte            | Jurtendach **oder** 6 Kohtenblätter (S)                                                         | 12 (T)       | keine · normal · hoch                    | Jurtendächle       |
| Großjurte        | Großjurtendach (S)                                                                              | 16 (S, T)    | keine · normal · hoch                    | Großjurtendächle   |
| Gigajurte 9 m    | Gigajurtendach (S)                                                                              | 18 (S, T)    | keine · normal · hoch                    | Gigajurtendächle   |
| Gigajurte 12 m   | Gigajurtendach + 12 Zwischendachteile + 6 Kohtenblätter (S)                                     | 24 (S)       | keine · normal · hoch                    | Gigajurtendächle   |
| Ovaljurte        | 2 Halbjurtendächer + 2 Zwischendachteile (T) **oder** 6 Kohtenblätter + 2 Zwischendachteile (A) | 14 (T)       | keine · normal · hoch                    | Jurtendächle (A)   |
| Dreierjurtenburg | 3 Jurtendächer + 1 Dreiecksdachteil (S) **oder** 18 Kohtenblätter + 1 Dreiecksdachteil (A)      | 27 (A)       | keine · normal · hoch                    | 3 Jurtendächle (A) |
| Sudan            | Zelthaut (A)                                                                                    | –            | –                                        | –                  |
| Yellowstone      | Zelthaut, Pyramidenzelt 410 × 410 cm (T)                                                        | –            | –                                        | –                  |

Zur Dreierjurtenburg: Jedes der drei zwölfeckigen Dächer gibt eine Kante an das Dreieck und
je eine an die beiden Nachbardächer ab; es bleiben 3 × 9 = 27 Außenkanten.

Je Wandsegment:

| Wandoption               | Bauarten                                                    |
| ------------------------ | ----------------------------------------------------------- |
| keine                    | –                                                           |
| mit Erdstreifen (Kohte)  | 1 Erdstreifen je Kohte (A)                                  |
| nur Erweiterungsstreifen | Erweiterungsstreifen                                        |
| normal                   | Normalbahn                                                  |
| hoch                     | Superbahn **oder** Normalbahn + Erweiterungsstreifen (S, T) |

### 7.2 Feste Teile

Die Mengen der Jurten stammen aus den Komplettangeboten (T). Werte mit (A) sind daraus
hochgerechnete Platzhalter.

| Zelttyp          | Aufhängung              | Mittelmast       | Seitenstangen | Abspannseile | Heringe | Bodennägel¹ | Sonstiges                     |
| ---------------- | ----------------------- | ---------------- | ------------- | ------------ | ------- | ----------- | ----------------------------- |
| Kohte            | Kohtenkreuz             | 2 × 375 cm       | –             | –            | 8       | –           | Aufzugseil                    |
| Hochkohte        | Kohtenkreuz             | 2 × 500 cm (A)   | 8             | 8 (A)        | 8 (A)   | 16 (A)      | Aufzugseil                    |
| Jurte            | Jurtenspinne 6er        | 3 × 375 cm       | 12            | 12           | 12      | 24          | Blockseilrolle, Aufzugseil    |
| Großjurte        | Jurtenspinne 8er        | 3 × 500 cm       | 16            | 16           | 16      | 32          | Blockseilrolle, Aufzugseil    |
| Gigajurte 9 m    | Jurtenspinne 9er        | 3 × 500 cm (A)   | 18            | 18 (A)       | 18 (A)  | 36 (A)      | Blockseilrolle, Aufzugseil    |
| Gigajurte 12 m   | Jurtenspinne 9er (A)    | 3 × 500 cm (A)   | 24            | 24 (A)       | 24 (A)  | 48 (A)      | Blockseilrolle, Aufzugseil    |
| Ovaljurte        | Ovaljurtenspinne 1-Feld | 2 × 375 cm       | 14            | 14           | 14      | 28          | 2 Blockseilrollen, Aufzugseil |
| Dreierjurtenburg | 3 Jurtenspinnen 6er (A) | 9 × 375 cm (A)   | 27 (A)        | 27 (A)       | 27 (A)  | 54 (A)      | 3 Blockseilrollen (A)         |
| Sudan            | –                       | Gestängesatz (A) | –             | –            | 16 (A)  | –           | Bodenplane rund (A)           |
| Yellowstone      | –                       | 1 Mittelmast (T) | –             | –            | 16 (A)  | –           | Bodenplane eckig (T, A)       |

¹ Bodennägel nur, wenn eine Seitenwand gewählt ist (2 je Wandsegment).

Seitenstangen sind bei Tortuga längenverstellbar (ca. 155–245 cm). Es gibt deshalb nur
einen Artikel „Seitenstange“ für alle Wandhöhen (A).

## 8. Geklärt

| Thema                                    | Ergebnis                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| Normalbahn + Streifen so hoch wie Super? | Ja.                                                                             |
| Normalbahnen mit Fenster oder Gaze?      | Nein, nur blanko.                                                               |
| Doppelbahnen, Doppelstreifen?            | Ja, jeweils einzel und doppelt vorhanden.                                       |
| Kohte / Hochkohte Varianten              | Kohte mit und ohne Erdstreifen; Hochkohte auch nur mit Erweiterungsstreifen.    |
| Stangen aus dem Bestand?                 | Teils, teils – siehe F-2A.                                                      |
| Ablageort                                | Space „Material-Team“.                                                          |
| Stücklisten als Daten oder Code?         | Code, kommt mit dem App-Update.                                                 |
| Ausweichreihenfolge der Ausführungen     | Gaze, Fenster, Blanko; je Packliste änderbar.                                   |
| Gigajurte 12 m                           | Gigajurtendach (9 m) + 6 Kohtenblätter + 12 Zwischendachteile, 24 Wandsegmente. |
| Dreierjurtenburg                         | 3 Jurtendächer + Dreiecksdachteil, außen herum Bahnen.                          |

## 9. Platzhalter und offene Punkte

Keiner dieser Punkte blockiert den Bau der App. Alle mit (A) markierten Werte aus
Abschnitt 7 stehen als gekennzeichnete Platzhalter in den Zelttyp-Dateien und lassen sich
dort korrigieren.

| ID  | Thema                                                                                                    | Platzhalter                                          |
| --- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| O-1 | Sudan: auf der Tortuga-Seite nicht (mehr) zu finden. Teile, Gestänge, Heringe.                           | Zelthaut, Gestängesatz, 16 Heringe, Bodenplane rund. |
| O-2 | Yellowstone: Zahl der Heringe und Seitenstäbe.                                                           | 1 Mittelmast, 16 Heringe, Bodenplane eckig.          |
| O-3 | Dreierjurtenburg: 27 Wandsegmente sind geometrisch abgeleitet; Masten und Dächle geschätzt.              | siehe 7.2.                                           |
| O-4 | Ovaljurte: eigenes Dächle (Tortuga hat eine Ovaljurtenabdeckplane) oder Jurtendächle?                    | Jurtendächle.                                        |
| O-5 | Erdstreifen der Kohte: anknüpfbarer Streifen oder eigene Kohtenblätter?                                  | Ein anknüpfbarer Streifen pro Kohte.                 |
| O-6 | Welche Stangen werden vor Ort geschlagen?                                                                | Entfällt: fehlende Stangen gelten als fehlend.       |
| O-7 | Soll je Zelt ein Segment für den Eingang Einzelbahn bleiben (Tortuga liefert z. B. 5 Doppel + 2 Einzel)? | Nein, Doppelteile zuerst, Einzelteile füllen auf.    |
| O-8 | Ort der Bestandsdatei.                                                                                   | Frei konfigurierbar (F-41).                          |
