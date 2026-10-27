class RendererRecovery{
 constructor({record=()=>{},quitting=()=>false,delay=1500,now=Date.now,schedule=setTimeout,cancel=clearTimeout}={}){Object.assign(this,{record,quitting,delay,now,schedule,cancel});this.pending=new Map();this.history=new WeakMap();}
 gone(wc,details){if(this.quitting()||wc.isDestroyed()||!['crashed','oom','abnormal-exit'].includes(details.reason)||this.pending.has(wc))return;
  const recent=(this.history.get(wc)||[]).filter(t=>this.now()-t<300000);if(recent.length>=2){this.record('renderer-recovery-paused',{reason:'repeated-failure'});return;}
  recent.push(this.now());this.history.set(wc,recent);const timer=this.schedule(()=>{this.pending.delete(wc);if(this.quitting()||wc.isDestroyed())return;try{wc.reload();this.record('renderer-reload',{attempt:recent.length});}catch{this.record('renderer-reload-failed');}},this.delay);timer?.unref?.();this.pending.set(wc,timer);
 }
 stop(){for(const timer of this.pending.values())this.cancel(timer);this.pending.clear();}
}
module.exports={RendererRecovery};
