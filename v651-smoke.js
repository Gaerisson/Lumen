const {BrowserWindow}=require('electron'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function runV651({action,windows,houseStep,engine,manager,getControl,getStandby,toggle,errors}){
 const checks=[],check=(label,value)=>{assert.ok(value,label);checks.push(label);};
 const until=async(fn,label)=>{for(let i=0;i<240;i++){if(await fn())return;await wait(75);}throw Error(label+' · '+JSON.stringify(BrowserWindow.getAllWindows().map(w=>({title:w.getTitle(),visible:w.isVisible(),loading:w.webContents.isLoading(),url:w.webContents.getURL()}))));};
 const actor=()=>{const c=getControl();return{sender:c.webContents,senderFrame:c.webContents.mainFrame};};
 try{
  await until(()=>getControl()?.isVisible(),'Atelier prêt');
  await until(()=>getControl().webContents.executeJavaScript('!!document.getElementById("a-standby-status")'),'État de veille dans les réglages');
  check('Réglages : état de veille et commande de reprise disponibles',await getControl().webContents.executeJavaScript('!!document.getElementById("a-resume")'));
  const cfg=(await action(actor(),'get')).config;Object.assign(cfg,{theme:'glass-aurora',standbyEnabled:true,standbyMode:'mascot',standbyDelaySeconds:10,haUrl:'',haToken:undefined,frigateUrl:'',newsUrl:'',latitude:null,longitude:null,entities:{},windows:[{id:'quota',name:'Quota de test',columns:1,rows:1,alwaysOnTop:false,fullscreen:false,bounds:{x:100,y:100,width:464,height:900},tiles:[{type:'quota',col:1,row:1,colSpan:1,rowSpan:1}]}]});await action(actor(),'save',cfg);await action(actor(),'openAll');
  const empty={connected:true,entities:{roomPresence:{state:'off'}}},t=Date.now();engine.reset();houseStep(empty,t);houseStep(empty,t+11000);
  check('Les réglages suspendent uniquement tant qu’ils sont ouverts',engine.idle&&!getStandby().active&&getStandby().holdUntil===0);
  const editor=getControl(),wc=editor.webContents;await action(actor(),'previewStandbyPair');await wait(200);const previews=BrowserWindow.getAllWindows().filter(w=>w!==editor&&w!==windows.get('quota').win);check('Aperçus créés sur les écrans',previews.length>0);
  editor.close();await until(()=>editor.isDestroyed(),'Fermeture réelle de l’atelier');check('Fermer les réglages détruit le rendu et tous les aperçus',wc.isDestroyed()&&previews.every(w=>w.isDestroyed())&&!getControl());
  houseStep(empty,t+12000);await until(()=>getStandby().active,'Retour automatique');check('La veille reprend sans délai de 30 minutes après les réglages',getStandby().windows.length>0&&getStandby().holdUntil===0);
  getStandby().windows[0].minimize();await wait(200);check('Réduire volontairement la veille garde la pause manuelle',!getStandby().active&&getStandby().holdUntil>Date.now()+29*60000);
  manager();await until(()=>getControl()?.isVisible(),'Réouverture de l’atelier');await action(actor(),'resumeStandby');await until(()=>!getControl(),'Fermeture avant reprise');check('Reprendre la veille efface explicitement la pause',getStandby().holdUntil===0);houseStep(empty,t+13000);check('La veille redémarre après reprise explicite',getStandby().active);
  manager();await until(()=>getControl()?.isVisible(),'Atelier à nouveau prêt');check('Ouvrir l’atelier libère les écrans sans pause permanente',!getStandby().active&&getStandby().holdUntil===0);
  await action(actor(),'theme','glass-rose');check('Les réglages restent opaques même avec un thème glass',getControl().getBackgroundColor().toLowerCase().endsWith('10171d'));
  const old=getControl();old.hide();toggle();toggle();await wait(100);check('Afficher les widgets ne ressuscite pas les réglages masqués',!old.isVisible());old.close();
  manager();await until(()=>getControl()?.isVisible(),'Atelier prêt pour aperçu');await action(actor(),'previewStandby');const all=BrowserWindow.getAllWindows();toggle();toggle();await wait(100);check('Le raccourci global détruit les aperçus sans les rouvrir',all.filter(w=>!w.isDestroyed()).every(w=>w===getControl()||w===windows.get('quota').win));getControl().close();
  engine.reset();const late=new Date(2026,9,24,23).getTime(),dark={connected:true,entities:{roomPresence:{state:'on'},bedroomLight:{state:'off'}}};houseStep(dark,late);houseStep(dark,late+11000);check('Chambre occupée, lumière éteinte la nuit : veille automatique',engine.quiet&&getStandby().active);dark.entities.bedroomLight.state='on';houseStep(dark,late+12000);await wait(150);check('Rallumer la lumière quitte la veille',!getStandby().active);
  const item=windows.get('quota'),view=item.views[0].webContents;item.win.showInactive();await until(()=>view.getURL().includes('widget.html'),'Widget quota prêt');await wait(500);
  await view.executeJavaScript(`clearInterval(widgetPoll);state={theme:'glass-smoke',options:{},activity:{projects:[]},quota:{timestamp:new Date(Date.now()-3600000).toISOString(),primary:{used_percent:0,resets_at:Date.now()/1000-1}}};render();`);
  check('Une échéance passée n’invente pas un quota renouvelé',await view.executeJavaScript(`document.querySelector('.ring strong').textContent==='—'&&!!document.querySelector('[data-refresh-quota]')`));
  await view.executeJavaScript(`state.quota={timestamp:new Date().toISOString(),source:'Codex · relevé direct',primary:{used_percent:8,resets_at:Date.now()/1000+3600},secondary:{used_percent:29,resets_at:Date.now()/1000+86400},credits:{hasCredits:false,balance:'0'}};render();`);await wait(300);
  check('Un relevé direct remplace immédiatement le compteur expiré',await view.executeJavaScript(`document.querySelector('.ring strong').textContent==='92%'&&!document.querySelector('.countdown.expired')`));
  check('Disposition quota compacte sans débordement',await view.executeJavaScript('document.documentElement.scrollWidth<=innerWidth+1'));
  fs.writeFileSync(path.join(__dirname,'v651-quota.png'),(await view.capturePage()).toPNG());
  check('Aucune erreur de rendu durant les changements de fenêtre',errors.length===0);
  fs.writeFileSync(path.join(__dirname,'v651-smoke-result.json'),JSON.stringify({version:'6.5.1',checks,errors},null,2));
 }finally{for(const win of BrowserWindow.getAllWindows())if(!win.isDestroyed())win.destroy();}
 return checks;
}
module.exports={runV651};
