// One event-driven notice per host window, plus the two main dashboard scenes.
(()=>{
 const file=location.pathname.split('/').pop(),kind=new URLSearchParams(location.search).get('type');
 const settings=file==='index.html',shell=file==='shell.html';if(!settings&&!shell&&!['quota','standby','lounge'].includes(kind))return;
 const button=document.createElement('button');button.className='lumen-update-notice'+(settings||shell?' in-titlebar':'');button.hidden=true;button.type='button';button.setAttribute('aria-label','Ouvrir les mises à jour de Lumen');button.onclick=()=>window.lumen.invoke('showUpdates');
 const host=settings?document.querySelector('.appbar nav'):shell?document.querySelector('header nav'):document.body;host?.prepend(button);
 function update(s){if(!s)return;const available=['available','downloading','ready'].includes(s.status);button.hidden=!available;if(!available)return;button.textContent=s.installError?'⚠ Mise à jour · installation à vérifier':s.status==='downloading'?'↓ Mise à jour · '+(s.progress||0)+' %':s.status==='ready'?'↻ Installer Lumen '+s.version:'↑ Lumen '+s.version+' disponible';button.dataset.status=s.status;button.title=s.installError?s.installError:s.status==='ready'?'Mise à jour vérifiée. Clique pour installer et relancer.':'Ouvrir le suivi de la mise à jour';}
 window.lumen.onUpdate?.(update);window.lumen.invoke('updateStatus').then(update).catch(()=>{});window.addEventListener('online',()=>window.lumen.invoke('updateWake').catch(()=>{}));
})();
