// A standby scene belongs to an existing native window. It never adds a taskbar
// entry, and its temporary fullscreen bounds must never overwrite saved layout.
function attachStandby(item,{display,role},{View,prefs,load,onWake,alwaysOnTop=true,ambient='night'}){
 const win=item.win;if(win.isDestroyed()||item.standby)return false;
 const saved={bounds:win.getNormalBounds(),fullscreen:win.isFullScreen(),top:win.isAlwaysOnTop(),minimized:win.isMinimized(),visible:win.isVisible()};
 win._lumenStandby=true;clearTimeout(item.timer);
 const view=new View({webPreferences:prefs});item.standby={view,saved};
 for(const v of [...item.views,item.overlay].filter(Boolean))v.setVisible(false);
 for(const s of item.streams||[])s?.setActive(false,'Veille');
 win.contentView.addChildView(view);view.setBounds({x:0,y:0,width:display.bounds.width,height:display.bounds.height});
 const wake=(e,input)=>{if(input.type==='keyDown'&&['Escape','F11'].includes(input.key)){e.preventDefault();onWake();}};
 const minimize=()=>{if(win._lumenStandby)onWake();};
 const close=e=>{if(win._lumenStandby){e.preventDefault();onWake();}};
 view.webContents.on('before-input-event',wake);win.on('minimize',minimize);win.prependListener('close',close);
 Object.assign(item.standby,{minimize,close});
 load(view,'widget.html',{type:'standby',role,ambient});
 if(win.isMinimized())win.restore();if(!win.isFullScreen()){win.setBounds(display.bounds);win.setFullScreen(true);}win.setAlwaysOnTop(alwaysOnTop);win.showInactive();item.arrange?.();return true;
}
function detachStandby(item){
 const s=item.standby;if(!s)return false;const win=item.win;item.standby=null;
 if(!win.isDestroyed()){
  win._lumenRestoring=true;win.removeListener('minimize',s.minimize);win.removeListener('close',s.close);
  win.contentView.removeChildView(s.view);s.view.setVisible(false);
  for(const v of [...item.views,item.overlay].filter(Boolean))v.setVisible(true);
  win._lumenStandby=false;
  const restore=()=>{if(win.isDestroyed())return;win.setBounds(s.saved.bounds);win.setAlwaysOnTop(s.saved.top);win._lumenBoundsBaseline=s.saved.bounds;item.arrange?.();if(!s.saved.visible)win.hide();else if(s.saved.minimized)win.minimize();setTimeout(()=>{if(!win.isDestroyed())win._lumenRestoring=false;},700);};
  // Windows completes fullscreen changes asynchronously. Applying bounds before
  // leave-full-screen is ignored by the native window manager.
  if(!s.saved.fullscreen&&win.isFullScreen()){win.once('leave-full-screen',()=>setImmediate(restore));win.setFullScreen(false);}else restore();
 }
 // Native input/close events must return before their renderer is destroyed.
 setImmediate(()=>{if(!s.view.webContents.isDestroyed())s.view.webContents.close({waitForBeforeUnload:false});});return true;
}
module.exports={attachStandby,detachStandby};
