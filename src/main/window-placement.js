const {placementPlan,pinWindow,migrateSelections}=require('../shared/display-placement.js');
const signature=d=>JSON.stringify([d.id,d.bounds,d.workArea,d.scaleFactor,d.rotation]);
class WindowPlacement{
 constructor({screen,getConfig,getWindows,save,onDisplaysReady=()=>{},later=setTimeout,cancel=clearTimeout}){Object.assign(this,{screen,getConfig,getWindows,save,onDisplaysReady,later,cancel});this.listeners=[];this.stopped=false;}
 plan(w){const all=this.screen.getAllDisplays();return placementPlan(w,all,all.length?this.screen.getPrimaryDisplay():null);}
 register(w,item){const plan=this.plan(w),win=item.win;item.placementSignature=plan.display?signature(plan.display):null;win._lumenDisplayFallback=!plan.matched;if(plan.matched){const bounds=plan.bounds;pinWindow(w,plan.display,bounds);}const deliberate=()=>{if(win._lumenStandby)return;item.placementRevision=(item.placementRevision||0)+1;win._lumenUserPlacement=true;win._lumenDisplayFallback=false;win._lumenRestoring=false;};for(const name of ['will-move','will-resize'])win.on(name,deliberate);return plan;}
 remember(w,win){if(win.isDestroyed()||win._lumenRestoring||win._lumenStandby||!win._lumenUserPlacement)return false;const d=this.screen.getDisplayMatching(win.getBounds());w.fullscreen=win.isFullScreen();const b=win.getNormalBounds();pinWindow(w,d,b);win._lumenBoundsBaseline=b;win._lumenDisplayFallback=false;win._lumenUserPlacement=false;const item=this.getWindows().get(w.id);if(item)item.placementSignature=signature(d);return true;}
 apply(w,item,plan){const win=item.win;if(win.isDestroyed())return;const revision=item.placementRevision=(item.placementRevision||0)+1;win._lumenRestoring=true;win._lumenDisplayFallback=!plan.matched;clearTimeout(item.timer);const visible=win.isVisible(),minimized=win.isMinimized();
  if(plan.matched)pinWindow(w,plan.display,plan.bounds);
  // While standby owns the window, update its saved base placement as well.
  if(item.standby){item.standby.saved.bounds={...plan.bounds};item.standby.saved.fullscreen=plan.fullscreen;}
  const fullscreen=item.standby?true:plan.fullscreen,bounds=item.standby?plan.display.bounds:plan.bounds;
  let finished=false;const onLeave=()=>this.later(finish,0),finish=()=>{if(finished||win.isDestroyed()||item.placementRevision!==revision)return;finished=true;win.removeListener('leave-full-screen',onLeave);win.setBounds(bounds);if(fullscreen)win.setFullScreen(true);if(minimized&&!win.isMinimized())win.minimize();if(!visible)win.hide();item.arrange?.();item.placementSignature=signature(plan.display);this.later(()=>{if(!win.isDestroyed()&&item.placementRevision===revision){win._lumenBoundsBaseline=win.getNormalBounds();win._lumenRestoring=false;}},900);};
  if(win.isFullScreen()){win.once('leave-full-screen',onLeave);win.setFullScreen(false);if(!finished)this.later(finish,900);}else finish();
 }
 reconcile(){if(this.stopped)return;const c=this.getConfig(),before=JSON.stringify(c);for(const w of c.windows||[]){const item=this.getWindows().get(w.id);if(item?.win._lumenUserPlacement)this.remember(w,item.win);}const all=this.screen.getAllDisplays();migrateSelections(c,all,all.length?this.screen.getPrimaryDisplay():null);
  for(const w of c.windows||[]){const item=this.getWindows().get(w.id),plan=this.plan(w);if(!plan.display||!item||item.win.isDestroyed())continue;const actual=this.screen.getDisplayMatching(item.win.getBounds()),wrongDisplay=String(actual.id)!==String(plan.display.id),wrongFullscreen=!item.standby&&item.win.isFullScreen()!==plan.fullscreen;if(item.win._lumenDisplayFallback!==!plan.matched||item.placementSignature!==signature(plan.display)||wrongDisplay||wrongFullscreen)this.apply(w,item,plan);else if(!item.win._lumenStandby)item.win._lumenRestoring=false;}
  if(JSON.stringify(c)!==before)this.save();if(all.length)this.onDisplaysReady();
 }
 start(){this.stopped=false;const update=()=>{for(const item of this.getWindows().values())if(!item.win.isDestroyed()&&!item.win._lumenUserPlacement)item.win._lumenRestoring=true;this.cancel(this.timer);this.timer=this.later(()=>this.reconcile(),1200);};for(const name of ['display-added','display-removed','display-metrics-changed']){this.screen.on(name,update);this.listeners.push([name,update]);}this.timer=this.later(()=>this.reconcile(),2000);}
 stop(){this.stopped=true;this.cancel(this.timer);for(const[name,listener]of this.listeners)this.screen.removeListener(name,listener);this.listeners=[];}
}
module.exports={WindowPlacement};
