function focusLayout(width,height,count,{snapshots=true}={}){const header=56,rail=snapshots?Math.round(Math.max(150,Math.min(230,height*.17))):0,gap=8,columns=count>1&&width>=1000?2:1,rows=Math.ceil(Math.max(1,count)/columns),area=height-header-rail;return{header,rail,views:Array.from({length:count},(_,i)=>({x:Math.round(i%columns*width/columns+gap),y:Math.round(header+Math.floor(i/columns)*area/rows+gap),width:Math.max(1,Math.floor(width/columns)-2*gap),height:Math.max(1,Math.floor(area/rows)-2*gap)}))};}
function focusGeometry(display,mode='fullscreen',count=1){
 const b=display.bounds;if(mode!=='panel')return{...b,fullscreen:true};
 const margin=Math.min(28,Math.round(Math.min(b.width,b.height)*.025)),width=Math.min(b.width-margin*2,Math.max(640,Math.min(1160,Math.round(b.width*.46)))),columns=count>1&&width>=1000?2:1,rows=Math.ceil(Math.max(1,count)/columns),height=Math.min(b.height-margin*2,720,Math.round(56+rows*((width/columns-16)*9/16+16)));
 return{x:b.x+b.width-width-margin,y:b.y+b.height-height-margin,width,height,fullscreen:false};
}
if(typeof module!=='undefined')module.exports={focusLayout,focusGeometry};
