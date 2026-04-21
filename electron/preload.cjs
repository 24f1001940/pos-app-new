const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('megDesktop', {
  getMeta: () => ipcRenderer.invoke('desktop:meta'),
  printInvoiceHtml: (html) => ipcRenderer.invoke('invoice:printHtml', { html }),
  cache: {
    write: (key, value) => ipcRenderer.invoke('cache:write', { key, value }),
    read: (key) => ipcRenderer.invoke('cache:read', { key }),
    remove: (key) => ipcRenderer.invoke('cache:remove', { key }),
  },
  fs: {
    readTextViaDialog: () => ipcRenderer.invoke('fs:readTextViaDialog'),
    writeTextViaDialog: (defaultName, content) =>
      ipcRenderer.invoke('fs:writeTextViaDialog', { defaultName, content }),
  },
})
