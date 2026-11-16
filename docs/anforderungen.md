# Anforderungen – Zeltkonfigurator

Stand: 2026-11-16 · Status: Entwurf 2 zur Abstimmung

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
| Bearbeiter | Schreibrecht im Space „Material Team“  | Bestand pflegen, Packlisten anlegen, ändern, abhaken, löschen |
| Betrachter | nur Leserecht im Space „Material Team“ | Bestand und Packlisten ansehen und drucken                    |

## 4. Begriffe

| Begriff              | Bedeutung                                                                                                    | Tortuga-Artikel                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Artikel              | Ein Materialtyp mit Stückzahl im Bestand.                                                                    |                                                         |
| Zelttyp              | Ein aufbaubares Zelt, siehe Abschnitt 7.                                                                     |                                                         |
| Dachkonfiguration    | Eine Möglichkeit, das Dach eines Zelttyps zu bauen. Ein Zelttyp kann mehrere haben.                          | z. B. Jurtendach **oder** 6 Kohtenblätter               |
| Wandsegment          | Ein Feld der Seitenwand, 165 cm breit, zwischen zwei Seitenstangen.                                          |                                                         |
| Normalbahn           | Seitenbahn in Standardhöhe (165 cm). Nur blanko.                                                             | Viereckzeltbahn 165 × 165, Doppelzeltbahn 323 × 165     |
| Superbahn            | Hohe Seitenbahn (209 cm); ersetzt die Normalbahn. Blanko, Fenster oder Gaze.                                 | Viereckzeltbahn XL, Doppelzeltbahn XL                   |
| Erweiterungsstreifen | 51 cm hoher Streifen, der eine Normalbahn auf Superbahn-Höhe bringt. Blanko, Fenster oder Gaze.              | Fensterstück (Folie / Tüll), Doppel-Fenster, blind      |
| Erdstreifen          | Streifen unter den Kohtenblättern.                                                                           | Kohten-Seitenwand 45 cm                                 |
| Einzel / Doppel      | Bahnen und Streifen gibt es für ein Wandsegment (einzel) und für zwei benachbarte (doppel).                  |                                                         |
| Ausführung           | Blanko, Fenster oder Gaze.                                                                                   |                                                         |
| Dächle               | Abdeckung für das Mittelloch, eines pro Zelt, passend zur Zeltklasse.                                        | Kohten-, Jurten-, Großjurten-, Gigajurtendächle         |
| Packliste            | Gespeicherte Zeltzusammenstellung für ein Lager samt berechnetem Material und Abhak-Stand.                   |                                                         |

## 5. Funktionale Anforderungen

### 5.1 Material und Bestand

| ID   | Anforderung                                                                                                                                              |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01 | Die App zeigt den Bestand als Liste, gruppiert nach Kategorie: Dächer und Planen, Seitenwand, Stangen und Gestänge, Heringe und Abspannung, Kleinteile, Bodenplanen. |
| F-02 | Bearbeiter können je Artikel Stückzahl und Notiz ändern.                                                                                                 |
| F-03 | Die Artikelliste selbst ist Teil der App und kommt mit dem App-Update. Im Space gespeichert werden nur Stückzahlen und Notizen.                          |
| F-04 | Fehlt die Bestandsdatei, legt die App sie beim ersten Speichern an; bis dahin gilt Stückzahl 0.                                                          |
| F-05 | Betrachter sehen den Bestand ohne Bearbeitungselemente.                                                                                                  |
| F-06 | Die Bestandsliste ist durchsuchbar.                                                                                                                      |
| F-07 | Enthält die Bestandsdatei Einträge zu Artikeln, die die App nicht (mehr) kennt, bleiben sie beim Speichern erhalten und werden als „unbekannt“ angezeigt. |

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

