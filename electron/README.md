# Desktop Runtime (Electron)

This folder contains the Electron main process and preload bridge for the desktop build.

## Development

```bash
npm run desktop:dev
```

The command starts Vite for renderer and launches Electron against `http://localhost:5173`.

## Production Build

```bash
npm run desktop:build:win
npm run desktop:build:mac
```

Installers are generated in `desktop-dist/`.

## Exposed Desktop Bridge

Renderer can access `window.megDesktop`:

- `getMeta()`
- `printInvoiceHtml(html)`
- `cache.write(key, value)` / `cache.read(key)` / `cache.remove(key)`
- `fs.readTextViaDialog()` / `fs.writeTextViaDialog(defaultName, content)`
