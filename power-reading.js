// Shared by Home Assistant and the renderer. Active watts and apparent VA are
// intentionally kept separate; CCASN is a load-curve point, not live power.
function powerReading(entity, connected=true, now=Date.now()) {
  const id=entity?.id||entity?.entity_id||'',unit=entity?.unit||entity?.attributes?.unit_of_measurement||'',raw=entity?.state;
  const numeric=raw!==null&&raw!==undefined&&String(raw).trim()!==''&&Number.isFinite(Number(raw))?Number(raw):null;
  const factor=unit==='kW'?1000:unit==='W'?1:null;
  const value=numeric!==null&&factor!==null?numeric*factor:null;
  const stamp=[entity?.reported,entity?.last_reported,entity?.updated,entity?.last_updated,entity?.changed,entity?.last_changed].map(Date.parse).find(Number.isFinite);
  const timestamp=Number.isFinite(stamp)?new Date(stamp).toISOString():null,age=timestamp?Math.max(0,now-stamp):null;
  const curve=/(?:^|_)ccasn(?:_\d+)?$/.test(id),status=!connected?'offline':value===null?'unavailable':curve?'curve':age===null?'unconfirmed':age>120000?'stale':'live';
  return {id,source:entity?.name||entity?.attributes?.friendly_name||id||'Capteur non configuré',value,unit:'W',timestamp,status,kind:curve?'curve':'instant',label:curve?'Courbe de charge':'Consommation maison'};
}
if(typeof module!=='undefined')module.exports={powerReading};
