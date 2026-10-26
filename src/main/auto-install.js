// The application stays open until a verified installer is ready to take over.
class AutoInstall {
 constructor({getConfig,getState,blockReason=()=>null,requestInstall,onChange=()=>{},now=Date.now,timers={setTimeout,clearTimeout},delay=60000}){Object.assign(this,{getConfig,getState,blockReason,requestInstall,onChange,now,timers,delay});this.stopped=true;this.deferredUntil=0;}
 snapshot(){return{installAutomatically:this.getConfig().autoUpdateInstall===true,autoInstallAt:this.deadline?new Date(this.deadline).toISOString():null,autoInstallPaused:this.paused||null,autoInstallDeferredUntil:this.deferredUntil>this.now()?new Date(this.deferredUntil).toISOString():null};}
 schedule(ms){this.timer=this.timers.setTimeout(()=>this.changed(),ms);this.timer?.unref?.();}
 changed(){
  this.timers.clearTimeout(this.timer);const c=this.getConfig(),s=this.getState();
  if(this.stopped||this.running||c.autoUpdateEnabled===false||c.autoUpdateInstall!==true||!s.supported||s.status!=='ready'||!s.runtimeReady||s.installError){this.deadline=null;this.paused=null;this.onChange();return;}
  if(this.deferredUntil>this.now()){this.deadline=null;this.paused='Reportée pendant une heure';this.schedule(this.deferredUntil-this.now());this.onChange();return;}
  this.paused=this.blockReason();
  if(this.paused){this.deadline=null;this.schedule(15000);this.onChange();return;}
  this.deadline=this.deadline||this.now()+this.delay;
  if(this.deadline>this.now()){this.schedule(this.deadline-this.now());this.onChange();return;}
  this.deadline=null;this.running=true;this.onChange();
  Promise.resolve().then(()=>this.requestInstall()).catch(()=>false).then(started=>{this.running=false;if(started){this.stop();this.onChange();return;}this.deferredUntil=this.now()+3600000;this.changed();});
 }
 defer(){this.deferredUntil=this.now()+3600000;this.deadline=null;this.changed();return this.snapshot();}
 start(){this.stopped=false;this.changed();}
 stop(){this.stopped=true;this.timers.clearTimeout(this.timer);this.deadline=null;this.paused=null;}
}
module.exports={AutoInstall};
