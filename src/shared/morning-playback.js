async function playMorningQueue({prepareTts,prepareRadio,playClip,current,radioEnabled}){const tts=await prepareTts();if(!current()||!tts)return;await playClip(tts,'tts');if(!current()||!radioEnabled)return;const radio=await prepareRadio();if(current()&&radio)await playClip(radio,'radio');}
if(typeof module!=='undefined')module.exports={playMorningQueue};
