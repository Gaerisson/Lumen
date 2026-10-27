const path=require('node:path'),{Worker}=require('node:worker_threads');
class CodexFiles{
 constructor({disabled=false,root,onChange=()=>{},onHealth=()=>{},createWorker=(file,options)=>new Worker(file,options),now=Date.now,interval=5000,timeout=15000}={}){Object.assign(this,{disabled,root,onChange,onHealth,createWorker,now,interval,timeout});this.lastAttempt=-Infinity;this.seq=0;this.stopped=false;this.value={activity:{projects:[],error:disabled?'Suivi désactivé pendant les tests':'Lecture des projets en cours'},quota:null};}
 snapshot(){this.refresh();return this.value.activity;}
 quota(){this.refresh();return this.value.quota;}
 status(){return{pending:!!this.pending,worker:!!this.worker,lastReadAt:this.value.activity.observedAt||null,error:this.error||null,stats:this.stats||null};}
 refresh(){
  if(this.stopped||this.disabled)return Promise.resolve(this.value);if(this.pending)return this.pending.promise;if(this.now()-this.lastAttempt<this.interval)return Promise.resolve(this.value);this.lastAttempt=this.now();
  let resolve;const promise=new Promise(r=>resolve=r),id=++this.seq,timer=setTimeout(()=>this.fail('Lecture locale trop longue'),this.timeout);this.pending={id,promise,resolve,timer};
  try{if(!this.worker){const worker=this.createWorker(path.join(__dirname,'codex-files-worker.js'),{workerData:{root:this.root},resourceLimits:{maxOldGenerationSizeMb:128,maxYoungGenerationSizeMb:16}});this.worker=worker;
   worker.on('message',message=>{if(worker!==this.worker||message.id!==this.pending?.id)return;this.value={activity:message.activity,quota:message.quota};this.stats=message.stats;this.error=null;this.onHealth('codex-read',message.stats);this.finish();this.onChange();});
   worker.on('error',()=>{if(worker===this.worker)this.fail('Lecture locale interrompue');});worker.on('exit',()=>{if(worker===this.worker)this.fail('Lecteur local arrêté');});worker.unref?.();}
   this.worker.postMessage({id});
  }catch{this.fail('Lecteur local indisponible');}return promise;
 }
 finish(){const pending=this.pending;this.pending=null;if(pending){clearTimeout(pending.timer);pending.resolve(this.value);}}
 fail(message){this.error=message;this.lastAttempt=this.now()+25000;const worker=this.worker;this.worker=null;worker?.terminate()?.catch?.(()=>{});this.value={...this.value,activity:{...this.value.activity,error:message}};this.onHealth('codex-read-error');this.finish();this.onChange();}
 stop(){this.stopped=true;const worker=this.worker;this.worker=null;this.finish();worker?.terminate()?.catch?.(()=>{});}
}
module.exports={CodexFiles};
