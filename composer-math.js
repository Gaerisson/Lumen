function tileRect(t,w){return w.layout==='free'&&t.rect?t.rect:{x:(t.col-1)/w.columns*100,y:(t.row-1)/w.rows*100,width:t.colSpan/w.columns*100,height:t.rowSpan/w.rows*100};}
function resizeRect(initial,dx,dy,handle='move'){
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v)),r={...initial};
 r.width=clamp(r.width,5,100);r.height=clamp(r.height,5,100);r.x=clamp(r.x,0,100-r.width);r.y=clamp(r.y,0,100-r.height);
 if(handle==='move'){r.x=clamp(r.x+dx,0,100-r.width);r.y=clamp(r.y+dy,0,100-r.height);}
 else{const right=r.x+r.width,bottom=r.y+r.height;if(handle.includes('w')){r.x=clamp(r.x+dx,0,right-5);r.width=right-r.x;}if(handle.includes('n')){r.y=clamp(r.y+dy,0,bottom-5);r.height=bottom-r.y;}if(handle.includes('e'))r.width=clamp(r.width+dx,5,100-r.x);if(handle.includes('s'))r.height=clamp(r.height+dy,5,100-r.y);}
 return Object.fromEntries(Object.entries(r).map(([k,v])=>[k,Math.round(v*1000)/1000]));
}
if(typeof module!=='undefined')module.exports={tileRect,resizeRect};
