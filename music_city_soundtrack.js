(function(root){
"use strict";

const STORAGE_KEY="mceSoundtrackStateV1";
const BLOCKED=[
  "record_music.html",
  "advanced_recording_studio.html",
  "live_freestyle.html",
  "music_city_feed.html"
];

const path=(location.pathname.split("/").pop()||"index.html").toLowerCase();
if(BLOCKED.includes(path)) return;

const zone=(()=>{
  if(/hip_hop|hiphop|warehouse/.test(path)) return "heights";
  if(/begenius|bedroom/.test(path)) return "studio";
  if(/nightclub|social/.test(path)) return "social";
  if(/sync_cinema/.test(path)) return "cinema";
  if(/avatar|manager/.test(path)) return "downtown";
  if(/music_city_radio/.test(path)) return "radio";
  return "city";
})();

const cues={
  city:{title:"Neon Boulevard",bpm:92,root:2,progression:[0,-3,-5,-2],bass:[0,0,-3,-5],hat:2,lead:[0,3,7,10,7,3],mood:"City Cruise"},
  heights:{title:"Heights After Dark",bpm:96,root:1,progression:[0,-5,-3,-2],bass:[0,-5,-3,-2],hat:2,lead:[0,7,3,10,7,5],mood:"Hip-Hop Heights"},
  studio:{title:"Studio District",bpm:86,root:4,progression:[0,-3,-5,-3],bass:[0,-3,-5,-3],hat:4,lead:[0,3,7,5,3,10],mood:"Lobby Session"},
  social:{title:"After Hours",bpm:104,root:9,progression:[0,-2,-5,-3],bass:[0,-2,-5,-3],hat:2,lead:[0,5,7,10,12,7],mood:"Nightlife"},
  cinema:{title:"Silver Screen Drive",bpm:82,root:7,progression:[0,-5,-2,-3],bass:[0,-5,-2,-3],hat:4,lead:[0,7,10,12,10,7],mood:"Sync District"},
  downtown:{title:"Downtown Ambition",bpm:90,root:0,progression:[0,-3,-2,-5],bass:[0,-3,-2,-5],hat:2,lead:[0,3,5,10,7,5],mood:"Career Mode"},
  radio:{title:"Music City Airwaves",bpm:94,root:5,progression:[0,-2,-5,-3],bass:[0,-2,-5,-3],hat:2,lead:[0,7,10,5,3,7],mood:"Music City Radio"}
};
const cue=cues[zone]||cues.city;

let state={muted:false,volume:.12,anchor:Date.now(),trackIndex:0,trackTime:0};
try{
  const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
  if(saved&&typeof saved==="object") state={...state,...saved};
}catch(e){}
if(!Number.isFinite(state.anchor)) state.anchor=Date.now();
if(!Number.isFinite(Number(state.volume))||Number(state.volume)<.06) state.volume=.12;
if(Number(state.volume)>.16) state.volume=.12;

let context=null,master=null,compressor=null,noiseBuffer=null;
let scheduler=null,nextTime=0,stepIndex=0,started=false,suppressed=false,sessionHold=false,lastError="";
let mediaAudio=null,mediaSaveTimer=null;
let widget=null,titleNode=null,modeNode=null,toggleNode=null,volumeNode=null,collapseTimer=null;

const catalog=Array.isArray(root.MusicCitySoundtrackCatalog)?root.MusicCitySoundtrackCatalog:[];
const realTracks=catalog.filter(t=>{
  if(!t||!t.src) return false;
  return !Array.isArray(t.zones)||!t.zones.length||t.zones.includes(zone)||t.zones.includes("all");
});

function saveState(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(e){}
}
function scheduleCollapse(delay){
  if(!widget) return;
  if(collapseTimer) clearTimeout(collapseTimer);
  collapseTimer=setTimeout(()=>{
    if(widget&&!widget.matches(":hover")&&!widget.contains(document.activeElement)) widget.classList.add("mce-collapsed");
  },Math.max(1200,delay||4800));
}
function wakeWidget(){
  if(!widget) return;
  widget.classList.remove("mce-collapsed");
  scheduleCollapse(4800);
}
function cycleVolume(){
  const levels=[.08,.12,.16];
  const current=Number(state.volume||.12);
  let next=levels.find(level=>level>current+.01);
  if(!next) next=levels[0];
  state.volume=next;
  state.muted=false;
  saveState();
  if(started) fadeTo(suppressed?0:state.volume,.18);
  renderWidget();
  wakeWidget();
}
function makeWidget(){
  if(widget) return;
  widget=document.createElement("div");
  widget.id="mceSoundtrackWidget";
  widget.innerHTML='<div class="mce-radio-icon" aria-hidden="true">📻</div><div class="mce-radio-copy"><strong>MUSIC CITY RADIO</strong><span class="mce-radio-title"></span><small class="mce-radio-mode"></small></div><button type="button" class="mce-radio-volume" aria-label="Change soundtrack volume">12%</button><button type="button" class="mce-radio-toggle" aria-label="Mute soundtrack">🔊</button>';
  const style=document.createElement("style");
  style.textContent=
    '#mceSoundtrackWidget{position:fixed;right:8px;top:max(6px,env(safe-area-inset-top));z-index:99999;display:grid;grid-template-columns:25px minmax(0,1fr) 38px 32px;align-items:center;gap:5px;width:min(270px,calc(100% - 16px));min-height:34px;padding:4px 5px;border:1px solid rgba(70,190,230,.34);border-radius:10px;background:rgba(3,9,18,.62);color:#fff;font-family:Arial,sans-serif;box-shadow:none;backdrop-filter:blur(12px);transition:width .22s ease,opacity .22s ease,background .22s ease}'+
    '#mceSoundtrackWidget .mce-radio-icon{font-size:15px;text-align:center}#mceSoundtrackWidget .mce-radio-copy{min-width:0}#mceSoundtrackWidget strong,#mceSoundtrackWidget span,#mceSoundtrackWidget small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
    '#mceSoundtrackWidget strong{font-size:6px;letter-spacing:.12em;color:#64ddff}#mceSoundtrackWidget span{font-size:9px;font-weight:900;line-height:1.05}#mceSoundtrackWidget small{color:#a8b8c8;font-size:6px;line-height:1.05}'+
    '#mceSoundtrackWidget button{height:26px;border:1px solid rgba(66,120,160,.65);border-radius:7px;background:rgba(7,20,34,.82);color:white;font-size:10px;font-weight:900;cursor:pointer;padding:0 4px}'+
    '#mceSoundtrackWidget .mce-radio-toggle{width:32px;font-size:12px}#mceSoundtrackWidget .mce-radio-volume{width:38px;font-size:8px}'+
    '#mceSoundtrackWidget.mce-collapsed{width:70px;grid-template-columns:25px 32px;opacity:.46;background:rgba(3,9,18,.38)}#mceSoundtrackWidget.mce-collapsed .mce-radio-copy,#mceSoundtrackWidget.mce-collapsed .mce-radio-volume{display:none}'+
    '#mceSoundtrackWidget:hover,#mceSoundtrackWidget:focus-within{opacity:1!important;background:rgba(3,9,18,.82)}'+
    '@media(max-width:520px){#mceSoundtrackWidget{right:6px;width:min(238px,calc(100% - 12px));grid-template-columns:23px minmax(0,1fr) 36px 30px;min-height:32px;padding:3px 4px}#mceSoundtrackWidget.mce-collapsed{width:66px;grid-template-columns:23px 30px}#mceSoundtrackWidget .mce-radio-icon{font-size:14px}#mceSoundtrackWidget .mce-radio-toggle{width:30px;height:25px}#mceSoundtrackWidget .mce-radio-volume{width:36px;height:25px}}';
  document.head.appendChild(style);
  document.body.appendChild(widget);
  titleNode=widget.querySelector(".mce-radio-title");
  modeNode=widget.querySelector(".mce-radio-mode");
  toggleNode=widget.querySelector(".mce-radio-toggle");
  volumeNode=widget.querySelector(".mce-radio-volume");
  toggleNode.addEventListener("click",event=>{
    event.preventDefault();
    event.stopPropagation();
    wakeWidget();
    if(!started){
      state.muted=false;
      saveState();
      unlock();
      return;
    }
    state.muted=!state.muted;
    saveState();
    if(state.muted) fadeTo(0,.16); else { unlock(); fadeTo(suppressed?0:state.volume,.22); }
    renderWidget();
  });
  volumeNode.addEventListener("click",event=>{
    event.preventDefault();
    event.stopPropagation();
    cycleVolume();
  });
  widget.addEventListener("pointerenter",wakeWidget);
  widget.addEventListener("pointerdown",wakeWidget);
  widget.addEventListener("focusin",wakeWidget);
  widget.addEventListener("pointerleave",()=>scheduleCollapse(1800));
  renderWidget();
  scheduleCollapse(5000);
}
function renderWidget(){
  if(!widget) return;
  const real=realTracks.length?realTracks[state.trackIndex%realTracks.length]:null;
  titleNode.textContent=real?(real.title||"Music City Soundtrack"):cue.title;
  modeNode.textContent=started?(suppressed?"Paused for other audio":(real?(real.artist||"Game Soundtrack"):cue.mood)):(lastError||"Tap ▶ to start music");
  toggleNode.textContent=!started?"▶":(state.muted?"🔇":"🔊");
  toggleNode.setAttribute("aria-label",!started?"Start soundtrack":(state.muted?"Unmute soundtrack":"Mute soundtrack"));
  if(volumeNode){
    volumeNode.textContent=Math.round(Number(state.volume||.20)*100)+"%";
    volumeNode.setAttribute("aria-label","Soundtrack volume "+Math.round(Number(state.volume||.20)*100)+" percent. Tap to change.");
  }
}
function fadeTo(value,seconds){
  if(mediaAudio){
    mediaAudio.volume=Math.max(0,Math.min(1,value));
    return;
  }
  if(!master||!context) return;
  const now=context.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value,now);
  master.gain.linearRampToValueAtTime(Math.max(0,value),now+Math.max(.02,seconds||.2));
}
function freq(midi){return 440*Math.pow(2,(midi-69)/12)}
function buildNoise(){
  const len=Math.floor(context.sampleRate*.14);
  const b=context.createBuffer(1,len,context.sampleRate),d=b.getChannelData(0);
  let seed=7517;
  for(let i=0;i<len;i++){seed=(seed*16807)%2147483647;d[i]=(seed/1073741823.5)-1}
  return b;
}
function env(g,t,peak,attack,release){
  g.gain.setValueAtTime(.0001,t);
  g.gain.linearRampToValueAtTime(peak,t+attack);
  g.gain.exponentialRampToValueAtTime(.0001,t+attack+release);
}
function kick(t,strong){
  const o=context.createOscillator(),g=context.createGain();
  o.type="sine";o.frequency.setValueAtTime(strong?148:120,t);o.frequency.exponentialRampToValueAtTime(45,t+.16);
  env(g,t,strong?.55:.4,.002,.22);o.connect(g).connect(compressor);o.start(t);o.stop(t+.25);
}
function noise(t,kind){
  const s=context.createBufferSource(),f=context.createBiquadFilter(),g=context.createGain();
  s.buffer=noiseBuffer;f.type=kind==="snare"?"bandpass":"highpass";f.frequency.value=kind==="snare"?1700:6900;
  env(g,t,kind==="snare"?.16:.045,.001,kind==="snare"?.11:.035);
  s.connect(f).connect(g).connect(compressor);s.start(t);s.stop(t+.14);
}
function bass(t,midi,dur){
  const o=context.createOscillator(),f=context.createBiquadFilter(),g=context.createGain();
  o.type="sine";o.frequency.value=freq(midi);f.type="lowpass";f.frequency.value=260;f.Q.value=.8;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.16,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(f).connect(g).connect(compressor);o.start(t);o.stop(t+dur+.02);
}
function chord(t,midi,dur){
  [0,3,7].forEach((n,i)=>{
    const o=context.createOscillator(),f=context.createBiquadFilter(),g=context.createGain();
    o.type=i?"sine":"triangle";o.frequency.value=freq(midi+n+12);f.type="lowpass";f.frequency.value=1250;
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.025,t+.12);
    g.gain.setValueAtTime(.025,Math.max(t+.13,t+dur-.18));g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(f).connect(g).connect(compressor);o.start(t);o.stop(t+dur+.03);
  });
}
function pluck(t,midi){
  const o=context.createOscillator(),f=context.createBiquadFilter(),g=context.createGain();
  o.type="triangle";o.frequency.value=freq(midi+12);f.type="lowpass";f.frequency.value=3200;f.Q.value=.8;
  env(g,t,.035,.006,.18);o.connect(f).connect(g).connect(compressor);o.start(t);o.stop(t+.21);
}
function scheduleStep(step,t){
  const pat=step%16,bar=Math.floor(step/16),q=60/cue.bpm,six=q/4;
  const chordOffset=cue.progression[bar%cue.progression.length],root=36+cue.root+chordOffset;
  if(pat===0||pat===8||((zone==="heights"||zone==="social")&&(pat===3||pat===11))) kick(t,pat===0);
  if(pat===4||pat===12) noise(t,"snare");
  if(pat%cue.hat===0) noise(t,"hat");
  if(pat%4===0) bass(t,root,q*.88);
  if(pat===0) chord(t,48+cue.root+chordOffset,q*4);
  if(pat%2===0){
    const idx=(Math.floor(step/2)+bar)%cue.lead.length;
    if((step+cue.root)%3!==1) pluck(t,60+cue.root+chordOffset+cue.lead[idx]);
  }
  return six;
}
function schedulerTick(){
  if(!context||context.state!=="running") return;
  while(nextTime<context.currentTime+.25){
    const len=scheduleStep(stepIndex,nextTime);
    nextTime+=len;stepIndex++;
  }
}
async function startProcedural(){
  const AC=root.AudioContext||root.webkitAudioContext;
  if(!AC) throw new Error("Audio not supported");

  if(!context){
    context=new AC();
    master=context.createGain();master.gain.value=0;
    compressor=context.createDynamicsCompressor();
    compressor.threshold.value=-18;
    compressor.knee.value=18;
    compressor.ratio.value=3.5;
    compressor.attack.value=.006;
    compressor.release.value=.24;
    compressor.connect(master).connect(context.destination);
    noiseBuffer=buildNoise();

    const six=(60/cue.bpm)/4;
    const elapsed=Math.max(0,(Date.now()-state.anchor)/1000);
    stepIndex=Math.floor(elapsed/six);
    nextTime=context.currentTime+.06;
  }

  if(context.state!=="running") await context.resume();

  if(!scheduler){
    nextTime=Math.max(nextTime,context.currentTime+.06);
    scheduler=setInterval(schedulerTick,80);
  }

  schedulerTick();
  started=true;
  fadeTo(state.muted||suppressed?0:state.volume,.35);
}
function saveMediaPosition(){
  if(!mediaAudio) return;
  state.trackTime=Number(mediaAudio.currentTime||0);
  state.trackIndex=Number(state.trackIndex||0);
  saveState();
}
async function startRealTrack(){
  if(!realTracks.length) throw new Error("No soundtrack files");
  if(!mediaAudio){
    const track=realTracks[state.trackIndex%realTracks.length];
    mediaAudio=new Audio(track.src);
    mediaAudio.dataset.mceSoundtrack="1";
    mediaAudio.preload="auto";
    mediaAudio.volume=state.muted||suppressed?0:state.volume;
    mediaAudio.currentTime=Math.max(0,Number(state.trackTime||0));
    mediaAudio.addEventListener("timeupdate",()=>{
      if(!mediaSaveTimer) mediaSaveTimer=setTimeout(()=>{mediaSaveTimer=null;saveMediaPosition()},1000);
    });
    mediaAudio.addEventListener("ended",()=>{
      state.trackIndex=(state.trackIndex+1)%realTracks.length;
      state.trackTime=0;
      saveState();
      mediaAudio=null;
      started=false;
      startRealTrack().then(renderWidget).catch(()=>{started=false;renderWidget()});
    });
  }
  await mediaAudio.play();
  started=true;
}
async function unlock(){
  try{
    if(sessionHold){
      suppressed=true;
      renderWidget();
      return;
    }
    if(state.muted) state.muted=false;
    if(realTracks.length){
      try{
        await startRealTrack();
      }catch(error){
        if(mediaAudio){
          try{mediaAudio.pause();}catch(ignore){}
          mediaAudio=null;
        }
        if(zone==="radio"){
          lastError="Organ Donor failed to load — tap ▶ to retry";
          throw error;
        }
        await startProcedural();
      }
    }else{
      await startProcedural();
    }
    lastError="";
    renderWidget();
  }catch(error){
    started=false;
    renderWidget();
  }
}
function suppress(on){
  suppressed=sessionHold||Boolean(on);
  if(mediaAudio) mediaAudio.volume=state.muted||suppressed?0:state.volume;
  else fadeTo(state.muted||suppressed?0:state.volume,.18);
  renderWidget();
}
function holdForSession(on){
  sessionHold=Boolean(on);
  suppressed=sessionHold;
  if(sessionHold){
    saveMediaPosition();
    if(mediaAudio){
      try{mediaAudio.pause()}catch(error){}
      mediaAudio.volume=0;
    }
    if(context&&context.state==="running"){
      context.suspend().catch(()=>{});
    }
    renderWidget();
    return;
  }

  suppressed=anyExternalMediaPlaying();
  if(mediaAudio){
    mediaAudio.volume=state.muted||suppressed?0:state.volume;
    if(started&&!state.muted&&!suppressed) mediaAudio.play().catch(()=>{});
  }else if(context&&started&&!suppressed){
    context.resume().then(()=>fadeTo(state.muted?0:state.volume,.2)).catch(()=>{});
  }else if(started&&!state.muted&&!suppressed){
    unlock().catch(()=>{});
  }
  renderWidget();
}
function anyExternalMediaPlaying(){
  return Array.from(document.querySelectorAll("audio,video")).some(el=>!el.dataset.mceSoundtrack&&!el.paused&&!el.ended);
}

