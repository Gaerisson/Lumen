const fs=require('fs'),path=require('path'),crypto=require('crypto'),{spawn}=require('child_process');
function publicBriefing(data,mode='briefing'){
  const words=[];
  if(mode!=='news'){
    words.push('Bonjour. Voici ton point du matin.');
    const w=data.weather?.current;if(w){words.push(`Il fait ${Math.round(w.temperature_2m)} degrés, avec un ressenti de ${Math.round(w.apparent_temperature)} degrés.`);const p=data.weather.daily?.precipitation_probability_max?.[0];if(p!==undefined)words.push(`La probabilité de pluie aujourd’hui est de ${p} pour cent.`);}
  }
  const items=mode==='morning'?[]:data.news?.items?.slice(0,5)||[];
  if(items.length){words.push('Les titres à la une.');items.forEach((item,i)=>words.push(`${i+1}. ${item.title}`));words.push('Les articles complets sont disponibles auprès des sources indiquées à l’écran.');}
  else if(mode!=='morning')words.push('Les actualités ne sont pas disponibles pour le moment.');
  words.push('Je te souhaite une belle journée.');
  return words.join(' ').slice(0,6000);
}
function localWave(text,file,volume=65){return new Promise((resolve,reject)=>{
  const script=`[Console]::InputEncoding=[Text.Encoding]::UTF8; Add-Type -AssemblyName System.Speech; $speaker=New-Object System.Speech.Synthesis.SpeechSynthesizer; try { $voice=$speaker.GetInstalledVoices() | Where-Object {$_.VoiceInfo.Culture.Name -eq 'fr-FR'} | Select-Object -First 1; if($voice){$speaker.SelectVoice($voice.VoiceInfo.Name)}; $speaker.Volume=${Math.max(0,Math.min(100,Number.isFinite(Number(volume))?Number(volume):65))}; $speaker.Rate=-1; $speaker.SetOutputToWaveFile('${file.replace(/'/g,"''")}'); $speaker.Speak([Console]::In.ReadToEnd()); } finally { $speaker.Dispose() }`;
  const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,stdio:['pipe','ignore','pipe']});let err='';const timer=setTimeout(()=>{child.kill();reject(Error('La synthèse vocale a dépassé le délai prévu'));},90000);child.stderr.on('data',b=>err+=b);child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('close',code=>{clearTimeout(timer);code===0?resolve(file):reject(Error('Voix Windows indisponible. Installe une voix française dans les réglages de langue Windows.'));});child.stdin.end(text,'utf8');
});}
class SpeechError extends Error{constructor(status){super(({401:'Clé API Mistral refusée. Remplace la clé dans les options.',403:'Accès Mistral refusé pour ce modèle ou cet espace.',404:'Modèle ou voix Mistral indisponible.',429:'Limite Mistral atteinte. Réessaie plus tard.'})[status]||('Mistral indisponible (HTTP '+status+').'));this.status=status;}}
class AudioBriefing{
 constructor({getConfig,getData,decrypt,dataDir,fetcher=fetch,synthesize=localWave}){Object.assign(this,{getConfig,getData,decrypt,dataDir,fetcher,synthesize});this.previews=new Map();this.pending=false;this.lastStatus=null;}
 status(){const c=this.getConfig();return{provider:c.audioProvider,configured:!!c.mistralKey,last:this.lastStatus,fallback:c.audioFallbackLocal!==false};}
 async mistral(text,c){if(!c.mistralKey)throw Error('Ajoute ta clé API Mistral dans les options.');let key=(await this.decrypt(c.mistralKey)).trim().replace(/^Bearer\s+/i,'');if(/^(["']).*\1$/.test(key))key=key.slice(1,-1).trim();
  const r=await this.fetcher('https://api.mistral.ai/v1/audio/speech',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:'voxtral-mini-tts-3-0',input:text,voice_id:c.mistralVoice||'voice_592',response_format:'mp3'}),signal:AbortSignal.timeout(60000)});if(!r.ok)throw new SpeechError(r.status);
  let audio;if(r.headers.get('content-type')?.includes('json')){const body=await r.json();if(typeof body.audio_data!=='string')throw Error('Mistral n’a pas renvoyé de fichier audio.');audio=Buffer.from(body.audio_data,'base64');}else audio=Buffer.from(await r.arrayBuffer());
  if(audio.length<32||audio.length>20000000||!(audio.subarray(0,3).toString()==='ID3'||audio[0]===255&&(audio[1]&224)===224))throw Error('Le fichier MP3 renvoyé par Mistral est invalide.');return audio;
 }
 async test(){const c=this.getConfig();try{const audio=await this.mistral('Bonjour. La voix de Lumen est prête.',c);this.lastStatus={ok:true,provider:'mistral',audioBytes:audio.length,at:new Date().toISOString(),message:'Mistral répond. Audio généré, sans lecture.'};}catch(e){this.lastStatus={ok:false,provider:'mistral',status:e.status||null,at:new Date().toISOString(),message:e.message};}return this.lastStatus;}
 async preview(owner,mode,forceProvider){const c=this.getConfig(),provider=forceProvider||c.audioProvider;if(!['local','mistral'].includes(provider))throw Error('Active d’abord la lecture audio dans l’atelier.');if(!['news','briefing','morning','sample'].includes(mode))throw Error('Lecture inconnue');const text=mode==='sample'?'Bonjour. Je suis Lumen, ton compagnon de bureau. La météo, la maison et tes projets, à ton rythme.':publicBriefing(await this.getData(),mode),id=crypto.randomUUID();this.previews.set(id,{owner,text,provider,forceProvider,created:Date.now()});for(const[k,v]of this.previews)if(Date.now()-v.created>300000)this.previews.delete(k);return{id,text,provider};}
 async generate(owner,id){const plan=this.previews.get(id);if(!plan||plan.owner!==owner||Date.now()-plan.created>300000)throw Error('L’aperçu a expiré. Prépare une nouvelle lecture.');if(this.pending)throw Error('Une génération audio est déjà en cours.');const c=this.getConfig();if(!plan.forceProvider&&c.audioProvider!==plan.provider)throw Error('Le fournisseur a changé. Prépare un nouvel aperçu.');this.pending=true;
  try{const dir=path.join(this.dataDir,'audio');fs.mkdirSync(dir,{recursive:true});const digest=crypto.createHash('sha256').update('v4:'+plan.provider+plan.text+(c.mistralVoice||'voice_592')).digest('hex');let provider=plan.provider,file=path.join(dir,digest+(provider==='local'?'.wav':'.mp3')),warning=null;
   if(!fs.existsSync(file)){if(provider==='local')await this.synthesize(plan.text,file,100);else try{const audio=await this.mistral(plan.text,c);fs.writeFileSync(file,audio);this.lastStatus={ok:true,provider:'mistral',at:new Date().toISOString(),message:'Lecture Mistral disponible.'};}catch(e){this.lastStatus={ok:false,provider:'mistral',status:e.status||null,at:new Date().toISOString(),message:e.message};if(c.audioFallbackLocal===false)throw e;provider='local';warning=e.message+' La voix Windows prend le relais.';file=path.join(dir,digest+'-fallback.wav');if(!fs.existsSync(file))await this.synthesize(plan.text,file,100);}}
   const audio=fs.readFileSync(file);return{url:'data:audio/'+(provider==='local'?'wav':'mpeg')+';base64,'+audio.toString('base64'),volume:Math.max(0,Math.min(1,(Number.isFinite(Number(c.audioVolume))?Number(c.audioVolume):55)/100)),provider,warning};
  }finally{this.pending=false;}
 }
}
module.exports={publicBriefing,localWave,AudioBriefing,SpeechError};