| ID   | Anforderung                                                                                                                                                                      |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-20 | In einer Packliste lassen sich beliebig viele Zelte hinzufügen, entfernen und duplizieren. Jedes Zelt kann eine Bezeichnung bekommen (z. B. „Küchenjurte“).                      |
| F-21 | Hat ein Zelttyp mehrere Dachkonfigurationen, wird die bevorzugte gewählt (Vorgabe: die erste).                                                                                   |
| F-22 | Pro Zelt wird eine Wandoption gewählt, einheitlich für das ganze Zelt. Welche es gibt, bestimmt der Zelttyp (Abschnitt 7).                                                       |
| F-23 | Lässt eine Wandoption mehrere Bauarten zu („hoch“: Superbahn oder Normalbahn + Erweiterungsstreifen), wird die bevorzugte gewählt (Vorgabe: Superbahn).                          |
| F-24 | Pro Zelt wird die Wunsch-Ausführung gewählt: Blanko, Fenster oder Gaze. Sie gilt für Superbahnen und Erweiterungsstreifen dieses Zeltes.                                         |
| F-25 | Die App berechnet sofort nach jeder Änderung die Materialliste pro Zelt und die Gesamtliste und gleicht sie mit dem Bestand ab: benötigt, vorhanden, fehlend.                    |
| F-26 | Reicht der Bestand für den Wunsch nicht, weicht die App in fester Reihenfolge aus (5.4) und kennzeichnet jede Abweichung am betroffenen Zelt.                                    |
| F-27 | Was auf keinem Weg gedeckt werden kann, wird als fehlend ausgewiesen – gezählt in der Wunsch-Variante.                                                                           |
| F-28 | Zelte werden in Listenreihenfolge bedient: Das erste Zelt bekommt seine Wünsche zuerst. Die Reihenfolge ist änderbar.                                                            |
| F-29 | Eine Zusammenfassung oben zeigt: „alles vorhanden“, „mit Ausweichmaterial machbar“ oder „es fehlt Material“.                                                                     |
| F-2A | Stangen, die laut Artikelliste auch vor Ort geschlagen werden können, zählen nicht als fehlend. Was der Bestand nicht deckt, erscheint als „vor Ort schlagen“ mit Anzahl und Länge. |

### 5.4 Ausweichregeln

**Dach.** Ein Dach wird immer vollständig aus einer Dachkonfiguration gebaut. Reicht der
Bestand für die bevorzugte nicht, nimmt die App die nächste Dachkonfiguration des Zelttyps,
die vollständig vorhanden ist. Ist keine vollständig vorhanden, bleibt es bei der
bevorzugten, und der Fehlbestand wird ausgewiesen.

**Wand.** Für Wunsch-Bauart B und Wunsch-Ausführung A werden die Wandsegmente eines Zeltes
in dieser Reihenfolge gedeckt, jeweils so viele Segmente wie möglich:

1. Bauart B in Ausführung A
2. andere Bauart in Ausführung A
3. Bauart B in anderer Ausführung (Reihenfolge: Blanko, Fenster, Gaze)
4. andere Bauart in anderer Ausführung

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
| F-30 | Eine Übersicht zeigt alle gespeicherten Packlisten mit Name, Datum, Anzahl Zelte und Abhak-Fortschritt.                                                                   |
| F-31 | Packlisten können angelegt, umbenannt, dupliziert und gelöscht werden. Löschen verlangt eine Bestätigung.                                                                 |
| F-32 | Jede Packliste ist eine eigene Datei im Space und enthält Zelte, berechnetes Material und Abhak-Stand.                                                                    |
| F-33 | Jede Zeile der Packliste ist abhakbar. Der Stand wird automatisch gespeichert und ist für alle mit Zugriff derselbe.                                                      |
| F-34 | Bearbeiter können freie Zeilen ergänzen (Text, Stückzahl), die ebenfalls abhakbar sind.                                                                                   |
| F-35 | Die Packliste lässt sich umschalten zwischen „Gesamt“ (summiert, nach Kategorie) und „Pro Zelt“.                                                                          |
| F-36 | Wird die Zeltzusammenstellung geändert, bleibt ein Haken erhalten, wenn Artikel und Stückzahl der Zeile gleich bleiben; sonst wird er entfernt.                           |
| F-37 | Die Packliste speichert das berechnete Material fest. Ändern sich später Bestand oder App-Version, weist die App darauf hin und bietet „Neu berechnen“ an.                |
| F-38 | Bearbeiten zwei Personen gleichzeitig dieselbe Packliste, geht kein Haken verloren: Bei einem Speicherkonflikt lädt die App neu und wendet die eigene Änderung erneut an. |
| F-39 | Eine Druckansicht gibt die Packliste mit Kästchen zum Abhaken aus (Gesamt und pro Zelt, gesetzte Haken sichtbar). PDF entsteht über den Druckdialog des Browsers.         |

