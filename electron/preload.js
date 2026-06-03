const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('kandidatStore', {
  load: () => ipcRenderer.invoke('load-data'),
  save: (data) => ipcRenderer.invoke('save-data', data),
  getDataPath: () => ipcRenderer.invoke('get-data-path'),
})
