function sensorSparkline(history){
 const samples=(history||[]).slice(-120),values=samples.map(p=>p.value).filter(Number.isFinite);if(values.length<2)return '';
 const low=Math.min(...values),high=Math.max(...values),span=high-low||Math.max(1,Math.abs(high)*.05);let segment=false;
 const d=samples.map((p,i)=>{if(!Number.isFinite(p.value)){segment=false;return '';}const x=i/Math.max(1,samples.length-1)*300,y=55-(p.value-low)/span*45,cmd=segment?'L':'M';segment=true;return cmd+x.toFixed(1)+','+y.toFixed(1);}).join(' ');
 return '<svg class="sensor-sparkline" viewBox="0 0 300 65" preserveAspectRatio="none" aria-label="Évolution récente"><path d="'+d+'" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>';
}
function sensorsView(data,ids,title='Mes capteurs'){
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!ids?.length)return '<section class="module sensor-empty"><span class="module-heading">HOME ASSISTANT</span><h2>Choisis tes capteurs.</h2><p>Ajoute jusqu’à huit entités depuis le studio.</p><button data-window-settings>Choisir mes capteurs ↗</button></section>';
 return '<section class="sensor-module"><div class="sensor-heading"><span class="eyebrow">HOME ASSISTANT</span><h2>'+escape(title)+'</h2></div><div class="sensor-grid">'+ids.map(id=>{const e=data?.find(e=>e.id===id),n=e?.state!==null&&e?.state!==undefined?Number(e.state):NaN,value=Number.isFinite(n)?n.toLocaleString('fr-FR',{maximumFractionDigits:2}):e?.state||'—';return '<article class="sensor-card '+(e?.available?'':'sensor-offline')+'" data-live-key="sensor-'+escape(id)+'"><span class="sensor-name">'+escape(e?.name||id)+'</span><div class="sensor-value">'+escape(value)+'<small>'+escape(e?.unit)+'</small></div>'+sensorSparkline(e?.history)+'<div class="sensor-meta"><i class="status-dot '+(e?.available?'live':'')+'"></i>'+escape(e?.missing?'Entité absente':e?.available?'Connecté':'Indisponible')+(e?.updated?' · '+escape(new Date(e.updated).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})):'')+'</div></article>';}).join('')+'</div><small class="sensor-credit">Home Assistant · historique local, échantillonné toutes les 15 s</small></section>';
}
function healthRows(state,now=Date.now()){
 const f=state.options?.features||{},quota=state.quota,age=now-Date.parse(quota?.timestamp),fresh=Number.isFinite(age)&&age>=-10000&&age<600000,weather=state.weather,home=state.home;
 return [
  {id:'home',name:'Home Assistant',icon:'⌂',ok:home?.connected,detail:home?.connected?'Temps réel connecté':home?.error||'À connecter'},
  {id:'codex',name:'Quota Codex',icon:'◔',ok:fresh,detail:!quota?'Relevé attendu':fresh?'Relevé récent':age>=600000?'Relevé ancien':'Horodatage à vérifier'},
  {id:'weather',name:'Météo',icon:'☀',ok:!!weather?.current,detail:weather?.current?'Prévisions disponibles':'Ville ou connexion à vérifier'},
  {id:'network',name:'UniFi',icon:'⌁',ok:!!home?.network?.available&&!!home.connected,detail:!home?.connected?'Home Assistant déconnecté':home?.network?.available?'Capteurs disponibles':'Association des capteurs à vérifier'},
  {id:'music',name:'Spotify',icon:'♫',ok:!!state.spotify?.connected,detail:state.spotify?.connected?'Compte connecté':'Connexion Spotify à terminer'},
  {id:'computer',name:'Ordinateurs',icon:'▥',ok:!!state.computers?.some(c=>c.connected),detail:(state.computers||[]).filter(c=>c.connected).length+' PC connecté(s)'}
 ].map(r=>({...r,disabled:f[r.id]===false,detail:f[r.id]===false?'Module désactivé':r.detail}));
}
function moduleOffView(){return '<section class="module sensor-empty"><h2>Module désactivé</h2><p>Tu peux le réactiver dans les modules de Lumen.</p><button data-window-settings>Ouvrir les réglages ↗</button></section>';}
function healthView(state){
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return '<section class="service-health module"><div class="sensor-heading"><span class="eyebrow">CONNECTEURS</span><h2>État des services</h2></div><div class="health-grid">'+healthRows(state).map(r=>'<article data-live-key="health-'+r.id+'" class="health-card '+(r.disabled?'disabled':r.ok?'online':'offline')+'"><i>'+r.icon+'</i><div><b>'+r.name+'</b><small>'+escape(r.detail)+'</small></div><span class="health-dot"></span></article>').join('')+'</div><button data-window-settings>Ouvrir les connexions ↗</button><small class="sensor-credit">Lecture seule · utilise les relevés existants</small></section>';
}
if(typeof module!=='undefined')module.exports={sensorSparkline,sensorsView,healthRows,healthView};
