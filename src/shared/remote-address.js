(function(root){
 function remoteAddress(value){
  let text=String(value||'').trim();if(!text)throw Error('Indique le nom ou l’adresse du PC distant');
  const explicit=/^https?:\/\//i.test(text),hasPort=/:\d+$/.test(text.split('/')[0]);
  if(/^[a-z][a-z\d+.-]*:\/\//i.test(text)&&!explicit)throw Error('Utilise une adresse HTTP ou HTTPS');
  if(!explicit)text='http://'+text;
  let u;try{u=new URL(text);}catch{throw Error('Adresse du PC invalide');}
  if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.search||u.hash)throw Error('Utilise une adresse HTTP(S), sans clé ni paramètres');
  if(['0.0.0.0','[::]'].includes(u.hostname))throw Error('Utilise l’adresse réseau du PC, pas son adresse d’écoute');
  if(!explicit&&!hasPort)u.port='32145';
  return u.origin;
 }
 if(typeof module!=='undefined')module.exports={remoteAddress};else root.remoteAddress=remoteAddress;
})(globalThis);
