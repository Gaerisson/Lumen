(function(root){
 const entityId=/^\w+\.[a-z0-9_]+$/;
 function moduleOptions(input={}){const o={};if(input.title)o.title=String(input.title).slice(0,80);o.density=input.density==='compact'?'compact':'comfortable';o.view=['all','nodes','guests','vms','containers','backups'].includes(input.view)?input.view:'all';for(const k of ['showCpu','showMemory','showDisk','showStatus','showBackup'])o[k]=input[k]!==false;if(input.entityIds!==undefined&&(!Array.isArray(input.entityIds)||input.entityIds.length>64||input.entityIds.some(id=>typeof id!=='string'||!entityId.test(id))))throw Error('Choisis jusqu’à 64 entités valides');o.entityIds=[...new Set(input.entityIds||[])];o.computerId=String(input.computerId||'all').slice(0,100);o.newsCount=Math.max(1,Math.min(12,Math.round(Number(input.newsCount)||6)));return o;}
 function selectedModuleEntities(windows,type){return[...new Set((windows||[]).flatMap(w=>(w.tiles||[]).filter(t=>t.type===type).flatMap(t=>t.options?.entityIds||[])))].slice(0,128);}
 if(typeof module!=='undefined')module.exports={moduleOptions,selectedModuleEntities};else Object.assign(root,{moduleOptions,selectedModuleEntities});
})(globalThis);
