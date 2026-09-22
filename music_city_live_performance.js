(function(root){
"use strict";

let active=null;
let applauseContext=null;

function dispatchSession(on,source){
  try{
    root.dispatchEvent(new CustomEvent("mce-audio-session",{detail:{active:Boolean(on),source:source||"live-performance"}}));
  }catch(error){}
  try{
    if(root.MusicCitySoundtrack){
      if(on&&root.MusicCitySoundtrack.pauseForSession)root.MusicCitySoundtrack.pauseForSession();
      if(!on&&root.MusicCitySoundtrack.resumeAfterSession)root.MusicCitySoundtrack.resumeAfterSession();
    }
  }catch(error){}
}

function ensureApplauseContext(){
  if(applauseContext)return applauseContext;
  const AudioContext=root.AudioContext||root.webkitAudioContext;
  if(!AudioContext)return null;
  try{applauseContext=new AudioContext()}catch(error){return null}
  return applauseContext;
}

function makeNoiseBuffer(context,duration){
  const frames=Math.max(1,Math.floor(context.sampleRate*duration));
  const buffer=context.createBuffer(1,frames,context.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<frames;i++)data[i]=Math.random()*2-1;
  return buffer;
}

function playClap(context,when,gainValue,panValue){
  const source=context.createBufferSource();
  source.buffer=makeNoiseBuffer(context,.065);
  const filter=context.createBiquadFilter();
  filter.type="bandpass";
  filter.frequency.value=1200+Math.random()*1700;
  filter.Q.value=.55+Math.random()*.8;
  const gain=context.createGain();
  gain.gain.setValueAtTime(.0001,when);
  gain.gain.exponentialRampToValueAtTime(Math.max(.015,gainValue),when+.008);
  gain.gain.exponentialRampToValueAtTime(.0001,when+.07);
  source.connect(filter);
  if(context.createStereoPanner){
    const pan=context.createStereoPanner();
    pan.pan.value=Math.max(-1,Math.min(1,panValue));
    filter.connect(pan);
    pan.connect(gain);
  }else{
    filter.connect(gain);
  }
  gain.connect(context.destination);
  source.start(when);
  source.stop(when+.08);
}

function playCrowdReaction(score){
  const context=ensureApplauseContext();
  const numeric=Math.max(0,Math.min(100,Number(score)||0));
  const standing=numeric>=82;
  const strong=numeric>=62;
  const duration=standing?4.4:strong?3.2:2.2;
  const label=standing?"STANDING OVATION":strong?"BIG APPLAUSE":"AUDIENCE APPLAUSE";
  if(!context)return Promise.resolve({label,duration,standing,strong});

  try{if(context.state==="suspended")context.resume().catch(()=>{})}catch(error){}
  const now=context.currentTime+.05;
  const density=standing?18:strong?12:8;
  for(let i=0;i<Math.floor(duration*density);i++){
    const when=now+(i/density)+(Math.random()*.11);
    const base=standing?.14:strong?.105:.075;
    playClap(context,when,base+Math.random()*.055,Math.random()*2-1);
  }
  if(standing){
    for(let i=0;i<5;i++){
      const osc=context.createOscillator();
      const gain=context.createGain();
      osc.type="sine";
      osc.frequency.setValueAtTime(1050+Math.random()*650,now+.45+i*.55);
      osc.frequency.exponentialRampToValueAtTime(1750+Math.random()*750,now+.8+i*.55);
      gain.gain.setValueAtTime(.0001,now+.45+i*.55);
      gain.gain.exponentialRampToValueAtTime(.025,now+.5+i*.55);
      gain.gain.exponentialRampToValueAtTime(.0001,now+.83+i*.55);
      osc.connect(gain);gain.connect(context.destination);
      osc.start(now+.45+i*.55);osc.stop(now+.86+i*.55);
    }
  }
  return new Promise(resolve=>setTimeout(()=>resolve({label,duration,standing,strong}),Math.round(duration*1000)));
}

function stop(reason){
  if(!active)return;
  const session=active;
  active=null;
  try{session.audio.pause()}catch(error){}
  try{session.audio.removeAttribute("src");session.audio.load()}catch(error){}
  if(session.url){try{URL.revokeObjectURL(session.url)}catch(error){}}
  dispatchSession(false,session.source);
  if(reason&&session.onStop)try{session.onStop(reason)}catch(error){}
}

async function play(options){
  const config=options&&typeof options==="object"?options:{};
  if(active)stop("replaced");
  if(!config.blob)throw new Error("This song has no saved audio to perform.");

  const audio=document.createElement("audio");
  audio.preload="auto";
  audio.playsInline=true;
  audio.volume=Number.isFinite(Number(config.volume))?Math.max(0,Math.min(1,Number(config.volume))):1;
  audio.dataset.mceLivePerformance="1";
  const url=URL.createObjectURL(config.blob);
  audio.src=url;

  const source=config.source||"live-performance";
  const session={audio,url,source,onStop:config.onStop||null};
  active=session;
  dispatchSession(true,source);

  let ended=false;
  let progressTimer=null;
  function clean(){
    if(progressTimer){clearInterval(progressTimer);progressTimer=null}
  }
  audio.addEventListener("timeupdate",()=>{
    if(config.onProgress){
      const duration=Number(audio.duration)||0;
      const current=Number(audio.currentTime)||0;
      const percent=duration>0?Math.max(0,Math.min(1,current/duration)):0;
      try{config.onProgress({current,duration,percent})}catch(error){}
    }
  });
  audio.addEventListener("error",()=>{
    if(ended)return;
    ended=true;clean();
    if(active===session)active=null;
    try{URL.revokeObjectURL(url)}catch(error){}
    dispatchSession(false,source);
    if(config.onError)config.onError(new Error("Music City could not play this song audio."));
  });
  audio.addEventListener("ended",async()=>{
    if(ended)return;
    ended=true;clean();
    if(active===session)active=null;
    try{URL.revokeObjectURL(url)}catch(error){}
    if(config.onTrackEnded)try{config.onTrackEnded()}catch(error){}
    const score=typeof config.getScore==="function"?config.getScore():Number(config.score)||0;
    const reaction=await playCrowdReaction(score);
    if(config.onReaction)try{config.onReaction(reaction)}catch(error){}
    dispatchSession(false,source);
    if(config.onComplete)try{config.onComplete(reaction)}catch(error){}
  });

  const context=ensureApplauseContext();
  if(context&&context.state==="suspended"){
    try{await context.resume()}catch(error){}
  }

  try{
    await audio.play();
  }catch(error){
    ended=true;clean();
    if(active===session)active=null;
    try{URL.revokeObjectURL(url)}catch(ignore){}
    dispatchSession(false,source);
    throw new Error("Tap START SET again if iPhone blocked the song from playing.");
  }

  if(config.onStart)try{config.onStart({audio})}catch(error){}
  progressTimer=setInterval(()=>{
    if(ended||audio.ended)return clean();
    if(config.onProgress){
      const duration=Number(audio.duration)||0;
      const current=Number(audio.currentTime)||0;
      const percent=duration>0?Math.max(0,Math.min(1,current/duration)):0;
      try{config.onProgress({current,duration,percent})}catch(error){}
    }
  },500);

  return session;
}

root.MusicCityLivePerformance={
  play,
  stop,
  playCrowdReaction,
  getActive(){return active}
};
})(window);
