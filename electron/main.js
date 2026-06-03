const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = !app.isPackaged

// Stockage persistant dans AppData/Kandidat
function getDataPath() {
  const dir = path.join(app.getPath('userData'), 'data')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'candidatures.json')
}

function loadData() {
  const filePath = getDataPath()
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    }
  } catch (e) {
    console.error('Erreur lecture données:', e)
  }
  return null
}

function saveData(data) {
  const filePath = getDataPath()
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

// IPC handlers pour communiquer avec le renderer
ipcMain.handle('load-data', () => loadData())
ipcMain.handle('save-data', (_event, data) => saveData(data))
ipcMain.handle('get-data-path', () => getDataPath())

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    title: 'Kandidat',
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    backgroundColor: '#0f0f14',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  win.setMenuBarVisibility(false)

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
