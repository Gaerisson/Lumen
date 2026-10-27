const fs=require('node:fs'),{StringDecoder}=require('node:string_decoder');
const TAIL_BYTES=8*1024*1024,MAX_LINE=2*1024*1024;
class RecentSessionReader{
 constructor({compact=e=>e,maxFiles=16,tailBytes=TAIL_BYTES,maxLine=MAX_LINE}={}){Object.assign(this,{compact,maxFiles,tailBytes,maxLine});this.sessions=new Map();}
 read(file){const stat=fs.statSync(file);let s=this.sessions.get(file);if(!s||stat.size<s.position||stat.ino!==s.ino){const position=Math.max(0,stat.size-this.tailBytes);s={ino:stat.ino,position,partial:'',skipping:position>0,recentOnly:position>0,decoder:new StringDecoder('utf8'),events:[],start:null,end:null};}
  if(stat.size-s.position>this.tailBytes){s.position=stat.size-this.tailBytes;s.partial='';s.skipping=true;s.recentOnly=true;s.start=s.end=null;s.decoder=new StringDecoder('utf8');}
  this.sessions.delete(file);this.sessions.set(file,s);while(this.sessions.size>this.maxFiles)this.sessions.delete(this.sessions.keys().next().value);
  const fd=fs.openSync(file,'r');try{while(s.position<stat.size){const b=Buffer.alloc(Math.min(262144,stat.size-s.position)),n=fs.readSync(fd,b,0,b.length,s.position);if(!n)break;s.position+=n;let text=s.partial+s.decoder.write(b.subarray(0,n));s.partial='';
   if(s.skipping){const end=text.indexOf('\n');if(end<0)continue;text=text.slice(end+1);s.skipping=false;}
   const lines=text.split('\n');s.partial=lines.pop();if(s.partial.length>this.maxLine){s.partial='';s.skipping=true;}
   for(const line of lines){if(line.length>this.maxLine||!/(task_started|task_complete|task_aborted|turn_started|turn_complete|turn_aborted|custom_tool_call|function_call|"commentary")/.test(line))continue;
    try{const e=this.compact(JSON.parse(line)),p=e?.payload;if(!e||!p)continue;if(e.type==='event_msg'&&['task_started','turn_started'].includes(p.type)){s.start=e;s.end=null;}else if(e.type==='event_msg'&&['task_complete','turn_complete','turn_aborted','task_aborted'].includes(p.type))s.end=e;else{s.events.push(e);if(s.events.length>40)s.events.shift();}}catch{}}
  }}finally{fs.closeSync(fd);}return{events:[...s.events,s.start,s.end].filter(Boolean).sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp)),recentOnly:s.recentOnly};
 }
}
module.exports={RecentSessionReader,TAIL_BYTES,MAX_LINE};
