# Run Symtora yourself — step by step

**English** · [Deutsch](run-guide.de.md) · [← back to the README](../README.md)

This guide is for people who don't write code. It walks you through running the whole of
Symtora on your own computer — **Windows or macOS** — and opening the app either in your
**web browser** or on your **phone**. You copy and paste a few commands; everything else is clicking.

> [!WARNING]
> Symtora is a student project, **not a medical device**, and gives no diagnosis.
> In an emergency in Switzerland, call **144**.

---

## Contents

0. [What you'll end up with](#0-what-youll-end-up-with)
1. [Install the tools (once)](#1-install-the-tools-once)
2. [Get the code](#2-get-the-code)
3. [Configure the backend](#3-configure-the-backend)
4. [Start the backend](#4-start-the-backend)
5. [Start the app](#5-start-the-app)
6. [Use it](#6-use-it)
7. [Stop, restart, reset](#7-stop-restart-reset)
8. [Optional extras](#8-optional-extras)
9. [Troubleshooting](#9-troubleshooting)

---

## 0. What you'll end up with

Symtora is made of several parts. All of them run on your computer:

```
 App (browser or phone)  ──►  Symtora server (API)  ──►  Database        (your accounts and entries)
                                                     ──►  AI model        (analyses the symptoms)
                                                     ──►  Speech-to-text  (voice input)
```

The server, database, AI model and speech-to-text all run inside **Docker**, a program that
starts them for you with one command. The app runs through **Node.js**. Nothing you type is sent
to an outside AI service.

**What you need**

| | |
|---|---|
| Time | About 30–60 minutes the first time (mostly downloads). Afterwards about 2 minutes. |
| Disk space | About **10 GB** free |
| Memory (RAM) | **8 GB** minimum, **16 GB** recommended — the AI model is hungry |
| Internet | Needed for the first run (several GB of downloads) |
| Phone (optional) | iPhone or Android, on the **same Wi-Fi** as the computer |

> [!TIP]
> **How to read the commands.** Grey boxes are commands. Copy the whole line, paste it into the
> terminal window (Windows: right-click pastes; macOS: <kbd>Cmd</kbd>+<kbd>V</kbd>) and press
> <kbd>Enter</kbd>. When the guide shows separate **Windows** and **macOS** boxes, use only the one
> for your computer.

---

## 1. Install the tools (once)

### 1.1 Docker Desktop

Download from **<https://www.docker.com/products/docker-desktop/>** and install it.

- **Windows:** accept the suggestion to use **WSL 2** during installation. Restart the computer
  when asked. Windows Home is fine. If Docker later says *"virtualization is not enabled"* or
  *"WSL needs updating"*, see [Troubleshooting](#9-troubleshooting).
- **macOS:** choose the right download — **Apple chip** (M1/M2/M3/M4…) or **Intel chip**. Not sure?
   → Apple menu  → *About This Mac* → look at "Chip" or "Processor". Drag Docker into *Applications*.

Open **Docker Desktop** and wait until it says *"Engine running"* (green, bottom left). You can skip
the sign-in. Docker must be running every time you use Symtora.

> [!NOTE]
> **macOS only:** Docker Desktop → ⚙ *Settings* → *Resources* → set **Memory** to at least
> **6 GB**, then *Apply & restart*. On Windows Docker manages memory itself.

### 1.2 Node.js

Download the **LTS** version (22.x) from **<https://nodejs.org/>** and install it with the default
options. (On Windows you can leave "Tools for Native Modules" unticked.)

### 1.3 Git (optional)

Only needed if you want to download the code with a command. Otherwise you can download a ZIP file
in the next step. Windows: <https://git-scm.com/download/win> · macOS: already offered when you
first type `git` in the Terminal.

### 1.4 Expo Go on your phone (optional)

Only if you want to use the app on your phone. Install **Expo Go** from the
[App Store](https://apps.apple.com/app/expo-go/id982107779) or
[Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent).

### 1.5 Check that everything is installed

Open a terminal:

- **Windows:** Start menu → type `PowerShell` → open *Windows PowerShell*.
- **macOS:** <kbd>Cmd</kbd>+<kbd>Space</kbd> → type `Terminal` → <kbd>Enter</kbd>.

Then run:

```
docker --version
node --version
```

Both should print a version number (Node should start with `v22` or higher). If you get
*"not recognized"* / *"command not found"*, close the terminal, open a new one and try again —
a freshly installed program is only found in new windows. If it still fails, restart the computer.

---

## 2. Get the code

**Option 1 — ZIP (no Git needed):** open <https://github.com/smadev10/symtora>, click the green
**Code** button → **Download ZIP**. Unzip it somewhere easy to find, e.g. your *Documents* folder.
The folder will be called `symtora-main` — that is fine.

**Option 2 — with Git:** in the terminal:

```
cd ~/Documents
git clone https://github.com/smadev10/symtora.git
```

### Open a terminal in the project folder

You'll do this several times, so remember how:

- **Windows:** open the folder in File Explorer (the one that contains `docker-compose.yml`), click
  into the **address bar** at the top, type `powershell` and press <kbd>Enter</kbd>.
- **macOS:** in Finder, right-click the folder → **New Terminal at Folder**. (If that entry is
  missing: System Settings → Keyboard → Keyboard Shortcuts → Services → Files and Folders → tick
  *New Terminal at Folder*.)

### Make hidden files visible

The settings files are called `.env` — names starting with a dot are hidden by default.

- **Windows 11:** File Explorer → **View** → **Show** → tick **File name extensions** and
  **Hidden items**.
- **macOS:** in Finder press <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>.</kbd> (period).

---

## 3. Configure the backend

Open a terminal **in the project folder** (see above).

**3.1 Create the settings file** by copying the example:

**Windows:**
```
Copy-Item .env.example .env
```
**macOS:**
```
cp .env.example .env
```

**3.2 Create a secret key.** The server needs a long random password to sign logins. Generate one:

**Windows:**
```
[Convert]::ToBase64String((1..48 | % { [byte](Get-Random -Max 256) }))
```
**macOS:**
```
openssl rand -base64 48
```

It prints something like `zICb7mhLuNtDnEDPYLEname/t+coXZu…`. Select and copy that whole line.

**3.3 Put the key into the file.** Open `.env`:

**Windows:**
```
notepad .env
```
**macOS:**
```
open -e .env
```

Find the line `JWT_SECRET=` and paste the key directly behind the `=` (no spaces, no quotes):

```
JWT_SECRET=zICb7mhLuNtDnEDPYLEname/t+coXZuFSnEdg30PwqFYrsyG2ac+JeYBq+cidPer
```

Save (<kbd>Ctrl</kbd>+<kbd>S</kbd> / <kbd>Cmd</kbd>+<kbd>S</kbd>) and close the editor.

> [!IMPORTANT]
> **macOS TextEdit:** if it asks about the format, keep it as **plain text** — never save as `.rtf`.

The other lines can stay as they are. What they mean:

| Setting | Meaning |
|---|---|
| `POSTGRES_PASSWORD` | Password of the database. Only used inside Docker; the default is fine. |
| `OLLAMA_MODEL` | Which AI model analyses symptoms. `llama3.2:3b` (default) answers in about a minute. See [Optional extras](#8-optional-extras) for a better but slower one. |
| `EXPOSE_API_DOCS` | `true` shows a technical API web page. Leave `false` unless you want it. |
| `WHISPER_MODEL` | Speech-to-text model for voice input. `small` (default) is a good balance. |

---

## 4. Start the backend

Make sure **Docker Desktop is running**. In the terminal **in the project folder**:

```
docker compose up --build
```

**What happens now** (first time only, 10–30 minutes depending on your internet):

1. Docker downloads the building blocks (database, AI runtime, speech-to-text — around 4 GB).
2. It builds the Symtora server.
3. It downloads the AI model (~2 GB). You'll see lines like `pulling … 45%`.
4. The server starts.

A lot of text scrolls past — that's normal. Red-looking words like `warn` are usually harmless.

**Is it ready?** Open **<http://localhost:8080/health>** in your browser. When it shows
**`{"status":"ok"}`**, the backend is running.

> [!IMPORTANT]
> **Leave this terminal window open.** Closing it stops the backend.

---

## 5. Start the app

Open a **second** terminal in the project folder (the first one is busy) and go into the app folder:

```
cd src/frontend
```

Install the app's components (takes 1–5 minutes, once):

```
npm install
```

Create the app's settings file:

**Windows:**
```
Copy-Item .env.example .env
```
**macOS:**
```
cp .env.example .env
```

Now choose **one** of the two paths.

### Path A — in the web browser (easiest)

The file you just created already contains the right address (`http://localhost:8080`). Start:

```
npx expo start --web
```

After a short while your browser opens the app (otherwise open **<http://localhost:8081>**).
Continue with [6. Use it](#6-use-it).

### Path B — on your phone

The phone needs to know your computer's address on the Wi-Fi.

**5B.1 — Find your computer's Wi-Fi address (IP address).**

**Windows:**
```
ipconfig
```
Look for the block **"Wireless LAN adapter WLAN"** (or *Wi-Fi*) and copy the **IPv4 Address**,
e.g. `192.168.1.111`. **Ignore** blocks named *vEthernet*, *WSL*, *VMware* or *VirtualBox* — those are
virtual and won't work. (Computer on a network cable? Use the *Ethernet adapter* block.)

**macOS:**
```
ipconfig getifaddr en0
```
It prints the address directly, e.g. `192.168.1.111`. (Empty? Try `ipconfig getifaddr en1`.)

**5B.2 — Test it from the phone first.** Make sure the phone is on the **same Wi-Fi** as the
computer. Open the phone's browser and go to `http://<your-ip>:8080/health`, e.g.
`http://192.168.1.111:8080/health`.

- Shows **`{"status":"ok"}`** → continue.
- Doesn't load → fix that first, see [Troubleshooting](#9-troubleshooting) ("The health page doesn't
  open on the phone"). The app can't work until this page loads.

**5B.3 — Put the address into the app's settings.** Open the file:

**Windows:**
```
notepad .env
```
**macOS:**
```
open -e .env
```

Change the last line to your address, keeping `http://` and `:8080`:

```
EXPO_PUBLIC_API_URL=http://192.168.1.111:8080
```

Save and close.

**5B.4 — Start the app:**

```
npx expo start --go -c
```

A large **QR code** appears in the terminal.

- **iPhone:** open the normal **Camera** app, point it at the QR code and tap the banner.
- **Android:** open **Expo Go** → **Scan QR code**.

The first load takes up to a minute. Allow **Local Network** access if the iPhone asks.

> [!NOTE]
> **Firewall prompts.** When Windows asks whether to allow *Node.js* or *Docker* on networks,
> tick **both Private and Public** and click *Allow*. On macOS click **Allow** when asked about
> incoming connections.

---

## 6. Use it

> [!TIP]
> The app starts in **German**. To switch to English: bottom bar → **Einstellungen** →
> **Sprache** → **EN**. (French is there too.)

1. Tick the consent box on the welcome screen and tap **Start**, then **Create account** — any
   e-mail address and a password with at least 8 characters. The account lives only in the database
   on your computer.
2. Tap **New description**, describe how you feel in your own words (e.g. *"headache since this
   morning, worse when I bend down"*) and tap **Analyze**.
3. Wait for the **assessment** — about **one minute** with the default model. You then see the
   urgency level, possible causes and next steps.
4. Try **voice input** with **Speak** / **Speak instead**. The **very first** recording takes longer
   because the speech model (~500 MB) is downloaded in the background.
5. **History** shows your past entries (the pattern charts there are still demo data in this
   prototype). **Settings** lets you change
   language and light/dark mode, export your data, delete all entries or delete the account.

## 7. Stop, restart, reset

**Stop:** in each terminal window press <kbd>Ctrl</kbd>+<kbd>C</kbd> (on macOS too — *Ctrl*, not
*Cmd*). Then, to be sure the backend is fully stopped, in the project folder:

```
docker compose down
```

**Start again next time** — only these steps are needed, everything else is remembered:

1. Open Docker Desktop and wait for *Engine running*.
2. Terminal 1, project folder: `docker compose up` (ready after about a minute).
3. Terminal 2, folder `src/frontend`: `npx expo start --web` (browser) or `npx expo start --go`
   (phone).

> [!IMPORTANT]
> On a **different Wi-Fi** your computer's address changes. Repeat 5B.1–5B.3 and start with
> `npx expo start --go -c` — the `-c` makes the app pick up the new address.

**Reset everything** (deletes all accounts and entries **and** the downloaded AI model — the next
start downloads it again):

```
docker compose down -v
```

**Uninstall:** run the reset command above, delete the project folder, then uninstall Docker Desktop
and Node.js like any other program.

---

## 8. Optional extras

**Better German and French answers.** In the `.env` of the project folder set
`OLLAMA_MODEL=llama3.1:8b`, then stop and run `docker compose up` again. It downloads ~5 GB and
takes several minutes per analysis without a graphics card — and needs 16 GB RAM.

**Technical API page.** Set `EXPOSE_API_DOCS=true` in the project folder's `.env`, restart the
backend, and open **<http://localhost:8080/scalar>** to browse and try every server function.

**Emulators, development builds, tests.** These are developer topics — see
[Getting started in the README](../README.md#getting-started). In short: the Android emulator
needs `EXPO_PUBLIC_API_URL=http://10.0.2.2:8080`; tests run with `npm test` (in `src/frontend`) and
`dotnet test` (in `src/backend`, needs the [.NET 10 SDK](https://dotnet.microsoft.com/download)).

---

## 9. Troubleshooting

| What you see | Why | What to do |
|---|---|---|
| `JWT_SECRET must be set in .env` | The secret key is missing in `.env`, or the file is in the wrong folder / called `.env.txt` | Repeat [step 3](#3-configure-the-backend). `.env` must sit next to `docker-compose.yml`. With file extensions visible, check it isn't `.env.txt`. |
| `Cannot connect to the Docker daemon` / `error during connect` | Docker Desktop isn't running | Start Docker Desktop, wait for *Engine running*, run the command again. |
| Windows: *"Virtualization not enabled"* or *"WSL"* errors | WSL 2 is missing or virtualization is off in the BIOS | In PowerShell **as administrator**: `wsl --install`, then restart. If it still fails, enable *Intel VT-x* / *AMD-V (SVM)* in the BIOS/UEFI settings. |
| `port is already allocated` / `address already in use` (8080, 5432 or 8081) | Another program uses that port — often an older Symtora run | Run `docker compose down`, close other terminal windows, try again. Still busy? Restart the computer. |
| `'docker' / 'node' is not recognized` / `command not found` | Terminal was opened before installing | Close and reopen the terminal; otherwise restart the computer. |
| The health page doesn't open **on the phone** | Different Wi-Fi, firewall, or the network blocks devices from talking to each other | Same Wi-Fi on both? Address from 5B.1 correct (not a *vEthernet/WSL* one)? On Windows: Settings → Network → set the Wi-Fi to **Private**, or allow Docker in the firewall for Public networks. **School, company and guest Wi-Fis often block this completely** — use your **phone's hotspot** for the computer instead, or use [Path A](#path-a--in-the-web-browser-easiest). |
| App says it can't reach the server, but the health page works on the phone | The app still uses an old address | Check `src/frontend/.env`, then stop the app with <kbd>Ctrl</kbd>+<kbd>C</kbd> and start it with `npx expo start --go -c`. |
| iPhone: app loads forever or *"Could not connect"* | Expo Go may not use the local network | iPhone Settings → Privacy & Security → **Local Network** → turn on **Expo Go**. |
| QR code opens a *development build* / *"No development build installed"* | The app was started without `--go` | Stop with <kbd>Ctrl</kbd>+<kbd>C</kbd> and use `npx expo start --go`, or press <kbd>s</kbd> in the terminal to switch to Expo Go. |
| Analysis takes forever or fails | Not enough memory, or the model is still downloading | Wait for the first run to finish. Close other big programs. macOS: give Docker more memory (step 1.1). See what's going on: `docker compose logs api`. |
| Voice input fails the first time | Speech model is being downloaded | Wait a minute and try again. |
| `npm install` errors | Node.js too old | `node --version` must show `v22` or higher — install the current LTS from nodejs.org. |
| Anything else | – | Stop everything, run `docker compose down`, restart Docker Desktop, start again from [step 4](#4-start-the-backend). |
