const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const {installScript}=require('../../src/main/portable-updater.js');
const {resolvePowerShell}=require('../../src/main/update-runtime.js');
test('mise à jour Windows : installe, préserve data et refuse une archive traversante',{skip:process.platform!=='win32'},async()=>{
 const runtime=await resolvePowerShell();
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"lumen's-update-")),appDir=path.join(dir,'app'),archive=path.join(dir,'update.zip'),ps=s=>"'"+s.replaceAll("'","''")+"'";
 const run=source=>{const file=path.join(dir,'test.ps1');fs.writeFileSync(file,source.replace('} catch {','} catch { Write-Error $_ -ErrorAction Continue;'));return spawnSync(runtime,['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',file],{windowsHide:true,encoding:'utf8',timeout:30000});};
 function zip(bad=false){const script=`$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$zip=[IO.Compression.ZipFile]::Open(${ps(archive)},[IO.Compression.ZipArchiveMode]::Create)
try { foreach ($item in @(@{name='Lumen.exe';text='new runtime'},@{name='resources/app/package.json';text='{"version":"9.0.0","main":"src/main/main.js"}'},@{name='resources/app/node_modules/ws/index.js';text='short folder'},@{name='resources/app/src/main/main.js';text='new app'}${bad?",@{name='../escaped.txt';text='bad'}":''})) { $entry=$zip.CreateEntry($item.name);$writer=[IO.StreamWriter]::new($entry.Open());$writer.Write($item.text);$writer.Dispose() } } finally { $zip.Dispose() }`;const r=run(script);assert.equal(r.status,0,r.stderr);}
 try{fs.mkdirSync(path.join(appDir,'data'),{recursive:true});fs.writeFileSync(path.join(appDir,'Lumen.exe'),'old runtime');fs.writeFileSync(path.join(appDir,'data','settings.json'),'private config');zip();let sha256=crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex');let r=run(installScript({appDir,archive,sha256,version:'9.0.0',pid:0,restart:false}));assert.equal(r.status,0,r.stderr);assert.equal(fs.readFileSync(path.join(appDir,'Lumen.exe'),'utf8'),'new runtime');assert.equal(fs.readFileSync(path.join(appDir,'data','settings.json'),'utf8'),'private config');
 fs.unlinkSync(archive);zip(true);sha256=crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex');r=run(installScript({appDir,archive,sha256,version:'9.0.0',pid:0,restart:false}));assert.equal(r.status,1);assert.equal(fs.existsSync(path.join(dir,'escaped.txt')),false);assert.equal(fs.readFileSync(path.join(appDir,'Lumen.exe'),'utf8'),'new runtime');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('mise à jour Windows : prépare sans quitter, attend le processus puis installe ; annulation protège les fichiers',{skip:process.platform!=='win32'},async()=>{
 const {spawn}=require('node:child_process'),runtime=await resolvePowerShell(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'lumen-handoff-native-')),appDir=path.join(dir,'app'),archive=path.join(dir,'update.zip'),readyFile=path.join(dir,'ready.flag'),cancelFile=path.join(dir,'cancel.flag'),ps=s=>"'"+s.replaceAll("'","''")+"'";
 const wait=ms=>new Promise(r=>setTimeout(r,ms)),until=async fn=>{for(let i=0;i<200;i++){if(fn())return;await wait(50);}throw Error('Installer preparation timeout');};
 const run=source=>{const file=path.join(dir,'script.ps1');fs.writeFileSync(file,source);return spawn(runtime,['-NoProfile','-NonInteractive','-File',file],{windowsHide:true,stdio:['ignore','pipe','pipe']});};
 const complete=child=>new Promise((resolve,reject)=>{let stderr='';child.stderr.on('data',b=>stderr+=b);child.once('error',reject);child.once('exit',code=>resolve({code,stderr}));});
 let worker;
 try{
  fs.mkdirSync(path.join(appDir,'data'),{recursive:true});fs.writeFileSync(path.join(appDir,'Lumen.exe'),'old runtime');fs.writeFileSync(path.join(appDir,'data','settings.json'),'private settings');fs.writeFileSync(path.join(appDir,'data','Local State'),'private encryption context');
  const zip=run(`Add-Type -AssemblyName System.IO.Compression.FileSystem\n$z=[IO.Compression.ZipFile]::Open(${ps(archive)},'Create')\nforeach($i in @(@{name='Lumen/Lumen.exe';text='new runtime'},@{name='Lumen/resources/app/package.json';text='{"version":"9.0.0","main":"src/main/main.js"}'})){ $e=$z.CreateEntry($i.name);$w=[IO.StreamWriter]::new($e.Open());$w.Write($i.text);$w.Dispose() };$z.Dispose()`);assert.equal((await complete(zip)).code,0);
  const sha256=crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
  worker=spawn(process.execPath,['-e',"process.stdin.once('data',()=>process.exit(0));setInterval(()=>{},1000)"],{windowsHide:true,stdio:['pipe','ignore','ignore']});
  const helper=run(installScript({appDir,archive,sha256,version:'9.0.0',pid:worker.pid,restart:false,readyFile,cancelFile})),result=complete(helper);
  await until(()=>fs.existsSync(readyFile));assert.equal(fs.readFileSync(path.join(appDir,'Lumen.exe'),'utf8'),'old runtime');worker.stdin.end('quit');const installed=await result;assert.equal(installed.code,0,installed.stderr);assert.equal(fs.readFileSync(path.join(appDir,'Lumen.exe'),'utf8'),'new runtime');assert.equal(fs.readFileSync(path.join(appDir,'data','Local State'),'utf8'),'private encryption context');assert.equal(fs.readFileSync(path.join(appDir,'data','settings.json'),'utf8'),'private settings');
  fs.unlinkSync(readyFile);fs.writeFileSync(cancelFile,'cancel');const canceled=await complete(run(installScript({appDir,archive,sha256,version:'9.0.0',pid:0,restart:false,readyFile,cancelFile})));assert.equal(canceled.code,1);assert.equal(fs.existsSync(readyFile),false);assert.equal(fs.readFileSync(path.join(appDir,'Lumen.exe'),'utf8'),'new runtime');
 }finally{worker?.stdin?.end('quit');fs.rmSync(dir,{recursive:true,force:true});}
});
