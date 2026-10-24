// Reconcile in place: moving an animated element out of the document restarts
// its CSS timeline, even when the same node is later inserted again.
const liveTemplates=new WeakMap();
function patchView(parent,html){if(liveTemplates.get(parent)===html)return;liveTemplates.set(parent,html);const template=document.createElement('template');template.innerHTML=html;patchChildren(parent,template.content);}
function liveKey(node){return node.nodeType===1?(node.getAttribute('data-live-key')||node.id||''):'';}
function compatible(a,b){return a&&a.nodeType===b.nodeType&&(a.nodeType!==1||a.nodeName===b.nodeName&&a.namespaceURI===b.namespaceURI)&&liveKey(a)===liveKey(b);}
function patchChildren(parent,next){let cursor=parent.firstChild;const keyed=new Map([...parent.childNodes].filter(liveKey).map(n=>[liveKey(n),n]));for(const fresh of [...next.childNodes]){const key=liveKey(fresh);let node=key?keyed.get(key):cursor;if(!compatible(node,fresh)){node=fresh.cloneNode(true);parent.insertBefore(node,cursor);}else{if(node!==cursor)parent.insertBefore(node,cursor);patchNode(node,fresh);}cursor=node.nextSibling;}while(cursor){const old=cursor;cursor=cursor.nextSibling;old.remove();}}
function patchNode(node,fresh){
 if(node.nodeType===3||node.nodeType===8){if(node.nodeValue!==fresh.nodeValue)node.nodeValue=fresh.nodeValue;return;}
 const hover=node.hasAttribute('data-network-plot')&&node.classList.contains('is-hovered');
 const thumb=node.hasAttribute('data-thumb')&&node.getAttribute('data-thumb')===fresh.getAttribute('data-thumb')&&node.querySelector('img');
 // Measurements belong to the layout engine, not to the incoming template.
 // Clearing them during polling collapses the grid for a frame.
 if(node.parentElement?.classList.contains('dashboard-grid')&&node.style.gridRowEnd)fresh.style.gridRowEnd=node.style.gridRowEnd;
 for(const a of [...node.attributes])if(!fresh.hasAttribute(a.name)&&!(hover&&a.name==='style')&&!(node.tagName==='DETAILS'&&a.name==='open'))node.removeAttribute(a.name);
 for(const a of fresh.attributes){
  if(hover&&a.name==='class')a.value+=' is-hovered';
  if(node.getAttribute(a.name)===a.value)continue;
  let old=node.getAttribute(a.name);if(a.name==='d'&&node.hasAttribute('data-smooth-path')){const running=node.getAnimations().filter(a=>a.id==='network-path');if(running.length){const current=getComputedStyle(node).d;const match=current?.match(/^path\("(.*)"\)$/);if(match)old=match[1];running.forEach(a=>a.cancel());}}node.setAttribute(a.name,a.value);
  if(a.name==='d'&&node.hasAttribute('data-smooth-path')&&old&&old.match(/[MLCQZ]/g)?.join('')===a.value.match(/[MLCQZ]/g)?.join('')&&!document.body.classList.contains('no-motion')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){try{node.getAnimations().filter(a=>a.id==='network-path').forEach(a=>a.cancel());const animation=node.animate([{d:'path("'+old+'")'},{d:'path("'+a.value+'")'}],{duration:850,easing:'cubic-bezier(.2,.7,.2,1)'});animation.id='network-path';}catch{}}
 }
 if(!thumb&&!(node.matches('[data-clock],[data-date],[data-elapsed],.network-tooltip')&&!fresh.childNodes.length))patchChildren(node,fresh);
}
