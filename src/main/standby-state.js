function standbyState({config={},home,engine={},active=false,hidden=false,holdUntil=0,settings=false,alert=false,focus=false,morning=false,now=Date.now()}={}){
 const result=(reason,label)=>({active,reason,label,holdUntil,quiet:!!engine.quiet});
 if(!config.standbyEnabled)return result('disabled','Veille désactivée');
 if(hidden)return result('hidden','Widgets masqués');
 if(holdUntil>now)return result('paused','Pause manuelle · encore '+Math.ceil((holdUntil-now)/60000)+' min');
 if(settings)return result('settings','Réglages ouverts · reprise à leur fermeture');
 if(alert)return result('alert','Alarme prioritaire');
 if(focus)return result('camera','Détection extérieure en cours');
 if(morning)return result('morning','Résumé du matin en cours');
 if(active)return result('active',engine.quiet?'Veille · chambre éteinte':'Veille active');
 if(!home?.connected)return result('disconnected','Connexion Home Assistant attendue');
 if(!['on','off'].includes(home.entities?.roomPresence?.state))return result('presence-unknown','Capteur de présence indisponible');
 if(engine.idle)return result('ready','Veille prête');
 if(engine.quietSince!==null&&engine.quietSince!==undefined)return result('quiet-delay','Chambre éteinte · veille dans '+Math.max(0,Math.ceil((engine.quietSince+config.standbyQuietDelaySeconds*1000-now)/1000))+' s');
 if(engine.awaySince!==null&&engine.awaySince!==undefined)return result('away-delay','Absence · veille dans '+Math.max(0,Math.ceil((engine.awaySince+config.standbyDelaySeconds*1000-now)/1000))+' s');
 return result('occupied','Présence dans la chambre · affichage normal');
}
module.exports={standbyState};
