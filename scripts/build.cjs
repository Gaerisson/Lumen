const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const pkg=require('../package.json');

function copyTree(from,to,extensions){
 fs.mkdirSync(to,{recursive:true});
 for(const entry of fs.readdirSync(from,{withFileTypes:true})){
  const source=path.join(from,entry.name),target=path.join(to,entry.name);
  if(entry.isDirectory())copyTree(source,target,extensions);
  else if(entry.isFile()&&extensions.has(path.extname(entry.name)))fs.copyFileSync(source,target);
 }
}

async function build(){
 const out=path.resolve(root,process.env.LUMEN_OUTPUT||'dist/Lumen');
 const updating=process.argv.includes('--update');
 if(fs.existsSync(path.join(out,'Lumen.exe'))&&!updating)throw Error('Le dossier de sortie contient déjà un exécutable. Fermer Lumen puis utiliser --update.');
 if(updating&&!fs.existsSync(path.join(out,'Lumen.exe')))throw Error('Aucun Lumen.exe à mettre à jour. Lance une première compilation sans --update.');
 fs.mkdirSync(out,{recursive:true});
 if(!updating){
  // Electron 45 installs its pinned binary on first use, including a fresh CI.
  const runtime=path.dirname(require('electron'));
  fs.cpSync(runtime,out,{recursive:true});
 }
 const appDir=path.join(out,'resources/app');
 fs.mkdirSync(appDir,{recursive:true});
 // Remove former flat-layout code files when updating an older portable build.
 // User profiles live in out/data and are never traversed by this operation.
 for(const entry of fs.readdirSync(appDir,{withFileTypes:true})){
  if(entry.isFile()&&(/\.(js|cjs|html|css)$/.test(entry.name)||['icon.ico','icon.png'].includes(entry.name)))fs.unlinkSync(path.join(appDir,entry.name));
 }
 copyTree(path.join(root,'src'),path.join(appDir,'src'),new Set(['.js','.cjs','.html','.css']));
 copyTree(path.join(root,'assets'),path.join(appDir,'assets'),new Set(['.ico','.png','.jpg','.svg']));
 copyTree(path.join(root,'tests/smoke'),path.join(appDir,'tests/smoke'),new Set(['.js']));
 fs.writeFileSync(path.join(appDir,'package.json'),JSON.stringify({name:pkg.name,productName:pkg.productName,version:pkg.version,main:pkg.main}));
 fs.cpSync(path.join(root,'node_modules/ws'),path.join(appDir,'node_modules/ws'),{recursive:true});
 fs.rmSync(path.join(out,'resources/default_app.asar'),{force:true});
 if(!updating)fs.renameSync(path.join(out,'electron.exe'),path.join(out,'Lumen.exe'));
 const {rcedit}=await import('rcedit');
 await rcedit(path.join(out,'Lumen.exe'),{
  icon:path.join(root,'assets/icons/icon.ico'),
  'file-version':pkg.version+'.0','product-version':pkg.version+'.0',
  'version-string':{ProductName:pkg.productName,FileDescription:'Lumen · Bureau multi-écrans',CompanyName:pkg.author,OriginalFilename:'Lumen.exe'},
  'requested-execution-level':'asInvoker'
 });
 for(const file of['README.md','SECURITY.md','LICENSE'])fs.copyFileSync(path.join(root,file),path.join(out,file));
 copyTree(path.join(root,'docs'),path.join(out,'docs'),new Set(['.md','.jpg','.png','.svg']));
 console.log('Construit : '+path.join(out,'Lumen.exe'));
}
build().catch(error=>{console.error(error);process.exitCode=1;});
