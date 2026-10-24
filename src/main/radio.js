const {httpUrl,decodeFeed,decodeEntities,repairText}=require('./integrations.js');
const DEFAULT_RADIO_FEED='https://radiofrance-podcast.net/podcast09/podcast_8149e0c1-1d27-4a7a-b3da-13307d91a8a2.xml';
const radioSources=[
 {id:'nrj',name:'NRJ · infos nationales, environ 3 min',feed:'https://aod.nrjaudio.fm/xml/2010.xml',note:'Dernier bulletin national publié par NRJ. Le contenu et les éventuelles publicités dépendent de la radio.'},
 {id:'rfi',name:'RFI · Journal en français facile',feed:'https://www.rfi.fr/fr/podcasts/journal-fran%C3%A7ais-facile/podcast',note:'Journal international plus long. La durée maximale et la vitesse restent réglables.'},
 {id:'franceinfo',name:'franceinfo · Ça dit quoi ?',feed:DEFAULT_RADIO_FEED,note:'Podcast court de franceinfo. Des messages promotionnels peuvent être inclus par l’éditeur.'},
 {id:'local',name:'Flash local · titres RSS, sans publicité ajoutée',note:'La voix Windows lit les cinq titres du flux RSS configuré. Aucun enregistrement publicitaire n’est ajouté par Lumen.'},
 {id:'custom',name:'Autre podcast · adresse RSS',note:'Utilise un flux RSS contenant des fichiers audio et un bulletin récent.'}
];
function radioFeed(c){const source=radioSources.find(s=>s.id===c.morningRadioSource);return source?.feed||c.morningRadioFeed||radioSources[0].feed;}
const radioText=s=>repairText(decodeEntities(String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1'))).replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
function radioDuration(s){if(!String(s||'').trim())return null;const parts=String(s).trim().split(':').map(Number);return parts.length<=3&&parts.every(Number.isFinite)?parts.reduce((n,v)=>n*60+v,0):null;}
function parseRadioFeed(xml,now=Date.now()){
 const get=(s,tag)=>radioText(s.match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+tag+'>','i'))?.[1]),source=get(xml.slice(0,xml.search(/<item\b/i)),'title');
 const items=[...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0,100).flatMap(([,item])=>{const enclosure=item.match(/<enclosure\b[^>]*>/i)?.[0]||'',attr=name=>decodeEntities(enclosure.match(new RegExp('\\b'+name+'=["\x27]([^"\x27]+)','i'))?.[1]||''),date=Date.parse(get(item,'pubDate'));try{const url=httpUrl(attr('url'));if(!/^audio\//i.test(attr('type'))&&!/\.(mp3|m4a|aac|ogg|wav)(\?|$)/i.test(url.href))return[];if(!Number.isFinite(date)||date>now+600000||now-date>96*3600000)return[];return[{url:url.href,title:get(item,'title').slice(0,250),source:source||'Flash radio',publishedAt:new Date(date).toISOString(),seconds:radioDuration(get(item,'itunes:duration'))}];}catch{return[];}});
 return items.sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))[0]||null;
}
class RadioBulletin{
 constructor(getConfig,fetcher=fetch){this.getConfig=getConfig;this.fetcher=fetcher;this.cache=null;}
 async latest(){const c=this.getConfig(),feed=httpUrl(radioFeed(c)).href;let item;if(this.cache?.feed===feed&&this.cache.until>Date.now())item=this.cache.item;else{const r=await this.fetcher(feed,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Flux radio indisponible (HTTP '+r.status+').');const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length>2000000)throw Error('Flux radio trop volumineux.');item=parseRadioFeed(decodeFeed(bytes,r.headers.get('content-type')||''));if(!item)throw Error('Aucun bulletin audio récent dans ce flux.');this.cache={feed,item,until:Date.now()+300000};}return{...item,volume:Math.max(0,Math.min(1,Number(c.morningRadioVolume??40)/100)),rate:Math.max(1,Math.min(1.5,Number(c.morningRadioRate)||1.15)),limitSeconds:Math.max(60,Math.min(900,(Number(c.morningRadioMinutes)||8)*60))};}
}
module.exports={RadioBulletin,parseRadioFeed,radioDuration,DEFAULT_RADIO_FEED,radioSources,radioFeed};
