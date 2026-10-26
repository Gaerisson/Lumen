const fs=require('node:fs');
// Do not close Lumen merely because spawn() returned a ChildProcess: the helper
// must have extracted and validated the archive and checked destination access.
function waitForInstaller(child,{readyFile,cancelFile,timeout=60000,interval=150,launcher=false}){
 return new Promise(resolve=>{
  let done=false,timer;const finish=ok=>{if(done)return;done=true;clearTimeout(timer);clearTimeout(limit);child.removeListener('error',failed);child.removeListener('exit',exited);if(!ok)try{fs.writeFileSync(cancelFile,'cancel');}catch{}child.unref?.();resolve(ok);};
  const failed=()=>finish(false),exited=code=>{if(!launcher||code!==0)finish(false);},poll=()=>{if(fs.existsSync(readyFile))finish(true);else timer=setTimeout(poll,interval);};
  const limit=setTimeout(failed,timeout);child.once('error',failed);child.once('exit',exited);poll();
 });
}
function installerLauncher(runtime,script){const ps=s=>"'"+s.replaceAll("'","''")+"'",encoded=Buffer.from('& '+ps(script),'utf16le').toString('base64'),args='-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand '+encoded,command='Start-Process -FilePath '+ps(runtime)+' -ArgumentList '+ps(args)+' -WindowStyle Hidden -ErrorAction Stop | Out-Null';return['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(command,'utf16le').toString('base64')];}
module.exports={waitForInstaller,installerLauncher};