### 5.6 Einbindung in OpenCloud

| ID   | Anforderung                                                                                                                  |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| F-40 | Die App erscheint im App-Umschalter von OpenCloud.                                                                           |
| F-41 | Der Ablageort (Space und Ordner) wird einmal in der App-Konfiguration des Servers festgelegt. Vorgabe: Space „Material Team“. |
| F-42 | Fehlt die Konfiguration, der Space oder der Zugriff, zeigt die App eine verständliche Meldung statt einer leeren Seite.      |
| F-43 | Packlisten-Dateien lassen sich auch aus der Dateiansicht heraus mit der App öffnen. _(Wunsch, nicht für Version 1 zugesagt)_ |

## 6. Nichtfunktionale Anforderungen

| ID   | Anforderung                                                                                                                      |
| ---- | -------------------------------------------------------------------------------------------------------------------------------- |
| N-01 | Kein eigenes Backend. Alle Daten liegen als Dateien im Space; die App läuft vollständig im Browser.                              |
| N-02 | Bedienbar auf dem Handy (ab 360 px Breite), insbesondere das Abhaken im Materiallager.                                           |
| N-03 | Oberfläche auf Deutsch. Texte sind übersetzbar angelegt.                                                                         |
| N-04 | Optik und Bedienelemente folgen dem OpenCloud-Design-System, inklusive Dunkelmodus.                                              |
| N-05 | Alle Dateien tragen eine Schema-Version. Unbekannte oder defekte Dateien werden abgewiesen, nicht stillschweigend überschrieben. |
| N-06 | Die Berechnungslogik ist vollständig durch automatische Tests abgedeckt.                                                         |
| N-07 | Die Dateien sind lesbares JSON, damit sie notfalls von Hand korrigiert werden können.                                            |
| N-08 | Bedienelemente sind per Tastatur erreichbar und beschriftet.                                                                     |
| N-09 | Eine Anleitung im Repo beschreibt in wenigen Schritten, wie ein Zelttyp oder eine Dachkonfiguration ergänzt wird.                |

## 7. Zelttypen

Herkunft der Angaben: **S** = vom Stamm genannt, **T** = Tortuga-Webseite,
**?** = unbekannt, bitte ergänzen.

| Zelttyp          | Dachkonfigurationen                                                      | Wandsegmente | Wandoptionen                                 | Dächle            |
| ---------------- | ------------------------------------------------------------------------ | ------------ | -------------------------------------------- | ----------------- |
| Kohte            | 4 Kohtenblätter (T)                                                      | –            | ohne Erdstreifen · mit Erdstreifen (S)       | Kohtendächle      |
| Hochkohte        | 4 Kohtenblätter (T)                                                      | 8 (T)        | nur Erweiterungsstreifen (S) · normal · hoch | Kohtendächle      |
| Jurte            | Jurtendach **oder** 6 Kohtenblätter (S)                                  | 12 (T)       | keine · normal · hoch                        | Jurtendächle      |
| Großjurte        | Großjurtendach (S)                                                       | 16 (S, T)    | keine · normal · hoch                        | Großjurtendächle  |
| Gigajurte 9 m    | Gigajurtendach (S)                                                       | 18 (S, T)    | keine · normal · hoch                        | Gigajurtendächle  |
| Gigajurte 12 m   | Gigajurtendach + 12 Zwischendachteile + 12 Kohtenblätter (S)             | ?            | keine · normal · hoch                        | Gigajurtendächle  |
| Ovaljurte        | ? (laut T: 2 Halbjurtendächer oder 6 Kohtenblätter, + 2 Zwischendachteile) | ? (14?)      | keine · normal · hoch                        | ?                 |
| Dreierjurtenburg | ? (laut T: 3 Jurtendächer ohne Traufkante + Dreieckzeltbahn)             | ?            | ?                                            | ? (3 Jurtendächle?) |
| Sudan            | Zelthaut                                                                 | –            | –                                            | –                 |
| Yellowstone      | Zelthaut                                                                 | –            | –                                            | –                 |

