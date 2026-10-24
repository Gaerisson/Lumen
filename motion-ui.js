function motionAllowed(){return !document.body.classList.contains('no-motion')&&!matchMedia('(prefers-reduced-motion: reduce)').matches;}
function setLiveText(element,value){if(element&&element.textContent!==value)element.textContent=value;}
function syncMotionPreferences(){if(!motionAllowed())document.getAnimations().filter(a=>a.id==='card-switch'||a.id==='network-path').forEach(a=>a.cancel());}
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',syncMotionPreferences);
function animateCardSwitch(element){
 if(!element||!motionAllowed())return;
 element.getAnimations().filter(a=>a.id==='card-switch').forEach(a=>a.cancel());
 const animation=element.animate([{opacity:.55,transform:'translateY(9px) scale(.994)'},{opacity:1,transform:'none'}],{duration:440,easing:'cubic-bezier(.16,1,.3,1)'});
 animation.id='card-switch';
}
function weatherKind(code){
 const n=Number(code);if(code==null||!Number.isFinite(n))return'unknown';
 return n===0?'clear':n<=3?'cloudy':n<=48?'fog':n<=67?'rain':n<=77?'snow':n<=82?'rain':n<=86?'snow':'storm';
}
function weatherArtwork(current={}){
 const kind=weatherKind(current.weather_code),night=current.is_day===0;
 const sun='<g class="weather-sun"><circle cx="64" cy="46" r="17"/><g class="weather-rays"><path d="M64 17v-5m0 68v-5M35 46h-5m68 0h-5M43 25l-4-4m50 50l-4-4M43 67l-4 4m50-50l-4 4"/></g></g>';
 const moon='<path class="weather-moon" d="M78 24a24 24 0 1 0 14 39 23 23 0 0 1-27-33 26 26 0 0 1 13-6Z"/>';
 const cloud='<g class="weather-cloud"><path d="M39 77a15 15 0 0 1-1-30 23 23 0 0 1 43 0 15 15 0 1 1 6 30Z"/></g>';
 const drops='<g class="weather-drops">'+[46,62,78].map((x,i)=>'<path style="--drop:'+i+'" d="M'+x+' 87l-4 8"/>').join('')+'</g>';
 const flakes='<g class="weather-flakes">'+[46,62,78].map((x,i)=>'<path style="--drop:'+i+'" d="M'+x+' 86v8m-4-4h8m-7-3 6 6m0-6-6 6"/>').join('')+'</g>';
 const fog='<g class="weather-fog"><path d="M32 84h58m-52 8h44m-52 8h58"/></g>';
 const art=kind==='unknown'?'<circle class="weather-unknown" cx="64" cy="59" r="22"/>':kind==='clear'?(night?moon:sun):(kind==='cloudy'?(night?moon:sun):'')+cloud+(kind==='rain'?drops:kind==='snow'?flakes:kind==='fog'?fog:kind==='storm'?'<path class="weather-bolt" d="m65 82-10 14h10l-4 14 18-20H68l7-8"/>':'');
 return '<svg class="weather-art weather-'+kind+(night?' weather-at-night':'')+'" data-live-key="weather-art-'+kind+(night?'-night':'-day')+'" viewBox="0 0 128 120" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+art+'</svg>';
}
let newsDeckKey='',newsDeckPaused=false,newsDeckAt=Date.now();
function newsDeckMarkup(items=[]){
 const news=items.filter(i=>i.title).slice(0,4);if(!news.length)return'';
 const key=i=>i.url||i.link||i.title;
 if(!news.some(i=>key(i)===newsDeckKey))newsDeckKey=key(news[0]);
 return '<div class="ambient-news" data-live-key="ambient-news"><span class="eyebrow">À LA UNE</span><div class="news-deck" aria-live="off">'+news.map(i=>'<button class="news-slide'+(key(i)===newsDeckKey?' is-current':'')+'" data-live-key="headline-'+esc(key(i))+'" data-news-key="'+esc(key(i))+'" data-external="'+esc(i.url||i.link||'')+'" '+(key(i)!==newsDeckKey?'inert aria-hidden="true"':'')+'>'+esc(i.title)+'<span aria-hidden="true"> ↗</span></button>').join('')+'</div>'+(news.length>1?'<div class="news-deck-controls"><button data-news-step="-1" aria-label="Actualité précédente">‹</button><small class="news-deck-count">'+(news.findIndex(i=>key(i)===newsDeckKey)+1)+' / '+news.length+'</small><button data-news-step="1" aria-label="Actualité suivante">›</button><button data-news-pause aria-label="'+(newsDeckPaused?'Reprendre le défilement':'Mettre le défilement en pause')+'" aria-pressed="'+newsDeckPaused+'">'+(newsDeckPaused?'▷':'Ⅱ')+'</button></div>':'')+'</div>';
}
function advanceNewsDeck(step){
 const slides=[...document.querySelectorAll('[data-news-key]')];if(slides.length<2)return;
 const next=(Math.max(0,slides.findIndex(s=>s.dataset.newsKey===newsDeckKey))+step+slides.length)%slides.length;
 newsDeckKey=slides[next].dataset.newsKey;newsDeckAt=Date.now();
 for(let i=0;i<slides.length;i++){slides[i].classList.toggle('is-current',i===next);slides[i].inert=i!==next;if(i!==next)slides[i].setAttribute('aria-hidden','true');else slides[i].removeAttribute('aria-hidden');}
 setLiveText(document.querySelector('.news-deck-count'),(next+1)+' / '+slides.length);
}
let newsTimer=null;
function newsTick(){const deck=document.querySelector('.news-deck');if(document.hidden||!deck||newsDeckPaused||!motionAllowed()||deck.parentElement.matches(':hover,:focus-within')){newsDeckAt=Date.now();return;}if(Date.now()-newsDeckAt>=24000)advanceNewsDeck(1);}
function syncNewsTimer(){const enabled=!!document.querySelector('.news-deck')&&!document.hidden&&!document.body.classList.contains('surface-paused')&&motionAllowed();if(enabled&&newsTimer===null)newsTimer=setInterval(newsTick,1000);else if(!enabled&&newsTimer!==null){clearInterval(newsTimer);newsTimer=null;newsDeckAt=Date.now();}}
function bindMotion(){
 syncMotionPreferences();
 syncNewsTimer();
 document.querySelectorAll('[data-news-step]').forEach(b=>b.onclick=()=>advanceNewsDeck(Number(b.dataset.newsStep)));
 const pause=document.querySelector('[data-news-pause]');if(pause)pause.onclick=()=>{newsDeckPaused=!newsDeckPaused;newsDeckAt=Date.now();pause.textContent=newsDeckPaused?'▷':'Ⅱ';pause.setAttribute('aria-label',newsDeckPaused?'Reprendre le défilement':'Mettre le défilement en pause');pause.setAttribute('aria-pressed',String(newsDeckPaused));};
}
