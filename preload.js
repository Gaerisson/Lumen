const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('lumen',{invoke:(action,data)=>ipcRenderer.invoke('lumen',action,data),onAppearance:callback=>{ipcRenderer.on('appearance',(_,value)=>callback(value));},onSurfaceActive:callback=>{ipcRenderer.on('surface-active',(_,value)=>callback(value));}});