document.addEventListener("play",e=>{
  const el=e.target;
  if((el instanceof HTMLMediaElement)&&!el.dataset.mceSoundtrack) suppress(true);
},true);
["pause","ended"].forEach(name=>document.addEventListener(name,e=>{
  const el=e.target;
  if((el instanceof HTMLMediaElement)&&!el.dataset.mceSoundtrack){
    setTimeout(()=>suppress(anyExternalMediaPlaying()),40);
  }
},true));

document.addEventListener("visibilitychange",()=>{
  if(document.hidden){
    saveMediaPosition();
    if(context&&context.state==="running") context.suspend().catch(()=>{});
    if(sessionHold&&mediaAudio){try{mediaAudio.pause()}catch(error){}}
  }else if(started&&!sessionHold){
    if(context) context.resume().then(()=>fadeTo(state.muted||suppressed?0:state.volume,.2)).catch(()=>{});
    if(mediaAudio&&!suppressed) mediaAudio.play().catch(()=>{});
  }
});
window.addEventListener("pagehide",saveMediaPosition);
window.addEventListener("beforeunload",saveMediaPosition);

window.addEventListener("mce-live-arena-ui",event=>{
  const phase=event&&event.detail&&event.detail.phase;
  suppress(phase==="battle"||phase==="voting");
});

window.addEventListener("mce-audio-session",event=>{
  const active=Boolean(event&&event.detail&&event.detail.active);
  holdForSession(active);
});

saveState();
makeWidget();
const gesture=event=>{
  if(event && event.target && event.target.closest && event.target.closest("#mceSoundtrackWidget")) return;
  unlock();
  document.removeEventListener("pointerdown",gesture,true);
  document.removeEventListener("touchstart",gesture,true);
  document.removeEventListener("keydown",gesture,true);
};
document.addEventListener("pointerdown",gesture,true);
document.addEventListener("touchstart",gesture,true);
document.addEventListener("keydown",gesture,true);

root.MusicCitySoundtrack={
  start:unlock,
  mute(){state.muted=true;saveState();fadeTo(0,.15);renderWidget()},
  unmute(){state.muted=false;saveState();unlock();fadeTo(suppressed?0:state.volume,.2);renderWidget()},
  pauseForSession(){holdForSession(true)},
  resumeAfterSession(){holdForSession(false)},
  getState(){return{...state,zone,title:realTracks.length?(realTracks[state.trackIndex%realTracks.length].title||"Music City Soundtrack"):cue.title,suppressed,sessionHold,started}}
};
})(window);
