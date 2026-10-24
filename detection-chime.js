class DetectionChime{
 constructor(){this.seen=new Set();this.lastAt=-Infinity;this.mutedUntil=0;this.signal=null;this.seq=0;}
 consider(events,c={},context={}){const now=context.now??Date.now(),fresh=[];for(const e of events||[]){const key=e.camera+':'+e.key;if(this.seen.has(key))continue;this.seen.add(key);if(this.seen.size>500)this.seen.delete(this.seen.values().next().value);if(e.label==='person'&&now-e.at>=0&&now-e.at<8000)fresh.push(e);}if(!fresh.length||c.detectionSoundEnabled===false||context.hidden||context.alert||context.preview||now<this.mutedUntil)return null;if(context.night&&c.detectionNightMode==='mute')return null;const volume=context.night&&c.detectionNightMode!=='same'?c.detectionNightVolume??10:c.detectionVolume??25;if(Number(volume)<=0||now-this.lastAt<Math.max(5,Number(c.detectionCooldownSeconds)||30)*1000)return null;this.lastAt=now;return this.signal={id:++this.seq,created:now,tone:c.detectionTone||'soft',volume:Math.max(0,Math.min(1,Number(volume)/100))};}
 toggleMute(now=Date.now()){this.mutedUntil=this.mutedUntil>now?0:now+300000;this.signal=null;return this.mutedUntil;}
}
if(typeof module!=='undefined')module.exports={DetectionChime};
