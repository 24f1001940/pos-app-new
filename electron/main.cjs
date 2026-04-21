const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('node:path')
const fs = require('node:fs/promises')

const isDev = Boolean(process.env.ELECTRON_START_URL)

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 760,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (isDev) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'))
  }

  return mainWindow
}

function getCacheDir() {
  return path.join(app.getPath('userData'), 'cache')
}

function safeCachePath(key) {
  const normalized = String(key || '').trim().replace(/[^a-zA-Z0-9-_]/g, '_')
  if (!normalized) {
    throw new Error('Invalid cache key')
  }

  return path.join(getCacheDir(), `${normalized}.json`)
}

async function registerIpcHandlers() {
  ipcMain.handle('desktop:meta', () => ({
    platform: process.platform,
    appVersion: app.getVersion(),
    userDataPath: app.getPath('userData'),
  }))

  ipcMain.handle('cache:write', async (_, { key, value }) => {
    const cacheDir = getCacheDir()
    await fs.mkdir(cacheDir, { recursive: true })
    await fs.writeFile(safeCachePath(key), JSON.stringify(value ?? null), 'utf8')
    return { ok: true }
  })

  ipcMain.handle('cache:read', async (_, { key }) => {
    try {
      const raw = await fs.readFile(safeCachePath(key), 'utf8')
      return { ok: true, value: JSON.parse(raw) }
    } catch {
      return { ok: false, value: null }
    }
  })

  ipcMain.handle('cache:remove', async (_, { key }) => {
    try {
      await fs.unlink(safeCachePath(key))
      return { ok: true }
    } catch {
      return { ok: false }
    }
  })

  ipcMain.handle('invoice:printHtml', async (_, { html }) => {
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        sandbox: true,
      },
    })

    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html || '')}`)
    await printWindow.webContents.print({ silent: false, printBackground: true })
    printWindow.close()
    return { ok: true }
  })

  ipcMain.handle('fs:readTextViaDialog', async () => {
    const selected = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Text and JSON', extensions: ['txt', 'json', 'csv'] },
        { name: 'All files', extensions: ['*'] },
      ],
    })

    if (selected.canceled || !selected.filePaths.length) {
      return { ok: false, canceled: true, content: '' }
    }

    const filePath = selected.filePaths[0]
    const content = await fs.readFile(filePath, 'utf8')
    return { ok: true, canceled: false, filePath, content }
  })

  ipcMain.handle('fs:writeTextViaDialog', async (_, { defaultName, content }) => {
    const selected = await dialog.showSaveDialog({
      defaultPath: defaultName || 'export.txt',
      filters: [
        { name: 'Text and JSON', extensions: ['txt', 'json', 'csv'] },
        { name: 'All files', extensions: ['*'] },
      ],
    })

    if (selected.canceled || !selected.filePath) {
      return { ok: false, canceled: true }
    }

    await fs.writeFile(selected.filePath, String(content ?? ''), 'utf8')
    return { ok: true, canceled: false, filePath: selected.filePath }
  })
}

app.whenReady().then(async () => {
  await registerIpcHandlers()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
