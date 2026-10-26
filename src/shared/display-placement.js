// Display IDs can change after a reboot, a driver update or a docking change.
// Keep the preferred monitor distinct from a temporary visible fallback.
const rect=r=>r&&['x','y','width','height'].every(k=>Number.isFinite(r[k]))&&r.width>0&&r.height>0?{x:r.x,y:r.y,width:r.width,height:r.height}:null;
const label=s=>String(s||'').trim().toLocaleLowerCase();
function displayReference(d){return{id:d.id,label:String(d.label||'').slice(0,120),internal:typeof d.internal==='boolean'?d.internal:undefined,bounds:rect(d.bounds),workArea:rect(d.workArea)||rect(d.bounds),scaleFactor:Number(d.scaleFactor)||1};}
function pixels(d){const b=rect(d.bounds);return b?[b.width*(d.scaleFactor||1),b.height*(d.scaleFactor||1)].sort((a,b)=>a-b):null;}
function sameSize(a,b){const x=pixels(a),y=pixels(b);return !!x&&!!y&&x.every((n,i)=>Math.abs(n-y[i])<=Math.max(4,n*.015));}
function overlap(a,b){if(!a||!b)return 0;return Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));}
function boundsDisplay(bounds,displays){const b=rect(bounds);if(!b)return null;const ranked=displays.map(d=>({d,area:overlap(b,d.bounds)})).sort((a,b)=>b.area-a.area);return ranked[0]?.area>0&&ranked[0].area>(ranked[1]?.area||0)?ranked[0].d:null;}
function resolveDisplay(w,displays,primary){
 if(!displays.length)return{display:null,matched:false,reason:'unavailable'};
 const ref=w.displayRef,byId=displays.find(d=>String(d.id)===String(w.displayId??ref?.id));
 if(ref){
  const names=label(ref.label)?displays.filter(d=>label(d.label)===label(ref.label)):[];
  if(names.length===1)return{display:names[0],matched:true,reason:'label'};
  if(byId&&(!label(ref.label)||label(byId.label)===label(ref.label))&&(ref.internal===undefined||ref.internal===byId.internal))return{display:byId,matched:true,reason:'id'};
  let candidates=names.length?names:displays.filter(d=>!label(ref.label)&&sameSize(d,ref)&&(ref.internal===undefined||d.internal===ref.internal));
  if(!candidates.length&&ref.internal===true)candidates=displays.filter(d=>d.internal===true);
  if(candidates.length===1)return{display:candidates[0],matched:true,reason:'identity'};
  if(candidates.length>1){const d=boundsDisplay(ref.bounds,candidates);if(d)return{display:d,matched:true,reason:'geometry'};}
 }else{
  if(byId)return{display:byId,matched:true,reason:'legacy-id'};
  const geometric=boundsDisplay(w.bounds,displays);if(geometric)return{display:geometric,matched:true,reason:'legacy-bounds'};
  if(w.displayId===undefined&&Number.isInteger(w.display)&&displays[w.display])return{display:displays[w.display],matched:true,reason:'legacy-index'};
  if(w.displayId===undefined&&w.display===undefined)return{display:primary||displays[0],matched:true,reason:'default'};
 }
 return{display:displays.find(d=>String(d.id)===String(primary?.id))||displays[0],matched:false,reason:'fallback'};
}
function windowBounds(w,display){const area=rect(display.workArea)||display.bounds,b=rect(w.bounds),old=rect(w.displayRef?.workArea)||rect(w.displayRef?.bounds);const width=Math.min(area.width,Math.max(220,Math.round(b?.width||800))),height=Math.min(area.height,Math.max(120,Math.round(b?.height||600)));let x=b?.x??area.x+25,y=b?.y??area.y+25;
 if(b&&old){const ratio=(v,range)=>Math.max(0,Math.min(1,range>0?v/range:0));x=area.x+ratio(b.x-old.x,old.width-b.width)*Math.max(0,area.width-width);y=area.y+ratio(b.y-old.y,old.height-b.height)*Math.max(0,area.height-height);}
 return{x:Math.round(Math.max(area.x,Math.min(x,area.x+area.width-width))),y:Math.round(Math.max(area.y,Math.min(y,area.y+area.height-height))),width,height};
}
function pinWindow(w,display,bounds){if(bounds)w.bounds={...bounds};w.displayId=display.id;w.displayRef=displayReference(display);return w;}
function placementPlan(w,displays,primary){const match=resolveDisplay(w,displays,primary);if(!match.display)return match;const bounds=windowBounds(w,match.display);return{...match,bounds,fullscreen:!!w.fullscreen&&match.matched};}
function adoptSelections(next,previous,displays,primary){for(const w of next.windows||[]){const old=previous?.windows?.find(p=>p.id===w.id),selected=displays.find(d=>String(d.id)===String(w.displayId));if(selected&&(!old||String(old.displayId)!==String(w.displayId)))pinWindow(w,selected);else if(old?.displayRef&&!w.displayRef)w.displayRef=structuredClone(old.displayRef);}
 const keys=['intrusionDisplayId','wakeDisplayId','morningDisplayId','outdoorDisplayId','alertDisplayId'];next.displayRefs={...previous?.displayRefs,...next.displayRefs};for(const key of keys){const id=next[key];if(id===null||id===undefined||id===''){delete next.displayRefs[key];continue;}const d=displays.find(d=>String(d.id)===String(id));if(d&&(String(previous?.[key])!==String(id)||!next.displayRefs[key]))next.displayRefs[key]=displayReference(d);}return next;
}
function migrateSelections(config,displays,primary){const identities=new Map();for(const w of config.windows||[]){const oldId=w.displayId,plan=placementPlan(w,displays,primary);if(plan.matched){if(oldId!==undefined)identities.set(String(oldId),plan.display);pinWindow(w,plan.display,plan.bounds);}}
 config.displayRefs=config.displayRefs||{};for(const key of ['intrusionDisplayId','wakeDisplayId','morningDisplayId','outdoorDisplayId','alertDisplayId']){const id=config[key];if(id===undefined||id===null||id==='')continue;const ref=config.displayRefs[key],found=ref?resolveDisplay({displayId:id,displayRef:ref},displays,primary):null,d=found?.matched?found.display:!ref?identities.get(String(id))||displays.find(d=>String(d.id)===String(id)):null;if(d){config[key]=d.id;config.displayRefs[key]=displayReference(d);}}return config;
}
module.exports={displayReference,resolveDisplay,windowBounds,pinWindow,placementPlan,adoptSelections,migrateSelections,rect};
