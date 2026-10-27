const fs=require('node:fs');
function graphicsMode(file,{argv=process.argv,env=process.env}={}){
 if(argv.includes('--software-rendering')||env.LUMEN_SOFTWARE_RENDERING==='1')return 'software';
 try{if(fs.statSync(file).size<=2*1024*1024&&JSON.parse(fs.readFileSync(file,'utf8')).graphicsMode==='software')return 'software';}catch{}
 return 'auto';
}
function configureGraphics(app,mode){if(mode==='software')app.disableHardwareAcceleration();return mode;}
module.exports={graphicsMode,configureGraphics};
