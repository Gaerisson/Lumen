const entityNormalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function entitySuggestions(catalog,query,field,options={}){
 const tokens=entityNormalize(query).split(/[\s_.]+/).filter(Boolean),hints={power:/power|puissance|consommation/i,apparent:/apparent|sinsts|va$/i,alarm:/alarm_control_panel\./,bedroom:/climate\./,bedroomLight:/^(light|switch)\./,bedroomTemperature:/temperature|température/i,bedroomHumidity:/humidity|humidite/i,roomPresence:/occupancy|presence|motion/i,sleepEvent:/sleep|alarm|reveil/i,nextAlarm:/next.*alarm|prochain.*reveil/i,networkLatency:/latency|latence|ping/i,networkGateway:/gateway|passerelle|connect/i,networkWanDown:/download|wan.*rx|debit.*recu/i,networkWanUp:/upload|wan.*tx|debit.*emis/i,music:/media_player\./,nas:/nas|disk|volume|storage/i,proxmox:/proxmox|cpu|memory|memoire/i};
 return(catalog||[]).filter(e=>!options.platform||e.platform===options.platform).map(e=>{const text=entityNormalize([e.id,e.name,e.unit,e.platform,e.deviceClass].join(' '));return{...e,score:(hints[field]?.test(entityNormalize(e.id+' '+e.name))?20:0)+(field==='power'&&e.unit==='W'?15:0),matches:tokens.every(t=>text.includes(t))};}).filter(e=>e.matches).sort((a,b)=>b.score-a.score||String(a.name||a.id).localeCompare(String(b.name||b.id),'fr')).slice(0,options.limit||35);
}
if(typeof document!=='undefined'){
 let entityCatalog=[],serial=0,observer;
 const bound=new WeakSet(),multiBound=new WeakSet();
 const selectionFields={'a-bedroom-light':'bedroomLight','r-proxmox':'proxmox','nasEntities':'nas','circuitsEntities':'power','r-presenceEntities':'roomPresence'};
 function chipsFor(original){
  if(multiBound.has(original))return;multiBound.add(original);
  const multi=original.tagName==='SELECT',values=()=>multi?[...original.selectedOptions].map(o=>o.value):original.value.split(/[\n,]/).map(s=>s.trim()).filter(Boolean);
  const shell=document.createElement('div');shell.className='entity-multi';original.after(shell);original.hidden=true;
  const chips=document.createElement('div'),input=document.createElement('input');chips.className='entity-chips';input.placeholder='Rechercher et ajouter une entité…';input.dataset.entityField=selectionFields[original.id]||original.dataset.entity||'';input.dataset.entityMulti='true';shell.append(chips,input);
  const set=ids=>{if(multi){for(const id of ids)if(![...original.options].some(o=>o.value===id))original.add(new Option(entityCatalog.find(e=>e.id===id)?.name||id,id));for(const o of original.options)o.selected=ids.includes(o.value);}else original.value=ids.join('\n');original.dispatchEvent(new Event('change',{bubbles:true}));render();};
  const render=()=>{chips.replaceChildren();for(const id of [...new Set(values())]){const tag=document.createElement('button');tag.type='button';tag.className='entity-chip';tag.title=id+' · retirer';tag.textContent=(entityCatalog.find(e=>e.id===id)?.name||id)+' ×';tag.onclick=()=>set(values().filter(v=>v!==id));chips.append(tag);}};
  input.addEventListener('entity-picked',e=>{set([...new Set([...values(),e.detail.id])]);input.value='';input.focus();});original.addEventListener('change',render);render();
 }
 function bindOne(input){
  if(bound.has(input))return;bound.add(input);input.removeAttribute('list');input.autocomplete='off';input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');
  const wrap=document.createElement('div');wrap.className='entity-picker';input.before(wrap);wrap.append(input);
  const list=document.createElement('div');list.className='entity-results';list.id='entity-options-'+(++serial);list.setAttribute('role','listbox');list.hidden=true;wrap.append(list);input.setAttribute('aria-controls',list.id);
  let count=35,index=-1,rows=[],timer;
  const hide=()=>{list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');};
  const choose=e=>{input.value=e.id;const caption=input.closest('label')?.querySelector(':scope>small');if(caption)caption.textContent=e.name||e.id;hide();input.dispatchEvent(new Event('change',{bubbles:true}));input.dispatchEvent(new CustomEvent('entity-picked',{bubbles:true,detail:e}));};
  const draw=()=>{const field=input.dataset.entity||input.dataset.entityField||input.dataset.networkEntity||selectionFields[input.id]||'',query=input.value===input.defaultValue?'':input.value;rows=entitySuggestions(entityCatalog,query,field,{limit:count});index=-1;list.replaceChildren();
   const summary=document.createElement('small');summary.className='entity-result-summary';summary.textContent=entityCatalog.length+' entités · recherche par nom, identifiant ou intégration';list.append(summary);
   rows.forEach((e,i)=>{const button=document.createElement('button'),name=document.createElement('b'),detail=document.createElement('small');button.type='button';button.id=list.id+'-'+i;button.setAttribute('role','option');name.textContent=e.name||e.id;detail.textContent=e.id+(e.unit?' · '+e.unit:'')+(e.platform?' · '+e.platform:'');button.append(name,detail);button.onmousedown=event=>event.preventDefault();button.onclick=()=>choose(e);list.append(button);});
   if(!rows.length){const empty=document.createElement('p');empty.textContent=entityCatalog.length?'Aucun résultat. Essaie un autre nom.':'Connecte Home Assistant pour voir tes entités.';list.append(empty);}
   if(rows.length===count){const more=document.createElement('button');more.type='button';more.className='entity-more';more.textContent='Afficher davantage';more.onmousedown=e=>e.preventDefault();more.onclick=()=>{count+=35;draw();};list.append(more);}
   list.hidden=false;input.setAttribute('aria-expanded','true');
  };
  input.addEventListener('focus',()=>{count=35;draw();});input.addEventListener('input',()=>{clearTimeout(timer);count=35;timer=setTimeout(draw,100);});
  input.addEventListener('keydown',e=>{if(e.key==='Escape')hide();if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();if(list.hidden)draw();index=Math.max(0,Math.min(rows.length-1,index+(e.key==='ArrowDown'?1:-1)));const button=list.querySelector('#'+list.id+'-'+index);list.querySelectorAll('[role=option]').forEach(b=>b.setAttribute('aria-selected',String(b===button)));if(button){input.setAttribute('aria-activedescendant',button.id);button.scrollIntoView({block:'nearest'});}}if(e.key==='Enter'&&!list.hidden&&index>=0&&rows[index]){e.preventDefault();choose(rows[index]);}});
  wrap.addEventListener('focusout',()=>setTimeout(()=>{if(!wrap.contains(document.activeElement))hide();},0));
 }
 window.bindEntityPicker=function(catalog,scope=document){if(Array.isArray(catalog))entityCatalog=catalog;for(const original of scope.querySelectorAll('#nasEntities,#circuitsEntities,#r-proxmox,#r-presenceEntities,select[data-entity][multiple],textarea[data-entity]'))chipsFor(original);for(const input of scope.querySelectorAll('input[data-entity],input[data-entity-field],input[data-network-entity],input[list="ha-entities"],#a-bedroom-light,#haAlarm'))bindOne(input);
  if(!observer){observer=new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('input,select,textarea')||n.querySelector?.('input,select,textarea')))))window.bindEntityPicker(undefined);});observer.observe(document.querySelector('main')||document.body,{childList:true,subtree:true});}
 };
}
if(typeof module!=='undefined')module.exports={entitySuggestions};
