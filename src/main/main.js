const { app, BrowserWindow, WebContentsView, ipcMain, screen, globalShortcut,
  Menu, Tray, nativeImage, safeStorage, nativeTheme, session, dialog, shell, clipboard, Notification, powerMonitor, webContents } = require('electron');
const fs = require('fs'), path = require('path');
const projectRoot=path.resolve(__dirname,'../..'),testResults=path.join(projectRoot,'test-results');
const {Telemetry}=require('./telemetry.js'),{RemoteServer,RemoteClient}=require('./remote.js'),{moduleDefaults,moduleCatalog,enabled}=require('./modules.js'),{Spotify}=require('./spotify.js'),{attachStandby,detachStandby}=require('./standby-host.js');
const {RemoteDiscovery,findHosts,addresses}=require('./remote-discovery.js'),{remoteAddress}=require('../shared/remote-address.js');
const remoteDiscovery=new RemoteDiscovery();let discoveryError=null,moduleQueue=Promise.resolve();
const telemetry=new Telemetry(),remoteServer=new RemoteServer(),remoteClient=new RemoteClient();let remoteError=null,remoteRows=[],spotify,homeChangeTimer,homeChangeEvents=0,homeChangeRuns=0;
const {SurfaceScheduler}=require('./surface-scheduler.js');const surfaces=new SurfaceScheduler();
function registerScene(win,priority){surfaces.add(win,{priority,getContents:()=>[win.webContents]});}
const {WindowPlacement}=require('./window-placement.js');
const {adoptSelections,migrateSelections,pinWindow}=require('../shared/display-placement.js');
const { defaults, normalize, rectangles, visibleBounds } = require('../shared/layout.js');
const {selectedModuleEntities}=require('../shared/module-options.js');
const {newLayoutFeatures}=require('../shared/studio-history.js');
const {SensorMonitor,selectedSensors}=require('./sensor-monitor.js');const sensorMonitor=new SensorMonitor();
const {freshConfig,displayFor,presetWindow}=require('../shared/setup.js');
const {serviceUrl,testHomeConnection,FrigateCatalog}=require('./setup-services.js');
const {PortableUpdater}=require('./portable-updater.js');
const {AutoInstall}=require('./auto-install.js');
const { readQuota } = require('./quota-source.js');
const {QuotaMonitor}=require('./quota-live.js');
const quotaMonitor=new QuotaMonitor({readLocal:readQuota,onChange:()=>{dataCache={};}});
const {homeScreenConfig}=require('../shared/home-screen.js');
const {standbyState}=require('./standby-state.js');
const {HomeAssistant,alertFor,pack}=require('./home-assistant.js');
const {readActivity}=require('./activity.js');
const {Integrations,httpUrl}=require('./integrations.js');
const {AudioBriefing,localWave}=require('./audio.js');
const {HouseEngine,automationDefaults}=require('./house-engine.js');
const {Brightness}=require('./brightness.js');
const {DetectionChime}=require('./detection-chime.js'),{toneWave,toneCatalog}=require('../shared/notification-tones.js');const detectionChime=new DetectionChime();
const {OutdoorWatch}=require('./outdoor-watch.js'),{CameraFocus}=require('./camera-focus.js');const outdoorWatch=new OutdoorWatch();let outdoorFocus,outdoorPollTimer,outdoorPolling=false,outdoorPreviewUntil=0;
const {watchStream,isCamera,isCameraPage}=require('./stream-watch.js');
const {standbyRoles,standbyNight,standbyNightHours}=require('../shared/standby-policy.js');let standbyNightState=null;
const standbyWindows=new Map();let standbyActive=false,standbyHoldUntil=0,automationQueue=Promise.resolve();
const engine=new HouseEngine();let houseTimer,morningWindow,morningUntil=0,morningKey='',presenceAlert=null,mutedAlert=null;
const brightness=new Brightness(()=>config,{dry:process.argv.includes('--smoke-test')||process.argv.includes('--performance-test')||process.argv.includes('--regression-test')||process.argv.includes('--home-screen-test')||process.argv.includes('--setup-test')});
let audioBriefing;
let haClient, alertWindow, activeAlert, dismissedAlert, alertTimer;
const {RadioBulletin,radioSources}=require('./radio.js');const radioBulletin=new RadioBulletin(()=>config,(...args)=>session.defaultSession.fetch(...args));
const integrations=new Integrations(()=>config,(...args)=>session.defaultSession.fetch(...args));
const homeSmoke=process.argv.includes('--home-screen-test');
const regressionSmoke=process.argv.includes('--regression-test');
const performanceSmoke=process.argv.includes('--performance-test');
const setupSmoke=process.argv.includes('--setup-test');
const smoke = process.argv.includes('--smoke-test')||performanceSmoke||regressionSmoke||homeSmoke||setupSmoke;
const dataDir = smoke?path.join(testResults,'profiles',setupSmoke?'setup':homeSmoke?'home-screen':regressionSmoke?'regression':performanceSmoke?'performance':'smoke'):process.env.LUMEN_DATA_DIR||path.join(path.dirname(process.execPath),'data');
fs.mkdirSync(dataDir, { recursive: true });
app.setPath('userData', dataDir);
app.setPath('sessionData', dataDir);
nativeTheme.themeSource = 'dark';
app.setName('Lumen');
if (process.platform === 'win32') app.setAppUserModelId('fr.lumen.desktop');
let config, control, tray, hidden = false;
const frigateCatalog=new FrigateCatalog(()=>config);
let updater,autoInstall,updateInstallTask,updateExitPrepared=false,skipUpdateOnQuit=false;
const previewWindows=new Set(),hiddenWindows=new Set();
function trackPreview(win){previewWindows.add(win);win.once('closed',()=>previewWindows.delete(win));return win;}
function closePreviews(){for(const win of previewWindows)if(!win.isDestroyed())win.destroy();previewWindows.clear();}
function settingsOpen(){return !!control&&!control.isDestroyed()&&control.isVisible()&&!control.isMinimized();}
const windows = new Map(), trusted = new Set(), shortcuts = {}, errors = [];
const pendingDisplayWindows=new Set();
const placements=new WindowPlacement({screen,getConfig:()=>config,getWindows:()=>windows,save,onDisplaysReady:()=>{for(const id of [...pendingDisplayWindows]){const w=config.windows.find(w=>w.id===id);if(w)makeWindow(w);else pendingDisplayWindows.delete(id);}}});
const prefs = { contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: true, autoplayPolicy: 'no-user-gesture-required' };
const configPath = path.join(dataDir, 'settings.json');
function applyMaterial(win) {
  const glass = (config.theme || 'glass-aurora').startsWith('glass');
  try { win.setBackgroundMaterial(glass ? 'acrylic' : 'none'); } catch { /* Native backdrop is optional. */ }
  win.setBackgroundColor(glass ? '#00000000' : '#10171d');
}
function save() {
  fs.writeFileSync(configPath + '.tmp', JSON.stringify(config, null, 2));
  fs.renameSync(configPath + '.tmp', configPath);
}
function watch(wc) {
  if(smoke){const capture=wc.capturePage.bind(wc);wc.capturePage=async(...args)=>{let last;for(let i=0;i<3;i++){try{return await capture(args[0],{...args[1],stayAwake:true});}catch(e){last=e;await new Promise(r=>setTimeout(r,200));}}throw last;};}
  wc.setWindowOpenHandler(() => ({ action: 'deny' }));
  wc.on('render-process-gone', (_, details) => errors.push({ type: 'renderer', reason: details.reason }));
  wc.on('console-message', details => {
    if (details.level === 'error') errors.push({ type: 'console', message: details.message });
  });
}
function local(view, file, query = {}) {
  const wc = view.webContents;
  trusted.add(wc.id);
  wc.once('destroyed', () => trusted.delete(wc.id));
  wc.on('will-navigate', e => e.preventDefault());
  watch(wc);
  wc.once('did-finish-load',()=>{if(updater&&!wc.isDestroyed())wc.send('update-status',updater.snapshot());});
  return wc.loadFile(path.join(__dirname,'../renderer',file), { query });
}
function manager() {
  closePreviews();
  if(control&&!control.isDestroyed()&&control._lumenClosing)control.destroy();
  if(outdoorFocus?.win&&!outdoorFocus.win.isDestroyed()){outdoorWatch.dismiss(Date.now(),300);outdoorPreviewUntil=0;outdoorFocus.close();}
  if(standbyActive)endStandby();
  if (control && !control.isDestroyed()) { if(control.isMinimized())control.restore();control.show(); control.focus(); return; }
  control = new BrowserWindow({ width: 1180, height: 860, minWidth: 800, minHeight: 600,
    title: 'Lumen · Atelier', icon: path.join(__dirname,'../../assets/icons/icon.ico'), backgroundColor: '#10171d', backgroundMaterial:'none', transparent:false, show:false, autoHideMenuBar: true, frame:false,
    webPreferences: { ...prefs, preload: path.join(__dirname,'./preload.js') } });
  const editor=control;editor.setMenu(null);
  editor.once('ready-to-show',()=>{if(!editor.isDestroyed()&&!app.quitting){editor.showInactive();editor.show();editor.focus();}});
  local(editor, config.setupComplete===false?'onboarding.html':'index.html').catch(e=>{if(!editor.isDestroyed()&&!editor._lumenClosing)errors.push({type:'settings-load',message:e.message});});
  editor.on('close',()=>{editor._lumenClosing=true;closePreviews();});
  editor.on('closed',()=>{if(control===editor)control=null;if(!app.quitting&&!smoke)setImmediate(houseStep);});
}
function record(w, win) {return placements.remember(w,win);}
function remember() {
  for (const [id, { win }] of windows) {
    const w = config.windows.find(w => w.id === id);
    if (w) record(w, win);
  }
}
function dispose(item) {
  if (item.disposed) return;
  item.disposed = true;
  clearTimeout(item.timer);
  for(const stream of item.streams||[])stream?.stop();
  for (const view of [...item.views, item.overlay].filter(Boolean)) {
    try {
      item.win.contentView.removeChildView(view);
      if (!view.webContents.isDestroyed()) view.webContents.close({ waitForBeforeUnload: false });
    } catch { /* Owner may already have been destroyed. */ }
  }
}
function closeWindow(id) {
  pendingDisplayWindows.delete(id);
  const item = windows.get(id);
  if (!item) return;
  dispose(item);
  if (!item.win.isDestroyed()) item.win.destroy();
  windows.delete(id);
}
function makeWindow(w) {
  hidden = false;
  if (windows.has(w.id)) { const win=windows.get(w.id).win;if(win.isMinimized())win.restore();win.showInactive(); return; }
  const plan=placements.plan(w),d=plan.display;if(!d){pendingDisplayWindows.add(w.id);return;}pendingDisplayWindows.delete(w.id);
  const win = new BrowserWindow({ ...plan.bounds, minWidth: 220, minHeight: 120,
    frame: false, title: w.name, icon: path.join(__dirname,'../../assets/icons/icon.ico'), backgroundColor: '#10171d',
    alwaysOnTop: w.alwaysOnTop !== false, show: false, autoHideMenuBar: true, webPreferences: {...prefs,preload:path.join(__dirname,'./preload.js')} });
  win._lumenRestoring=true;
  win.setMenu(null);
  applyMaterial(win);
  local(win,'shell.html',{title:w.name});
  const item = { win, views: [], streams:[], overlay: null, disposed: false };
  windows.set(w.id, item);placements.register(w,item);
  for (const tile of w.tiles) {
    const v = new WebContentsView({ webPreferences: tile.type === 'web' ? prefs : {
      ...prefs, preload: path.join(__dirname,'./preload.js') } });
    win.contentView.addChildView(v);
    if (tile.type !== 'web') v.setBackgroundColor('#00000000');
    item.views.push(v);
    if (tile.type === 'web') {
      watch(v.webContents);
      item.streams.push(watchStream(v,tile,config,()=>{dataCache={};},{initiallyActive:!isCameraPage(tile)}));
      v.webContents.on('will-navigate', (e, url) => { if (!/^https?:/.test(url)) e.preventDefault(); });
      v.webContents.on('did-fail-load', (_, code, description, url, isMainFrame) => {
        if (!isMainFrame || code === -3 || v.webContents.isDestroyed()) return;
        v.webContents.loadFile(path.join(__dirname,'../renderer/unavailable.html'), {
          query: { url: tile.url, reason: description } }).catch(() => {});
      });
      if(!isCameraPage(tile))v.webContents.loadURL(tile.url).catch(() => {});
    } else {item.streams.push(null);local(v, 'widget.html', { type: tile.type,...(tile.options?{moduleOptions:JSON.stringify(tile.options)}:{}),...(tile.type==='sensors'?{sensorIds:JSON.stringify(tile.sensorIds||[]),title:tile.title||'Mes capteurs'}:{}),...(tile.type==='lounge'?{ambient:standbyNight(config,haClient?.snapshot().sun)?'night':'day'}:{}) });}
  }
  if (w.overlay) {
    item.overlay = new WebContentsView({ webPreferences: { ...prefs, preload: path.join(__dirname,'./preload.js') } });
    item.overlay.setBackgroundColor('#00000000');
    win.contentView.addChildView(item.overlay);
    local(item.overlay, 'widget.html', { type: 'overlay' });
  }
  const baseContents=()=>[win.webContents,...item.views.map(v=>v.webContents),item.overlay?.webContents].filter(wc=>wc&&trusted.has(wc.id));surfaces.add(win,{getStreams:()=>item.standby?[]:item.streams,getContents:()=>item.standby?[item.standby.view.webContents]:baseContents(),getInactiveContents:()=>item.standby?baseContents():[]});
  const arrange = () => {
    if (win.isDestroyed()) return;
    const [width, height] = win.getContentSize();
    if(item.standby){item.standby.view.setBounds({x:0,y:0,width,height});return;}
    const bar=win.isFullScreen()?0:34;
    rectangles(w, width, height-bar).forEach((b, i) => item.views[i].setBounds({...b,y:b.y+bar}));
    win.webContents.send('window-state',{fullscreen:win.isFullScreen()});
    if (item.overlay) {
      const ow = Math.min(340, width), oh = Math.min(150, height);
      item.overlay.setBounds({ x: w.overlayCorner?.endsWith('right') ? width - ow : 0,
        y: w.overlayCorner?.startsWith('bottom') ? height - oh : bar, width: ow, height: oh });
    }
  };
  item.arrange=arrange;
  const persist = () => {
    if(win._lumenStandby||win._lumenRestoring)return;
    clearTimeout(item.timer);
    item.timer = setTimeout(() => { if (!win.isDestroyed()) { record(w, win); save(); } }, 300);
  };
  for (const wc of [win.webContents, ...item.views.map(v => v.webContents), item.overlay?.webContents].filter(Boolean)) {
    wc.on('context-menu', () => popup(w, win));
    wc.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;
      if(win._lumenStandby&&['Escape','F11'].includes(input.key)){event.preventDefault();suspendStandby();return;}
      if (input.key === 'F11') { event.preventDefault();win._lumenUserPlacement=true; win.setFullScreen(!win.isFullScreen()); }
      if (input.key === 'Escape' && win.isFullScreen()) { event.preventDefault();win._lumenUserPlacement=true; win.setFullScreen(false); }
    });
  }
  win.on('resize', arrange);
  const keepOnTop=()=>{if(!win.isDestroyed()&&w.alwaysOnTop!==false&&win.isVisible()&&!win.isMinimized()&&!win.isAlwaysOnTop())win.setAlwaysOnTop(true);};
  for(const event of ['show','resize','enter-full-screen','leave-full-screen'])win.on(event,keepOnTop);
  for (const event of ['move', 'resize', 'enter-full-screen', 'leave-full-screen']) win.on(event, persist);
  win.on('close', event => { if(event.defaultPrevented||win._lumenStandby)return;record(w, win); save(); dispose(item); });
  win.on('closed', () => { dispose(item); windows.delete(w.id); });
  win.setIgnoreMouseEvents(!!w.clickThrough, { forward: true });
  win.setFullScreen(plan.fullscreen);
  setTimeout(()=>{if(!win.isDestroyed()){win._lumenBoundsBaseline=win.getNormalBounds();win._lumenRestoring=false;}},700);
  arrange();
  win.showInactive();
}
function popup(w, win) {
  Menu.buildFromTemplate([
    { label: 'Configurer dans Lumen', click: manager },
    { label: 'Plein écran (F11)', type: 'checkbox', checked: win.isFullScreen(), click: () => {win._lumenUserPlacement=true;win.setFullScreen(!win.isFullScreen());} },
    { label: 'Toujours au premier plan', type: 'checkbox', checked: win.isAlwaysOnTop(), click: item => {
      w.alwaysOnTop = item.checked; win.setAlwaysOnTop(item.checked); save(); } },
    { label: 'Laisser passer les clics', type: 'checkbox', checked: !!w.clickThrough, click: item => {
      w.clickThrough = item.checked; win.setIgnoreMouseEvents(item.checked, { forward: true }); save(); } },
    { label: 'Recharger les pages', click: () => reloadWeb(w.id) },
    { label: 'Masquer tout (Ctrl+Alt+Espace)', click: toggle },
    { label: 'Fermer cette fenêtre', click: () => win.close() }
  ]).popup({ window: win });
}
function reloadWeb(id) {
  const item = windows.get(id), w = config.windows.find(w => w.id === id);
  item?.views.forEach((v,i)=>w.tiles[i].type==='web'?item.streams[i]?.reload('Actualisation manuelle'):v.webContents.reload());
}
function toggle() {
  hidden = !hidden;
  closePreviews();
  if(hidden)outdoorFocus?.hide();
  if(hidden&&standbyActive){standbyHoldUntil=Date.now()+1800000;endStandby();}
  if(hidden){hiddenWindows.clear();for(const win of BrowserWindow.getAllWindows()){if(win.isVisible()&&!win.isMinimized()&&win!==control&&win!==outdoorFocus?.win)hiddenWindows.add(win);win.hide();}}
  else{for(const win of hiddenWindows)if(!win.isDestroyed())win.showInactive();hiddenWindows.clear();}
  if(!hidden)cameraStep();surfaces.sync();
}
async function getJson(url, headers = {}) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw Error('HTTP ' + response.status);
  return response.json();
}
async function decryptSecret(value){return value?(await safeStorage.decryptStringAsync(Buffer.from(value,'base64'))).result:'';}
function setupModules(){const task=moduleQueue.then(configureModules);moduleQueue=task.catch(()=>{});return task;}
async function configureModules(){await remoteDiscovery.stop();discoveryError=null;await remoteServer.stop();remoteClient.clear();remoteError=null;remoteRows=[];if(smoke)return;if(config.remoteServerEnabled){try{const token=await decryptSecret(config.remoteServerToken);await remoteServer.start({host:config.remoteLan?'0.0.0.0':'127.0.0.1',port:config.remotePort,token,snapshot:()=>({quota:enabled(config,'codex')?quotaMonitor.snapshot():null,activity:config.remoteShareProjects?readActivity():null,computer:enabled(config,'computer')?telemetry.snapshot():null})});if(config.remoteLan&&config.remoteDiscovery!==false){try{if(!config.remoteId){config.remoteId=require('node:crypto').randomUUID();save();}await remoteDiscovery.start({id:config.remoteId,name:require('node:os').hostname(),port:config.remotePort,version:app.getVersion()});}catch(e){discoveryError='Détection automatique indisponible : '+e.code;}}}catch(e){remoteError=e.message;}}if(!spotify)spotify=new Spotify({getConfig:()=>config,readTokens:async()=>{try{return JSON.parse(await decryptSecret(config.spotifyTokens));}catch{return null;}},saveTokens:async t=>{if(t)config.spotifyTokens=(await safeStorage.encryptStringAsync(JSON.stringify(t))).toString('base64');else delete config.spotifyTokens;save();invalidateData(true);},fetcher:(...a)=>session.defaultSession.fetch(...a)});}
async function preparePeers(input){
 if(!Array.isArray(input)||input.length>8)throw Error('Huit PC maximum');const seen=new Set(),result=[];
 for(const item of input){if(!item.url?.trim())continue;const id=String(item.id||'');if(!/^[\w-]{1,100}$/.test(id)||seen.has(id))throw Error('Identifiant de PC invalide');seen.add(id);const old=config.remotePeers?.find(p=>p.id===id),key=String(item.newToken||'').trim();if(key&&(key.length<32||key.length>256||/\s/.test(key)))throw Error('Copie la clé complète du PC distant');result.push({id,name:String(item.name||'PC distant').slice(0,80),url:remoteAddress(item.url),token:key?(await safeStorage.encryptStringAsync(key)).toString('base64'):old?.token});}return result;
}
async function remoteSnapshot(){if(!config.remotePeers?.length)return[];return Promise.all(config.remotePeers.map(async p=>{try{return await remoteClient.read(p,await decryptSecret(p.token));}catch{return{id:p.id,name:p.name,connected:false,error:'Clé distante indisponible'};}}));}
let dataCache={},pendingData,dataRevision=0;
function invalidateData(revision=false){dataCache={};if(revision){dataRevision++;pendingData=null;}}
function homeData(){if(!haClient)return{connected:false,error:'Connexion HA non configurée',entities:{}};const home=haClient.snapshot(),extra=selectedModuleEntities(config.windows,'nas').map(id=>pack(haClient.states.get(id))).filter(Boolean);return{...home,proxmox:haClient.proxmox(selectedModuleEntities(config.windows,'proxmox')),nas:[...new Map([...(home.nas||[]),...extra].map(e=>[e.id,e])).values()]};}
async function data(){
  if(dataCache.until>Date.now())return {...dataCache.value,home:homeData()};
  if(pendingData)return pendingData;
  const revision=dataRevision,request=(async()=>{const [weather,news,frigate,peers,music]=await Promise.all([enabled(config,'weather')?integrations.weather():null,enabled(config,'news')?integrations.news():null,enabled(config,'cameras')?integrations.frigate():null,remoteSnapshot(),enabled(config,'music')&&spotify?spotify.refresh():null]);remoteRows=peers;const remote=config.codexSource&&config.codexSource!=='local'?peers.find(p=>p.id===config.codexSource):null,localCodex=!config.codexSource||config.codexSource==='local';if(revision!==dataRevision)return data();
    const value={sensors:enabled(config,'sensors')?sensorMonitor.snapshot(haClient?.states,selectedSensors(config.windows),!!haClient?.connected):[],computers:enabled(config,'computer')?[{id:'local',connected:true,...telemetry.snapshot()},...peers.map(p=>p.connected?{...p.computer,id:p.id,name:p.name,connected:true}:p)]:[],spotify:music,moduleStatus:{remoteServer:!!remoteServer.server,remoteError},quota:enabled(config,'codex')?(localCodex?quotaMonitor.snapshot():remote?.connected?remote.quota:null):null,activity:!enabled(config,'codex')||config.activityEnabled===false?{projects:[],error:'Affichage désactivé dans les options'}:localCodex?readActivity():remote?.connected?remote.activity:{projects:[],error:'PC Codex distant indisponible'},weather,news,frigate,home:homeData(),city:config.city,night:config.night,theme:config.theme||'glass-aurora',options:{modules:{...config.modules,...Object.fromEntries([['weather','weather'],['alarm','home'],['energy','home'],['sleep','sleep'],['nas','nas'],['news','news'],['proxmox','proxmox']].filter(([,feature])=>!enabled(config,feature)).map(([id])=>[id,false]))},moduleOrder:config.moduleOrder||['weather','alarm','sleep','energy','nas','news'],nasThreshold:config.nasThreshold||85,animationsEnabled:config.animationsEnabled!==false,showCommands:config.showCommands!==false,audioProvider:config.audioProvider||'off',...publicOptions()},cameraWatch:{enabled:config.outdoorEnabled!==false,cameras:(config.outdoorCameras||[]).length,connected:!!haClient?.connected,active:outdoorWatch.snapshot().length},phoneConfigured:!!config.phoneService,alert:activeAlert?{...activeAlert,muted:mutedAlert===activeAlert.key}:null,runtime:engine.snapshot(),streams:[...windows.entries()].flatMap(([id,item])=>(item.streams||[]).flatMap((s,index)=>s?[{windowId:id,index,...s.state}]:[])),audio:audioBriefing?.status(),standby:standbyStatus(),brightness:brightness.snapshot(),morning:{until:morningUntil,key:morningKey},observedAt:new Date().toISOString()};
    if(config.showCommands===false)value.activity={...value.activity,projects:(value.activity.projects||[]).map(p=>({...p,commands:[]}))};dataCache={until:Date.now()+4000,value};return value;})();
  pendingData=request;try{return await request;}finally{if(pendingData===request)pendingData=null;}
}
async function startHome(){
  outdoorWatch.reset();outdoorFocus?.close();outdoorPreviewUntil=0;endStandby();haClient?.stop();haClient=null;clearTimeout(homeChangeTimer);homeChangeTimer=null;engine.reset();dataCache={};
  if(!enabled(config,'home')||!config.haToken||!config.haUrl)return;
  try{const token=(await safeStorage.decryptStringAsync(Buffer.from(config.haToken,'base64'))).result;
    haClient=new HomeAssistant({url:config.haUrl,token,mapping:{...config.entities,...(config.musicEntity?{music:config.musicEntity}:{}),alarm:config.haAlarm||config.entities?.alarm}});
    haClient.on('change',()=>{homeChangeEvents++;dataCache={};if(!homeChangeTimer)homeChangeTimer=setTimeout(()=>{homeChangeTimer=null;homeChangeRuns++;cameraStep();evaluateAlerts();},500);});
    await haClient.start();
  }catch(e){errors.push({type:'ha',message:'Impossible d’ouvrir la connexion Home Assistant'});}
}
function evaluateAlerts(){
  if(smoke||!config.alertsEnabled)return;
  const snapshot=haClient?.snapshot();let next=alertFor(snapshot);
  if(!next&&presenceAlert&&Date.now()-Date.parse(presenceAlert.startedAt)<(config.presenceHoldSeconds||45)*1000)next=presenceAlert;
  if(!next&&activeAlert?.kind==='wake'&&snapshot?.connected&&snapshot.entities.sleepEvent?.eventType==='alert_start'&&activeAlert.key==='wake:'+snapshot.entities.sleepEvent.state)next=activeAlert;
  if(!next){activeAlert=null;if(alertWindow&&!alertWindow.isDestroyed())alertWindow.close();return;}
  if(dismissedAlert===next.key)return;
  if(activeAlert?.key===next.key)return;
  endStandby(false);if(morningWindow&&!morningWindow.isDestroyed())morningWindow.close();
  if(next.kind==='intrusion')brightness.transition('wake').catch(()=>{});
  activeAlert={...next,startedAt:next.startedAt||(next.kind==='wake'?snapshot.entities.sleepEvent.state:new Date().toISOString())};dataCache={};
  if(alertWindow&&!alertWindow.isDestroyed())alertWindow.close();
  const monitor=displayFor(screen.getAllDisplays(),config,next.kind==='wake'?'wake':'intrusion',cameraDisplay());
  alertWindow=new BrowserWindow({...monitor.bounds,frame:false,fullscreen:true,alwaysOnTop:true,show:false,backgroundColor:'#0c141b',webPreferences:{...prefs,preload:path.join(__dirname,'./preload.js')}});
  registerScene(alertWindow,100);local(alertWindow,'widget.html',{type:'alert'});if(!hidden){alertWindow.showInactive();alertWindow.moveTop();if(next.kind!=='intrusion'&&outdoorFocus?.win?.isVisible())outdoorFocus.win.moveTop();}
}

