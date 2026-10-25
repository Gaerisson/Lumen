const moduleCatalog=[
 ['sensors','Capteurs libres','Tes entités et courbes personnalisées','Home Assistant'],
 ['health','État des services','Connexions et disponibilité en un regard','Lumen'],
 ['codex','Codex','Quota, projets et mascotte','OpenAI Codex'],
 ['computer','Ordinateurs','CPU, mémoire et machines distantes','Lumen Remote'],
 ['home','Maison','Capteurs et énergie en direct','Home Assistant'],
 ['network','Réseau','Connexion, clients et graphiques','Ubiquiti / UniFi'],
 ['cameras','Caméras','Direct uniquement sur détection','Frigate / go2rtc'],
 ['weather','Météo','Prévisions et météo animée','Open-Meteo'],
 ['morning','Matin','Réveil, voix et bulletin radio','Sleep as Android'],
 ['sleep','Sommeil','Résumé de la dernière nuit','ResMed myAir'],
 ['nas','Stockage','Santé et capacité des NAS','Home Assistant'],
 ['proxmox','Serveurs','Ressources de virtualisation','Proxmox'],
 ['music','Spotify','Lecture, appareils et volume','Spotify Web API'],
 ['news','Actualités','Titres RSS et flash radio','RSS / franceinfo']
].map(([id,name,description,credit])=>({id,name,description,credit}));
function moduleDefaults(c){c.features={...Object.fromEntries(moduleCatalog.map(m=>[m.id,!['music','sensors'].includes(m.id)])),...c.features};delete c.features.resume;delete c.resumeEnabled;c.economyMode=c.economyMode!==false;c.appearanceMode=['auto','dark','light','theme'].includes(c.appearanceMode)?c.appearanceMode:'auto';c.remotePeers=Array.isArray(c.remotePeers)?c.remotePeers.slice(0,8):[];c.remotePort=Math.max(1024,Math.min(65535,Number(c.remotePort)||32145));c.remoteLan=c.remoteLan===true;return c;}
function enabled(c,id){return c.features?.[id]!==false;}
module.exports={moduleCatalog,moduleDefaults,enabled};
