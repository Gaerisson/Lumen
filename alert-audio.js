// One playback owner per native alert window. No audio in previews or smoke tests.
const alertPlayer={key:null,ctx:null,timer:null,voice:null,stopped:false,voiceBusy:false};
function stopAlertAudio(){clearInterval(alertPlayer.timer);clearTimeout(alertPlayer.voiceTimer);alertPlayer.timer=null;alertPlayer.voice?.pause();alertPlayer.voice=null;alertPlayer.ctx?.close().catch(()=>{});alertPlayer.ctx=null;alertPlayer.key=null;alertPlayer.stopped=true;}
async function syncAlertAudio(){
  if(type!=='alert'||params.has('preview'))return;
  const a=state.alert,c=state.options||{};
  if(!a||a.muted){if(alertPlayer.key)stopAlertAudio();return;}
  const settings=JSON.stringify([a.key,c.alarmSound,c.wakeSound,c.alarmVoice,c.wakeVoice,c.alarmVolume,c.wakeVolume,c.alarmVoiceVolume,c.wakeVoiceVolume,c.escalateSeconds,c.wakeVoiceDelaySeconds,c.alarmTone,c.wakeTone]);
  if(alertPlayer.key===a.key&&alertPlayer.settings===settings)return;
  stopAlertAudio();alertPlayer.stopped=false;alertPlayer.key=a.key;alertPlayer.settings=settings;const key=a.key,wake=a.kind==='wake',sound=wake?c.wakeSound:c.alarmSound,max=Math.max(0,Math.min(1,(wake?c.wakeVolume:c.alarmVolume)/100));
  let pulses=0,lastSpoken=0;const voiceDelay=wake?Math.max(0,(Number(c.wakeVoiceDelaySeconds)||0)*1000-(Date.now()-Date.parse(a.startedAt))):0;
  const voice=async()=>{if(alertPlayer.stopped||alertPlayer.voiceBusy)return;alertPlayer.voiceBusy=true;lastSpoken=Date.now();try{const clip=await api('alarmSpeech',key);if(clip&&alertPlayer.key===key&&!alertPlayer.stopped){alertPlayer.voice=new Audio(clip.url);alertPlayer.voice.volume=clip.volume;await alertPlayer.voice.play();}}catch{message('Voix indisponible · signal sonore actif selon tes réglages.');}finally{alertPlayer.voiceBusy=false;}};
  if(wake?c.wakeVoice:c.alarmVoice)alertPlayer.voiceTimer=setTimeout(voice,voiceDelay);
  const pulse=()=>{
    if(alertPlayer.stopped)return;
    if(sound&&max>0){try{const ctx=alertPlayer.ctx||(alertPlayer.ctx=new AudioContext()),elapsed=Math.max(0,(Date.now()-Date.parse(a.startedAt))/1000),gain=max*(.2+.8*Math.min(1,elapsed/Math.max(10,Number(c.escalateSeconds)||60))),t=ctx.currentTime;ctx.resume();
      const notes=toneNotes(wake?c.wakeTone||'chime':a.kind==='presence'?'soft':c.alarmTone||'urgent');
      notes.forEach(n=>{const o=ctx.createOscillator(),g=ctx.createGain(),start=t+n.at;o.type='sine';o.frequency.setValueAtTime(n.hz,start);o.frequency.linearRampToValueAtTime(n.to,start+n.length);g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(gain*.24,start+.014);g.gain.exponentialRampToValueAtTime(.001,start+n.length);o.connect(g);g.connect(ctx.destination);o.start(start);o.stop(start+n.length+.01);});
    }catch{message('Le périphérique audio du PC est indisponible.');}}
    if(++pulses>1&&(wake?c.wakeVoice:c.alarmVoice)&&Date.now()-Date.parse(a.startedAt)>=(wake?Number(c.wakeVoiceDelaySeconds)||0:0)*1000&&Date.now()-lastSpoken>(wake?60000:30000))voice();
  };pulse();alertPlayer.timer=setInterval(pulse,wake?6500:4000);
}
window.addEventListener('beforeunload',()=>{stopAlertAudio();});
