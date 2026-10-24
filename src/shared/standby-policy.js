function standbyNightHours(options={},now=new Date()){
 const hour=now.getHours()+now.getMinutes()/60,start=Number(options.standbyNightStart??22),end=Number(options.standbyNightEnd??7);return start===end?false:start<end?hour>=start&&hour<end:hour>=start||hour<end;
}
function standbyNight(options={},sunState,now=new Date()){
 if(options.standbyAppearance==='day')return false;if(options.standbyAppearance==='dark')return true;
 if(sunState==='above_horizon')return false;if(sunState==='below_horizon')return true;
 return standbyNightHours(options,now);
}
function standbyRoles(displays,camera,options={}){const seen=new Set();return[[camera,'home'],...(options.standbySecondaryEnabled===false?[]:displays.filter(d=>String(d.id)!==String(camera.id)).map(d=>[d,'codex']))].filter(([d])=>{if(!d||seen.has(String(d.id)))return false;seen.add(String(d.id));return true;}).map(([display,role])=>({display,role:options.standbyDisplayRoles?.[String(display.id)]||role})).filter(target=>target.role!=='off');}
if(typeof module!=='undefined')module.exports={standbyNight,standbyNightHours,standbyRoles};