Je Wandsegment:

| Wandoption               | Bauarten                                                          | Seitenstange |
| ------------------------ | ----------------------------------------------------------------- | ------------ |
| keine                    | –                                                                 | kurz? (?)    |
| nur Erweiterungsstreifen | Erweiterungsstreifen                                              | ?            |
| normal                   | Normalbahn                                                        | ?            |
| hoch                     | Superbahn **oder** Normalbahn + Erweiterungsstreifen (T: gleich hoch) | ?        |

Bekannte feste Teile (T): Kohte braucht 1 Kohtenkreuz, 2 Kohtenstangen ca. 390 cm, Seil und
Heringe. Alles Weitere steht in O-3.

## 8. Geklärt

| Thema                                    | Ergebnis                                                              |
| ---------------------------------------- | --------------------------------------------------------------------- |
| Normalbahn + Streifen so hoch wie Super? | Ja.                                                                   |
| Normalbahnen mit Fenster oder Gaze?      | Nein, nur blanko.                                                     |
| Doppelbahnen, Doppelstreifen?            | Ja, jeweils einzel und doppelt vorhanden.                             |
| Kohte / Hochkohte Varianten              | Kohte mit und ohne Erdstreifen; Hochkohte auch nur mit Erweiterungsstreifen. |
| Stangen aus dem Bestand?                 | Teils, teils – siehe F-2A.                                            |
| Ablageort                                | Space „Material Team“.                                                |
| Stücklisten als Daten oder Code?         | Code, kommt mit dem App-Update.                                       |

## 9. Offene Punkte

Keiner dieser Punkte blockiert den Bau der App; sie betreffen nur die Inhalte der
Zelttyp-Dateien.

| ID  | Frage                                                                                                                                                              | Annahme bis zur Klärung                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| O-1 | Gigajurte 12 m, Ovaljurte, Dreierjurtenburg: Dach, Zahl der Wandsegmente und Seitenstangen, Dächle (Zeilen mit „?“ in Abschnitt 7).                                | Werte der Tortuga-Seite, Rest leer.                |
| O-2 | Erdstreifen der Kohte: ein anknüpfbarer Streifen pro Kohte, oder eigene Kohtenblätter mit angenähtem Erdstreifen?                                                  | Ein anknüpfbarer Streifen pro Kohte.               |
| O-3 | Feste Teile je Zelttyp: Kreuz bzw. Ring, Mittelmast (Zweibein, Dreibein, Länge), Zahl der Heringe und Abspannseile, Länge der Seitenstangen je Wandoption.         | Nur die Kohten-Angaben der Tortuga-Seite.          |
| O-4 | Welche Stangen werden vor Ort geschlagen, welche sind immer im Bestand?                                                                                            | Alle Holzstangen dürfen geschlagen werden.         |
| O-5 | Sudan und Yellowstone: Teile (Zelthaut, Gestänge, Heringe) und welche Bodenplane (rund/eckig) zu welchem Zelt gehört. Gibt es mehrere passende Bodenplanen je Zelt? | Je Zelt eine Bodenplane.                           |
| O-6 | Soll an jedem Zelt ein Segment für den Eingang bewusst als Einzelbahn bleiben (Tortuga nennt z. B. 5 Doppel + 2 Einzel bei der Jurte)?                              | Nein, Doppelteile zuerst, Einzelteile füllen auf.  |
| O-7 | In welchem Ordner im Space „Material Team“ sollen die Dateien liegen?                                                                                              | Ordner „Zeltkonfigurator“.                         |
