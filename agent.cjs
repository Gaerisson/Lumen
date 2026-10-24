// Standalone, read-only remote sensor. Token is read from a private file, never
// from a command-line argument. No Home Assistant or Codex credentials are sent.
const fs=require('fs'),{Telemetry}=require('./telemetry'),{RemoteServer}=require('./remote');
const args=process.argv.slice(2),option=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
if(!option('--token-file')){console.error('Usage: node agent.cjs --token-file <private-file> [--host 127.0.0.1] [--port 32145]');process.exitCode=1;}else{const telemetry=new Telemetry(),server=new RemoteServer();server.start({token:fs.readFileSync(option('--token-file'),'utf8').trim(),host:option('--host','127.0.0.1'),port:Number(option('--port',32145)),snapshot:()=>({computer:telemetry.snapshot()})}).then(address=>console.log('Lumen Remote · '+address.address+':'+address.port)).catch(e=>{console.error(e.message);process.exitCode=1;});process.on('SIGINT',async()=>{await server.stop();process.exit();});}
