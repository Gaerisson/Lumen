// Discovery contains identity only. Status still requires the private pairing key.
const dgram=require('node:dgram'),os=require('node:os'),crypto=require('node:crypto');
const PORT=32146,MAGIC='lumen-discovery-v1';
function addresses(){return Object.values(os.networkInterfaces()).flat().filter(n=>n.family==='IPv4'&&!n.internal);}
function broadcasts(){return [...new Set(['255.255.255.255',...addresses().map(n=>n.address.split('.').map((v,i)=>(Number(v)|(~Number(n.netmask.split('.')[i])&255))).join('.'))])];}
function identity(value){return{id:String(value.id||'').slice(0,80),name:String(value.name||'PC Lumen').slice(0,80),port:Math.max(1024,Math.min(65535,Number(value.port)||32145)),version:String(value.version||'').slice(0,24)};}
class RemoteDiscovery{
 async start(info,{port=PORT,host='0.0.0.0'}={}){await this.stop();const socket=dgram.createSocket({type:'udp4',reuseAddr:true});this.socket=socket;let last=0;
  socket.on('message',(bytes,from)=>{if(bytes.length>1024||Date.now()-last<40)return;try{const q=JSON.parse(bytes);if(q.protocol!==MAGIC||q.kind!=='find'||!/^\w{32}$/.test(q.nonce))return;last=Date.now();socket.send(JSON.stringify({protocol:MAGIC,kind:'host',nonce:q.nonce,...identity(info)}),from.port,from.address);}catch{}});
  try{await new Promise((resolve,reject)=>{socket.once('error',reject);socket.bind(port,host,resolve);});socket.on('error',()=>{});return socket.address();}catch(e){await this.stop();throw e;}
 }
 async stop(){const s=this.socket;this.socket=null;if(s)await new Promise(resolve=>{try{s.close(resolve);}catch{resolve();}});}
}
function findHosts({timeout=2400,targets=broadcasts(),port=PORT,excludeId=''}={}){return new Promise((resolve,reject)=>{const socket=dgram.createSocket('udp4'),nonce=crypto.randomBytes(16).toString('hex'),found=new Map();let timer,done=false;const finish=e=>{if(done)return;done=true;clearTimeout(timer);try{socket.close();}catch{}if(e)reject(Error('Recherche réseau indisponible. Tu peux saisir une adresse manuellement.'));else resolve([...found.values()].sort((a,b)=>a.name.localeCompare(b.name)));};socket.on('error',finish);socket.on('message',(bytes,from)=>{if(bytes.length>1024)return;try{const v=JSON.parse(bytes);if(v.protocol!==MAGIC||v.kind!=='host'||v.nonce!==nonce||!v.id||v.id===excludeId||!Number.isInteger(v.port)||v.port<1024||v.port>65535)return;found.set(v.id+'|'+from.address,{...identity(v),url:'http://'+from.address+':'+v.port});}catch{}});socket.bind(0,'0.0.0.0',()=>{socket.setBroadcast(true);const query=Buffer.from(JSON.stringify({protocol:MAGIC,kind:'find',nonce}));for(const address of targets)socket.send(query,port,address,()=>{});timer=setTimeout(()=>finish(),timeout);});});}
module.exports={RemoteDiscovery,findHosts,addresses,broadcasts,identity};
