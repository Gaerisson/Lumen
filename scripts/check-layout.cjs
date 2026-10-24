// Verify moved module imports and browser assets without starting any service.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),errors=[];
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):e.isFile()?[path.join(dir,e.name)]:[]);
const check=(from,reference)=>{
 if(!reference.startsWith('.'))return;
 const target=path.resolve(path.dirname(from),reference);
 if(!['','.js','.cjs','.json'].some(ext=>fs.existsSync(target+ext)))errors.push(path.relative(root,from)+' → '+reference);
};
for(const dir of['src','tests','scripts'])for(const file of walk(path.join(root,dir))){
 if(!/\.(js|cjs|html|css)$/.test(file))continue;
 const text=fs.readFileSync(file,'utf8');
 if(/\.(js|cjs)$/.test(file)){
  for(const match of text.matchAll(/require\((['"])(\.[^'"]+)\1\)/g))check(file,match[2]);
  for(const match of text.matchAll(/path\.(?:join|resolve)\(__dirname,\s*(['"])([^'"]+)\1\)/g)){
   if(/\.(?:js|cjs|html|css|ico|png)$/.test(match[2])&&!match[2].includes('test-results/'))check(file,match[2]);
  }
 }
 if(file.endsWith('.html'))for(const match of text.matchAll(/\b(?:src|href)="(\.[^"]+)"/g))check(file,match[1]);
}
const pkg=require('../package.json');
for(const required of[pkg.main,'src/main/preload.js','src/agent.cjs','assets/icons/icon.ico','docs/installation.md'])if(!fs.existsSync(path.join(root,required)))errors.push('Fichier requis absent : '+required);
const rootCode=fs.readdirSync(root).filter(f=>/\.(js|cjs|html|css|ico|png)$/.test(f));
if(rootCode.length)errors.push('Code ou ressource à la racine : '+rootCode.join(', '));
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log('Structure valide : imports, pages, ressources et points d’entrée.');
