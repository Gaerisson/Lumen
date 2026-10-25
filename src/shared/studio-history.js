class StudioHistory {
  constructor(limit=40){this.limit=limit;this.past=[];this.future=[];}
  push(value){const text=JSON.stringify(value);if(this.past.at(-1)!==text){this.past.push(text);if(this.past.length>this.limit)this.past.shift();}this.future=[];}
  undo(value){if(!this.past.length)return null;this.future.push(JSON.stringify(value));return JSON.parse(this.past.pop());}
  redo(value){if(!this.future.length)return null;this.past.push(JSON.stringify(value));return JSON.parse(this.future.pop());}
  clear(){this.past=[];this.future=[];}
}
function featuresForTile(tile){
 const key={quota:'codex',activity:'codex',energy:'home',bedroom:'home',frigate:'cameras',web:tile.videoEnhanced?'cameras':null}[tile.type]??tile.type;
 if(['network','sleep','nas','proxmox','sensors'].includes(key))return[key,'home'];
 return ['codex','computer','home','weather','cameras','morning','music','news','health'].includes(key)?[key]:[];
}
function newLayoutFeatures(windows,original){
 const counts=new Map(),signature=t=>t.type+'|'+!!t.videoEnhanced,added=[];
 for(const t of original.flatMap(w=>w.tiles))counts.set(signature(t),(counts.get(signature(t))||0)+1);
 // Geometry, names and entity edits preserve the user's disabled modules.
 for(const t of windows.flatMap(w=>w.tiles)){const key=signature(t),count=counts.get(key)||0;if(count)counts.set(key,count-1);else added.push(...featuresForTile(t));}
 return [...new Set(added)];
}
if(typeof module!=='undefined')module.exports={StudioHistory,featuresForTile,newLayoutFeatures};
