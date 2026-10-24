let layoutFrame=0;
const measuredCards=new Set();
function requestModuleLayout(){if(!layoutFrame)layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;layoutModules();});}
const moduleObserver=new ResizeObserver(requestModuleLayout);
function layoutModules(){
 const grids=[...document.querySelectorAll('.dashboard-grid')],wide=matchMedia('(min-width:800px)').matches,updates=[],observed=new Set();
 for(const grid of grids)for(const child of grid.children){
  const inner=child.firstElementChild;if(!inner)continue;
  observed.add(inner);
  updates.push([child,wide?'span '+Math.ceil((inner.offsetHeight+18)/28):'']);
 }
 // Read all heights before writing any grid spans; unchanged cards stay untouched.
 for(const [child,span]of updates)if(child.style.gridRowEnd!==span)child.style.gridRowEnd=span;
 for(const card of measuredCards)if(!observed.has(card)){moduleObserver.unobserve(card);measuredCards.delete(card);}
 for(const card of observed)if(!measuredCards.has(card)){moduleObserver.observe(card);measuredCards.add(card);}
}
let measuredWidth=0;
new ResizeObserver(()=>{if(document.body.clientWidth!==measuredWidth){measuredWidth=document.body.clientWidth;requestModuleLayout();}}).observe(document.body);
