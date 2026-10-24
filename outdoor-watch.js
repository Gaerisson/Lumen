const cameraFor=(id,cameras=['camera_exterieur','camera_exterieur_2'])=>[...cameras].sort((a,b)=>b.length-a.length).find(camera=>String(id).startsWith('binary_sensor.'+camera+'_')||String(id).startsWith('sensor.'+camera+'_'))||null;
class OutdoorWatch{
 constructor(){this.reset();}
 reset(){this.states=new Map();this.active=new Map();this.seen=new Set();this.ready=false;this.mutedUntil=0;this.startedAt=Date.now();}
 dismiss(now=Date.now(),seconds=300){this.active.clear();this.mutedUntil=now+seconds*1000;}
 step(home,options={},now=Date.now()){
  const allowed=new Set(options.outdoorCameras||['camera_exterieur','camera_exterieur_2']);
  if(!home?.connected){this.ready=false;this.states.clear();return this.snapshot(now);}
  for(const e of home.cameraActivity||[]){const camera=e.camera||cameraFor(e.id,[...allowed]);if(!allowed.has(camera)||!/_person_(occupancy|count)$/.test(e.id))continue;const old=this.states.get(e.id),changed=old?.state!==e.state||old?.changed!==e.changed,fresh=now-Date.parse(e.changed)>=-10000&&now-Date.parse(e.changed)<30000,count=/_count$/.test(e.id),on=e.state==='on'||count&&Number(e.state)>0;
   if(on&&changed&&(this.ready||fresh)&&(!count||!old||Number(e.state)>Number(old.state)))this.trigger({camera,key:e.id+':'+e.changed,label:'person'},options,now);
   this.states.set(e.id,{state:e.state,changed:e.changed});
  }this.ready=true;return this.snapshot(now);
 }
 ingest(events,options={},now=Date.now()){for(const e of events||[]){const start=(e.start??e.start_time)*1000,key=e.id;if(!key||this.seen.has(key))continue;this.seen.add(key);if(this.seen.size>500)this.seen.delete(this.seen.values().next().value);if((e.falsePositive??e.false_positive)||!Number.isFinite(start)||start<this.startedAt-3000||now-start>30000||start>now+10000)continue;this.trigger({camera:e.camera,key,label:e.label||'detection'},options,now);}return this.snapshot(now);}
 trigger(event,options={},now=Date.now()){if(event.label!=='person'||options.outdoorEnabled===false||now<this.mutedUntil||!(options.outdoorCameras||['camera_exterieur','camera_exterieur_2']).includes(event.camera))return;this.active.set(event.camera,{...event,at:now,until:now+Math.max(10,Math.min(300,Number(options.outdoorHoldSeconds)||45))*1000});}
 snapshot(now=Date.now()){for(const [key,e]of this.active)if(e.until<=now)this.active.delete(key);return[...this.active.values()].sort((a,b)=>b.at-a.at);}
}
module.exports={OutdoorWatch,cameraFor};
