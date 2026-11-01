# Run Symtora yourself – step by step

**English** · [Deutsch](run-guide.de.md) · [← back to the README](../README.md)

This guide is for people who don't write code. You install **one** program, download the code and
start Symtora with a **double-click** – on **Windows or macOS**. Then you open the app in your **web
browser** or on your **phone**.

> [!WARNING]
> Symtora is a student project, **not a medical device**, and gives no diagnosis.
> In an emergency in Switzerland, call **144**.

---

## Contents

0. [What you end up with](#0-what-you-end-up-with)
1. [Install Docker Desktop (once)](#1-install-docker-desktop-once)
2. [Download the code](#2-download-the-code)
3. [Start Symtora](#3-start-symtora)
4. [Open the app](#4-open-the-app)
5. [Use the app](#5-use-the-app)
6. [Stop, restart, reset](#6-stop-restart-reset)
7. [Optional extras](#7-optional-extras)
8. [Troubleshooting](#8-troubleshooting)

---

## 0. What you end up with

Symtora is made of several parts. All of them run on your computer, inside **Docker** – a program
that starts them all together:

```
 Browser or phone  ──►  App server  ──►  Symtora server (API)  ──►  Database        (accounts and entries)
                                                              ──►  AI model        (analyses the symptoms)
                                                              ──►  Speech-to-text  (voice input)
```

Nothing you type is sent to an outside AI service.

**What you need**

| | |
|---|---|
| Time | About 30–60 minutes the first time (mostly downloads). About 2 minutes after that. |
| Disk space | About **12 GB** free |
| Memory (RAM) | At least **8 GB**, **16 GB** recommended – the AI model is hungry |
| Internet | Needed for the first start (several GB of downloads) |
| Phone (optional) | iPhone or Android, on the **same Wi-Fi** as the computer |

---

## 1. Install Docker Desktop (once)

Download it from **<https://www.docker.com/products/docker-desktop/>** and install it.

- **Windows:** Accept the suggestion to use **WSL 2** during installation. Restart the computer if
  asked. Windows Home works too. If Docker later says *"Virtualization is not enabled"* or *"WSL
  needs updating"*, see [Troubleshooting](#8-troubleshooting).
- **macOS:** Pick the right download – **Apple chip** (M1/M2/M3/M4 …) or **Intel chip**. Not sure?
  → Apple menu  → *About This Mac* → look at "Chip" or "Processor". Drag Docker into
  *Applications*.

**Open Docker Desktop once**, accept the terms and wait until the bottom left shows *"Engine
running"* (green). You can skip signing in.

> [!NOTE]
> **macOS only:** Docker Desktop → ⚙ *Settings* → *Resources* → set **Memory** to at least **6 GB**,
> then *Apply & restart*. On Windows, Docker manages memory itself.

**For the phone (optional):** install **Expo Go** from the
[App Store](https://apps.apple.com/app/expo-go/id982107779) or
[Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent).

---

## 2. Download the code

Open <https://github.com/smadev10/symtora>, click the green **Code** button → **Download ZIP**.
Unpack the file somewhere easy to find, e.g. your *Documents* folder.

> [!IMPORTANT]
> **Windows:** right-click the ZIP file → **Extract All…**. Don't double-click into the ZIP – the
> start files don't work from inside it.

The unpacked folder (called `symtora-main`) contains the file that starts and stops everything:

| Windows | macOS |
|---|---|
| `Symtora.bat` | `Symtora.command` |

---

## 3. Start Symtora

**Windows:** double-click **`Symtora.bat`**.

> If *"Windows protected your PC"* appears: click **More info** → **Run anyway**. If Windows asks
> *"Do you want to run this file?"*: **Run**.

**macOS:** **the first time**, right-click **`Symtora.command`** → **Open** → **Open** again in
the dialog. (macOS blocks a plain double-click the first time because the file came from the
internet.) From then on, a double-click is enough.

A window opens and does everything by itself:

1. It checks that Docker is running, and starts Docker Desktop if needed.
2. It creates the settings, including a secret key.
3. It builds Symtora and downloads the AI model (~2 GB). You'll see lines like `pulling … 45%`.
4. It waits until everything is ready and opens the app in your browser.

The first time this takes **10–30 minutes**, depending on your internet. A lot of text scrolls by –
that's normal. Words like `warn` are usually harmless.

> [!NOTE]
> **Firewall prompts.** If Windows asks whether to allow *Docker* on networks, tick **Private and
> Public** and click *Allow*. On macOS, click **Allow** when asked about incoming connections.

---

## 4. Open the app

When the window shows **"Symtora is running"**, everything is ready.

### In the browser

The browser opens by itself at **<http://localhost:8081>**. The first load takes up to a minute.

### On your phone

The **QR code** is in two places: in the start window below the browser address, and in the browser
on the sign-in screen (the **"Open on your phone"** card) – there even after the window is closed.

1. The phone must be on the **same Wi-Fi** as the computer.
2. **iPhone:** open the regular **Camera** app, point it at the QR code and tap the banner.
   **Android:** open **Expo Go** → **Scan QR code**.
3. The first load takes up to a minute. If the iPhone asks for access to the **local network**,
   allow it.

You never type in an IP address – the start window finds it itself. If you're on a different Wi-Fi
later, stop Symtora once and start it again.

**Show the QR code or open the browser again:** double-click `Symtora` again and choose **1**.

You can then close the window with <kbd>Enter</kbd>. **Symtora keeps running in the background**
until you stop it.

---

## 5. Use the app

1. On the welcome screen, tick the consent box and tap **Start**, then **Create account** – any
   e-mail address and a password of at least 8 characters. The account only exists in the database
   on your computer.
2. Tap **New description**, describe how you feel in your own words (e.g. *"Headache since this
   morning, worse when I bend down"*) and tap **Analyse**.
3. Wait for the **assessment** – about **a minute** with the default model. You then see urgency,
   possible causes and next steps.
4. Try **voice input** with **Speak** / **Speak instead**. The **very first** recording takes longer
   because the speech model (~500 MB) is downloaded in the background.
5. **History** shows your past entries (the sample charts there are still demo data in this
   prototype). In **Settings** you can switch language (DE/EN/FR) and light/dark mode, export your
   data, and delete all entries or the whole account.

---

## 6. Stop, restart, reset

**Stop:** double-click **`Symtora`** again. Because it's already running, a menu appears – choose
**2** (*Stop Symtora*). Your accounts and entries are kept.

**Next time:** double-click **`Symtora`** again. Nothing is downloaded this time; everything
is ready after about 1–2 minutes.

**Reset everything** (deletes all accounts and entries **and** the downloaded AI model – it is
downloaded again on the next start): open a terminal in the project folder (see
[Optional extras](#7-optional-extras)) and run:

```
docker compose down -v
```

**Uninstall:** run the reset command, delete the project folder, then uninstall Docker Desktop like
any other program.

---

## 7. Optional extras

These extras need a **terminal in the project folder** and an edit to the **settings file `.env`**
that the start window created.

- **Open a terminal – Windows:** open the folder in Explorer, click into the **address bar**, type
  `powershell` and press <kbd>Enter</kbd>. **macOS:** in Finder, right-click the folder → **New
  Terminal at Folder**.
- **Open `.env` – Windows:** in the terminal, `notepad .env`. **macOS:** `open -e .env` (when saving,
  keep **plain text**, never `.rtf`).

**Better answers in German and French.** Set `OLLAMA_MODEL=llama3.1:8b` in `.env`, then stop and
start Symtora. Downloads ~5 GB, takes several minutes per analysis without a graphics card – and
16 GB of RAM.

**Technical API page.** Set `EXPOSE_API_DOCS=true` in `.env`, restart Symtora and open
**<http://localhost:8080/scalar>** to browse and try out every server function.

**What's happening in the background.** In the terminal, `docker compose logs -f` shows the running
messages of every part (stop with <kbd>Ctrl</kbd>+<kbd>C</kbd>).

**Developing, emulators, tests.** See [Getting started in the README](../README.md#getting-started).

---

## 8. Troubleshooting

| What you see | Why | What to do |
|---|---|---|
| *"Docker is not installed"* | Docker Desktop is missing, or the window was opened before installing it | Do [step 1](#1-install-docker-desktop-once), restart the computer and try again. |
| *"Docker did not start"* | Docker Desktop needs a confirmation or an update the first time | Open Docker Desktop yourself, confirm any dialogs, wait for *Engine running*, start again. |
| Windows: errors like *"Virtualization not enabled"* or *"WSL"* | WSL 2 is missing or virtualisation is switched off in the BIOS | Open PowerShell **as administrator**: `wsl --install`, then restart. If that doesn't help, enable *Intel VT-x* or *AMD-V (SVM)* in the BIOS/UEFI. |
| Windows: the window just flashes | The file was started from inside the ZIP | Unpack the ZIP with **Extract All…** first and start from the unpacked folder. |
| macOS: *"cannot be opened because it is from an unidentified developer"* | Gatekeeper blocks files from the internet | Right-click → **Open** → **Open** (see [step 3](#3-start-symtora)). |
| macOS: *"Permission denied"* | The file lost its execute permission while unpacking | Open a terminal in the project folder and run `bash scripts/symtora.sh`. |
| `port is already allocated` / `address already in use` (8080, 8081 or 5432) | Another program uses the port – often an earlier start | Stop Symtora ([step 6](#6-stop-restart-reset)) and start it again. Still taken? Restart the computer. |
| *"The AI model could not be downloaded"* | No or too slow internet connection | Check the connection and start again – the download resumes where it stopped. |
| Phone: the app doesn't load after scanning | Different Wi-Fi, firewall, or the network stops devices talking to each other | Both on the same Wi-Fi? Windows: Settings → Network → set the Wi-Fi to **Private**, or allow Docker for public networks in the firewall. **School, office and guest Wi-Fi often block this completely** – connect the computer to your **phone's hotspot** instead and restart Symtora, or use the browser. |
| iPhone: endless loading or *"Could not connect"* | Expo Go isn't allowed on the local network | iPhone Settings → Privacy & Security → **Local Network** → turn on **Expo Go**. |
| Phone: no QR code (*"No Wi-Fi/network address found"*) | The computer isn't connected to a network | Connect to Wi-Fi and restart Symtora. |
| The analysis takes forever or fails | Not enough memory, or the model is still downloading | Let the first start finish. Close other big programs. macOS: give Docker more memory ([step 1](#1-install-docker-desktop-once)). See what's going on: `docker compose logs api`. |
| Voice input fails the first time | The speech model is downloading | Wait a minute and try again. |
| Something else | – | Stop Symtora, restart Docker Desktop, double-click **Symtora** again. |
