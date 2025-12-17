import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { PtyManager } from './pty-manager'

let mainWindow: BrowserWindow | null = null
let ptyManager: PtyManager | null = null

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    frame: true,
    titleBarStyle: 'default',
    title: 'Better Agent Terminal'
  })

  ptyManager = new PtyManager(mainWindow)

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    ptyManager?.dispose()
    ptyManager = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// IPC Handlers
ipcMain.handle('pty:create', async (_event, options) => {
  return ptyManager?.create(options)
})

ipcMain.handle('pty:write', async (_event, id: string, data: string) => {
  ptyManager?.write(id, data)
})

ipcMain.handle('pty:resize', async (_event, id: string, cols: number, rows: number) => {
  ptyManager?.resize(id, cols, rows)
})

ipcMain.handle('pty:kill', async (_event, id: string) => {
  return ptyManager?.kill(id)
})

ipcMain.handle('pty:restart', async (_event, id: string, cwd: string) => {
  return ptyManager?.restart(id, cwd)
})

ipcMain.handle('pty:get-cwd', async (_event, id: string) => {
  return ptyManager?.getCwd(id)
})

ipcMain.handle('dialog:select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('workspace:save', async (_event, data: string) => {
  const fs = await import('fs/promises')
  const configPath = path.join(app.getPath('userData'), 'workspaces.json')
  await fs.writeFile(configPath, data, 'utf-8')
  return true
})

ipcMain.handle('workspace:load', async () => {
  const fs = await import('fs/promises')
  const configPath = path.join(app.getPath('userData'), 'workspaces.json')
  try {
    const data = await fs.readFile(configPath, 'utf-8')
    return data
  } catch {
    return null
  }
})
