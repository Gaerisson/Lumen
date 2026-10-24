function visible(win){return !!win&&!win.isDestroyed()&&win.isVisible()&&!win.isMinimized();}
function covers(front,back){return front.x<=back.x+1&&front.y<=back.y+1&&front.x+front.width>=back.x+back.width-1&&front.y+front.height>=back.y+back.height-1;}
class SurfaceScheduler{
 constructor({later=setTimeout,cancel=clearTimeout}={}){this.entries=new Map();this.later=later;this.cancel=cancel;this.timer=null;this.stopped=false;}
 add(win,{priority=0,getStreams=()=>[],getContents=()=>[],getInactiveContents=()=>[],onState=()=>{}}={}){
  if(this.stopped||this.entries.has(win))return;
  const entry={win,priority,getStreams,getContents,getInactiveContents,onState,last:new Map(),hooked:new Set()},schedule=()=>this.schedule();this.entries.set(win,entry);
  for(const name of ['show','hide','minimize','restore','resize','move','enter-full-screen','leave-full-screen'])win.on(name,schedule);
  win.once('closed',()=>{this.entries.delete(win);this.schedule();});
  win.webContents?.on('did-finish-load',()=>{entry.last.clear();this.schedule();});this.schedule();
 }
 schedule(){if(!this.stopped&&this.timer===null)this.timer=this.later(()=>{this.timer=null;this.sync();},30);}
 sync(){
  if(this.stopped)return;const entries=[...this.entries.values()],fronts=entries.filter(e=>e.priority>0&&visible(e.win));
  for(const e of entries){
   const shown=visible(e.win),covered=shown&&fronts.some(f=>f!==e&&f.priority>e.priority&&(!e.win.isAlwaysOnTop()||f.win.isAlwaysOnTop())&&covers(f.win.getBounds(),e.win.getBounds())),active=shown&&!covered;
   for(const stream of e.getStreams().filter(Boolean))stream.setActive?.(active,covered?'Écran temporaire':shown?'Visible':'Fenêtre masquée');
   for(const wc of e.getContents().filter(Boolean))if(!wc.isDestroyed()){
    if(!e.hooked.has(wc.id)){e.hooked.add(wc.id);wc.on('did-finish-load',()=>{e.last.delete(wc.id);this.schedule();});}
    if(e.last.get(wc.id)!==active){e.last.set(wc.id,active);wc.send('surface-active',active);}
   }
   for(const wc of e.getInactiveContents().filter(Boolean))if(!wc.isDestroyed()&&e.last.get(wc.id)!==false){e.last.set(wc.id,false);wc.send('surface-active',false);}
   e.onState(active);
  }
 }
 stop(){this.stopped=true;if(this.timer!==null)this.cancel(this.timer);this.timer=null;this.entries.clear();}
}
module.exports={SurfaceScheduler,covers,visible};
