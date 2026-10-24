function networkStats(history,minutes=60,now=Date.now()){
 const points=(history||[]).filter(p=>p.time>=now-minutes*60000&&p.time<=now).sort((a,b)=>a.time-b.time),latency=points.filter(p=>Number.isFinite(p.latency)).map(p=>p.latency),sorted=[...latency].sort((a,b)=>a-b),quantile=q=>sorted.length?sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*q))]:null;
 let variation=0;for(let i=1;i<latency.length;i++)variation+=Math.abs(latency[i]-latency[i-1]);const volume=key=>{let bytes=0,seconds=0;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dt=(b.time-a.time)/1000;if(dt>0&&dt<=120&&Number.isFinite(a[key])&&Number.isFinite(b[key])){bytes+=(a[key]+b[key])/2*dt*1e6/8;seconds+=dt;}}return seconds?{bytes,seconds}:null;};
 return{count:latency.length,median:sorted.length?(sorted[Math.floor((sorted.length-1)/2)]+sorted[Math.ceil((sorted.length-1)/2)])/2:null,p95:sorted.length?sorted[Math.ceil(sorted.length*.95)-1]:null,min:sorted[0]??null,max:sorted.at(-1)??null,variation:latency.length>1?variation/(latency.length-1):null,rx:volume('rx'),tx:volume('tx')};
}
function smoothNetworkPath(points){
 if(!points.length)return'';if(points.length===1)return'M'+points[0].join(',');
 const slopes=points.slice(1).map((b,i)=>{const a=points[i];return(b[1]-a[1])/Math.max(.001,b[0]-a[0]);}),tangents=points.map((p,i)=>{if(i===0)return slopes[0];if(i===points.length-1)return slopes.at(-1);const a=slopes[i-1],b=slopes[i];return a*b<=0?0:2*a*b/(a+b);});
 let d='M'+points[0].join(',');for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=(b[0]-a[0])/3,lo=Math.min(a[1],b[1]),hi=Math.max(a[1],b[1]),bound=y=>Math.max(lo,Math.min(hi,y));d+='C'+(a[0]+dx).toFixed(2)+','+bound(a[1]+tangents[i-1]*dx).toFixed(2)+','+(b[0]-dx).toFixed(2)+','+bound(b[1]-tangents[i]*dx).toFixed(2)+','+b.join(',');}return d;
}
if(typeof module!=='undefined')module.exports={networkStats,smoothNetworkPath};
