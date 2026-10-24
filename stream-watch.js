const {playerScript}=require('./stream-player');
function isCamera(tile){if(tile.videoEnhanced===false)return false;try{const u=new URL(tile.url);return tile.videoEnhanced===true||u.pathname.endsWith('/stream.html')&&u.searchParams.has('src');}catch{return false;}}
function isCameraPage(tile){try{const u=new URL(tile.url);return tile.videoEnhanced===true||u.pathname.endsWith('/stream.html')&&u.searchParams.has('src');}catch{return false;}}
function watchStream(view,tile,config,onStatus=()=>{},{now=Date.now,every=setInterval,clear=clearInterval,initiallyActive=true}={}){
 const wc=view.webContents,enhanced=isCamera(tile),camera=isCameraPage(tile),period=Number(tile.refreshMinutes??(camera?config.streamRefreshMinutes:0))*60000,stall=Number(tile.stallSeconds??config.streamStallSeconds)||25;
 let closed=false,active=initiallyActive,timer=null,polling=null,epoch=0,loadingAt=now(),lastReload=now(),lastRecovery=0,forceMute=!!tile.forceMute;
 const audioMuted=()=>!active||forceMute||(tile.cameraRole==='detection'?config.cameraAudioDetection!==true:config.cameraAudioLive!==true);
 const state={camera,active,suspended:!active,resumes:0,reloads:0,status:active?'Connexion':'En pause',lastReload:null,nextReload:active&&period?new Date(lastReload+period).toISOString():null,...(camera?{audioMuted:audioMuted()}:{})};
 const applyMute=()=>{if(camera&&!wc.isDestroyed()){state.audioMuted=audioMuted();wc.setAudioMuted?.(state.audioMuted);}};applyMute();
 const load=url=>{if(!wc.isDestroyed())wc.loadURL(url).catch(()=>{});};
 const reload=reason=>{if(closed||!active||wc.isDestroyed()||now()-lastRecovery<12000)return false;lastRecovery=now();lastReload=loadingAt=now();state.reloads++;state.reason=reason;state.status='Reconnexion';state.lastReload=new Date(now()).toISOString();state.nextReload=period?new Date(lastReload+period).toISOString():null;onStatus(state);load(tile.url);return true;};
 const loaded=()=>{applyMute();if(!active||wc.getURL?.()==='about:blank')return;loadingAt=now();state.status='En direct';onStatus(state);if(enhanced)wc.executeJavaScript(playerScript({fit:tile.videoFit||config.videoFit||'soft',trim:tile.autoTrimVideo??config.autoTrimVideo??true})).catch(()=>{});};
 const loading=()=>{applyMute();if(active)loadingAt=now();};wc.on('did-finish-load',loaded);wc.on('did-start-loading',loading);
 const poll=async()=>{
  if(closed||!active||polling!==null||wc.isDestroyed())return;
  if(period&&now()-lastReload>=period){reload('Actualisation programmée');return;}if(!enhanced)return;
  const ticket=epoch;polling=ticket;
  try{const video=await wc.executeJavaScript('window.__lumenCameraStatus||null');if(closed||!active||epoch!==ticket)return;
   if(video){state.video=video;state.status=video.ready?'En direct':'Connexion';if(video.stalledFor>stall&&now()-loadingAt>(stall+5)*1000)reload('Flux figé');}else if(now()-loadingAt>(stall+10)*1000)reload('Lecteur indisponible');onStatus(state);
  }catch{if(!closed&&active&&epoch===ticket&&now()-loadingAt>45000)reload('Lecteur interrompu');}finally{if(polling===ticket)polling=null;}
 };
 const start=()=>{if(timer===null&&(enhanced||period))timer=every(poll,5000);};
 const pause=()=>{if(timer!==null)clear(timer);timer=null;};if(active)start();
 return{state,reload,setActive(value,reason='Fenêtre masquée'){
  value=!!value;if(closed||wc.isDestroyed()||active===value)return;active=value;epoch++;polling=null;state.active=value;state.suspended=!value;applyMute();
  if(!active){pause();state.status='En pause';state.reason=reason;state.nextReload=null;delete state.video;if(camera){wc.stop?.();load('about:blank');}}
  else{loadingAt=lastReload=now();state.status=camera?'Connexion':'Page active';state.nextReload=period?new Date(lastReload+period).toISOString():null;state.resumes++;if(camera)load(tile.url);start();}
  onStatus(state);
 },setForceMute(value){if(forceMute===!!value)return;forceMute=!!value;applyMute();},stop(){closed=true;epoch++;pause();wc.removeListener('did-finish-load',loaded);wc.removeListener('did-start-loading',loading);}};
}
module.exports={watchStream,isCamera,isCameraPage};