function publicOptions(){const keys=['alarmTone','wakeTone','detectionTone','alarmSound','wakeSound','alarmVoice','wakeVoice','alarmVolume','wakeVolume','alarmVoiceVolume','wakeVoiceVolume','escalateSeconds','morningAutoTts','morningRadioEnabled','animatedBackground','accentColor','glassOpacity','cornerRadius','presenceSeconds','presenceArmedOnly','wakeVoiceDelaySeconds','standbyMode','streamRefreshMinutes','videoFit','standbyAppearance','standbyNightStart','standbyNightEnd','standbyPauseMinutes','networkEnabled','standbyShowNetwork','standbyShowHome','standbyShowWeather','standbyShowNews','features','economyMode','appearanceMode'];return Object.fromEntries(keys.map(k=>[k,config[k]]));}
function showMorning(key,silent=false){
  if((!config.morningEnabled&&!silent)||activeAlert?.kind==='intrusion')return;
  if(morningWindow&&!morningWindow.isDestroyed())morningWindow.close();
  morningKey=key;morningUntil=Date.now()+Math.max(1,Number(config.morningMinutes)||8)*60000;dataCache={};
  const d=displayFor(screen.getAllDisplays(),config,'morning',cameraDisplay());endStandby(silent);if(!silent)brightness.transition('wake').catch(()=>{});
  morningWindow=new BrowserWindow({...d.bounds,frame:false,fullscreen:true,alwaysOnTop:true,show:false,backgroundColor:'#0c141b',webPreferences:{...prefs,preload:path.join(__dirname,'./preload.js')}});
  if(silent)trackPreview(morningWindow);registerScene(morningWindow,60);local(morningWindow,'widget.html',{type:'briefing',silent:silent?'1':'0'});if(!hidden){morningWindow.showInactive();if(outdoorFocus?.win?.isVisible())outdoorFocus.win.moveTop();}
  const shown=morningWindow;shown.on('closed',()=>{if(morningWindow===shown){morningUntil=0;morningWindow=null;dataCache={};}});
}
function houseStep(homeOverride,now=Date.now()){
  cameraStep();
  const home=homeOverride||haClient?.snapshot();
  for(const a of engine.step(home,config,now)){
    if(a.type==='brightness')automationQueue=automationQueue.then(()=>brightness.transition(a.mode)).catch(()=>{});
    if(a.type==='standby')automationQueue=automationQueue.then(()=>a.active?startStandby():endStandby()).catch(()=>{});
    if(a.type==='morning'){
      if(alertWindow&&!alertWindow.isDestroyed())alertWindow.close();activeAlert=null;showMorning(a.key);
    }
    if(a.type==='presence'&&config.alertsEnabled){presenceAlert={...a,kind:'presence'};}
  }
  evaluateAlerts();
  if(engine.idle&&!standbyActive&&Date.now()>standbyHoldUntil)startStandby();
  if(standbyActive&&config.standbyMode!=='mascot'&&config.brightnessEnabled){const night=engine.quiet||standbyNight(config,home?.sun);if(night!==standbyNightState){standbyNightState=night;brightness.apply(brightness.selected().map(d=>({id:d.id,from:d.brightness,target:night?config.standbyBrightness:config.standbyDayBrightness})),config.brightnessTransition,'standby').catch(()=>{});}}
  if(morningUntil&&Date.now()>morningUntil&&morningWindow&&!morningWindow.isDestroyed())morningWindow.close();
}
function outdoorDisplay(){return screen.getAllDisplays().find(d=>String(d.id)===String(config.outdoorDisplayId))||cameraDisplay();}
function initOutdoor(){outdoorFocus=new CameraFocus({getConfig:()=>config,getDisplay:outdoorDisplay,local,prefs,watch,onUpdate:()=>surfaces.sync(),onWindow:win=>surfaces.add(win,{priority:80,getStreams:()=>[...outdoorFocus.views.values()].map(i=>i.stream),getContents:()=>[win.webContents]}),onDismiss:()=>{outdoorWatch.dismiss(Date.now(),(config.outdoorSnoozeMinutes||5)*60);outdoorPreviewUntil=0;outdoorFocus.close();dataCache={};}});}
function cameraStep(homeOverride){if(!enabled(config,'cameras')){outdoorFocus?.close();return;}if(smoke&&!homeOverride||!outdoorFocus)return;const home=homeOverride||haClient?.snapshot(),events=outdoorWatch.step(home,config);if(config.outdoorEnabled===false){outdoorFocus.close();return;}detectionChime.consider(events,config,{hidden,alert:!!activeAlert||home?.entities.alarm?.state==='triggered',night:standbyNightHours(config)});if(hidden||home?.entities.alarm?.state==='triggered'){outdoorFocus.hide();return;}if(events.length){outdoorFocus.show(events);outdoorFocus.data.signal=detectionChime.signal;outdoorFocus.data.soundEnabled=config.detectionSoundEnabled!==false;outdoorFocus.data.soundMuted=Date.now()<detectionChime.mutedUntil;}else if(Date.now()>outdoorPreviewUntil)outdoorFocus.close();}
async function pollOutdoor(){if(smoke||!enabled(config,'cameras')||!config.outdoorEnabled||!config.frigateUrl||outdoorPolling)return;outdoorPolling=true;try{const u=new URL('/api/events?limit=20&label=person&after='+Math.floor(Date.now()/1000-20),config.frigateUrl),r=await session.defaultSession.fetch(u.href,{signal:AbortSignal.timeout(5000)});if(r.ok){const events=await r.json();if(Array.isArray(events)){outdoorWatch.ingest(events,config);cameraStep();}}}catch{}finally{outdoorPolling=false;}}
function cameraDisplay(){const all=screen.getAllDisplays(),id=config.preferCameraDisplay!==false?config.windows.find(w=>w.id==='camera')?.displayId:config.alertDisplayId;return all.find(d=>String(d.id)===String(id))||[...all].sort((a,b)=>a.bounds.y-b.bounds.y)[0]||screen.getPrimaryDisplay();}
function endStandby(restore=true){const existed=standbyActive;standbyActive=false;for(const win of standbyWindows.values()){const item=[...windows.values()].find(i=>i.win===win);if(item?.standby){detachStandby(item);continue;}if(!win.isDestroyed()){win._lumenClosing=true;win.hide();setImmediate(()=>{if(!win.isDestroyed())win.destroy();});}}standbyWindows.clear();surfaces.sync();dataCache={};if(existed&&restore)brightness.restore().catch(()=>{});}
function suspendStandby(){standbyHoldUntil=Date.now()+Math.max(5,Number(config.standbyPauseMinutes)||30)*60000;endStandby();dataCache={};}
function standbyStatus(){return standbyState({config,home:haClient?.snapshot(),engine,active:standbyActive,hidden,holdUntil:standbyHoldUntil,settings:settingsOpen(),alert:!!activeAlert,focus:!!outdoorFocus?.win&&!outdoorFocus.win.isDestroyed()&&outdoorFocus.win.isVisible(),morning:!!morningWindow&&!morningWindow.isDestroyed()&&morningUntil>Date.now()});}
function resumeStandby(){standbyHoldUntil=0;closePreviews();if(control&&!control.isDestroyed())control.close();if(!smoke)houseStep();dataCache={};}
function createStandby({display,role},preview=false){const win=new BrowserWindow({...display.bounds,frame:false,fullscreen:true,alwaysOnTop:config.standbyAlwaysOnTop!==false,show:false,minimizable:true,skipTaskbar:false,title:'Lumen · '+(role==='home'?'Maison en veille':'Codex en veille'),backgroundColor:'#05070b',webPreferences:{...prefs,preload:path.join(__dirname,'./preload.js')}});const key=String(display.id);if(preview)trackPreview(win);else standbyWindows.set(key,win);registerScene(win,20);local(win,'widget.html',{type:'standby',role,ambient:engine.quiet||standbyNight(config,haClient?.snapshot().sun)?'night':'day',...(preview?{preview:'1'}:{})});win.webContents.on('before-input-event',(event,input)=>{if(input.type==='keyDown'&&['Escape','F11'].includes(input.key)){event.preventDefault();if(preview)win.close();else suspendStandby();}});win.on('minimize',()=>{if(!preview&&!win._lumenClosing)suspendStandby();});win.on('close',event=>{if(!preview&&!win._lumenClosing){event.preventDefault();suspendStandby();}});win.showInactive();return win;}
function startStandby(){if(smoke&&!regressionSmoke||!engine.idle||settingsOpen()||hidden||Date.now()<standbyHoldUntil||activeAlert||standbyActive||outdoorFocus?.win&&!outdoorFocus.win.isDestroyed()||morningWindow&&!morningWindow.isDestroyed()&&morningUntil>Date.now())return;standbyActive=true;standbyNightState=engine.quiet||standbyNight(config,haClient?.snapshot().sun);if(config.standbyMode!=='mascot')brightness.dim(standbyNightState?config.standbyBrightness:config.standbyDayBrightness).catch(()=>{});if(config.standbyMode==='dim')return;for(const target of standbyRoles(screen.getAllDisplays(),cameraDisplay(),config)){const item=[...windows.values()].find(i=>!i.win.isDestroyed()&&!i.standby&&String(screen.getDisplayMatching(i.win.getBounds()).id)===String(target.display.id));if(item&&attachStandby(item,target,{View:WebContentsView,prefs:{...prefs,preload:path.join(__dirname,'./preload.js')},load:local,onWake:suspendStandby,alwaysOnTop:config.standbyAlwaysOnTop!==false,ambient:standbyNightState?'night':'day'}))standbyWindows.set(String(target.display.id),item.win);else createStandby(target);}surfaces.sync();dataCache={};}
function ownerOf(sender){const native=BrowserWindow.fromWebContents(sender);if(native)return native;if(control?.webContents.id===sender.id)return control;if(alertWindow&&!alertWindow.isDestroyed()&&alertWindow.webContents.id===sender.id)return alertWindow;for(const item of windows.values())if(item.win.webContents.id===sender.id||[...item.views,item.overlay,item.standby?.view].filter(Boolean).some(v=>v.webContents?.id===sender.id))return item.win;return null;}
async function controlHome(sender,payload){
  if(!haClient?.connected)throw Error('Home Assistant est hors ligne');
  const allowed={arm_home:'Armer la maison en mode présence',arm_away:'Armer la maison en mode absence',arm_night:'Armer la maison pour la nuit',disarm:'Désarmer l’alarme de la maison',snooze:'Reporter le réveil du téléphone',dismiss:'Arrêter le réveil du téléphone',notify:'Envoyer une notification d’alarme sur ton téléphone'};
  if(!allowed[payload?.action])throw Error('Commande non autorisée');
  if(payload.action.startsWith('arm_')){const flags={arm_home:1,arm_away:2,arm_night:4};const alarm=haClient.snapshot().entities.alarm;if(!(Number(alarm?.features)&flags[payload.action]))throw Error('Ce mode d’armement n’est pas proposé par ton alarme.');}
  const answer=await dialog.showMessageBox(ownerOf(sender)||control,{type:'question',title:'Lumen · Confirmer',message:allowed[payload.action]+' ?',detail:payload.action==='disarm'?'Cette action modifie la protection de ta maison. Le code éventuel est envoyé uniquement à Home Assistant.':'La commande sera envoyée à Home Assistant. Le nouvel état sera affiché après confirmation du serveur.',buttons:['Confirmer','Annuler'],defaultId:1,cancelId:1,noLink:true});
  if(answer.response!==0)return{cancelled:true};
  if(['snooze','dismiss','notify'].includes(payload.action)){
    if(!/^mobile_app_[a-z0-9_]+$/.test(config.phoneService||''))throw Error('Téléphone Companion non configuré');
    const body=payload.action==='notify'?{title:'Lumen · Alarme maison',message:'Vérifie l’état de ton alarme et les caméras dans Home Assistant.'}:{message:'command_broadcast_intent',data:{intent_package_name:'com.urbandroid.sleep',intent_action:'com.urbandroid.sleep.alarmclock.'+(payload.action==='snooze'?'ALARM_SNOOZE':'ALARM_DISMISS')}};
    await haClient.service('notify',config.phoneService,body);
  }else{
    const entity=config.haAlarm||haClient.mapping.alarm;if(!/^alarm_control_panel\.[a-z0-9_]+$/.test(entity||''))throw Error('Entité alarme invalide');
    const body={entity_id:entity};if(payload.code)body.code=String(payload.code).slice(0,40);
    await haClient.service('alarm_control_panel',payload.action==='disarm'?'alarm_disarm':'alarm_'+payload.action,body);
  }
  await haClient.refresh();dataCache={};return{sent:true};
}
async function morningRadio(owner,override){const c={...config,...override};if(c.morningRadioSource==='local'){const preview=await audioBriefing.preview(owner,'news','local'),clip=await audioBriefing.generate(owner,preview.id);return{...clip,source:'Flash local · titres RSS',title:'Les titres du jour',volume:Math.max(0,Math.min(1,Number(c.morningRadioVolume??40)/100)),rate:c.morningRadioRate||1.15,limitSeconds:(c.morningRadioMinutes||8)*60};}return override?new RadioBulletin(()=>c,(...a)=>session.defaultSession.fetch(...a)).latest():radioBulletin.latest();}
async function action(event, name, payload) {
  if (!trusted.has(event.sender.id) || event.senderFrame !== event.sender.mainFrame) throw Error('Accès refusé');
  if(name==='data')return data();
  if(name==='powerData')return haClient?.powerSnapshot()||null;
  if(name==='musicControl'){if(!enabled(config,'music')||!spotify)throw Error('Active Spotify dans les modules');await spotify.control(typeof payload==='string'?payload:payload.action,payload?.value);invalidateData(true);return spotify.snapshot();}
  if(name==='soundPreview'){if(!toneCatalog.some(t=>t.id===payload?.tone))throw Error('Son inconnu');return{url:'data:audio/wav;base64,'+toneWave(payload.tone).toString('base64'),volume:smoke?0:Math.max(0,Math.min(1,Number(payload.volume??25)/100))};}
  if(name==='muteDetectionSound'){detectionChime.toggleMute();return true;}
  if(name==='detectionSound'){const s=detectionChime.signal;if(smoke||hidden||config.detectionSoundEnabled===false||!outdoorFocus?.win?.isVisible()||!s||s.id!==payload||Date.now()-s.created>8000||Date.now()<detectionChime.mutedUntil||event.sender.id!==outdoorFocus?.win?.webContents.id||activeAlert)return null;return{url:'data:audio/wav;base64,'+toneWave(s.tone).toString('base64'),volume:s.volume};}
  if(name==='outdoorSnapshots'){if(config.outdoorShowSnapshots===false)return{events:[]};const result=await integrations.frigate({live:true});return{events:(result?.events||[]).filter(e=>e.label==='person'&&e.snapshot&&config.outdoorCameras.includes(e.camera)).slice(0,6),error:result?.error};}
  if(name==='openOutdoorSnapshot'){if(!outdoorFocus?.win||event.sender.id!==outdoorFocus.win.webContents.id)throw Error('Vue caméra requise');const owner=outdoorFocus.win,result=await integrations.frigate({live:true}),e=result?.events?.find(e=>e.id===payload&&e.label==='person'&&e.snapshot&&config.outdoorCameras.includes(e.camera));if(!e)throw Error('Instantané indisponible');const src=await integrations.thumbnail(e.id);if(outdoorFocus.win===owner&&!owner.isDestroyed())outdoorFocus.showSnapshot(src,e);return true;}
  if(name==='cameraSnapshot'){if(event.sender.id!==outdoorFocus?.photoWindow?.webContents.id)throw Error('Accès refusé');return outdoorFocus.photo;}
  if(name==='radioBulletin'){if(payload?.automatic&&(smoke||!morningWindow||morningWindow.isDestroyed()||event.sender.id!==morningWindow.webContents.id||!config.morningRadioEnabled||hidden))return null;return morningRadio(event.sender.id);}
  if(name==='cameraFocusStatus')return outdoorFocus?.data||{events:[],until:0};
  if(name==='dismissCameraFocus'){outdoorWatch.dismiss(Date.now(),(config.outdoorSnoozeMinutes||5)*60);outdoorPreviewUntil=0;outdoorFocus?.close();return true;}
  if(name==='refreshQuota'){await quotaMonitor.refresh(true);dataCache={};return quotaMonitor.snapshot();}
  if(name==='standbyStatus')return standbyStatus();
  if(name==='resumeStandby'){resumeStandby();return true;}
  if(name==='wakeStandby'){suspendStandby();return true;}
  if(name==='refreshStream'){const stream=windows.get(payload?.windowId)?.streams?.[Number(payload?.index)];return stream?.reload('Actualisation manuelle')||false;}
  if(name==='copyCommand'||name==='copyText'){if(typeof payload!=='string'||payload.length>20000)throw Error('Texte à copier invalide');try{clipboard.writeText(payload);}catch{throw Error('Le presse-papiers Windows est indisponible. Réessaie dans un instant.');}return true;}
  if(name==='muteAlert'){mutedAlert=activeAlert?.key;dataCache={};return true;}
  if(name==='closeMorning'){if(morningWindow&&!morningWindow.isDestroyed())morningWindow.close();morningUntil=0;return true;}
  if(name==='showMorning'){showMorning('manual:'+Date.now(),true);return true;}
  if(name==='autoBriefing'){
    if(smoke||!morningWindow||morningWindow.isDestroyed()||event.sender.id!==morningWindow.webContents.id||!config.morningAutoTts)return null;
    const p=await audioBriefing.preview(event.sender.id,config.morningRadioEnabled?'morning':'briefing');return audioBriefing.generate(event.sender.id,p.id);
  }
  if(name==='alarmSpeech'){
    if(smoke||!activeAlert||event.sender.id!==alertWindow?.webContents.id||payload!==activeAlert.key)return null;
    const wake=activeAlert.kind==='wake';if(!(wake?config.wakeVoice:config.alarmVoice))return null;if(wake&&Date.now()-Date.parse(activeAlert.startedAt)<config.wakeVoiceDelaySeconds*1000)return null;
    const kind=activeAlert.kind,text=kind==='intrusion'?'Attention. L’alarme de la maison est déclenchée. Vérifie les caméras.':kind==='presence'?'Attention. Une présence prolongée a été détectée. Vérifie les caméras.':'Bonjour. C’est l’heure de se réveiller.';
    const file=path.join(dataDir,'audio','alert-'+kind+'.wav');fs.mkdirSync(path.dirname(file),{recursive:true});if(!fs.existsSync(file))await localWave(text,file,100);
    return {url:'data:audio/wav;base64,'+fs.readFileSync(file).toString('base64'),volume:(wake?config.wakeVoiceVolume:config.alarmVoiceVolume)/100};
  }
  if(name==='audioPreview')return audioBriefing.preview(event.sender.id,payload);
  if(name==='audioGenerate')return audioBriefing.generate(event.sender.id,payload);
  if(name==='openFrigate'){if(!config.frigateUrl)throw Error('Frigate non configuré');await shell.openExternal(new URL('/review',config.frigateUrl).href);return true;}
  if(name==='showFrigate'){if(alertWindow&&!alertWindow.isDestroyed())alertWindow.hide();const w=config.windows.find(w=>w.id==='frigate');if(w)makeWindow(w);else makeWindow({id:'frigate-popup',name:'Frigate',columns:1,rows:1,bounds:{width:800,height:700},tiles:[{type:'frigate',col:1,row:1,colSpan:1,rowSpan:1}],alwaysOnTop:true});return true;}
  if(name==='thumbnail')return integrations.thumbnail(payload);
  if(name==='homeControl')return controlHome(event.sender,payload);
  if(name==='dismissAlert'){const wake=activeAlert?.kind==='wake';dismissedAlert=activeAlert?.key;activeAlert=null;dataCache={};if(alertWindow&&!alertWindow.isDestroyed())alertWindow.close();if(wake)showMorning('manual-wake:'+Date.now());return true;}
  if(name==='window'){const win=ownerOf(event.sender);if(!win)return false;if([...standbyWindows.values()].includes(win)&&['close','minimize'].includes(payload)){suspendStandby();return true;}if(payload==='close')win.close();if(payload==='minimize')win.minimize();if(payload==='fullscreen'){win._lumenUserPlacement=true;win.setFullScreen(!win.isFullScreen());}if(payload==='settings')manager();return true;}
  if(name==='external'){const url=httpUrl(payload);await shell.openExternal(url.href);return true;}
  if(name==='updateStatus')return updateSnapshot();
  if(name==='updateDefer'){autoInstall.defer();return updateSnapshot();}
  if(name==='updateWake'){updater.wake();return true;}
  if(name==='showUpdates'){showUpdates();return true;}
  if (!control || control.isDestroyed() || event.sender.id !== control.webContents.id) throw Error('Action réservée à l’atelier');
  if(name==='setupGuide'){await local(control,'onboarding.html');return true;}
  if(name==='saveLayout'){
    remember();const next=normalize({...config,windows:structuredClone(payload?.windows)}),original=config.windows;
    adoptSelections(next,config,screen.getAllDisplays(),screen.getPrimaryDisplay());
    const additions=newLayoutFeatures(next.windows,original);next.features={...config.features};for(const id of additions)if(moduleCatalog.some(m=>m.id===id))next.features[id]=true;
    next.windows=next.windows.map(w=>{const old=original.find(x=>x.id===w.id);if(old&&String(w.displayId)===String(old.displayId))w.bounds=old.bounds;return old&&JSON.stringify(w)===JSON.stringify(old)?old:w;});
    for(const old of original)if(next.windows.find(w=>w.id===old.id)!==old)closeWindow(old.id);
    const startHa=!enabled(config,'home')&&enabled(next,'home');config=next;config.restoreOnLaunch=config.windows.length>0;invalidateData(true);save();if(startHa)await startHome();config.windows.forEach(makeWindow);return true;
  }
  if(name==='frigateCameras')return config.frigateUrl?frigateCatalog.read():[];
  if(name==='updateCheck')return updater.checkForUpdates();
  if(name==='updateDownload')return updater.download();
  if(name==='updateInstall'){if(!updater.canInstall())throw Error('Aucune mise à jour prête');return requestUpdateInstall();}
  if(name==='updateOptions'){const wasEnabled=config.autoUpdateEnabled!==false;config.autoUpdateEnabled=payload?.enabled!==false;config.autoUpdateInstallOnQuit=payload?.installOnQuit!==false;config.autoUpdateInstall=payload?.installAutomatically===true;config.autoUpdateNotify=payload?.notify!==false;save();if(wasEnabled!==(config.autoUpdateEnabled!==false))updater.preferencesChanged();autoInstall.changed();publishUpdate(updater.snapshot());return updateSnapshot();}
  if(name==='setupConnect'){
    if(payload?.service==='home'){
      const url=serviceUrl(payload.url),token=payload.token|| (config.haToken?(await safeStorage.decryptStringAsync(Buffer.from(config.haToken,'base64'))).result:'');
      if(!token)throw Error('Renseigne un jeton longue durée Home Assistant.');
      const result=await testHomeConnection(url,token);
      if(payload.token){if(!(await safeStorage.isAsyncEncryptionAvailable()))throw Error('Chiffrement Windows indisponible');config.haToken=(await safeStorage.encryptStringAsync(token)).toString('base64');}
      config.haUrl=url;config.features.home=true;save();await startHome();for(let i=0;i<20&&haClient&&!haClient.registry.size;i++)await new Promise(r=>setTimeout(r,100));return{...result,catalog:haClient?.catalog()||result.catalog};
    }
    if(payload?.service==='frigate'){
      const url=serviceUrl(payload.url),cameras=await frigateCatalog.read(url),stream=new URL(url);stream.port='1984';stream.pathname='/';stream.search='';stream.hash='';
      const streamUrl=serviceUrl(payload.streamUrl||stream.href);config.frigateUrl=url;config.go2rtcUrl=streamUrl;config.features.cameras=true;save();return{url,streamUrl,cameras};
    }
    throw Error('Service inconnu');
  }
  if(name==='finishSetup'){
    const all=screen.getAllDisplays(),next=structuredClone(config);next.entities={...next.entities,...payload.entities};next.haAlarm=next.entities.alarm||'';
    for(const k of ['intrusionDisplayId','wakeDisplayId','morningDisplayId','outdoorDisplayId'])next[k]=all.find(d=>String(d.id)===String(payload.displays?.[k]))?.id||screen.getPrimaryDisplay().id;
    next.features={...next.features,...payload.features};if(next.entities.networkGateway||next.entities.networkLatency)next.features.network=true;
    next.alertsEnabled=!!payload.alertsEnabled;next.outdoorEnabled=!!payload.outdoorEnabled;next.outdoorCameras=(payload.outdoorCameras||[]).filter(id=>/^[\w-]{1,100}$/.test(id));
    next.autoUpdateEnabled=payload.autoUpdateEnabled!==false;next.autoUpdateInstallOnQuit=payload.autoUpdateInstallOnQuit!==false;
    if(payload.location){const p=payload.location;if(!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude)||Math.abs(p.latitude)>90||Math.abs(p.longitude)>180)throw Error('Ville invalide');Object.assign(next,{city:String(p.name).slice(0,100),latitude:p.latitude,longitude:p.longitude});}
    if(payload.preset!=='keep'){
      if(!['calm','codex','home','empty'].includes(payload.preset))throw Error('Disposition inconnue');
      const display=all.find(d=>String(d.id)===String(payload.displayId))||screen.getPrimaryDisplay();const w=presetWindow(display,payload.preset);w.id+='-'+Date.now();next.windows.push(w);
    }
    next.setupComplete=true;next.tutorialCompleted=true;next.restoreOnLaunch=next.windows.length>0;
    normalize(next);adoptSelections(next,config,screen.getAllDisplays(),screen.getPrimaryDisplay());config=next;save();await setupModules();await startHome();await local(control,'index.html');config.windows.forEach(makeWindow);return true;
  }
  if(name==='spotifyStatus')return spotify?.refresh()||{connected:false};
  if(name==='spotifyConnect'){const result=await spotify.begin();await shell.openExternal(result.url);return{redirectUri:result.redirectUri};}
  if(name==='spotifyDisconnect'){await spotify.disconnect();return true;}
  if(name==='moduleInfo')return{catalog:moduleCatalog,remoteError,server:!!remoteServer.server,discovery:!!remoteDiscovery.socket,discoveryError,addresses:addresses().map(n=>'http://'+n.address+':'+config.remotePort),peers:remoteRows.map(p=>({id:p.id,connected:p.connected,error:p.error,elapsed:p.elapsed})),version:app.getVersion()};
  if(name==='remoteFind')return findHosts({excludeId:config.remoteId});
  if(name==='remoteTest'){const old=config.remotePeers?.find(p=>p.id===payload?.id),token=payload?.newToken?.trim()||await decryptSecret(old?.token);const result=await remoteClient.read({id:payload?.id||'test',name:String(payload?.name||'PC distant').slice(0,80),url:payload?.url||old?.url},token,{fresh:true});return{connected:result.connected,error:result.error,elapsed:result.elapsed,hasQuota:!!result.quota,hasComputer:!!result.computer,observedAt:result.observedAt};}
  if(name==='remoteSave'){const peers=await preparePeers(payload?.remotePeers);const port=Number(payload?.remotePort);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Port : de 1024 à 65535');if(payload.remoteServerEnabled&&!config.remoteServerToken)config.remoteServerToken=(await safeStorage.encryptStringAsync(require('node:crypto').randomBytes(32).toString('base64url'))).toString('base64');Object.assign(config,{remotePeers:peers,remotePort:port,remoteServerEnabled:payload.remoteServerEnabled===true,remoteLan:payload.remoteLan===true,remoteDiscovery:payload.remoteDiscovery!==false,remoteShareProjects:payload.remoteShareProjects===true,codexSource:peers.some(p=>p.id===payload.codexSource)?payload.codexSource:'local'});save();invalidateData(true);await setupModules();remoteRows=await remoteSnapshot();invalidateData(true);return{server:!!remoteServer.server,error:remoteError};}
  if(name==='remotePair'||name==='remoteCopyKey'){let token=await decryptSecret(config.remoteServerToken);if(!token||payload?.rotate){token=require('node:crypto').randomBytes(32).toString('base64url');config.remoteServerToken=(await safeStorage.encryptStringAsync(token)).toString('base64');save();await setupModules();}if(name==='remoteCopyKey'){try{clipboard.writeText(token);}catch{throw Error('Le presse-papiers Windows est indisponible. Réessaie dans un instant.');}return{copied:true,port:config.remotePort};}return{token,port:config.remotePort};}
  if(name==='applyHomeScreen'){const d=cameraDisplay();config=homeScreenConfig(config,d.id);pinWindow(config.windows.find(w=>w.id==='camera'),d);save();closeWindow('camera');makeWindow(config.windows.find(w=>w.id==='camera'));invalidateData(true);return true;}
  if (name === 'theme') {
    if (!['jade','midnight','amber','glass-aurora','glass-smoke','glass-ocean','glass-rose','noir'].includes(payload)) throw Error('Thème inconnu');
    config.theme = payload; dataCache = {}; save();
    control.setBackgroundMaterial('none');control.setBackgroundColor('#10171d');
    for (const item of windows.values()) {
      applyMaterial(item.win);
      for (const v of [...item.views, item.overlay].filter(Boolean)) {
        if (trusted.has(v.webContents.id)) v.webContents.send('appearance', { theme: config.theme, night: config.night });
      }
    }
    return true;
  }
  if(name==='brightnessSet'){const n=Number(payload);if(!Number.isFinite(n))throw Error('Luminosité invalide');await brightness.apply(brightness.selected().map(d=>({id:d.id,from:d.brightness,target:Math.max(0,Math.min(100,n))})),0,'manual');return brightness.snapshot();}
  if(name==='brightnessInfo')return brightness.snapshot();
  if(name==='brightnessApply'){await brightness.transition(payload==='sleep'?'sleep':'wake',{manual:true});return brightness.snapshot();}
  if(name==='audioStatus')return audioBriefing.status();
  if(name==='audioTest')return audioBriefing.test();
  if(name==='radioSources')return radioSources;
  if(name==='radioSample')return morningRadio(event.sender.id,{morningRadioSource:payload?.source||'custom',morningRadioFeed:payload?.feed||'',morningRadioVolume:payload?.volume??40});
  if(name==='radioCheck'){const source=payload?.feed!==undefined?new RadioBulletin(()=>({...config,morningRadioSource:'custom',morningRadioFeed:payload.feed}),(...args)=>session.defaultSession.fetch(...args)):radioBulletin,r=await source.latest();return{title:r.title,source:r.source,publishedAt:r.publishedAt,seconds:r.seconds};}
  if(name==='previewOutdoor'){outdoorPreviewUntil=Date.now()+15000;outdoorFocus.show((config.outdoorCameras||['camera_exterieur','camera_exterieur_2']).slice(0,2).map(camera=>({camera,label:'person',at:Date.now(),until:outdoorPreviewUntil})),{preview:true});return true;}
  if(name==='previewStandbyPair'){closePreviews();for(const target of standbyRoles(screen.getAllDisplays(),cameraDisplay(),config))createStandby(target,true);return true;}
  if(name==='previewStandby'){closePreviews();createStandby({display:cameraDisplay(),role:'home'},true);return true;}
  if(name==='placeWindow'){const w=config.windows.find(w=>w.id===payload?.id),d=screen.getAllDisplays().find(d=>String(d.id)===String(payload?.displayId));if(!w||!d)throw Error('Fenêtre ou écran introuvable');pinWindow(w,d,visibleBounds(payload.bounds,d));w.fullscreen=!!payload.fullscreen;const item=windows.get(w.id);if(item&&!item.win.isDestroyed())placements.apply(w,item,{display:d,matched:true,bounds:w.bounds,fullscreen:w.fullscreen});save();return true;}
  if(name==='discover'){let phones=[];try{const services=await haClient?.request('/api/services');phones=Object.keys(services?.find(s=>s.domain==='notify')?.services||{}).filter(k=>k.startsWith('mobile_app_'));}catch{}return{catalog:haClient?.catalog()||[],mapping:haClient?.mapping||{},connected:!!haClient?.connected,phones};}
  if(name==='tutorialComplete'){config.tutorialCompleted=true;save();return true;}
  if(name==='refreshHome'){await haClient?.refresh();dataCache={};return true;}
  if(name==='previewAlert'){closePreviews();const win=trackPreview(new BrowserWindow({...displayFor(screen.getAllDisplays(),config,payload==='wake'?'wake':'intrusion',cameraDisplay()).bounds,fullscreen:true,frame:false,alwaysOnTop:true,webPreferences:{...prefs,preload:path.join(__dirname,'./preload.js')}}));registerScene(win,100);local(win,'widget.html',{type:'alert',preview:payload==='wake'?'wake':'intrusion'});return true;}
  if (name === 'get') {
    remember();
    const { haToken, mistralKey,spotifyTokens,remoteServerToken,...publicConfig } = config;publicConfig.remotePeers=(config.remotePeers||[]).map(({token,...p})=>({...p,hasToken:!!token}));
    return { config: publicConfig, hasRemoteToken:!!remoteServerToken,hasMistralKey:!!mistralKey, hasToken: !!haToken, displays: screen.getAllDisplays().map((d, index) => ({
      id: d.id, index, label: d.label || 'Écran ' + (index + 1), bounds:d.bounds,workArea:d.workArea,scaleFactor:d.scaleFactor,internal:d.internal,rotation:d.rotation })), shortcuts };
  }
  if (name === 'save') {
    remember();
    const next = normalize(moduleDefaults(automationDefaults(payload)));
    for (const w of next.windows) {
      const old = config.windows.find(v => v.id === w.id);
      if (old && old.displayId === w.displayId) w.bounds = old.bounds;
    }
    adoptSelections(next,config,screen.getAllDisplays(),screen.getPrimaryDisplay());
    next.remoteServerToken=config.remoteServerToken;next.remoteId=config.remoteId;next.remotePeers=await preparePeers(next.remotePeers);
    next.haToken = config.haToken;next.spotifyTokens=config.spotifyTokens;if(next.spotifyClientId!==config.spotifyClientId){delete next.spotifyTokens;await spotify?.disconnect();}
    next.mistralKey=config.mistralKey;if(next.newMistralKey)next.mistralKey=(await safeStorage.encryptStringAsync(next.newMistralKey)).toString('base64');if(next.clearMistral)delete next.mistralKey;delete next.newMistralKey;delete next.clearMistral;
    if (next.token) {
    if (!(await safeStorage.isAsyncEncryptionAvailable())) throw Error('Chiffrement Windows indisponible');
      next.haToken = (await safeStorage.encryptStringAsync(next.token)).toString('base64');
    }
    if (next.clearToken) delete next.haToken;
    delete next.token; delete next.clearToken;
    if (!smoke && !!config.startup !== !!next.startup) app.setLoginItemSettings({ openAtLogin: !!next.startup, path: process.execPath });
    for (const id of [...windows.keys()]) closeWindow(id);
    config = next; invalidateData(true); save();startHome();await setupModules();
    return true;
  }
  if (name === 'open') { const w = config.windows.find(w => w.id === payload); if (w) makeWindow(w); return true; }
  if (name === 'openAll') { config.windows.forEach(makeWindow); hidden = false; return true; }
  if (name === 'hide') { toggle(); return hidden; }
  if (name === 'quit') { app.quit(); return true; }
  if (name === 'locate') {
    const r = await getJson('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(String(payload).slice(0, 100)) + '&count=5&language=fr');
    return r.results || [];
  }
  throw Error('Action inconnue');
}
function firstSetup() {
  if(!smoke||setupSmoke)return normalize(moduleDefaults(automationDefaults(freshConfig())));
  const result = defaults(), displays = screen.getAllDisplays();
  result.theme = 'glass-aurora';
  const primary = screen.getPrimaryDisplay(), top = [...displays].sort((a, b) => a.bounds.y - b.bounds.y)[0];
  result.restoreOnLaunch = true;
  const camera = result.windows[0];
  camera.name='Maison · Accueil';camera.columns=camera.rows=1;camera.overlay=false;camera.tiles=[{type:'lounge',col:1,row:1,colSpan:1,rowSpan:1}];camera.displayId = top.id;
  camera.bounds = { x: top.bounds.x + 20, y: top.bounds.y + 20, width: Math.min(1100, top.workArea.width), height: Math.min(680, top.workArea.height) };
  camera.fullscreen = top.id !== primary.id;
  const quota = result.windows[2];
  quota.displayId = primary.id;
  quota.bounds = { x: primary.workArea.x + primary.workArea.width - 395, y: primary.workArea.y + primary.workArea.height - 435, width: 380, height: 420 };
  const morning = result.windows[1];
  morning.displayId = primary.id;
  morning.bounds = { x: primary.workArea.x + 25, y: primary.workArea.y + 60, width: 440, height: 620 };
  return result;
}
function makeTray() {
  const pixels = Buffer.alloc(32 * 32 * 4);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const i = (y * 32 + x) * 4;
    pixels[i] = 164; pixels[i + 1] = 215; pixels[i + 2] = 193;
    pixels[i + 3] = (x - 16) ** 2 + (y - 16) ** 2 < 175 ? 255 : 0;
  }
  tray = new Tray(nativeImage.createFromBitmap(pixels, { width: 32, height: 32 }));
  refreshTray();tray.on('double-click', manager);
}
function refreshTray(){
  if(!tray||tray.isDestroyed())return;const s=updater?.snapshot(),pending=['available','downloading','ready'].includes(s?.status);
  tray.setToolTip(pending?'Lumen '+s.version+(s.status==='ready'?' · mise à jour prête':' · mise à jour disponible'):'Lumen · Ctrl+Alt+Espace pour libérer l’écran');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Ouvrir l’atelier', click: manager },
    {label:pending?(s.status==='ready'?'Installer Lumen ':'Mise à jour Lumen ')+s.version:'Rechercher une mise à jour',click:()=>{showUpdates();if(!pending)updater.checkForUpdates();}},
    {label:'Reprendre la veille automatique',click:resumeStandby},
    { label: 'Afficher / masquer les widgets', click: toggle },
    { label: 'Ouvrir toutes les fenêtres', click: () => config.windows.forEach(makeWindow) },
    { type: 'separator' }, { label: 'Quitter Lumen', click: () => app.quit() }
  ]));
}
let updateTrayState='',updateNotification;
function updateSnapshot(){return{...updater.snapshot(),...autoInstall?.snapshot()};}
function updateBlockReason(){if(settingsOpen())return 'Réglages ouverts';if(activeAlert)return 'Alarme ou réveil en cours';if(morningWindow&&!morningWindow.isDestroyed()&&morningUntil>Date.now())return 'Résumé du matin en cours';if(outdoorFocus?.win&&!outdoorFocus.win.isDestroyed()&&outdoorFocus.win.isVisible())return 'Détection caméra en cours';return null;}
function requestUpdateInstall(){if(updateInstallTask)return updateInstallTask;updateInstallTask=(async()=>{skipUpdateOnQuit=false;const started=await updater.install();if(started){updateExitPrepared=true;autoInstall.stop();setImmediate(()=>app.quit());}else{skipUpdateOnQuit=true;showUpdates();}return started;})().finally(()=>{updateInstallTask=null;});return updateInstallTask;}
function publishUpdate(state){
  state={...state,...autoInstall?.snapshot()};
  for(const id of trusted){const wc=webContents.fromId(id);if(wc&&!wc.isDestroyed())try{wc.send('update-status',state);}catch{}}
  const key=state.status+'|'+state.version;if(key!==updateTrayState){updateTrayState=key;refreshTray();}
  if(!smoke&&updater?.shouldNotify()&&Notification.isSupported()){try{updateNotification=new Notification({title:'Lumen '+state.version+' est prêt',body:'La mise à jour a été téléchargée et vérifiée. Clique pour installer et relancer Lumen.',icon:path.join(__dirname,'../../assets/icons/icon.png'),silent:true});updateNotification.on('click',showUpdates);updateNotification.show();updater.markNotified();}catch{}}
}
function showUpdates(){manager();if(!control||control.isDestroyed())return;const wc=control.webContents,open=()=>{if(!wc.isDestroyed())wc.send('updates-open');};if(wc.isLoading())wc.once('did-finish-load',open);else open();}
const hasLock = app.requestSingleInstanceLock();
if (!hasLock) app.quit();
else app.whenReady().then(async () => {
  try { config = setupSmoke||smoke&&!performanceSmoke&&!regressionSmoke&&!homeSmoke?firstSetup():normalize(JSON.parse(fs.readFileSync(configPath, 'utf8'))); }
  catch { config = firstSetup(); save(); }
  moduleDefaults(automationDefaults(config));migrateSelections(config,screen.getAllDisplays(),screen.getPrimaryDisplay());config.entities=config.entities||{};if(config.setupComplete===undefined)config.setupComplete=!!config.windows.length;delete config.haSolar;if(!config.v4Migrated){config.v4Migrated=true;const camera=config.windows.find(w=>w.id==='camera');if(camera)camera.gap=0;}
  if(config.version<2){config.version=2;config.alertsEnabled=true;config.frigateUrl=config.frigateUrl||'';config.phoneService=config.phoneService||'';config.newsUrl='https://www.francetvinfo.fr/titres.rss';for(const w of config.windows)w.frame=false;save();}
  if(config.version<3){config.version=3;if(config.audioProvider==='off')config.audioProvider='local';}save();
  if(process.argv.includes('--home-screen')){config=homeScreenConfig(config,cameraDisplay().id);save();}
  session.defaultSession.setPermissionRequestHandler((_, __, callback) => callback(false));
  ipcMain.handle('lumen', action);
  audioBriefing=new AudioBriefing({getConfig:()=>config,getData:data,decrypt:async encoded=>(await safeStorage.decryptStringAsync(Buffer.from(encoded,'base64'))).result,dataDir});
  updater=new PortableUpdater({version:app.getVersion(),exe:process.execPath,dataDir,getConfig:()=>config,dry:smoke||!app.isPackaged,onChange:state=>{autoInstall?.changed();publishUpdate(state);}});
  autoInstall=new AutoInstall({getConfig:()=>config,getState:()=>updater.snapshot(),blockReason:updateBlockReason,requestInstall:requestUpdateInstall,onChange:()=>publishUpdate(updater.snapshot())});if(!smoke&&app.isPackaged)autoInstall.start();updater.start();powerMonitor.on('resume',()=>updater.wake());app.on('browser-window-focus',()=>updater.wake());
  await setupModules();initOutdoor();if(smoke||!config.restoreOnLaunch||!config.windows.length||process.argv.includes('--settings'))manager(); makeTray();if(!smoke){quotaMonitor.start();startHome();houseTimer=setInterval(houseStep,1000);outdoorPollTimer=setInterval(pollOutdoor,2500);}
  shortcuts.hide = globalShortcut.register('CommandOrControl+Alt+Space', toggle);
  shortcuts.manager = globalShortcut.register('CommandOrControl+Alt+L', manager);
  placements.start();
  if (smoke) {
    const { runSmoke } = require('../../tests/smoke/smoke.js');
    fs.rmSync(path.join(__dirname,'../../test-results/smoke-failure.json'), { force: true });
    fs.rmSync(path.join(__dirname,'../../test-results/smoke-result.json'), { force: true });
    const timeout = setTimeout(() => { fs.writeFileSync(path.join(__dirname,'../../test-results/smoke-failure.json'), JSON.stringify({ error: 'Délai de test dépassé' })); app.exit(1); }, 120000);
    try { if(setupSmoke){await require('../../tests/smoke/setup-smoke.js').run({control,action,windows,errors,data,invalidateData,integrations,updater,placements,screen});}else if(homeSmoke){await require('../../tests/smoke/v66-smoke.js').runV66({control,action,windows,cameraStep,outdoorWatch,getFocus:()=>outdoorFocus,cameraDisplay,surfaces,errors});}else if(regressionSmoke){await require('../../tests/smoke/v651-smoke.js').runV651({action,windows,houseStep,engine,manager,getControl:()=>control,getStandby:()=>({active:standbyActive,holdUntil:standbyHoldUntil,windows:[...standbyWindows.values()]}),toggle,errors});}else if(performanceSmoke){await require('../../tests/smoke/v64-smoke.js').runV64({control,action,windows,surfaces,createStandby,cameraDisplay,getFocus:()=>outdoorFocus,errors});}else{await runSmoke({ control, config, windows, makeWindow, closeWindow, toggle, shortcuts, errors, action, data, save, screen, startHome, houseStep, getMorning:()=>morningWindow }); await require('../../tests/smoke/v4-smoke.js').runV4({control,action,screen}); await require('../../tests/smoke/v5-smoke.js').runV5({control,action,screen,createStandby,cameraDisplay,markStandby:()=>{standbyActive=true;},openManager:manager,errors,getStandby:()=>({active:standbyActive,holdUntil:standbyHoldUntil})}); await require('../../tests/smoke/v6-smoke.js').runV6({control,action,cameraStep,outdoorWatch,getFocus:()=>outdoorFocus,cameraDisplay,windows,errors}); await require('../../tests/smoke/v61-smoke.js').runV61({control,action,getFocus:()=>outdoorFocus,errors}); await require('../../tests/smoke/v62-smoke.js').runV62({control,action,getFocus:()=>outdoorFocus,windows,errors}); await require('../../tests/smoke/v64-smoke.js').runV64({control,action,windows,surfaces,createStandby,cameraDisplay,getFocus:()=>outdoorFocus,errors}); }}
    catch (e) { fs.writeFileSync(path.join(__dirname,'../../test-results/smoke-failure.json'), JSON.stringify({ error: e.stack,errors }, null, 2)); app.exit(1); return; }
    clearTimeout(timeout);
    setTimeout(()=>app.exit(0),1500);app.quit();
  } else {
    if (config.restoreOnLaunch){config.windows.forEach(makeWindow);save();}
    if(process.argv.includes('--diagnostics'))setTimeout(writeDiagnostics,15000);if(process.argv.includes('--effect-audit'))setTimeout(()=>require('./effect-audit.js').effectAudit([...windows.values()].flatMap(i=>i.views.map(v=>v.webContents))).then(r=>fs.writeFileSync(path.join(dataDir,'effect-audit.json'),JSON.stringify(r,null,2))),10000);
  }
});
async function homeScreenDiagnostics(){const item=windows.get('camera');if(!item||config.windows.find(w=>w.id==='camera')?.tiles[0]?.type!=='lounge')return{enabled:false};return{enabled:true,permanentStreams:item.streams.filter(Boolean).length,...await item.views[0].webContents.executeJavaScript('({powerText:document.querySelector("[data-power-value]")?.textContent,powerSource:document.querySelector("[data-power-source]")?.textContent,powerStatus:document.querySelector("[data-power-freshness]")?.textContent,photos:document.querySelectorAll("img").length,clock:!!document.querySelector("[data-clock]"),mascot:!!document.querySelector(".ambient-mascot"),horizontalOverflow:document.documentElement.scrollWidth-innerWidth,verticalOverflow:document.documentElement.scrollHeight-innerHeight})')};}
async function quotaDiagnostics(){const item=windows.get('quota');if(!item||item.win.isDestroyed())return null;const view=item.views[0]?.webContents;if(!view||view.isDestroyed())return null;return view.executeJavaScript("({visible:!document.hidden,remaining:[...document.querySelectorAll('.ring strong')].map(e=>e.textContent),refreshButton:!!document.querySelector('[data-refresh-quota]'),overflow:document.documentElement.scrollWidth-innerWidth,errors:document.querySelector('#feedback.visible')?.textContent||null})");}
async function writeDiagnostics(){try{const live=await data();fs.writeFileSync(path.join(dataDir,'diagnostics.json'),JSON.stringify({displayPlacement:config.windows.map(w=>({id:w.id,displayId:w.displayId,reference:!!w.displayRef,fallback:!!windows.get(w.id)?.win._lumenDisplayFallback})),displays:screen.getAllDisplays().map(d=>({id:d.id,bounds:d.bounds})),updater:updater?updateSnapshot():null,performance:{homeEvents:homeChangeEvents,homeBatches:homeChangeRuns,hiddenStreamsUnloaded:true,backgroundThrottling:true,cameras:live.streams.filter(s=>s.camera).map(s=>({active:s.active,suspended:s.suspended,resumes:s.resumes,status:s.status})),surfaces:surfaces.entries.size},version:app.getVersion(),modules:{features:config.features,economy:config.economyMode,remoteServer:!!remoteServer.server,remoteError,discovery:!!remoteDiscovery.socket,discoveryError,peers:remoteRows.map(p=>({connected:p.connected,error:p.error,elapsed:p.elapsed}))},electricity:haClient?.powerSnapshot(),homeConnected:live.home.connected,unifi:{available:live.home.network?.available,entities:live.home.network?.entityCount,devices:live.home.network?.devices?.length,historyPoints:live.home.network?.history?.length,wanExposed:live.home.network?.wanDown!==null&&live.home.network?.wanDown!==undefined},observedAt:new Date().toISOString(),quota:live.quota,quotaConnection:{connected:!!quotaMonitor.child,directObservedAt:quotaMonitor.live?.timestamp,error:quotaMonitor.lastError||null},quotaUi:await quotaDiagnostics(),homeScreen:await homeScreenDiagnostics(),windowInventory:BrowserWindow.getAllWindows().map(w=>({title:w.getTitle(),visible:w.isVisible(),minimized:w.isMinimized(),bounds:w.getBounds(),preview:previewWindows.has(w)})),standby:{...standbyStatus(),presence:live.home.entities.roomPresence?.state,bedroomLight:live.home.entities.bedroomLight?.state,engine:engine.snapshot(),screens:standbyRoles(screen.getAllDisplays(),cameraDisplay(),config).map(t=>({id:t.display.id,role:t.role})),appearance:config.standbyAppearance,sun:live.home.sun,quiet:engine.quiet,bedroomLightConfigured:!!live.home.entities.bedroomLight},cameraSound:{live:config.cameraAudioLive,detection:config.cameraAudioDetection,chime:config.detectionSoundEnabled,tone:config.detectionTone,volume:config.detectionVolume,nightVolume:config.detectionNightVolume,nightMode:config.detectionNightMode},settingsUi:{open:settingsOpen(),routes:control&&!control.isDestroyed()?await control.webContents.executeJavaScript('document.querySelectorAll("[data-settings-route]").length'):0},outdoor:{presentation:config.outdoorPresentation,snapshots:config.outdoorShowSnapshots,enabled:config.outdoorEnabled,cameras:config.outdoorCameras,displayId:outdoorDisplay().id,sensors:live.home.cameraActivity?.length,active:outdoorWatch.snapshot().length,visible:!!outdoorFocus?.win?.isVisible()},roomPresence:!!live.home.entities.roomPresence,audio:live.audio,streams:live.streams.map(s=>({camera:s.camera,status:s.status,reloads:s.reloads,audioMuted:s.audioMuted,video:s.video})),nasEntities:live.home.nas?.length,circuits:live.home.circuits?.length,sleepConfigured:!!live.home.entities.sleepEvent,cpapConfigured:!!live.home.entities.cpapUsage,bedroom:!!live.home.entities.bedroom,proxmoxMetrics:live.home.proxmox?.length,brightness:brightness.snapshot().displays.map(d=>({name:d.name,supported:d.supported})),weather:!!live.weather?.current,newsCount:live.news?.items?.length,frigateCount:live.frigate?.events?.length,codexProjects:live.activity?.projects?.length,activityError:live.activity?.error,windows:windows.size,shortcuts,errors},null,2));}catch(e){fs.writeFileSync(path.join(dataDir,'diagnostics-error.json'),JSON.stringify({error:e.message}));}}
app.on('second-instance', (_,args) => {if(args.includes('--diagnostics'))writeDiagnostics();else manager();});
app.on('window-all-closed', () => {});
app.on('before-quit', event => {
  if(!updateExitPrepared&&(updateInstallTask||!skipUpdateOnQuit&&updater?.canInstall()&&config.autoUpdateInstallOnQuit!==false)){event.preventDefault();requestUpdateInstall();return;}
  autoInstall?.stop();updater?.stop();
  placements.stop();pendingDisplayWindows.clear();app.quitting = true;spotify?.cancel();remoteDiscovery.stop();remoteServer.stop();clearTimeout(homeChangeTimer);quotaMonitor.stop();closePreviews();control?.destroy();surfaces.stop();clearInterval(outdoorPollTimer);outdoorFocus?.close();endStandby(false);brightness.stop();clearInterval(houseTimer);if(morningWindow&&!morningWindow.isDestroyed())morningWindow.close();haClient?.stop();clearTimeout(alertTimer);if(alertWindow&&!alertWindow.isDestroyed())alertWindow.close();
  if (config) { remember(); save(); }
  for (const id of [...windows.keys()]) closeWindow(id);
  tray?.destroy();
});
app.on('will-quit', () => globalShortcut.unregisterAll());
