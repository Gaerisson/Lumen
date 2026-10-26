const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {resolvePowerShell}=require('./update-runtime.js');
const {waitForInstaller,installerLauncher}=require('./update-handoff.js');
const REPOSITORY='Gaerisson/Lumen',API='https://api.github.com/repos/'+REPOSITORY+'/releases/latest';
const AUTO_INTERVAL=10*60*1000,RETRY_INTERVALS=[60000,120000,300000,600000];
function newer(a,b){const parse=v=>{const m=/^v?(\d+)\.(\d+)\.(\d+)$/.exec(v||'');return m?m.slice(1).map(Number):null;},x=parse(a),y=parse(b);return !!x&&!!y&&x.some((v,i)=>v>y[i]&&x.slice(0,i).every((n,j)=>n===y[j]));}
function releaseInfo(release,current){
 if(release?.draft||release?.prerelease||!newer(release?.tag_name,current))return null;
 const version=release.tag_name.replace(/^v/,''),name='Lumen-'+version+'-Windows-x64.zip';
 const asset=release.assets?.find(a=>a.name===name),digest=asset?.digest;
 if(!asset||!/^sha256:[a-f0-9]{64}$/i.test(digest||''))throw Error('Cette version ne fournit pas de fichier Windows vérifiable.');
 const url=new URL(asset.browser_download_url);if(url.protocol!=='https:'||url.hostname!=='github.com'||url.pathname!==`/${REPOSITORY}/releases/download/${release.tag_name}/${name}`||url.search||url.hash)throw Error('Adresse de mise à jour invalide.');
 if(!Number.isFinite(asset.size)||asset.size<=0||asset.size>512*1024*1024)throw Error('Taille de mise à jour invalide.');
 return{version,name,url:url.href,size:asset.size,sha256:digest.slice(7).toLowerCase()};
}
const ps=s=>"'"+String(s).replaceAll("'","''")+"'";
function installScript({appDir,archive,sha256,version,pid,restart=true,readyFile,cancelFile}){
 if(!path.isAbsolute(appDir)||!path.isAbsolute(archive)||!/^[a-f0-9]{64}$/.test(sha256)||!/^\d+\.\d+\.\d+$/.test(version)||!Number.isInteger(pid)||pid<0)throw Error('Installation invalide');
 return `$ErrorActionPreference = 'Stop'
$target = [IO.Path]::GetFullPath(${ps(appDir)})
$archive = [IO.Path]::GetFullPath(${ps(archive)})
$stage = Join-Path ([IO.Path]::GetDirectoryName($archive)) ('stage-' + [Guid]::NewGuid().ToString('N'))
$backup = Join-Path ([IO.Path]::GetDirectoryName($archive)) ('backup-' + [Guid]::NewGuid().ToString('N'))
$status = Join-Path ([IO.Path]::GetDirectoryName($archive)) 'install-result.json'
$copied = [Collections.Generic.List[string]]::new()
$finished = $false
$readyFile = ${ps(readyFile||'')}
$cancelFile = ${ps(cancelFile||'')}
try {
 $hash = [Security.Cryptography.SHA256]::Create()
 $inputFile = [IO.File]::OpenRead($archive)
 try { $actualHash = [BitConverter]::ToString($hash.ComputeHash($inputFile)).Replace('-','').ToLower() } finally { $inputFile.Dispose(); $hash.Dispose() }
 if ($actualHash -ne ${ps(sha256)}) { throw 'Archive modifiee' }
 Add-Type -AssemblyName System.IO.Compression.FileSystem
 Add-Type -AssemblyName System.IO.Compression
 $zip = [IO.Compression.ZipFile]::OpenRead($archive)
 try {
  $entries = @($zip.Entries | Where-Object { $_.Name })
  $prefix = ''
  if (-not ($entries | Where-Object { $_.FullName -eq 'Lumen.exe' })) { $prefix = 'Lumen/' }
  $size = 0L
  foreach ($entry in $zip.Entries) {
   $raw = $entry.FullName.Replace('\\','/')
   if ($raw -match '(^/|:|(^|/)\\.\\.(/|$))' -or (($entry.ExternalAttributes -shr 16) -band 0xF000) -eq 0xA000) { throw 'Chemin archive refuse' }
   if (-not $raw.StartsWith($prefix,[StringComparison]::Ordinal)) { throw 'Structure archive invalide' }
   $relative = $raw.Substring($prefix.Length)
   if ($relative -match '^(data|test-results|\\.git|updates)(/|$)') { throw 'Donnees privees dans archive' }
   $resolved = [IO.Path]::GetFullPath((Join-Path $stage $relative))
   if (-not ($resolved.StartsWith($stage + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or $resolved -eq $stage)) { throw 'Chemin hors destination' }
   $size += $entry.Length
   if ($size -gt 2147483648L) { throw 'Archive trop grande' }
  }
  if (-not ($entries | Where-Object { $_.FullName -eq ($prefix + 'Lumen.exe') }) -or -not ($entries | Where-Object { $_.FullName -eq ($prefix + 'resources/app/package.json') })) { throw 'Application manquante' }
  [IO.Directory]::CreateDirectory($stage) | Out-Null
  foreach ($entry in $entries) {
   $file = Join-Path $stage $entry.FullName.Substring($prefix.Length)
   [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($file)) | Out-Null
   [IO.Compression.ZipFileExtensions]::ExtractToFile($entry,$file,$false)
  }
 } finally { $zip.Dispose() }
 $package = Get-Content -LiteralPath (Join-Path $stage 'resources/app/package.json') -Raw | ConvertFrom-Json
 if ($package.version -ne ${ps(version)} -or $package.main -ne 'src/main/main.js') { throw 'Version application invalide' }
 if ($cancelFile -and (Test-Path -LiteralPath $cancelFile)) { throw 'Installation annulee' }
 [IO.Directory]::CreateDirectory($target) | Out-Null
 $probePath = Join-Path $target ('.lumen-update-' + [Guid]::NewGuid().ToString('N'))
 $probe = [IO.FileStream]::new($probePath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None,4096,[IO.FileOptions]::DeleteOnClose)
 $probe.Dispose()
 if ($readyFile) { [IO.File]::WriteAllText($readyFile,'ready') }
 if (${pid} -gt 0) {
  $process = Get-Process -Id ${pid} -ErrorAction SilentlyContinue
  if ($process) {
   $deadline = [DateTime]::UtcNow.AddSeconds(120)
   while (-not $process.WaitForExit(250)) {
    if (($cancelFile -and (Test-Path -LiteralPath $cancelFile)) -or [DateTime]::UtcNow -gt $deadline) { throw 'Lumen reste ouvert' }
   }
  }
 }
 if ($cancelFile -and (Test-Path -LiteralPath $cancelFile)) { throw 'Installation annulee' }
 foreach ($file in Get-ChildItem -LiteralPath $stage -File -Recurse) {
  $relative = $file.FullName.Substring($stage.Length + 1)
  $destination = [IO.Path]::GetFullPath((Join-Path $target $relative))
  if (-not $destination.StartsWith($target + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Destination refusee' }
  $saved = Join-Path $backup $relative
  if (Test-Path -LiteralPath $destination) { [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($saved)) | Out-Null; Copy-Item -LiteralPath $destination -Destination $saved }
  [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination)) | Out-Null
  $copied.Add($relative)
  Copy-Item -LiteralPath $file.FullName -Destination $destination -Force
 }
 $finished = $true
 @{ok=$true;version=${ps(version)};completedAt=[DateTime]::UtcNow.ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath $status -Encoding UTF8
} catch {
 foreach ($relative in $copied) {
  $destination = Join-Path $target $relative
  $saved = Join-Path $backup $relative
  if (Test-Path -LiteralPath $saved) { Copy-Item -LiteralPath $saved -Destination $destination -Force -ErrorAction SilentlyContinue } else { Remove-Item -LiteralPath $destination -Force -ErrorAction SilentlyContinue }
 }
 @{ok=$false;version=${ps(version)};message='Installation impossible. La sauvegarde est conservee.'} | ConvertTo-Json | Set-Content -LiteralPath $status -Encoding UTF8
}
foreach ($folder in @($stage,$backup)) {
 $resolvedFolder = [IO.Path]::GetFullPath($folder)
 $updateRoot = [IO.Path]::GetDirectoryName($archive) + [IO.Path]::DirectorySeparatorChar
 if (($finished -or [IO.Path]::GetFileName($resolvedFolder).StartsWith('stage-')) -and $resolvedFolder.StartsWith($updateRoot,[StringComparison]::OrdinalIgnoreCase) -and $resolvedFolder -ne $target -and [IO.Path]::GetFileName($resolvedFolder) -match '^(stage|backup)-[a-f0-9]{32}$') { Remove-Item -LiteralPath $resolvedFolder -Recurse -Force -ErrorAction SilentlyContinue }
}
if (${restart?'$true':'$false'} -and (-not $readyFile -or $finished -or $copied.Count -gt 0) -and (Test-Path -LiteralPath (Join-Path $target 'Lumen.exe'))) { Start-Process -FilePath (Join-Path $target 'Lumen.exe') -WorkingDirectory $target -WindowStyle Hidden }
if (-not $finished) { exit 1 }
`;
}
class PortableUpdater {
 constructor({version,exe,dataDir,getConfig,fetcher=fetch,onChange=()=>{},dry=false,spawnProcess=spawn,now=Date.now,timers={setTimeout,clearTimeout},resolveRuntime=resolvePowerShell,handoff=waitForInstaller}){
  Object.assign(this,{version,exe,dataDir,getConfig,fetcher,onChange,dry,spawnProcess,now,timers,resolveRuntime,handoff});
  this.folder=path.join(dataDir,'updates');this.state={status:'idle',current:version};this.available=null;this.ready=null;
  this.checkTask=null;this.downloadTask=null;this.autoTask=null;this.installRequested=false;this.stopped=true;this.failures=0;this.lastAttempt=0;this.retryAt=0;this.nextCheckAt=null;
  try{const journal=JSON.parse(fs.readFileSync(path.join(this.folder,'status.json'),'utf8'));this.notifiedVersion=journal.notifiedVersion;this.state.checkedAt=journal.checkedAt;this.state.lastAttemptAt=journal.lastAttemptAt;}catch{}
  try{const result=JSON.parse(fs.readFileSync(path.join(this.folder,'install-result.json'),'utf8').replace(/^\uFEFF/,''));if(result.ok&&result.version===version)this.state.lastInstall={version,completedAt:result.completedAt||null,verified:true};}catch{}
  try{
   const r=JSON.parse(fs.readFileSync(path.join(this.folder,'ready.json'),'utf8'));
   if(newer(r.version,version)&&/^[a-f0-9]{64}$/.test(r.sha256)&&r.name==='Lumen-'+r.version+'-Windows-x64.zip'){
    const file=fs.statSync(path.join(this.folder,r.name));if(!file.isFile()||file.size!==r.size)throw Error('Archive absente ou incomplète.');
    let result;try{result=JSON.parse(fs.readFileSync(path.join(this.folder,'install-result.json'),'utf8').replace(/^\uFEFF/,''));}catch{}
    if(result?.ok===false&&(!result.version||result.version===r.version)){this.blockedVersion=r.version;this.state={...this.state,status:'error',error:'La dernière installation a échoué. Tu peux retélécharger la version.',version:r.version};}
    else {this.ready=r;this.state={...this.state,status:'ready',version:r.version};}
   }
  }catch(e){if(e.code!=='ENOENT')this.state={...this.state,status:'error',error:'La mise à jour en attente doit être retéléchargée.'};}
 }
 archiveValid(){try{const file=fs.statSync(path.join(this.folder,this.ready.name));return file.isFile()&&file.size===this.ready.size;}catch{return false;}}
 snapshot(){if(this.ready&&!this.archiveValid()){this.ready=null;this.state={...this.state,status:'error',error:'L’archive de mise à jour doit être retéléchargée.'};}return{...this.state,runtimeReady:!!this.runtime,runtimeChecking:!!this.runtimeTask,installError:this.installError,nextCheckAt:this.nextCheckAt?new Date(this.nextCheckAt).toISOString():null,supported:!this.dry&&process.platform==='win32'&&path.basename(this.exe).toLowerCase()==='lumen.exe',enabled:this.getConfig().autoUpdateEnabled!==false,notify:this.getConfig().autoUpdateNotify!==false,installOnQuit:this.getConfig().autoUpdateInstallOnQuit!==false};}
 persistStatus(){try{fs.mkdirSync(this.folder,{recursive:true});const file=path.join(this.folder,'status.json');fs.writeFileSync(file+'.tmp',JSON.stringify({checkedAt:this.state.checkedAt,lastAttemptAt:this.state.lastAttemptAt,notifiedVersion:this.notifiedVersion}));fs.renameSync(file+'.tmp',file);}catch{}}
 shouldNotify(){return !!(this.state.status==='ready'&&this.ready&&this.runtime&&this.getConfig().autoUpdateNotify!==false&&this.notifiedVersion!==this.ready.version);}
 markNotified(){this.notifiedVersion=this.ready?.version;this.persistStatus();}
 set(state){this.state={...this.state,...state};this.onChange(this.snapshot());return this.snapshot();}
 check(){
  if(this.checkTask)return this.checkTask;if(this.state.status==='downloading')return Promise.resolve(this.snapshot());this.snapshot();if(this.ready)return Promise.resolve(this.snapshot());
  this.checkTask=Promise.resolve().then(async()=>{
   this.lastAttempt=this.now();this.set({status:'checking',error:null,progress:0,lastAttemptAt:new Date(this.lastAttempt).toISOString()});
   try{const response=await this.fetcher(API,{headers:{Accept:'application/vnd.github+json','User-Agent':'Lumen/'+this.version,'Cache-Control':'no-cache'},cache:'no-store',signal:AbortSignal.timeout(20000),redirect:'error'});
    if(!response.ok){const retry=Number(response.headers?.get('retry-after')),reset=Number(response.headers?.get('x-ratelimit-reset'));if(response.status===429||response.status===403&&response.headers?.get('x-ratelimit-remaining')==='0')this.retryAt=Math.max(this.now()+60000,retry>0?this.now()+retry*1000:reset>0?reset*1000:this.now()+15*60000);throw Error('GitHub indisponible (HTTP '+response.status+').');}this.available=releaseInfo(await response.json(),this.version);this.retryAt=0;
    this.set({status:this.available?'available':'current',version:this.available?.version,checkedAt:new Date(this.now()).toISOString()});
   }catch(e){this.available=null;this.set({status:'error',error:e.message==='fetch failed'?'Réseau indisponible. Une nouvelle tentative sera faite automatiquement.':e.message});}this.persistStatus();return this.snapshot();
  }).finally(()=>{this.checkTask=null;if(!this.autoTask&&!this.downloadTask)this.scheduleNext();});return this.checkTask;
 }
 download(){
  if(this.downloadTask)return this.downloadTask;
  this.downloadTask=Promise.resolve().then(async()=>{
   if(this.ready)return this.snapshot();if(!this.available)await this.check();if(!this.available)return this.snapshot();
   const asset=this.available,file=path.join(this.folder,asset.name),partial=file+'.part';
   this.set({status:'downloading',progress:0,error:null});
   try{
    fs.mkdirSync(this.folder,{recursive:true});
    for(const entry of fs.readdirSync(this.folder,{withFileTypes:true}))if(entry.isFile()&&/^Lumen-\d+\.\d+\.\d+-Windows-x64\.zip$/.test(entry.name)&&entry.name!==asset.name)fs.unlinkSync(path.join(this.folder,entry.name));
    const response=await this.fetcher(asset.url,{signal:AbortSignal.timeout(300000)}),final=new URL(response.url||asset.url);
    if(final.protocol!=='https:'||!['github.com','release-assets.githubusercontent.com','objects.githubusercontent.com'].includes(final.hostname)||!response.ok||!response.body)throw Error('Téléchargement GitHub impossible.');
    const fd=fs.openSync(partial,'w'),hash=crypto.createHash('sha256');let size=0,last=0;
    try{for await(const chunk of response.body){size+=chunk.length;if(size>asset.size)throw Error('Archive trop grande');hash.update(chunk);let offset=0;while(offset<chunk.length)offset+=fs.writeSync(fd,chunk,offset,chunk.length-offset);if(Date.now()-last>500){last=Date.now();this.set({progress:Math.round(size/asset.size*100)});}}}finally{fs.closeSync(fd);}
    if(size!==asset.size||hash.digest('hex')!==asset.sha256)throw Error('Vérification SHA-256 échouée.');
    fs.renameSync(partial,file);const manifest=path.join(this.folder,'ready.json');fs.writeFileSync(manifest+'.tmp',JSON.stringify(asset));fs.renameSync(manifest+'.tmp',manifest);
    fs.rmSync(path.join(this.folder,'install-result.json'),{force:true});this.ready=asset;this.blockedVersion=null;this.set({status:'ready',version:asset.version,progress:100});await this.prepareRuntime();
   }catch(e){try{fs.rmSync(partial,{force:true});}catch{}this.set({status:'error',error:e.message});}return this.snapshot();
  }).finally(()=>{this.downloadTask=null;if(!this.autoTask)this.scheduleNext();});return this.downloadTask;
 }
 prepareRuntime(){if(this.dry||process.platform!=='win32'||this.runtime&&!this.installError)return Promise.resolve(this.runtime);if(this.runtimeTask)return this.runtimeTask;this.runtime=null;this.installError=null;this.runtimeTask=Promise.resolve().then(()=>this.resolveRuntime()).then(file=>{this.runtime=file;}).catch(e=>{this.installError=e.message;}).finally(()=>{this.runtimeTask=null;this.onChange(this.snapshot());});return this.runtimeTask;}
 canInstall(){const s=this.snapshot();return !!this.ready&&s.supported&&s.runtimeReady;}
 async install({restart=true}={}){
  if(this.installTask)return this.installTask;
  if(!this.canInstall())return false;
  this.installTask=Promise.resolve().then(async()=>{try{const r=this.ready,script=path.join(this.folder,'install.ps1'),id=crypto.randomUUID(),readyFile=path.join(this.folder,'prepared-'+id+'.flag'),cancelFile=path.join(this.folder,'cancel-'+id+'.flag');fs.writeFileSync(script,installScript({appDir:path.dirname(this.exe),archive:path.join(this.folder,r.name),sha256:r.sha256,version:r.version,pid:process.pid,restart,readyFile,cancelFile}),{encoding:'utf8'});
   this.set({status:'preparing',error:null});this.installError=null;
   const powershell=this.runtime;
   const child=this.spawnProcess(powershell,installerLauncher(powershell,script),{detached:false,windowsHide:true,stdio:'ignore'});
   if(!await this.handoff(child,{readyFile,cancelFile,launcher:true}))throw Error('L’installateur Windows n’a pas pu préparer la mise à jour. Lumen reste ouvert ; vérifie l’espace disque et les droits du dossier.');
   this.set({status:'installing'});return true;
  }catch(e){this.installError=e.message||'Impossible de lancer l’installation Windows.';this.set({status:'ready',error:null});return false;}}).finally(()=>{this.installTask=null;});return this.installTask;
 }
 schedule(delay){this.timers.clearTimeout(this.timer);this.nextCheckAt=null;if(this.stopped||this.dry||this.getConfig().autoUpdateEnabled===false||this.ready)return;const wait=Math.max(0,delay,this.retryAt-this.now());this.nextCheckAt=this.now()+wait;this.timer=this.timers.setTimeout(()=>{this.nextCheckAt=null;this.runAutomatic();},wait);this.timer?.unref?.();}
 scheduleNext(){if(this.state.status==='error'){this.failures++;this.schedule(RETRY_INTERVALS[Math.min(this.failures-1,RETRY_INTERVALS.length-1)]);}else{this.failures=0;this.schedule(AUTO_INTERVAL);}this.onChange(this.snapshot());}
 runAutomatic(){
  if(this.autoTask)return this.autoTask;if(this.stopped||this.getConfig().autoUpdateEnabled===false)return Promise.resolve(this.snapshot());
  this.autoTask=Promise.resolve().then(async()=>{try{await this.check();if(!this.stopped&&this.getConfig().autoUpdateEnabled!==false&&this.state.status==='available'&&this.available?.version!==this.blockedVersion)await this.download();}catch{this.set({status:'error',error:'Le dossier de Lumen doit être accessible en écriture.'});}return this.snapshot();}).finally(()=>{this.autoTask=null;this.scheduleNext();});return this.autoTask;
 }
 async checkForUpdates(){await(this.getConfig().autoUpdateEnabled===false||this.dry||this.stopped?this.check():this.runAutomatic());if(this.ready)await this.prepareRuntime();return this.snapshot();}
 preferencesChanged(){this.stop();this.start({delay:0});return this.snapshot();}
 wake(){if(this.stopped||this.dry||this.getConfig().autoUpdateEnabled===false||this.ready||this.autoTask||this.checkTask||this.downloadTask)return;if(this.now()-this.lastAttempt>=120000)this.schedule(1000);}
 start({delay=8000}={}){this.stop();if(this.dry)return;this.stopped=false;this.schedule(delay);if(this.ready)this.prepareRuntime();this.onChange(this.snapshot());}
 stop(){this.stopped=true;this.timers.clearTimeout(this.timer);this.nextCheckAt=null;}
}
module.exports={PortableUpdater,newer,releaseInfo,installScript,AUTO_INTERVAL,RETRY_INTERVALS};
