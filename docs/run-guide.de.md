# Symtora selbst starten – Schritt für Schritt

[English](run-guide.en.md) · **Deutsch** · [← zurück zum README](../README.md)

Diese Anleitung ist für Menschen, die nicht programmieren. Du installierst **ein** Programm, lädst
den Code herunter und startest Symtora per **Doppelklick** – auf **Windows oder macOS**. Danach
öffnest du die App im **Webbrowser** oder auf deinem **Handy**.

> [!WARNING]
> Symtora ist ein Schulprojekt, **kein Medizinprodukt**, und stellt keine Diagnose.
> Im Notfall in der Schweiz: **144** anrufen.

---

## Inhalt

0. [Was du am Ende hast](#0-was-du-am-ende-hast)
1. [Docker Desktop installieren (einmalig)](#1-docker-desktop-installieren-einmalig)
2. [Den Code herunterladen](#2-den-code-herunterladen)
3. [Symtora starten](#3-symtora-starten)
4. [Die App öffnen](#4-die-app-öffnen)
5. [Die App benutzen](#5-die-app-benutzen)
6. [Beenden, neu starten, zurücksetzen](#6-beenden-neu-starten-zurücksetzen)
7. [Optionale Extras](#7-optionale-extras)
8. [Probleme lösen](#8-probleme-lösen)

---

## 0. Was du am Ende hast

Symtora besteht aus mehreren Teilen. Alle laufen auf deinem Computer, in **Docker** – einem
Programm, das alles zusammen startet:

```
 Browser oder Handy  ──►  App-Server  ──►  Symtora-Server (API)  ──►  Datenbank        (Konten und Einträge)
                                                                ──►  KI-Modell        (analysiert die Symptome)
                                                                ──►  Spracherkennung  (Spracheingabe)
```

Nichts, was du eingibst, wird an einen externen KI-Dienst geschickt.

**Was du brauchst**

| | |
|---|---|
| Zeit | Beim ersten Mal ca. 30–60 Minuten (vor allem Downloads). Danach ca. 2 Minuten. |
| Speicherplatz | Ca. **12 GB** frei |
| Arbeitsspeicher (RAM) | Mindestens **8 GB**, empfohlen **16 GB** – das KI-Modell braucht viel |
| Internet | Für den ersten Start nötig (mehrere GB Downloads) |
| Handy (optional) | iPhone oder Android, im **gleichen WLAN** wie der Computer |

---

## 1. Docker Desktop installieren (einmalig)

Herunterladen von **<https://www.docker.com/products/docker-desktop/>** und installieren.

- **Windows:** Den Vorschlag, **WSL 2** zu verwenden, bei der Installation annehmen. Den Computer
  neu starten, wenn danach gefragt wird. Windows Home funktioniert auch. Meldet Docker später
  *«Virtualization is not enabled»* oder *«WSL needs updating»*, siehe [Probleme lösen](#8-probleme-lösen).
- **macOS:** Den richtigen Download wählen – **Apple-Chip** (M1/M2/M3/M4 …) oder **Intel-Chip**.
  Unsicher? → Apple-Menü  → *Über diesen Mac* → bei «Chip» bzw. «Prozessor» nachsehen. Docker in
  den Ordner *Programme* ziehen.

Docker Desktop **einmal öffnen**, die Bedingungen akzeptieren und warten, bis unten links
*«Engine running»* (grün) steht. Die Anmeldung kannst du überspringen.

> [!NOTE]
> **Nur macOS:** Docker Desktop → ⚙ *Settings* → *Resources* → **Memory** auf mindestens **6 GB**
> stellen, dann *Apply & restart*. Unter Windows regelt Docker den Speicher selbst.

**Für das Handy (optional):** **Expo Go** aus dem
[App Store](https://apps.apple.com/app/expo-go/id982107779) oder von
[Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent) installieren.

---

## 2. Den Code herunterladen

<https://github.com/smadev10/symtora> öffnen, auf den grünen Knopf **Code** → **Download ZIP**
klicken. Die Datei an einem leicht auffindbaren Ort entpacken, z. B. im Ordner *Dokumente*.

> [!IMPORTANT]
> **Windows:** Rechtsklick auf die ZIP-Datei → **Alle extrahieren…**. Nicht direkt in der ZIP-Datei
> doppelklicken – dort funktionieren die Startdateien nicht.

Im entpackten Ordner (er heisst `symtora-main`) liegen unter anderem diese vier Dateien:

| | Windows | macOS |
|---|---|---|
| Starten | `Start Symtora.bat` | `Start Symtora.command` |
| Beenden | `Stop Symtora.bat` | `Stop Symtora.command` |

---

## 3. Symtora starten

**Windows:** Doppelklick auf **`Start Symtora.bat`**.

> Erscheint *«Der Computer wurde durch Windows geschützt»*: auf **Weitere Informationen** →
> **Trotzdem ausführen** klicken. Fragt Windows *«Möchten Sie diese Datei ausführen?»*: **Ausführen**.

**macOS:** **Beim ersten Mal** Rechtsklick auf **`Start Symtora.command`** → **Öffnen** → im
Dialog nochmals **Öffnen**. (Ein normaler Doppelklick wird beim ersten Mal von macOS blockiert,
weil die Datei aus dem Internet kommt.) Ab dann reicht ein Doppelklick.

Es öffnet sich ein Fenster, das alles selbst erledigt:

1. Es prüft, ob Docker läuft, und startet Docker Desktop, falls nötig.
2. Es legt die Einstellungen an, inklusive eines geheimen Schlüssels.
3. Es baut Symtora und lädt das KI-Modell herunter (~2 GB). Du siehst Zeilen wie `pulling … 45%`.
4. Es wartet, bis alles bereit ist, und öffnet die App im Browser.

Beim ersten Mal dauert das je nach Internet **10–30 Minuten**. Es läuft viel Text durch – das ist
normal. Wörter wie `warn` sind meistens harmlos.

> [!NOTE]
> **Firewall-Abfragen.** Fragt Windows, ob *Docker* in Netzwerken zugelassen werden soll,
> **Privat und Öffentlich** anhaken und *Zulassen* klicken. Unter macOS bei der Frage nach
> eingehenden Verbindungen **Erlauben** klicken.

---

## 4. Die App öffnen

Wenn das Fenster **«Symtora is running»** zeigt, ist alles bereit.

### Im Browser

Der Browser öffnet sich von selbst mit **<http://localhost:8081>**. Das erste Laden dauert bis zu
einer Minute.

### Auf dem Handy

Den **QR-Code** findest du an zwei Orten: im Startfenster unter der Browser-Adresse und im Browser
auf dem Anmeldebildschirm (Karte **«Auf dem Handy öffnen»**) – dort auch noch, wenn das Fenster
längst zu ist.

1. Das Handy muss im **gleichen WLAN** sein wie der Computer.
2. **iPhone:** die normale **Kamera**-App öffnen, auf den QR-Code richten und auf das Banner tippen.
   **Android:** **Expo Go** öffnen → **Scan QR code**.
3. Das erste Laden dauert bis zu einer Minute. Fragt das iPhone nach Zugriff auf das **lokale
   Netzwerk**, erlauben.

Eine IP-Adresse musst du nirgends eintragen – das Startfenster findet sie selbst, auch wenn du
später in einem anderen WLAN bist.

Das Fenster kannst du danach mit <kbd>Enter</kbd> schliessen. **Symtora läuft im Hintergrund weiter**,
bis du es beendest.

---

## 5. Die App benutzen

1. Auf dem Willkommensbildschirm die Einwilligung anhaken und **Starten** tippen, dann
   **Konto erstellen** – mit beliebiger E-Mail-Adresse und einem Passwort mit mindestens 8 Zeichen.
   Das Konto existiert nur in der Datenbank auf deinem Computer.
2. **Neue Beschreibung** antippen, in eigenen Worten beschreiben, wie es dir geht (z. B.
   *«Kopfschmerzen seit heute Morgen, schlimmer beim Bücken»*) und **Analysieren** tippen.
3. Auf die **Einschätzung** warten – mit dem Standardmodell etwa **eine Minute**. Danach siehst du
   Dringlichkeit, mögliche Ursachen und nächste Schritte.
4. Die **Spracheingabe** mit **Sprechen** / **Stattdessen sprechen** ausprobieren. Die **allererste**
   Aufnahme dauert länger, weil das Spracherkennungsmodell (~500 MB) im Hintergrund heruntergeladen
   wird.
5. **Verlauf** zeigt deine bisherigen Einträge (die Muster-Diagramme dort sind in diesem Prototyp
   noch Demodaten). Unter **Einstellungen** kannst du
   Sprache (DE/EN/FR) und Hell-/Dunkelmodus wechseln, deine Daten exportieren, alle Einträge oder das
   ganze Konto löschen.

---

## 6. Beenden, neu starten, zurücksetzen

**Beenden:** Doppelklick auf **`Stop Symtora.bat`** (Windows) bzw. **`Stop Symtora.command`**
(macOS). Deine Konten und Einträge bleiben gespeichert.

**Beim nächsten Mal starten:** wieder **`Start Symtora`** doppelklicken. Diesmal wird nichts mehr
heruntergeladen; nach etwa 1–2 Minuten ist alles bereit.

**Alles zurücksetzen** (löscht alle Konten und Einträge **und** das heruntergeladene KI-Modell – beim
nächsten Start wird es erneut heruntergeladen): Ein Terminal im Projektordner öffnen (siehe
[Optionale Extras](#7-optionale-extras)) und ausführen:

```
docker compose down -v
```

**Deinstallieren:** Den Befehl zum Zurücksetzen ausführen, den Projektordner löschen, dann Docker
Desktop wie jedes andere Programm deinstallieren.

---

## 7. Optionale Extras

Für diese Extras brauchst du ein **Terminal im Projektordner** und musst die **Einstellungsdatei
`.env`** bearbeiten, die das Startfenster angelegt hat.

- **Terminal öffnen – Windows:** Den Ordner im Explorer öffnen, oben in die **Adressleiste**
  klicken, `powershell` eintippen und <kbd>Enter</kbd> drücken.
  **macOS:** Im Finder Rechtsklick auf den Ordner → **Neues Terminal beim Ordner**.
- **`.env` öffnen – Windows:** im Terminal `notepad .env`. **macOS:** `open -e .env` (beim Speichern
  **reinen Text** beibehalten, nie `.rtf`).

**Bessere Antworten auf Deutsch und Französisch.** In der `.env` `OLLAMA_MODEL=llama3.1:8b` setzen,
Symtora beenden und neu starten. Lädt ~5 GB herunter, braucht ohne Grafikkarte mehrere Minuten pro
Analyse – und 16 GB RAM.

**Technische API-Seite.** In der `.env` `EXPOSE_API_DOCS=true` setzen, Symtora neu starten und
**<http://localhost:8080/scalar>** öffnen, um alle Serverfunktionen anzusehen und auszuprobieren.

**Was im Hintergrund passiert.** Im Terminal `docker compose logs -f` zeigt die laufenden Meldungen
aller Teile (beenden mit <kbd>Ctrl</kbd>+<kbd>C</kbd>).

**Entwickeln, Emulatoren, Tests.** Siehe [Getting started im README](../README.md#getting-started).

---

## 8. Probleme lösen

| Was du siehst | Warum | Was tun |
|---|---|---|
| *«Docker is not installed»* | Docker Desktop fehlt, oder das Fenster wurde vor der Installation geöffnet | [Schritt 1](#1-docker-desktop-installieren-einmalig) erledigen, dann den Computer neu starten und nochmals versuchen. |
| *«Docker did not start»* | Docker Desktop braucht beim ersten Mal eine Bestätigung oder ein Update | Docker Desktop selbst öffnen, Dialoge bestätigen, auf *Engine running* warten, nochmals starten. |
| Windows: Fehler wie *«Virtualization not enabled»* oder *«WSL»* | WSL 2 fehlt oder die Virtualisierung ist im BIOS ausgeschaltet | PowerShell **als Administrator** öffnen: `wsl --install`, dann neu starten. Klappt es dann nicht, im BIOS/UEFI *Intel VT-x* bzw. *AMD-V (SVM)* einschalten. |
| Windows: Das Fenster blitzt nur kurz auf | Die Datei wurde direkt aus der ZIP-Datei gestartet | Die ZIP zuerst mit **Alle extrahieren…** entpacken und im entpackten Ordner starten. |
| macOS: *«kann nicht geöffnet werden, da es von einem nicht verifizierten Entwickler stammt»* | Gatekeeper blockiert Dateien aus dem Internet | Rechtsklick → **Öffnen** → **Öffnen** (siehe [Schritt 3](#3-symtora-starten)). |
| macOS: *«Permission denied»* | Die Datei hat beim Entpacken ihre Ausführungsrechte verloren | Terminal im Projektordner öffnen und `bash scripts/start.sh` ausführen. |
| `port is already allocated` / `address already in use` (8080, 8081 oder 5432) | Ein anderes Programm benutzt den Port – oft ein früherer Start | **Stop Symtora** doppelklicken und nochmals starten. Immer noch belegt? Computer neu starten. |
| *«The AI model could not be downloaded»* | Keine oder zu langsame Internetverbindung | Verbindung prüfen und nochmals starten – der Download geht dort weiter, wo er aufgehört hat. |
| Handy: App lädt nicht nach dem Scannen | Anderes WLAN, Firewall, oder das Netzwerk verhindert, dass Geräte miteinander sprechen | Beide im gleichen WLAN? Windows: Einstellungen → Netzwerk → WLAN auf **Privat** stellen oder Docker in der Firewall für öffentliche Netzwerke zulassen. **Schul-, Firmen- und Gäste-WLANs blockieren das oft komplett** – den Computer stattdessen mit dem **Hotspot des Handys** verbinden und Symtora neu starten, oder den Browser nehmen. |
| iPhone: App lädt endlos oder *«Could not connect»* | Expo Go darf das lokale Netzwerk nicht benutzen | iPhone-Einstellungen → Datenschutz & Sicherheit → **Lokales Netzwerk** → **Expo Go** einschalten. |
| Handy: QR-Code fehlt (*«No Wi-Fi/network address found»*) | Der Computer ist mit keinem Netzwerk verbunden | Mit dem WLAN verbinden und Symtora neu starten. |
| Die Analyse dauert ewig oder schlägt fehl | Zu wenig Arbeitsspeicher, oder das Modell wird noch heruntergeladen | Den ersten Start fertig laufen lassen. Andere grosse Programme schliessen. macOS: Docker mehr Speicher geben ([Schritt 1](#1-docker-desktop-installieren-einmalig)). Nachsehen, was los ist: `docker compose logs api`. |
| Spracheingabe klappt beim ersten Mal nicht | Das Spracherkennungsmodell wird heruntergeladen | Eine Minute warten und nochmals versuchen. |
| Etwas anderes | – | **Stop Symtora**, Docker Desktop neu starten, **Start Symtora** nochmals ausführen. |
