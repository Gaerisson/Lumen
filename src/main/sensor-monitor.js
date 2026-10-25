const ENTITY=/^\w+\.[a-z0-9_]+$/;
function selectedSensors(windows){return [...new Set((windows||[]).flatMap(w=>(w.tiles||[]).filter(t=>t.type==='sensors').flatMap(t=>t.sensorIds||[])))].filter(id=>ENTITY.test(id)).slice(0,64);}
class SensorMonitor {
 constructor(){this.rows=new Map();}
 snapshot(states,ids,connected,now=Date.now()){
  for(const id of this.rows.keys())if(!ids.includes(id))this.rows.delete(id);
  return ids.map(id=>{
   const entity=states?.get(id),raw=String(entity?.state??''),valid=!!entity&&!['','unknown','unavailable'].includes(raw),value=valid?Number(raw):NaN;
   const row=this.rows.get(id)||{history:[],last:0};this.rows.set(id,row);
   if(connected&&now-row.last>=15000){row.last=now;row.history.push({time:now,value:Number.isFinite(value)?value:null});if(row.history.length>120)row.history.shift();}
   return{id,name:String(entity?.attributes?.friendly_name||id).slice(0,100),state:valid?raw.slice(0,160):null,unit:String(entity?.attributes?.unit_of_measurement||'').slice(0,20),deviceClass:entity?.attributes?.device_class,updated:entity?.last_updated||null,available:!!connected&&valid,missing:!entity,history:row.history};
  });
 }
}
module.exports={SensorMonitor,selectedSensors};
