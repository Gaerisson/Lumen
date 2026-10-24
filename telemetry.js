const os=require('node:os');
class Telemetry{
 constructor(system=os,now=Date.now){this.system=system;this.now=now;this.points=[];this.previous=null;this.at=-Infinity;}
 snapshot(){const now=this.now();if(now-this.at>=2000){const cpus=this.system.cpus(),total=cpus.reduce((s,c)=>s+Object.values(c.times).reduce((a,b)=>a+b,0),0),idle=cpus.reduce((s,c)=>s+c.times.idle,0),before=this.previous,delta=before?total-before.total:0,cpu=delta>0?Math.max(0,Math.min(100,100*(1-(idle-before.idle)/delta))):null,totalRam=this.system.totalmem(),usedRam=Math.max(0,totalRam-this.system.freemem());this.at=now;this.previous={total,idle};this.value={name:this.system.hostname(),cpu,memory:totalRam>0?usedRam/totalRam*100:null,usedRam,totalRam,cores:cpus.length,uptime:this.system.uptime(),time:now};this.points.push({time:now,cpu,memory:this.value.memory});this.points=this.points.filter(p=>p.time>now-1800000).slice(-360);}return{...this.value,history:this.points};}
}
module.exports={Telemetry};
