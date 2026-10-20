# E87 Studio

**English** · [Русский](README.ru.md) · [BLE protocol reference](docs/PROTOCOL.md) · [Original web editor](https://hybridherbst.github.io/web-bluetooth-e87/)

A compact, offline desktop editor for circular E87 Bluetooth badges. Prepare an image, a scrolling message, a short video or a looping visual, preview it inside the badge's circle, and send it over Bluetooth.

Built on Felix Herbst's [web-bluetooth-e87](https://github.com/hybridherbst/web-bluetooth-e87). The original browser interface, BLE transfer protocol, Jieli authentication and AVI writer are preserved. The desktop interface is a separate entry point and is currently in **Russian**; the documentation is available in English and Russian.

> Community preview, maintained in the contributor's fork while the upstream PR is under review. These downloads are not an official upstream release.

## Download

**[E87 Studio 1.0.0-beta.1 — installers and SHA-256 checksums](https://github.com/xor334/web-bluetooth-e87/releases/tag/studio-v1.0.0-beta.1)**

| Platform | Packages | Hardware validation |
| --- | --- | --- |
| macOS | DMG and ZIP; architecture is included in the filename | E87 connection, screen-size query and advertised MAC identification tested on Apple Silicon; Intel still needs testing |
| Windows x64 | Setup installer and portable EXE | BLE connection and transfer still need testing on Windows |
| Linux x64 | AppImage and DEB | BLE connection and transfer still need testing on Linux |

Release assets can be downloaded without a GitHub account. The release notes identify the source commit and distinguish build checks from hardware checks. These are unsigned community builds: macOS uses an ad hoc signature without Developer ID notarization; Windows has no Authenticode certificate. The OS may show a warning on first launch.

## What you can make

- **Images:** crop, pan and scale a picture in a circular preview.
- **Scrolling text:** Cyrillic and Latin text, three font styles, size, speed, direction, colors and optional glow.
- **Studio effects:** Liquid chrome, Pearl, Crimson silk, Aurora, Dichroic, Gold eclipse, After dark and Contour. Generated locally as a still or a loop, alongside the 12 original patterns.
- **Slideshows and video:** ordered image sequences or short clips, converted locally to Motion JPEG AVI.
- **QR codes:** render a link as a badge image.
- **Multiple badges:** explicitly choose a device, give it a name, and keep its MAC/address information locally.

The default window is 920 × 720. Help and file-format guidance live behind `?`; diagnostic logs are collapsed. No account, cloud service, telemetry or runtime internet connection is required by the application.

## Connect a badge

1. Enable Bluetooth on your computer and open the badge's Bluetooth/QR screen.
2. Disconnect the badge from ZRun or an existing browser connection.
3. Click **Подключить** (Connect) and select the intended device. The app never automatically chooses the first E87 it sees.
4. Optionally save a name. If no hardware address is available, enter the address shown on the badge or paste the text decoded from its QR code. QR URLs are parsed locally, not opened.
5. Prepare content, inspect the preview and click **На значок ↗** (Send to badge). Keep the badge nearby until the transfer finishes.

On macOS, Chromium presents a UUID-derived identifier that looks like a MAC but is **not the badge's hardware MAC**. A small native helper reads supported E87 manufacturer advertisements (`0x6DB9`) and associates the advertised address with that identifier. This was verified on an E87 reporting a 360 × 360 screen. Other firmware may need manual address entry. A saved manual address is a label, not a way to connect to a device that is absent from the scan.

Windows and Linux may provide a MAC-shaped system address directly. Address behavior depends on the OS, adapter and firmware. Names and address associations are stored only on the current computer. **Забыть** (Forget) removes a local record; it does not erase the badge.

## File formats and limits

| Mode | Input | Badge payload |
| --- | --- | --- |
| Image | PNG, JPEG/JPG, WebP, BMP; GIF as one still frame | JPEG |
| Slideshow | Images, sorted by filename with numeric ordering | Motion JPEG AVI |
| Video | MP4/H.264 or WebM/VP8/VP9 recommended | Motion JPEG AVI without sound |
| Scrolling text | Up to 80 characters, subject to the duration limit | Motion JPEG AVI |
| Effects | Built-in procedural generators | JPEG or Motion JPEG AVI |
| QR | Link text | JPEG |

- Default output is **368 × 368** until a connected badge reports its screen dimensions. Important content should fit inside the circle.
- The prepared payload must be at most **2,000,000 bytes** (about 1.91 MiB). Source files may be larger.
- Video clips are limited to 10 seconds. Reduce duration or frame rate if the output exceeds the size limit.
- Text loops use 15 fps and at most 240 frames. Longer messages may require a faster speed, smaller type or fewer characters.
- Studio effects offer 3, 5, 6 or 8 seconds, or a single still frame. Some longer effects may exceed the payload limit.
- MOV, HEVC and other codecs depend on Chromium/OS decoders. The file extension alone does not guarantee support.
- **Сохранить** (Save) exports a prepared JPEG/AVI, not an editable project. Reimporting an AVI depends on decoder support.
- “Animations” are frames. ZIP archives, JSON, programs and executable scripts cannot be uploaded.

## Install and run

**macOS:** open the DMG and drag E87 Studio to Applications, or extract the ZIP. Grant Bluetooth access when macOS asks. The native address-discovery helper is bundled; no Python or development tools are needed to run the app.

**Windows:** run the setup installer or the portable executable. A working BLE adapter and driver are required.

**Linux:** use the DEB or make the AppImage executable and launch it. BlueZ, D-Bus and a BLE adapter are required. Web Bluetooth support varies by distribution; the app enables Chromium's experimental Web Bluetooth support and keeps its sandbox enabled. If FUSE is unavailable, use the DEB or the standard AppImage extraction mode. Do not disable the sandbox.

If a badge is missing, keep its QR screen open, check the app's OS Bluetooth permission, and end other connections to it. Reopen the chooser to start a new scan. Scanning times out after two minutes; macOS advertisement enrichment runs for up to 18 seconds per scan. Expand **Журнал** (Log) to inspect errors.

## Build from source

Use Node.js **22.16+** and npm. Building on macOS also requires Xcode Command Line Tools for the Swift helper. Internet access is needed to install dependencies and download Electron, not to use the packaged app.

```sh
npm ci
npm run check
npm start
```

```sh
npm run dist:mac     # DMG + ZIP, current Mac architecture
npm run dist:win     # Windows x64 setup + portable
npm run dist:linux   # Linux x64 AppImage + DEB
```

Run each packaging command on its corresponding OS. Output goes to `release/`. For an Intel + Apple Silicon Mac package, run `npm run build` followed by `npx electron-builder --mac --universal --publish never`.

The original web application remains available with `npm run dev --workspace web`. `npm run build:web` produces `web/dist/`, honoring `BASE_PATH` for GitHub Pages. The desktop build uses `web/desktop.html`, produces `web/dist-desktop/`, and loads local files in Electron.

## Code map

| Area | Responsibility |
| --- | --- |
| `desktop/main.cjs` | Window, explicit Bluetooth chooser, scoped permissions, pairing and shutdown handling |
| `desktop/preload.cjs` | Narrow IPC bridge; no generic filesystem or command access |
| `desktop/selection.cjs` | Chooser lifecycle, cancellation, timeout and stale-selection rejection |
| `desktop/mac-discovery.swift` | Read-only CoreBluetooth advertisement scan; emits address associations as JSON |
| `web/src/studio/` | Desktop interface, saved badge identities, scrolling text and eight Studio effects |
| `web/src/lib/e87-protocol.ts` | Original shared BLE connection and transfer implementation, unchanged |
| `web/src/jl-auth.ts`, `web/src/avi-builder.ts` | Original shared authentication and AVI implementation, unchanged |
| `.github/workflows/desktop.yml` | Checks and installer builds on macOS, Windows and Linux |

The renderer has sandboxing and context isolation enabled, with Node.js integration disabled. A local Content Security Policy, navigation restrictions and sender validation constrain the preload bridge. The Swift helper only scans advertisements; it does not connect to GATT or upload content.

`npm run check` runs Svelte/TypeScript checks and six regression tests covering explicit selection among multiple devices, cancellation, stale replies, timeout, MAC identity/QR parsing and scrolling-duration bounds. These tests do not prove hardware compatibility. The CI workflow builds both entry points, packages all three operating systems and retains artifacts; it does not automatically publish releases.

## Credits and protocol reference

The project is based on **Felix Herbst's web-bluetooth-e87**, upstream revision `9e8ba39`. The original README's reverse-engineered BLE protocol reference is preserved in full at **[docs/PROTOCOL.md](docs/PROTOCOL.md)**. See [LICENSE](LICENSE) for the original MIT copyright and license. Electron/Chromium license notices are included in the packaged runtime.
