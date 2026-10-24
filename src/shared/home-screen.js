function homeScreenConfig(current,displayId){
 const config=structuredClone(current),previous=config.windows.find(w=>w.id==='camera');
 if(previous&&!config.homeScreenBackup)config.homeScreenBackup=structuredClone(previous);
 const window={...previous,id:'camera',name:'Maison · Accueil',displayId,fullscreen:true,alwaysOnTop:true,frame:false,clickThrough:false,columns:1,rows:1,gap:0,overlay:false,tiles:[{type:'lounge',col:1,row:1,colSpan:1,rowSpan:1}]};
 delete window.layout;
 config.windows=config.windows.filter(w=>w.id!=='camera');config.windows.unshift(window);
 config.outdoorEnabled=true;config.outdoorPresentation='panel';config.outdoorShowSnapshots=false;
 return config;
}
module.exports={homeScreenConfig};
