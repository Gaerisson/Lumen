function formatRemaining(seconds) {
  if(seconds<=0)return'En attente';
  const days=Math.floor(seconds/86400),h=Math.floor(seconds%86400/3600),m=Math.floor(seconds%3600/60),s=seconds%60;
  return(days?days+'j ':'')+[h,m,s].map(n=>String(n).padStart(2,'0')).join(':');
}
function quotaMarkup(q){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  if(!q)return'<div class="quota-summary quota-unavailable" data-live-key="quota-summary"><span class="eyebrow">CAPACITÉ</span><h2>Connexion au quota</h2><p>Vérification automatique auprès de Codex.</p><button data-refresh-quota>Actualiser</button></div>';
  const age=Date.now()-Date.parse(q.timestamp);
  const meters=[['primary','Session'],['secondary','Semaine']].map(([key,label])=>{
    const v=q[key];if(!v)return'';
    const raw=v.used_percent??v.usedPercent,used=raw===null||raw===undefined?NaN:Number(raw),remaining=Number.isFinite(used)?Math.max(0,Math.min(100,100-used)):null;
    const reset=Number(v.resets_at??v.resetsAt),full=remaining===100,freshFull=full&&Number.isFinite(age)&&age<600000,expired=!freshFull&&Number.isFinite(reset)&&reset>0&&reset<=Date.now()/1000,empty=remaining===0;
    return`<div class="quota-card ${empty?'quota-exhausted':''}"><div class="quota-card-title"><span>${label}</span><i class="${empty?'waiting':''}"></i></div><div class="ring" style="--progress:${expired?0:remaining??0}"><div><strong>${expired||remaining===null?'—':Math.round(remaining)+'<small>%</small>'}</strong><span>${expired?'à confirmer':'restant'}</span></div></div><div class="quota-detail"><div class="quota-status">${expired?'Relevé expiré':empty?'Limite atteinte':remaining===null?'Non communiqué':full?'Capacité intacte':'Disponible'}</div>${full&&!expired?'<div class="quota-full-label">Prêt quand tu veux</div><div class="countdown-caption">Aucun décompte en cours</div>':Number.isFinite(reset)&&reset>0?`<div class="countdown ${empty?'waiting':''}" data-reset="${reset}" data-exhausted="${empty}">${formatRemaining(Math.ceil(reset-Date.now()/1000))}</div><div class="countdown-caption">${empty?'avant retour du quota':'avant renouvellement'}</div>`:'<div class="countdown-caption">Échéance inconnue</div>'}</div></div>`;
  }).join('');
  const c=q.credits,balance=c?.balance!==null&&c?.balance!==undefined&&Number.isFinite(Number(c.balance))?Number(c.balance).toLocaleString('fr-FR',{maximumFractionDigits:2}):'—';
  return`<div class="quota-summary" data-live-key="quota-summary"><div class="quota-meters">${meters}</div>${c?`<div class="quota-credit"><div><span>Crédits</span><small>${c.unlimited?'Accès illimité':c.hasCredits?'Solde disponible':'Aucun crédit disponible'}</small></div><strong>${c.unlimited?'∞':esc(balance)}</strong></div>`:''}<div class="quota-stamp ${age>600000?'quota-stale':''}"><span class="status-dot"></span><span title="${esc(q.source)}">${q.refreshing?'Synchronisation… · ':age>600000?'Dernier relevé · ':''}${esc(new Date(q.timestamp).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}))}</span><button data-refresh-quota title="Actualiser le quota auprès de Codex" ${q.refreshing?'disabled':''}>↻ Actualiser</button></div>${q.refreshError&&age>120000?'<small class="quota-sync-error">'+esc(q.refreshError)+'</small>':''}</div>`;
}
function updateCountdowns(){
  for(const el of document.querySelectorAll('[data-reset]')){
    const remaining=Math.max(0,Math.ceil(Number(el.dataset.reset)-Date.now()/1000));el.textContent=formatRemaining(remaining);
    el.title=remaining?'Échéance : '+new Date(Number(el.dataset.reset)*1000).toLocaleString('fr-FR'):'En attente d’un nouveau relevé Codex.';
    if(!remaining){el.classList.add('expired');const card=el.closest('.quota-card');if(!card)continue;card.querySelector('.quota-status').textContent='Relevé expiré';card.querySelector('.countdown-caption').textContent='Vérification automatique';card.querySelector('.ring strong').textContent='—';card.querySelector('.ring span').textContent='à confirmer';card.querySelector('.ring').style.setProperty('--progress',0);}
  }
}
if(typeof module!=='undefined')module.exports={quotaMarkup,formatRemaining};
