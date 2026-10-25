const moduleChoices=[
 ['clock','Horloge','◷','L’heure, simplement'],['weather','Météo','☀','Prévisions locales'],
 ['quota','Compagnon Codex','◔','Quota et projets'],['computer','Ordinateurs','▥','CPU et mémoire'],
 ['home','Maison','⌂','Sécurité et confort'],['energy','Électricité','ϟ','Puissance et consommation'],
 ['network','UniFi','⌁','Réseau et équipements'],['camera','Caméra en direct','◉','Frigate / go2rtc'],
 ['frigate','Détections','◎','Événements Frigate'],['music','Spotify','♫','Appareils et lecture'],
 ['news','Actualités','≡','Titres de tes flux'],['sleep','Sommeil','☾','Réveil et CPAP'],
 ['nas','Stockage','▤','NAS et capacité'],['proxmox','Serveurs','▦','Proxmox'],
 ['lounge','Accueil maison','◒','Horloge, mascotte et informations'],['web','Page web','↗','Ton propre dashboard']
].map(([id,name,icon,description])=>({id,name,icon,description}));
function freshConfig(){return{version:3,setupComplete:false,tutorialCompleted:false,theme:'glass-aurora',appearanceMode:'auto',economyMode:true,animationsEnabled:true,animatedBackground:false,city:'',latitude:null,longitude:null,haUrl:'',frigateUrl:'',go2rtcUrl:'',entities:{},windows:[],restoreOnLaunch:false,startup:false,alertsEnabled:false,alarmSound:false,wakeSound:false,alarmVoice:false,wakeVoice:false,morningAutoTts:false,standbyEnabled:false,presenceEnabled:false,brightnessEnabled:false,audioProvider:'off',outdoorEnabled:false,outdoorCameras:[],newsUrl:'https://www.francetvinfo.fr/titres.rss',autoUpdateEnabled:true,autoUpdateInstallOnQuit:true,features:{codex:true,computer:true,weather:true,home:false,network:false,cameras:false,morning:false,sleep:false,nas:false,proxmox:false,music:false,news:false}};}
function displayFor(displays,config,kind,fallback){
 const key=kind==='wake'?'wakeDisplayId':kind==='morning'?'morningDisplayId':kind==='intrusion'?'intrusionDisplayId':'outdoorDisplayId';
 const id=config[key]??(kind==='morning'?config.wakeDisplayId:null)??config.alertDisplayId;
 return displays.find(d=>String(d.id)===String(id))||fallback||displays[0];
}
function clampRect(rect={}){const width=Math.min(100,Math.max(12,Number(rect.width)||35)),height=Math.min(100,Math.max(12,Number(rect.height)||35));return{x:Math.max(0,Math.min(100-width,Number(rect.x)||0)),y:Math.max(0,Math.min(100-height,Number(rect.y)||0)),width,height};}
function tileRect(tile,w){return tile.rect?clampRect(tile.rect):clampRect({x:(tile.col-1)/w.columns*100,y:(tile.row-1)/w.rows*100,width:tile.colSpan/w.columns*100,height:tile.rowSpan/w.rows*100});}
function cameraPage(base,camera){if(!/^[\w-]{1,100}$/.test(camera||''))throw Error('Choisis une caméra Frigate.');const u=new URL('/stream.html',base);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error('Adresse HTTP ou HTTPS sans identifiant requise.');u.searchParams.set('src',camera);return u.href;}
function moduleTile(id,rect,options={}){if(!moduleChoices.some(m=>m.id===id))throw Error('Module inconnu');const tile={type:id,col:1,row:1,colSpan:1,rowSpan:1,rect:clampRect(rect)};if(id==='camera'){Object.assign(tile,{type:'web',url:cameraPage(options.streamBase,options.camera),cameraName:options.camera,videoEnhanced:true,cameraRole:'live',videoFit:options.fit||'contain',forceMute:true});}if(id==='web'){const u=new URL(options.url||'https://example.com/');if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error('Adresse de page HTTP ou HTTPS requise.');tile.url=u.href;}return tile;}
function presetWindow(display,preset='calm'){
 if(!display)throw Error('Choisis un écran.');const b=display.bounds;
 const w={id:'screen-'+display.id,name:display.label||'Mon écran',displayId:display.id,layout:'free',columns:1,rows:1,fullscreen:false,alwaysOnTop:false,overlay:false,bounds:{x:b.x+30,y:b.y+30,width:Math.min(1000,b.width-60),height:Math.min(720,b.height-90)},tiles:[]};
 if(preset==='calm')w.tiles=[moduleTile('clock',{x:0,y:0,width:55,height:100}),moduleTile('weather',{x:55,y:0,width:45,height:100})];
 else if(preset==='codex')w.tiles=[moduleTile('quota',{x:0,y:0,width:65,height:100}),moduleTile('computer',{x:65,y:0,width:35,height:100})];
 else if(preset==='home')w.tiles=[moduleTile('lounge',{x:0,y:0,width:100,height:100})];
 return w;
}
if(typeof module!=='undefined')module.exports={moduleChoices,freshConfig,displayFor,clampRect,tileRect,moduleTile,presetWindow};
