const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
function findCodex(){
 const candidates=[process.env.CODEX_CLI_PATH,...(process.env.PATH||'').split(path.delimiter).map(p=>path.join(p,'codex.exe'))].filter(Boolean);
 const dir=path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'AppData/Local'),'OpenAI/Codex/bin');
 try{candidates.push(...fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>path.join(dir,e.name,'codex.exe')).filter(p=>fs.existsSync(p)).sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs));}catch{}
 return candidates.find(p=>fs.existsSync(p))||null;
}
function normalizeQuota(result,now=Date.now()){
 const q=result?.rateLimitsByLimitId?.codex||result?.rateLimits;
 if(!q||q.limitId&&q.limitId!=='codex')throw Error('Quota Codex indisponible');
 const window=v=>{if(!v)return null;const used=v.usedPercent??v.used_percent;if(used===null||used===undefined||!Number.isFinite(Number(used)))return null;return{used_percent:Number(used),window_minutes:v.windowDurationMins??v.window_minutes,resets_at:v.resetsAt??v.resets_at};};
 const primary=window(q.primary),secondary=window(q.secondary);if(!primary&&!secondary)throw Error('Quota Codex indisponible');
 return{primary,secondary,credits:q.credits?{hasCredits:q.credits.hasCredits??q.credits.has_credits,unlimited:q.credits.unlimited,balance:q.credits.balance}:null,timestamp:new Date(now).toISOString(),source:'Codex · relevé direct'};
}
class QuotaMonitor{
 constructor({readLocal=()=>null,onChange=()=>{},spawnProcess=spawn,locate=findCodex,now=Date.now,interval=60000,timeout=15000}={}){Object.assign(this,{readLocal,onChange,spawnProcess,locate,now,interval,timeout});this.pending=new Map();this.seq=0;this.localAt=-Infinity;this.lastAttempt=-Infinity;this.live=null;this.stopped=false;}
 snapshot(){const now=this.now();if(now-this.localAt>=15000){this.localAt=now;try{this.local=this.readLocal();}catch{}}const q=Date.parse(this.local?.timestamp)>Date.parse(this.live?.timestamp||0)?this.local:this.live||this.local;return q?{...q,refreshing:!!this.refreshing,refreshError:this.lastError||null}:null;}
 start(){if(this.timer||this.stopped)return;this.refresh();this.timer=setInterval(()=>this.refresh(),this.interval);this.timer.unref?.();}
 async connect(){
  if(this.connection)return this.connection;
  this.connection=(async()=>{const exe=this.locate();if(!exe)throw Error('Codex local introuvable');
   const child=this.child=this.spawnProcess(exe,['app-server','--listen','stdio://'],{windowsHide:true,shell:false,stdio:['pipe','pipe','ignore']});let buffer='';
   const lost=()=>{if(this.child!==child)return;this.child=null;this.connection=null;for(const p of this.pending.values())p.reject(Error('Connexion quota interrompue'));this.pending.clear();};child.on('error',lost);child.on('exit',lost);child.stdin.on('error',lost);
   child.stdout.on('data',chunk=>{buffer+=chunk;if(buffer.length>2097152){child.kill();lost();return;}let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);try{const message=JSON.parse(line),p=this.pending.get(message.id);if(message.method&&message.id!==undefined&&!p){const result=message.method.endsWith('/requestApproval')?{result:{decision:'decline'}}:{error:{code:-32601,message:'Cet outil nécessite le client Codex interactif'}};child.stdin.write(JSON.stringify({id:message.id,...result})+'\n');}if(p){this.pending.delete(message.id);message.error?p.reject(Error('Lecture du quota refusée')):p.resolve(message.result);}}catch{}}});
   await this.rpc('initialize',{clientInfo:{name:'lumen',title:'Lumen',version:'6.5.1'}});if(this.stopped)throw Error('Arrêt');child.stdin.write(JSON.stringify({method:'initialized',params:{}})+'\n');
  })();try{await this.connection;}catch(e){this.disconnect();throw e;}
 }
 rpc(method,params){return new Promise((resolve,reject)=>{const id=++this.seq,timer=setTimeout(()=>{this.pending.delete(id);reject(Error('Lecture du quota trop longue'));},this.timeout);const finish=fn=>value=>{clearTimeout(timer);fn(value);};this.pending.set(id,{resolve:finish(resolve),reject:finish(reject)});try{if(!this.child)throw Error('Connexion absente');this.child.stdin.write(JSON.stringify({id,method,...(params?{params}:{})})+'\n');}catch(e){this.pending.delete(id);clearTimeout(timer);reject(e);}});}
 refresh(force=false){
  if(this.stopped)return Promise.resolve(this.snapshot());if(this.refreshing)return this.refreshing;
  if(!force&&this.now()-this.lastAttempt<this.interval)return Promise.resolve(this.snapshot());this.lastAttempt=this.now();
  this.refreshing=(async()=>{try{await this.connect();this.live=normalizeQuota(await this.rpc('account/rateLimits/read'),this.now());this.lastError=null;}catch{this.lastError='Connexion au quota indisponible · nouvel essai automatique';this.disconnect();}finally{this.refreshing=null;this.onChange();}return this.snapshot();})();return this.refreshing;
 }
 disconnect(){const child=this.child;this.child=null;this.connection=null;for(const p of this.pending.values())p.reject(Error('Connexion fermée'));this.pending.clear();child?.kill();}
 stop(){this.stopped=true;clearInterval(this.timer);this.timer=null;this.disconnect();}
}
module.exports={QuotaMonitor,normalizeQuota,findCodex};
