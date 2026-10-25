const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const REPOSITORY='Gaerisson/Lumen',API='https://api.github.com/repos/'+REPOSITORY+'/releases/latest';
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
function installScript({appDir,archive,sha256,version,pid,restart=true}){
 if(!path.isAbsolute(appDir)||!path.isAbsolute(archive)||!/^[a-f0-9]{64}$/.test(sha256)||!/^\d+\.\d+\.\d+$/.test(version)||!Number.isInteger(pid)||pid<0)throw Error('Installation invalide');
 return `$ErrorActionPreference = 'Stop'
$target = [IO.Path]::GetFullPath(${ps(appDir)})
$archive = [IO.Path]::GetFullPath(${ps(archive)})
$stage = Join-Path ([IO.Path]::GetDirectoryName($archive)) ('stage-' + [Guid]::NewGuid().ToString('N'))
$backup = Join-Path ([IO.Path]::GetDirectoryName($archive)) ('backup-' + [Guid]::NewGuid().ToString('N'))
$status = Join-Path ([IO.Path]::GetDirectoryName($archive)) 'install-result.json'
$copied = [Collections.Generic.List[string]]::new()
$finished = $false
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
   if ($relative -match '^(data|test-results|\.git|updates)(/|$)') { throw 'Donnees privees dans archive' }
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
 if (${pid} -gt 0) { $process = Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if ($process) { if (-not $process.WaitForExit(120000)) { throw 'Lumen reste ouvert' } } }
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
 @{ok=$true;version=${ps(version)}} | ConvertTo-Json | Set-Content -LiteralPath $status -Encoding UTF8
} catch {
 foreach ($relative in $copied) {
  $destination = Join-Path $target $relative
  $saved = Join-Path $backup $relative
  if (Test-Path -LiteralPath $saved) { Copy-Item -LiteralPath $saved -Destination $destination -Force -ErrorAction SilentlyContinue } else { Remove-Item -LiteralPath $destination -Force -ErrorAction SilentlyContinue }
 }
 @{ok=$false;message='Installation impossible. La version precedente est conservee.'} | ConvertTo-Json | Set-Content -LiteralPath $status -Encoding UTF8
}
foreach ($folder in @($stage,$backup)) {
 $resolvedFolder = [IO.Path]::GetFullPath($folder)
 $updateRoot = [IO.Path]::GetDirectoryName($archive) + [IO.Path]::DirectorySeparatorChar
 if ($finished -and $resolvedFolder.StartsWith($updateRoot,[StringComparison]::OrdinalIgnoreCase) -and $resolvedFolder -ne $target -and [IO.Path]::GetFileName($resolvedFolder) -match '^(stage|backup)-[a-f0-9]{32}$') { Remove-Item -LiteralPath $resolvedFolder -Recurse -Force -ErrorAction SilentlyContinue }
}
if (${restart?'$true':'$false'} -and (Test-Path -LiteralPath (Join-Path $target 'Lumen.exe'))) { Start-Process -FilePath (Join-Path $target 'Lumen.exe') -WorkingDirectory $target -WindowStyle Hidden }
if (-not $finished) { exit 1 }
`;
}
class PortableUpdater{
 constructor({version,exe,dataDir,getConfig,fetcher=fetch,onChange=()=>{},dry=false}){Object.assign(this,{version,exe,dataDir,getConfig,fetcher,onChange,dry});this.folder=path.join(dataDir,'updates');this.state={status:'idle',current:version};this.available=null;this.ready=null;this.busy=null;this.timer=null;this.installRequested=false;
  try{const ready=JSON.parse(fs.readFileSync(path.join(this.folder,'ready.json'),'utf8'));if(newer(ready.version,version)&&/^[a-f0-9]{64}$/.test(ready.sha256)&&ready.name===`Lumen-${ready.version}-Windows-x64.zip`){this.ready=ready;this.state={...this.state,status:'ready',version:ready.version};}}catch{}
 }
 snapshot(){return{...this.state,supported:!this.dry&&process.platform==='win32'&&path.basename(this.exe).toLowerCase()==='lumen.exe',enabled:this.getConfig().autoUpdateEnabled!==false,installOnQuit:this.getConfig().autoUpdateInstallOnQuit!==false};}
 set(state){this.state={...this.state,...state};this.onChange(this.snapshot());return this.snapshot();}
 async check(){if(this.busy)return this.busy;if(this.ready)return this.snapshot();this.busy=(async()=>{this.set({status:'checking',error:null});try{const response=await this.fetcher(API,{headers:{Accept:'application/vnd.github+json','User-Agent':'Lumen/'+this.version},signal:AbortSignal.timeout(20000),redirect:'error'});if(!response.ok)throw Error('GitHub indisponible (HTTP '+response.status+').');this.available=releaseInfo(await response.json(),this.version);this.set({status:this.available?'available':'current',version:this.available?.version,checkedAt:new Date().toISOString()});}catch(e){this.set({status:'error',error:e.message});}return this.snapshot();})();try{return await this.busy;}finally{this.busy=null;}}
 async download(){if(this.busy)return this.busy;if(this.ready)return this.snapshot();if(!this.available)await this.check();if(!this.available)return this.snapshot();const asset=this.available;this.busy=(async()=>{fs.mkdirSync(this.folder,{recursive:true});for(const entry of fs.readdirSync(this.folder,{withFileTypes:true}))if(entry.isFile()&&/^Lumen-\d+\.\d+\.\d+-Windows-x64\.zip$/.test(entry.name)&&entry.name!==asset.name)fs.unlinkSync(path.join(this.folder,entry.name));const file=path.join(this.folder,asset.name),partial=file+'.part';this.set({status:'downloading',progress:0,error:null});try{const response=await this.fetcher(asset.url,{signal:AbortSignal.timeout(300000)});const final=new URL(response.url||asset.url);if(final.protocol!=='https:'||!['github.com','release-assets.githubusercontent.com','objects.githubusercontent.com'].includes(final.hostname)||!response.ok||!response.body)throw Error('Téléchargement GitHub impossible.');const fd=fs.openSync(partial,'w'),hash=crypto.createHash('sha256');let size=0,last=0;try{for await(const chunk of response.body){size+=chunk.length;if(size>asset.size)throw Error('Archive trop grande');hash.update(chunk);let offset=0;while(offset<chunk.length)offset+=fs.writeSync(fd,chunk,offset,chunk.length-offset);if(Date.now()-last>500){last=Date.now();this.set({progress:Math.round(size/asset.size*100)});}}}finally{fs.closeSync(fd);}if(size!==asset.size||hash.digest('hex')!==asset.sha256)throw Error('Vérification SHA-256 échouée.');fs.renameSync(partial,file);this.ready=asset;fs.writeFileSync(path.join(this.folder,'ready.json'),JSON.stringify(asset));this.set({status:'ready',version:asset.version,progress:100});}catch(e){fs.rmSync(partial,{force:true});this.set({status:'error',error:e.message});}return this.snapshot();})();try{return await this.busy;}finally{this.busy=null;}}
 canInstall(){return !!this.ready&&this.snapshot().supported;}
 install(){if(!this.canInstall())return false;const r=this.ready,script=path.join(this.folder,'install.ps1');fs.writeFileSync(script,installScript({appDir:path.dirname(this.exe),archive:path.join(this.folder,r.name),sha256:r.sha256,version:r.version,pid:process.pid}),{encoding:'utf8'});const child=spawn('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script],{detached:true,windowsHide:true,stdio:'ignore'});child.on('error',()=>{});child.unref();return true;}
 start(){if(this.dry)return;const run=async()=>{if(this.getConfig().autoUpdateEnabled===false)return;try{await this.check();if(this.state.status==='available')await this.download();}catch{this.set({status:'error',error:'Le dossier de Lumen doit être accessible en écriture.'});}};this.timer=setTimeout(()=>{run();this.interval=setInterval(run,6*3600000);this.interval.unref();},30000);this.timer.unref();}
 stop(){clearTimeout(this.timer);clearInterval(this.interval);}
}
module.exports={PortableUpdater,newer,releaseInfo,installScript};
