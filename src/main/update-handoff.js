const fs=require('node:fs');
// Do not close Lumen merely because spawn() returned a ChildProcess: the helper
// must have extracted and validated the archive and checked destination access.
function waitForInstaller(child,{readyFile,cancelFile,timeout=60000,interval=150}){
 return new Promise(resolve=>{
  let done=false,timer;const finish=ok=>{if(done)return;done=true;clearTimeout(timer);clearTimeout(limit);child.removeListener('error',failed);child.removeListener('exit',failed);if(!ok)try{fs.writeFileSync(cancelFile,'cancel');}catch{}child.unref?.();resolve(ok);};
  const failed=()=>finish(false),poll=()=>{if(fs.existsSync(readyFile))finish(true);else timer=setTimeout(poll,interval);};
  const limit=setTimeout(failed,timeout);child.once('error',failed);child.once('exit',failed);poll();
 });
}
module.exports={waitForInstaller};
