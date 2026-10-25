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
