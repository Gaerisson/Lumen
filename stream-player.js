function detectBlackBars(data,width,height){
 const row=[],col=[];let active=0;
 for(let y=0;y<height;y++){let n=0;for(let x=0;x<width;x++){const i=(y*width+x)*4,lit=Math.max(data[i],data[i+1],data[i+2])>23;if(lit){n++;col[x]=(col[x]||0)+1;active++;}}row[y]=n;}
 const full={left:0,top:0,right:0,bottom:0};if(active<width*height*.2)return full;
 let top=0,bottom=height-1,left=0,right=width-1;
 while(top<height-1&&row[top]<width*.065)top++;while(bottom>top&&row[bottom]<width*.065)bottom--;
 while(left<width-1&&(col[left]||0)<height*.065)left++;while(right>left&&(col[right]||0)<height*.065)right--;
 if(bottom-top<height*.3||right-left<width*.3)return full;
 return{left:Math.max(0,left-1)/width,top:Math.max(0,top-1)/height,right:Math.max(0,width-right-2)/width,bottom:Math.max(0,height-bottom-1)/height};
}
function enhanceVideo(options={}){
 if(window.__lumenVideoCleanup)window.__lumenVideoCleanup();
 const fit=options.fit||'soft',style=document.createElement('style');style.id='lumen-video-style';style.textContent=`html,body{margin:0!important;padding:0!important;width:100%!important;height:100%!important;overflow:hidden!important;background:#10131b!important}video:not(.lumen-video-backdrop){position:absolute!important;z-index:2!important;max-width:none!important;max-height:none!important;object-fit:fill!important;background:transparent!important;border:0!important;border-radius:0!important}body{display:block!important}.lumen-video-backdrop{position:fixed!important;object-fit:fill!important;filter:blur(30px) saturate(.75)!important;opacity:.42!important;z-index:0!important;pointer-events:none!important;background:#10131b!important}video-stream{display:block!important;position:relative!important;width:100%!important;height:100%!important;overflow:hidden!important}.info{z-index:3}.info .mode{display:none!important}`;document.head.append(style);
 let last=0,lastAdvance=Date.now(),backdrop=null,current=null,crop={left:0,top:0,right:0,bottom:0},candidate='',stable=0,polls=0;
 const analysis=document.createElement('canvas');analysis.width=192;analysis.height=108;const context=analysis.getContext('2d',{willReadFrequently:true}),shadowStyles=[];
 const find=()=>{let v=document.querySelector('video:not(.lumen-video-backdrop)');for(const host of document.querySelectorAll('*')){if(v)break;if(host.shadowRoot){const nested=host.shadowRoot.querySelector('video');if(nested){v=nested;if(!host.shadowRoot.querySelector('#lumen-video-style')){const s=style.cloneNode(true);host.shadowRoot.append(s);shadowStyles.push(s);}}}}return v;};
 const position=(v,background=false)=>{if(!v||!current?.videoWidth)return;const cw=innerWidth,ch=innerHeight,fx=1-crop.left-crop.right,fy=1-crop.top-crop.bottom,aspect=current.videoWidth*fx/(current.videoHeight*fy);let width=cw,height=cw/aspect;if((fit==='cover'||background)?height<ch:height>ch){height=ch;width=ch*aspect;}if(background){width*=1.08;height*=1.08;}const values={width:width/fx+'px',height:height/fy+'px',left:(cw-width)/2-width*crop.left/fx+'px',top:(ch-height)/2-height*crop.top/fy+'px','clip-path':`inset(${crop.top*100}% ${crop.right*100}% ${crop.bottom*100}% ${crop.left*100}%)`};for(const[k,val]of Object.entries(values))v.style.setProperty(k,val,'important');};
 const poll=()=>{const v=find();if(!v){window.__lumenCameraStatus={ready:false,stalledFor:(Date.now()-lastAdvance)/1000};return;}if(v!==current){current=v;last=0;lastAdvance=Date.now();crop={left:0,top:0,right:0,bottom:0};candidate='';stable=0;}if(v.currentTime!==last){last=v.currentTime;lastAdvance=Date.now();}
  if(options.trim!==false&&v.readyState>=2&&++polls%2===0)try{context.drawImage(v,0,0,192,108);const next=detectBlackBars(context.getImageData(0,0,192,108).data,192,108),key=JSON.stringify(next);if(key===candidate)stable++;else{candidate=key;stable=1;}if(stable>=2)crop=next;}catch{}
  if(fit==='soft'&&v.readyState>=2){if(!backdrop){backdrop=document.createElement('canvas');backdrop.className='lumen-video-backdrop';backdrop.width=480;backdrop.height=270;document.body.prepend(backdrop);}try{backdrop.getContext('2d').drawImage(v,0,0,480,270);}catch{}};
  position(v);position(backdrop,true);window.__lumenCameraStatus={ready:v.readyState>=2,time:v.currentTime,stalledFor:(Date.now()-lastAdvance)/1000,width:v.videoWidth,height:v.videoHeight,crop};};
 poll();const timer=setInterval(poll,2000);window.addEventListener('resize',poll);window.__lumenVideoCleanup=()=>{clearInterval(timer);window.removeEventListener('resize',poll);style.remove();for(const s of shadowStyles)s.remove();backdrop?.remove();};
}
function playerScript(options){return'(()=>{const detectBlackBars='+detectBlackBars.toString()+';('+enhanceVideo.toString()+')('+JSON.stringify(options)+')})()';}
if(typeof module!=='undefined')module.exports={enhanceVideo,detectBlackBars,playerScript};
