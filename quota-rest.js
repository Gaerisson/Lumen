function quotaRest(q,now=Date.now()){
 if(!q||!Number.isFinite(Date.parse(q.timestamp))||now-Date.parse(q.timestamp)>180000)return null;
 const blocked=[q.primary,q.secondary].filter(w=>w&&Number.isFinite(w.used_percent)&&w.used_percent>=100);if(!blocked.length)return null;
 const next=Math.max(...blocked.map(w=>Number(w.resets_at)*1000).filter(Number.isFinite));if(!Number.isFinite(next))return{blocked:true,progress:null,resetAt:null};
 const controlling=blocked.find(w=>Number(w.resets_at)*1000===next),duration=Number(controlling?.window_minutes)*60000;
 return{blocked:true,progress:duration>0?Math.max(0,Math.min(100,100*(1-(next-now)/duration))):null,resetAt:next};
}
if(typeof module!=='undefined')module.exports={quotaRest};
