# Symtora selbst starten – Schritt für Schritt

[English](run-guide.en.md) · **Deutsch** · [← zurück zum README](../README.md)

Diese Anleitung ist für Menschen, die nicht programmieren. Sie führt dich durch alles, was es
braucht, um Symtora komplett auf deinem eigenen Computer laufen zu lassen – **Windows oder macOS** –
und die App entweder im **Webbrowser** oder auf deinem **Handy** zu öffnen. Du kopierst ein paar
Befehle, der Rest ist Klicken.

> [!WARNING]
> Symtora ist ein Schulprojekt, **kein Medizinprodukt**, und stellt keine Diagnose.
> Im Notfall in der Schweiz: **144** anrufen.

---

## Inhalt

0. [Was du am Ende hast](#0-was-du-am-ende-hast)
1. [Programme installieren (einmalig)](#1-programme-installieren-einmalig)
2. [Den Code herunterladen](#2-den-code-herunterladen)
3. [Das Backend einrichten](#3-das-backend-einrichten)
4. [Das Backend starten](#4-das-backend-starten)
5. [Die App starten](#5-die-app-starten)
6. [Die App benutzen](#6-die-app-benutzen)
7. [Beenden, neu starten, zurücksetzen](#7-beenden-neu-starten-zurücksetzen)
8. [Optionale Extras](#8-optionale-extras)
9. [Probleme lösen](#9-probleme-lösen)

---

## 0. Was du am Ende hast

Symtora besteht aus mehreren Teilen. Alle laufen auf deinem Computer:

```
 App (Browser oder Handy)  ──►  Symtora-Server (API)  ──►  Datenbank        (Konten und Einträge)
                                                       ──►  KI-Modell        (analysiert die Symptome)
                                                       ──►  Spracherkennung  (Spracheingabe)
```

Server, Datenbank, KI-Modell und Spracherkennung laufen in **Docker**, einem Programm, das alles mit
einem einzigen Befehl startet. Die App läuft über **Node.js**. Nichts, was du eingibst, wird an einen
externen KI-Dienst geschickt.

**Was du brauchst**

| | |
|---|---|
| Zeit | Beim ersten Mal ca. 30–60 Minuten (vor allem Downloads). Danach ca. 2 Minuten. |
| Speicherplatz | Ca. **10 GB** frei |
| Arbeitsspeicher (RAM) | Mindestens **8 GB**, empfohlen **16 GB** – das KI-Modell braucht viel |
| Internet | Für den ersten Start nötig (mehrere GB Downloads) |
| Handy (optional) | iPhone oder Android, im **gleichen WLAN** wie der Computer |

> [!TIP]
> **So liest du die Befehle.** Graue Kästen sind Befehle. Kopiere die ganze Zeile, füge sie ins
> Terminalfenster ein (Windows: Rechtsklick fügt ein; macOS: <kbd>Cmd</kbd>+<kbd>V</kbd>) und drücke
> <kbd>Enter</kbd>. Wenn es getrennte Kästen für **Windows** und **macOS** gibt, nimm nur den für
> deinen Computer.

---

## 1. Programme installieren (einmalig)

### 1.1 Docker Desktop

Herunterladen von **<https://www.docker.com/products/docker-desktop/>** und installieren.

- **Windows:** Den Vorschlag, **WSL 2** zu verwenden, bei der Installation annehmen. Den Computer
  neu starten, wenn danach gefragt wird. Windows Home funktioniert auch. Meldet Docker später
  *«Virtualization is not enabled»* oder *«WSL needs updating»*, siehe [Probleme lösen](#9-probleme-lösen).
- **macOS:** Den richtigen Download wählen – **Apple-Chip** (M1/M2/M3/M4 …) oder **Intel-Chip**.
  Unsicher? → Apple-Menü  → *Über diesen Mac* → bei «Chip» bzw. «Prozessor» nachsehen. Docker in
  den Ordner *Programme* ziehen.

**Docker Desktop** öffnen und warten, bis unten links *«Engine running»* (grün) steht. Die Anmeldung
kannst du überspringen. Docker muss jedes Mal laufen, wenn du Symtora benutzt.

> [!NOTE]
> **Nur macOS:** Docker Desktop → ⚙ *Settings* → *Resources* → **Memory** auf mindestens **6 GB**
> stellen, dann *Apply & restart*. Unter Windows regelt Docker den Speicher selbst.

### 1.2 Node.js

Die **LTS**-Version (22.x) von **<https://nodejs.org/>** herunterladen und mit den
Standardeinstellungen installieren. (Unter Windows kannst du «Tools for Native Modules» weglassen.)

### 1.3 Git (optional)

Nur nötig, wenn du den Code per Befehl herunterladen willst. Sonst lädst du im nächsten Schritt eine
ZIP-Datei herunter. Windows: <https://git-scm.com/download/win> · macOS: wird automatisch angeboten,
wenn du im Terminal zum ersten Mal `git` eingibst.

### 1.4 Expo Go auf dem Handy (optional)

Nur wenn du die App auf dem Handy benutzen willst. **Expo Go** aus dem
[App Store](https://apps.apple.com/app/expo-go/id982107779) oder von
[Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent) installieren.

### 1.5 Prüfen, ob alles installiert ist

Ein Terminal öffnen:

- **Windows:** Startmenü → `PowerShell` eintippen → *Windows PowerShell* öffnen.
- **macOS:** <kbd>Cmd</kbd>+<kbd>Leertaste</kbd> → `Terminal` eintippen → <kbd>Enter</kbd>.

Dann ausführen:

```
docker --version
node --version
```

Beide sollten eine Versionsnummer anzeigen (bei Node beginnend mit `v22` oder höher). Kommt
*«wird nicht erkannt»* / *«command not found»*, das Terminal schliessen, ein neues öffnen und nochmals
versuchen – frisch installierte Programme werden nur in neuen Fenstern gefunden. Klappt es immer noch
nicht, den Computer neu starten.

---

## 2. Den Code herunterladen

**Variante 1 – ZIP (ohne Git):** <https://github.com/smadev10/symtora> öffnen, auf den grünen
Knopf **Code** → **Download ZIP** klicken. Die Datei an einem leicht auffindbaren Ort entpacken,
z. B. im Ordner *Dokumente*. Der Ordner heisst dann `symtora-main` – das ist in Ordnung.

**Variante 2 – mit Git:** im Terminal:

```
cd ~/Documents
git clone https://github.com/smadev10/symtora.git
```

### Ein Terminal im Projektordner öffnen

Das brauchst du mehrmals, also gut merken:

- **Windows:** Den Ordner im Explorer öffnen (den, in dem `docker-compose.yml` liegt), oben in die
  **Adressleiste** klicken, `powershell` eintippen und <kbd>Enter</kbd> drücken.
- **macOS:** Im Finder Rechtsklick auf den Ordner → **Neues Terminal beim Ordner**. (Fehlt der
  Eintrag: Systemeinstellungen → Tastatur → Tastaturkurzbefehle → Dienste → Dateien und Ordner →
  *Neues Terminal beim Ordner* aktivieren.)

### Versteckte Dateien sichtbar machen

Die Einstellungsdateien heissen `.env` – Namen mit einem Punkt am Anfang sind normalerweise versteckt.

- **Windows 11:** Explorer → **Anzeigen** → **Einblenden** → **Dateinamenerweiterungen** und
  **Ausgeblendete Elemente** anhaken.
- **macOS:** Im Finder <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>.</kbd> (Punkt) drücken.

---

## 3. Das Backend einrichten

Ein Terminal **im Projektordner** öffnen (siehe oben).

**3.1 Die Einstellungsdatei anlegen**, indem du die Vorlage kopierst:

**Windows:**
```
Copy-Item .env.example .env
```
**macOS:**
```
cp .env.example .env
```

**3.2 Einen geheimen Schlüssel erzeugen.** Der Server braucht ein langes, zufälliges Passwort, um
Anmeldungen zu signieren. So erzeugst du eines:

**Windows:**
```
[Convert]::ToBase64String((1..48 | % { [byte](Get-Random -Max 256) }))
```
**macOS:**
```
openssl rand -base64 48
```

Es erscheint etwas wie `zICb7mhLuNtDnEDPYLEname/t+coXZu…`. Die ganze Zeile markieren und kopieren.

**3.3 Den Schlüssel in die Datei eintragen.** `.env` öffnen:

**Windows:**
```
notepad .env
```
**macOS:**
```
open -e .env
```

Die Zeile `JWT_SECRET=` suchen und den Schlüssel direkt hinter das `=` einfügen (keine Leerzeichen,
keine Anführungszeichen):

```
JWT_SECRET=zICb7mhLuNtDnEDPYLEname/t+coXZuFSnEdg30PwqFYrsyG2ac+JeYBq+cidPer
```

Speichern (<kbd>Ctrl</kbd>+<kbd>S</kbd> / <kbd>Cmd</kbd>+<kbd>S</kbd>) und den Editor schliessen.

> [!IMPORTANT]
> **macOS TextEdit:** Wird nach dem Format gefragt, **reinen Text** beibehalten – nie als `.rtf`
> speichern.

Die anderen Zeilen können bleiben, wie sie sind. Was sie bedeuten:

| Einstellung | Bedeutung |
|---|---|
| `POSTGRES_PASSWORD` | Passwort der Datenbank. Wird nur innerhalb von Docker verwendet; der Standardwert passt. |
| `OLLAMA_MODEL` | Welches KI-Modell die Symptome analysiert. `llama3.2:3b` (Standard) antwortet in etwa einer Minute. Ein besseres, aber langsameres Modell: siehe [Optionale Extras](#8-optionale-extras). |
| `EXPOSE_API_DOCS` | `true` zeigt eine technische API-Webseite an. Auf `false` lassen, ausser du willst sie sehen. |
| `WHISPER_MODEL` | Spracherkennungsmodell für die Spracheingabe. `small` (Standard) ist ein guter Kompromiss. |

---

## 4. Das Backend starten

Sicherstellen, dass **Docker Desktop läuft**. Im Terminal **im Projektordner**:

```
docker compose up --build
```

**Was jetzt passiert** (nur beim ersten Mal, je nach Internet 10–30 Minuten):

1. Docker lädt die Bausteine herunter (Datenbank, KI-Laufzeit, Spracherkennung – rund 4 GB).
2. Der Symtora-Server wird gebaut.
3. Das KI-Modell wird heruntergeladen (~2 GB). Du siehst Zeilen wie `pulling … 45%`.
4. Der Server startet.

Es läuft viel Text durch – das ist normal. Wörter wie `warn` sind meistens harmlos.

**Ist es bereit?** **<http://localhost:8080/health>** im Browser öffnen. Steht dort
**`{"status":"ok"}`**, läuft das Backend.

> [!IMPORTANT]
> **Dieses Terminalfenster offen lassen.** Schliessen beendet das Backend.

---

## 5. Die App starten

Ein **zweites** Terminal im Projektordner öffnen (das erste ist beschäftigt) und in den App-Ordner
wechseln:

```
cd src/frontend
```

Die Bausteine der App installieren (dauert 1–5 Minuten, einmalig):

```
npm install
```

Die Einstellungsdatei der App anlegen:

**Windows:**
```
Copy-Item .env.example .env
```
**macOS:**
```
cp .env.example .env
```

Jetzt **einen** der beiden Wege wählen.

### Weg A – im Webbrowser (am einfachsten)

Die eben erstellte Datei enthält bereits die richtige Adresse (`http://localhost:8080`). Starten:

```
npx expo start --web
```

Nach kurzer Zeit öffnet sich die App im Browser (sonst **<http://localhost:8081>** öffnen).
Weiter mit [6. Die App benutzen](#6-die-app-benutzen).

### Weg B – auf dem Handy

Das Handy muss die Adresse deines Computers im WLAN kennen.

**5B.1 – Die WLAN-Adresse (IP-Adresse) des Computers herausfinden.**

**Windows:**
```
ipconfig
```
Den Abschnitt **«Drahtlos-LAN-Adapter WLAN»** (englisch *Wireless LAN adapter WLAN*) suchen und die
**IPv4-Adresse** kopieren, z. B. `192.168.1.111`. Abschnitte mit *vEthernet*, *WSL*, *VMware* oder
*VirtualBox* **ignorieren** – die sind virtuell und funktionieren nicht. (Computer am Netzwerkkabel?
Dann den Abschnitt *Ethernet-Adapter* nehmen.)

**macOS:**
```
ipconfig getifaddr en0
```
Zeigt die Adresse direkt an, z. B. `192.168.1.111`. (Leer? `ipconfig getifaddr en1` versuchen.)

**5B.2 – Zuerst vom Handy aus testen.** Das Handy muss im **gleichen WLAN** sein wie der Computer.
Im Browser des Handys `http://<deine-ip>:8080/health` öffnen, z. B.
`http://192.168.1.111:8080/health`.

- Zeigt **`{"status":"ok"}`** → weiter.
- Lädt nicht → zuerst das beheben, siehe [Probleme lösen](#9-probleme-lösen) («Die Health-Seite
  öffnet sich auf dem Handy nicht»). Solange diese Seite nicht lädt, kann die App nicht funktionieren.

**5B.3 – Die Adresse in die Einstellungen der App eintragen.** Die Datei öffnen:

**Windows:**
```
notepad .env
```
**macOS:**
```
open -e .env
```

Die letzte Zeile auf deine Adresse ändern, `http://` und `:8080` beibehalten:

```
EXPO_PUBLIC_API_URL=http://192.168.1.111:8080
```

Speichern und schliessen.

**5B.4 – Die App starten:**

```
npx expo start --go -c
```

Im Terminal erscheint ein grosser **QR-Code**.

- **iPhone:** Die normale **Kamera**-App öffnen, auf den QR-Code richten und auf das Banner tippen.
- **Android:** **Expo Go** öffnen → **Scan QR code**.

Das erste Laden dauert bis zu einer Minute. Fragt das iPhone nach Zugriff auf das **lokale
Netzwerk**, erlauben.

> [!NOTE]
> **Firewall-Abfragen.** Fragt Windows, ob *Node.js* oder *Docker* in Netzwerken zugelassen werden
> soll, **Privat und Öffentlich** anhaken und *Zulassen* klicken. Unter macOS bei der Frage nach
> eingehenden Verbindungen **Erlauben** klicken.

---

## 6. Die App benutzen

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

## 7. Beenden, neu starten, zurücksetzen

**Beenden:** In jedem Terminalfenster <kbd>Ctrl</kbd>+<kbd>C</kbd> drücken (auch auf dem Mac –
*Ctrl*, nicht *Cmd*). Damit das Backend sicher ganz gestoppt ist, im Projektordner:

```
docker compose down
```

**Beim nächsten Mal starten** – nur diese Schritte sind nötig, alles andere bleibt gespeichert:

1. Docker Desktop öffnen und auf *Engine running* warten.
2. Terminal 1, Projektordner: `docker compose up` (nach etwa einer Minute bereit).
3. Terminal 2, Ordner `src/frontend`: `npx expo start --web` (Browser) oder `npx expo start --go`
   (Handy).

> [!IMPORTANT]
> In einem **anderen WLAN** ändert sich die Adresse deines Computers. Schritte 5B.1–5B.3 wiederholen
> und mit `npx expo start --go -c` starten – das `-c` sorgt dafür, dass die App die neue Adresse
> übernimmt.

**Alles zurücksetzen** (löscht alle Konten und Einträge **und** das heruntergeladene KI-Modell – beim
nächsten Start wird es erneut heruntergeladen):

```
docker compose down -v
```

**Deinstallieren:** Den Befehl zum Zurücksetzen ausführen, den Projektordner löschen, dann Docker
Desktop und Node.js wie jedes andere Programm deinstallieren.

---

## 8. Optionale Extras

**Bessere Antworten auf Deutsch und Französisch.** In der `.env` des Projektordners
`OLLAMA_MODEL=llama3.1:8b` setzen, das Backend beenden und `docker compose up` erneut ausführen.
Lädt ~5 GB herunter, braucht ohne Grafikkarte mehrere Minuten pro Analyse – und 16 GB RAM.

**Technische API-Seite.** In der `.env` des Projektordners `EXPOSE_API_DOCS=true` setzen, das Backend
neu starten und **<http://localhost:8080/scalar>** öffnen, um alle Serverfunktionen anzusehen und
auszuprobieren.

**Emulatoren, Development Builds, Tests.** Das sind Entwicklerthemen – siehe
[Getting started im README](../README.md#getting-started). Kurz: Der Android-Emulator braucht
`EXPO_PUBLIC_API_URL=http://10.0.2.2:8080`; Tests laufen mit `npm test` (in `src/frontend`) und
`dotnet test` (in `src/backend`, benötigt das [.NET 10 SDK](https://dotnet.microsoft.com/download)).

---

## 9. Probleme lösen

| Was du siehst | Warum | Was tun |
|---|---|---|
| `JWT_SECRET must be set in .env` | Der geheime Schlüssel fehlt in `.env`, oder die Datei liegt im falschen Ordner / heisst `.env.txt` | [Schritt 3](#3-das-backend-einrichten) wiederholen. `.env` muss neben `docker-compose.yml` liegen. Mit sichtbaren Dateierweiterungen prüfen, dass sie nicht `.env.txt` heisst. |
| `Cannot connect to the Docker daemon` / `error during connect` | Docker Desktop läuft nicht | Docker Desktop starten, auf *Engine running* warten, Befehl erneut ausführen. |
| Windows: Fehler wie *«Virtualization not enabled»* oder *«WSL»* | WSL 2 fehlt oder die Virtualisierung ist im BIOS ausgeschaltet | PowerShell **als Administrator** öffnen: `wsl --install`, dann neu starten. Klappt es dann nicht, im BIOS/UEFI *Intel VT-x* bzw. *AMD-V (SVM)* einschalten. |
| `port is already allocated` / `address already in use` (8080, 5432 oder 8081) | Ein anderes Programm benutzt den Port – oft ein früherer Symtora-Start | `docker compose down` ausführen, andere Terminalfenster schliessen, nochmals versuchen. Immer noch belegt? Computer neu starten. |
| `'docker' / 'node' wird nicht erkannt` / `command not found` | Das Terminal wurde vor der Installation geöffnet | Terminal schliessen und neu öffnen; sonst Computer neu starten. |
| Die Health-Seite öffnet sich **auf dem Handy** nicht | Anderes WLAN, Firewall, oder das Netzwerk verhindert, dass Geräte miteinander sprechen | Beide im gleichen WLAN? Adresse aus 5B.1 richtig (keine *vEthernet/WSL*-Adresse)? Windows: Einstellungen → Netzwerk → WLAN auf **Privat** stellen oder Docker in der Firewall für öffentliche Netzwerke zulassen. **Schul-, Firmen- und Gäste-WLANs blockieren das oft komplett** – den Computer stattdessen mit dem **Hotspot des Handys** verbinden oder [Weg A](#weg-a--im-webbrowser-am-einfachsten) nehmen. |
| Die App erreicht den Server nicht, obwohl die Health-Seite auf dem Handy geht | Die App benutzt noch eine alte Adresse | `src/frontend/.env` prüfen, die App mit <kbd>Ctrl</kbd>+<kbd>C</kbd> stoppen und mit `npx expo start --go -c` neu starten. |
| iPhone: App lädt endlos oder *«Could not connect»* | Expo Go darf das lokale Netzwerk nicht benutzen | iPhone-Einstellungen → Datenschutz & Sicherheit → **Lokales Netzwerk** → **Expo Go** einschalten. |
| QR-Code öffnet einen *Development Build* / *«No development build installed»* | Die App wurde ohne `--go` gestartet | Mit <kbd>Ctrl</kbd>+<kbd>C</kbd> stoppen und `npx expo start --go` benutzen, oder im Terminal <kbd>s</kbd> drücken, um zu Expo Go zu wechseln. |
| Die Analyse dauert ewig oder schlägt fehl | Zu wenig Arbeitsspeicher, oder das Modell wird noch heruntergeladen | Den ersten Start fertig laufen lassen. Andere grosse Programme schliessen. macOS: Docker mehr Speicher geben (Schritt 1.1). Nachsehen, was los ist: `docker compose logs api`. |
| Spracheingabe klappt beim ersten Mal nicht | Das Spracherkennungsmodell wird heruntergeladen | Eine Minute warten und nochmals versuchen. |
| Fehler bei `npm install` | Node.js zu alt | `node --version` muss `v22` oder höher zeigen – die aktuelle LTS von nodejs.org installieren. |
| Etwas anderes | – | Alles stoppen, `docker compose down` ausführen, Docker Desktop neu starten, ab [Schritt 4](#4-das-backend-starten) neu beginnen. |
