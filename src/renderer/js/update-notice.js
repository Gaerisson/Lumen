// Update one existing node; no polling or animation when the scene is hidden.
(()=>{
 const file=location.pathname.split('/').pop(),kind=new URLSearchParams(location.search).get('type');
 const settings=file==='index.html',shell=file==='shell.html';if(!settings&&!shell&&!['quota','standby','lounge'].includes(kind))return;
 let state,timer;const button=document.createElement('button');button.className='lumen-update-notice'+(settings||shell?' in-titlebar':'');button.hidden=true;button.type='button';
 button.onclick=()=>window.lumen.invoke(state?.autoInstallAt?'updateDefer':'showUpdates').catch(()=>{});
 const host=settings?document.querySelector('.appbar nav'):shell?document.querySelector('header nav'):document.body;host?.prepend(button);
 function update(s){if(!s)return;state=s;clearTimeout(timer);const available=['available','downloading','ready','preparing','installing'].includes(s.status);button.hidden=!available;if(!available)return;
  const seconds=s.autoInstallAt?Math.max(0,Math.ceil((new Date(s.autoInstallAt)-Date.now())/1000)):null;
  button.textContent=s.installError?'⚠ Mise à jour · installation à vérifier':seconds!==null?'↻ Mise à jour dans '+seconds+' s · Reporter':s.status==='preparing'?'↻ Préparation de la mise à jour…':s.status==='installing'?'↻ Redémarrage de Lumen…':s.status==='downloading'?'↓ Mise à jour · '+(s.progress||0)+' %':s.status==='ready'?'↻ Installer Lumen '+s.version:'↑ Lumen '+s.version+' disponible';
  button.dataset.status=s.status;button.setAttribute('aria-label',seconds!==null?'Reporter la mise à jour d’une heure':'Ouvrir les mises à jour de Lumen');button.title=s.installError||s.autoInstallPaused||(seconds!==null?'Clique pour reporter le redémarrage d’une heure':'Ouvrir le suivi de la mise à jour');
  if(seconds!==null&&!document.hidden)timer=setTimeout(()=>update(state),1000);
 }
 window.lumen.onUpdate?.(update);window.lumen.invoke('updateStatus').then(update).catch(()=>{});window.addEventListener('online',()=>window.lumen.invoke('updateWake').catch(()=>{}));document.addEventListener('visibilitychange',()=>{clearTimeout(timer);if(!document.hidden)window.lumen.invoke('updateStatus').then(update).catch(()=>{});});window.addEventListener('beforeunload',()=>clearTimeout(timer));
})();
