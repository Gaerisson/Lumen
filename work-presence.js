function workPresence(activity,now=Date.now(),quota=null){
 const rest=(typeof quotaRest!=='undefined'?quotaRest:require('./quota-rest').quotaRest)(quota,now);if(rest)return{id:'recharging',label:'Je recharge',title:'Quota épuisé',caption:rest.resetAt?'Retour prévu à '+new Date(rest.resetAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'En attente du renouvellement',activeCount:0};
 const projects=activity?.projects||[],stamp=value=>Date.parse(value),recent=(value,ms)=>Number.isFinite(stamp(value))&&stamp(value)<=now+30000&&now-stamp(value)<=ms;
 if(!activity||activity.error||activity.observedAt&&!recent(activity.observedAt,60000))return{id:'unknown',label:'Statut non confirmé',title:activity?.error?.includes('désactivé')?'Suivi Codex désactivé':'Suivi local indisponible',caption:'En attente d’un nouveau relevé',activeCount:0};
 const live=projects.filter(p=>p.status==='Activité en cours'&&recent(p.lastAt,180000)).sort((a,b)=>stamp(b.lastAt)-stamp(a.lastAt)),focus=live[0];
 const duration=started=>{const minutes=Math.max(0,Math.floor((now-stamp(started))/60000));return!Number.isFinite(minutes)?'':minutes<1?'à l’instant':minutes<60?'depuis '+minutes+' min':'depuis '+Math.floor(minutes/60)+' h '+String(minutes%60).padStart(2,'0');};
 if(focus)return{id:'working',label:'Je travaille',title:focus.title||focus.project||'Projet en cours',caption:[focus.project,duration(focus.startedAt),live.length>1?'+'+(live.length-1)+(live.length>2?' autres projets':' autre projet'):''].filter(Boolean).join(' · '),activeCount:live.length,projectId:focus.id};
 const waiting=projects.filter(p=>['Activité en cours','Dernière activité observée','Interrompu'].includes(p.status)).sort((a,b)=>(stamp(b.lastAt)||0)-(stamp(a.lastAt)||0))[0];
 if(waiting)return{id:'waiting',label:'En pause',title:'Aucune activité récente',caption:waiting.project||waiting.title||'Travail non confirmé',activeCount:0,projectId:waiting.id};
 const last=[...projects].sort((a,b)=>(stamp(b.lastAt)||0)-(stamp(a.lastAt)||0))[0];
 return{id:'resting',label:'Au repos',title:'Prêt pour la suite',caption:last?'Dernier projet · '+(last.project||last.title||'Projet local'):'Aucun projet en cours',activeCount:0};
}
if(typeof module!=='undefined')module.exports={workPresence};
