(function(root){
  "use strict";

  const TRACKS = [
    {id:"lead",label:"Lead Vocal",coach:"Record the full main performance. Stay close to the mic and deliver the whole verse/hook.",level:100,pan:0,reverb:.05,delay:.015},
    {id:"double",label:"Double",coach:"Repeat the strongest lead lines to make them hit harder. You do not have to double every word.",level:64,pan:-.22,reverb:.08,delay:.018},
    {id:"adlibs",label:"Ad-Libs",coach:"Add responses, energy words, echoes and personality around the lead.",level:55,pan:.28,reverb:.20,delay:.10},
    {id:"harmony",label:"Harmony / Hook",coach:"Add melody or a supporting hook layer. Skip this if the song does not need it.",level:48,pan:-.12,reverb:.17,delay:.055},
    {id:"background",label:"Background / Extra",coach:"Use this for punch-ins, whispers, crowd layers or one last texture. Optional.",level:42,pan:.18,reverb:.22,delay:.075}
  ];

  const params = new URLSearchParams(location.search);
  const studio = params.get("studio") || "begenius";
  const $ = id => document.getElementById(id);
  const trackState = {};
  TRACKS.forEach(t => trackState[t.id] = {blob:null,url:"",durationMs:0,muted:false,level:t.level,cleanBlob:null});

  let beat = null;
  let recorder = null;
  let micStream = null;
  let recordingTrack = "";
  let chunks = [];
  let recordingStartedAt = 0;
  let sessionContext = null;
  let sessionSources = [];
  let sessionNodes = new Map();
  let sessionPlaying = false;
  let masterBlob = null;
  let masterUrl = "";
  let generatedBeatUrl = "";
  let previewAudio = null;
  let masterDirty = true;

  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[ch])}
  function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0))}
  function setStatus(message,type){
    const el=$("studioStatus"); if(!el)return;
    el.textContent=message; el.className="studio-status"+(type?" "+type:"");
  }
  function dispatchAudio(active){
    try{root.dispatchEvent(new CustomEvent("mce-audio-session",{detail:{active:Boolean(active),source:"recording-studio"}}))}catch(error){}
  }
  function nextMissingTrack(){
    return TRACKS.find(t=>!trackState[t.id].blob) || null;
  }
  function markDirty(){masterDirty=true;$("saveMaster").disabled=true;$("masterBadge").textContent="MIX CHANGED";}

  function pendingCollab(){
    try{return JSON.parse(localStorage.getItem("mcePendingCollab")||"null")}catch(error){return null}
  }
  function renderCollab(){
    const item=pendingCollab(),banner=$("collabBanner");
    if(!item){banner.hidden=true;return}
    banner.hidden=false;
    banner.innerHTML='<b>🤝 COLLAB SESSION:</b> '+esc(item.artist||"Featured Artist")+' • '+esc(item.district||"Music City")+
      '<span>Finish and save the AI Master to complete this collaboration and collect the crossover rewards.</span>';
  }

  function renderTrackRows(){
    const host=$("trackRows"); host.innerHTML="";
    const next=nextMissingTrack();
    TRACKS.forEach((def,index)=>{
      const state=trackState[def.id];
      const row=document.createElement("article");
      row.className="track-row"+(next&&next.id===def.id?" next":"")+(state.blob?" ready":"");
      row.dataset.track=def.id;
      row.innerHTML=
        '<div class="track-step"><span>'+(index+2)+'</span></div>'+
        '<div class="track-copy"><strong>'+esc(def.label)+'</strong><small>'+esc(def.coach)+'</small>'+
        '<div class="take-state">'+(state.blob?'✓ TAKE READY • '+Math.max(1,Math.round(state.durationMs/1000))+'s':(next&&next.id===def.id?'RECORD THIS LAYER NEXT':'NOT RECORDED'))+'</div></div>'+
        '<div class="track-actions">'+
          '<button type="button" class="record-layer">'+(recordingTrack===def.id?'■ STOP':'● RECORD')+'</button>'+
          '<button type="button" class="play-layer" '+(state.blob?'':'disabled')+'>▶ PLAY</button>'+
          '<button type="button" class="mute-layer'+(state.muted?' on':'')+'" '+(state.blob?'':'disabled')+'>'+(state.muted?'UNMUTE':'MUTE')+'</button>'+
        '</div>'+
        '<div class="level-box"><label>VOLUME <b>'+Math.round(state.level)+'%</b></label><input class="level-slider" type="range" min="0" max="125" value="'+state.level+'" '+(state.blob?'':'disabled')+'></div>';
      row.querySelector(".record-layer").onclick=()=>toggleRecord(def.id);
      row.querySelector(".play-layer").onclick=()=>playLayer(def.id);
      row.querySelector(".mute-layer").onclick=()=>toggleMute(def.id);
      const slider=row.querySelector(".level-slider");
      slider.oninput=()=>{
        state.level=Number(slider.value);
        row.querySelector(".level-box b").textContent=Math.round(state.level)+"%";
        updateLiveGain(def.id);
        markDirty();
      };
      host.appendChild(row);
    });
    const n=nextMissingTrack();
    $("nextGuide").textContent=n ? "NEXT: "+n.label.toUpperCase() : "ALL VOCAL LAYERS READY";
    $("aiMix").disabled=!beat||!trackState.lead.blob;
  }

  function audioMimeForFile(file){
    const ext=String(file&&file.name||"").split(".").pop().toLowerCase();
    const byExt={
      mp3:"audio/mpeg",wav:"audio/wav",m4a:"audio/mp4",aac:"audio/aac",
      mp4:"audio/mp4",webm:"audio/webm",ogg:"audio/ogg",oga:"audio/ogg",
      flac:"audio/flac"
    };
    const reported=String(file&&file.type||"").toLowerCase();
    if(reported.startsWith("audio/"))return reported;
    return byExt[ext]||"";
  }

  async function normalizeBeatFile(file){
    if(!file)throw new Error("Choose an audio file first.");
    const ext=String(file.name||"").split(".").pop().toLowerCase();
    const allowed=["mp3","wav","m4a","aac","mp4","webm","ogg","oga","flac"];
    const mime=audioMimeForFile(file);
    if(!mime&&!allowed.includes(ext)){
      throw new Error("Use an MP3, WAV, M4A, AAC, MP4, WebM, OGG or FLAC audio file.");
    }
    if(Number(file.size||0)>80*1024*1024){
      throw new Error("That beat is too large for the phone studio. Keep beat files under 80 MB.");
    }
    const data=await file.arrayBuffer();
    if(!data.byteLength)throw new Error("That audio file is empty.");
    return new Blob([data],{type:mime||"audio/mpeg"});
  }

  async function loadBeatFile(file){
    try{
      setStatus("Loading "+String(file&&file.name||"your beat")+" from this device…");
      const blob=await normalizeBeatFile(file);
      setBeat(blob,String(file.name||"My Beat").replace(/\.[^.]+$/,""),"device");
      const audio=$("beatPreview");
      audio.load();
      const playable=await new Promise(resolve=>{
        let done=false;
        const finish=value=>{if(done)return;done=true;audio.removeEventListener("loadedmetadata",ok);audio.removeEventListener("canplay",ok);audio.removeEventListener("error",bad);resolve(value)};
        const ok=()=>finish(true),bad=()=>finish(false);
        audio.addEventListener("loadedmetadata",ok,{once:true});
        audio.addEventListener("canplay",ok,{once:true});
        audio.addEventListener("error",bad,{once:true});
        setTimeout(()=>finish(Boolean(audio.duration&&Number.isFinite(audio.duration))),3500);
      });
      if(!playable){
        beat=null;
        audio.removeAttribute("src");audio.load();audio.hidden=true;
        $("beatName").textContent="No beat selected";$("beatState").textContent="FILE COULD NOT PLAY";
        $("beatPlay").disabled=true;$("beatMute").disabled=true;$("beatLevel").disabled=true;
        renderTrackRows();
        throw new Error("Your phone selected the file, but the browser could not play that audio format. Try MP3, WAV or M4A.");
      }
      setStatus("Beat loaded from your phone. Tap PLAY BEAT to check it, then record the Lead Vocal.","ok");
    }catch(error){
      setStatus(error.message||"Music City could not load that audio file.","error");
    }
  }

  function setBeat(blob,name,source){
    if(!blob||!blob.size){setStatus("That beat could not be loaded.","error");return}
    if(beat&&beat.url&&beat.url.startsWith("blob:"))URL.revokeObjectURL(beat.url);
    const url=URL.createObjectURL(blob);
    beat={blob,url,name:name||"Selected Beat",source:source||"upload",muted:false,level:78};
    const audio=$("beatPreview");audio.src=url;audio.hidden=false;
    $("beatName").textContent=beat.name;
    $("beatState").textContent="BEAT READY";
    $("beatPlay").disabled=false;
    $("beatMute").disabled=false;
    $("beatLevel").disabled=false;
    $("beatLevel").value=beat.level;
    $("beatLevelValue").textContent=beat.level+"%";
    markDirty();renderTrackRows();
    setStatus("Beat loaded. Put on headphones and record the Lead Vocal first.","ok");
  }

  async function generateBeat(){
    const button=$("generateBeat");
    const style=String($("beatPrompt").value||"modern hip-hop instrumental, strong drums, open space for rap vocals").trim();
    button.disabled=true;button.textContent="GENERATING…";
    setStatus("ElevenLabs is creating a short instrumental preview…");
    try{
      if(!root.MusicCityAI)throw new Error("Music City AI engine is not loaded.");
      const result=await root.MusicCityAI.generate({
        title:"Music City Session Beat",
        style:style,
        studio:studio,
        mode:"Generate Instrumental",
        vocalStyle:"Instrumental Only",
        musicLengthMs:30000,
        creativity:55,
        influence:65
      });
      let blob=result&&result.audioBlob;
      if(!blob&&result&&result.audioUrl){
        const response=await fetch(result.audioUrl);if(!response.ok)throw new Error("Generated beat could not be loaded.");blob=await response.blob();
      }
      if(!blob)throw new Error(result&&result.message||"ElevenLabs did not return playable audio.");
      if(generatedBeatUrl)URL.revokeObjectURL(generatedBeatUrl);
      generatedBeatUrl=result.audioUrl||"";
      setBeat(blob,"ElevenLabs Beat Preview","elevenlabs");
      setStatus("AI beat preview loaded. Record your layers over it.","ok");
    }catch(error){setStatus(error.message||"AI beat generation is unavailable right now.","error")}
    finally{button.disabled=false;button.textContent="✨ GENERATE AI BEAT";}
  }

  function preferredMime(){
    const choices=["audio/webm;codecs=opus","audio/webm","audio/mp4"];
    return choices.find(t=>root.MediaRecorder&&MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t))||"";
  }

  async function ensureMic(){
    if(micStream&&micStream.active)return micStream;
    micStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:false},video:false});
    return micStream;
  }

  async function toggleRecord(trackId){
    if(recordingTrack){
      if(recordingTrack===trackId&&recorder&&recorder.state==="recording")recorder.stop();
      else setStatus("Finish the current layer before starting another one.","error");
      return;
    }
    if(!beat){setStatus("Add or generate a beat first.","error");return}
    try{
      stopSession();
      const stream=await ensureMic();
      dispatchAudio(true);
      chunks=[];
      const mime=preferredMime();
      recorder=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);
      recordingTrack=trackId;recordingStartedAt=Date.now();
      const beatAudio=$("beatPreview");beatAudio.pause();beatAudio.currentTime=0;beatAudio.loop=false;
      recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
      recorder.onerror=()=>setStatus("The microphone recording stopped unexpectedly.","error");
      recorder.onstop=()=>{
        const id=recordingTrack;
        recordingTrack="";
        beatAudio.pause();beatAudio.currentTime=0;
        dispatchAudio(false);
        const blob=new Blob(chunks,{type:recorder.mimeType||"audio/webm"});
        const state=trackState[id];
        if(state.url)URL.revokeObjectURL(state.url);
        state.blob=blob;state.url=URL.createObjectURL(blob);state.durationMs=Math.max(500,Date.now()-recordingStartedAt);state.cleanBlob=null;
        masterDirty=true;renderTrackRows();
        const next=nextMissingTrack();
        setStatus(next?"Nice. "+TRACKS.find(t=>t.id===id).label+" is ready. Next: "+next.label+".":"All layers are recorded. Play the session or let the AI Engineer mix it.","ok");
      };
      beatAudio.onended=()=>{if(recorder&&recorder.state==="recording")recorder.stop()};
      recorder.start(250);
      await beatAudio.play();
      setStatus("Recording "+TRACKS.find(t=>t.id===trackId).label+" over the beat. Tap STOP when the layer is finished.","recording");
      renderTrackRows();
    }catch(error){
      recordingTrack="";dispatchAudio(false);renderTrackRows();
      setStatus(error.message||"Music City could not start the microphone.","error");
    }
  }

  function playLayer(trackId){
    const t=trackState[trackId];if(!t.blob)return;
    stopSession();dispatchAudio(true);
    const a=new Audio(t.url);previewAudio=a;a.volume=clamp(t.level/100,0,1);a.onended=()=>{previewAudio=null;dispatchAudio(false)};a.play().catch(()=>{previewAudio=null;dispatchAudio(false)});
    setStatus("Playing "+TRACKS.find(x=>x.id===trackId).label+" by itself.");
  }

  function toggleBeat(){
    if(!beat)return;
    const a=$("beatPreview");
    if(!a.paused){a.pause();$("beatPlay").textContent="▶ PLAY BEAT";return}
    a.play();$("beatPlay").textContent="Ⅱ PAUSE BEAT";
    a.onpause=()=>{if(a.paused)$("beatPlay").textContent="▶ PLAY BEAT"};
    a.onended=()=>{$("beatPlay").textContent="▶ PLAY BEAT"};
  }

  function toggleMute(trackId){
    const s=trackState[trackId];if(!s.blob)return;
    s.muted=!s.muted;updateLiveGain(trackId);markDirty();renderTrackRows();
  }
  function toggleBeatMute(){
    if(!beat)return;beat.muted=!beat.muted;$("beatMute").textContent=beat.muted?"UNMUTE":"MUTE";$("beatMute").classList.toggle("on",beat.muted);updateLiveGain("beat");markDirty();
  }

  async function blobBuffer(ctx,blob){
    const ab=await blob.arrayBuffer();
    return await ctx.decodeAudioData(ab.slice(0));
  }

  function stopSession(){
    if(previewAudio){try{previewAudio.pause();previewAudio.currentTime=0}catch(error){}previewAudio=null}
    sessionSources.forEach(s=>{try{s.stop()}catch(error){}});
    sessionSources=[];sessionNodes.clear();
    if(sessionContext){sessionContext.close().catch(()=>{});sessionContext=null}
    sessionPlaying=false;
    $("playAll").textContent="▶ PLAY ALL TRACKS";
    dispatchAudio(false);
  }

  function updateLiveGain(id){
    const node=sessionNodes.get(id);if(!node)return;
    if(id==="beat")node.gain.value=beat&&beat.muted?0:clamp((beat?beat.level:78)/100,0,1.25);
    else{
      const s=trackState[id];node.gain.value=s.muted?0:clamp(s.level/100,0,1.25);
    }
  }

  async function playAll(){
    if(sessionPlaying){stopSession();return}
    if(!beat){setStatus("Add a beat first.","error");return}
    const active=TRACKS.filter(t=>trackState[t.id].blob);
    if(!active.length){setStatus("Record at least the Lead Vocal first.","error");return}
    try{
      stopSession();dispatchAudio(true);
      const Ctx=root.AudioContext||root.webkitAudioContext;if(!Ctx)throw new Error("This browser does not support the session mixer.");
      sessionContext=new Ctx();
      const start=sessionContext.currentTime+.06;
      const sources=[];
      const beatBuffer=await blobBuffer(sessionContext,beat.blob);
      const beatSource=sessionContext.createBufferSource();beatSource.buffer=beatBuffer;
      const beatGain=sessionContext.createGain();beatGain.gain.value=beat.muted?0:clamp(beat.level/100,0,1.25);
      beatSource.connect(beatGain).connect(sessionContext.destination);beatSource.start(start);sources.push(beatSource);sessionNodes.set("beat",beatGain);
      for(const def of active){
        const state=trackState[def.id],buffer=await blobBuffer(sessionContext,state.blob),source=sessionContext.createBufferSource(),gain=sessionContext.createGain();
        source.buffer=buffer;gain.gain.value=state.muted?0:clamp(state.level/100,0,1.25);
        if(sessionContext.createStereoPanner){const pan=sessionContext.createStereoPanner();pan.pan.value=def.pan;source.connect(gain).connect(pan).connect(sessionContext.destination)}
        else source.connect(gain).connect(sessionContext.destination);
        source.start(start);sources.push(source);sessionNodes.set(def.id,gain);
      }
      sessionSources=sources;sessionPlaying=true;$("playAll").textContent="■ STOP PLAYBACK";
      beatSource.onended=()=>{if(sessionPlaying)stopSession()};
      setStatus("Playing the full multitrack session. Mute or move a volume slider while it plays.","ok");
    }catch(error){stopSession();setStatus(error.message||"Could not play the session.","error")}
  }

  function blobToBase64(blob){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>{const v=String(reader.result||"");resolve(v.slice(v.indexOf(",")+1))};
      reader.onerror=()=>reject(new Error("Could not read vocal audio."));
      reader.readAsDataURL(blob);
    });
  }

  async function cleanVocal(def,state){
    if(state.cleanBlob)return state.cleanBlob;
    if(!state.blob)return null;
    if(state.blob.size>3*1024*1024)return state.blob;
    try{
      const base64=await blobToBase64(state.blob);
      const response=await fetch("/api/elevenlabs/isolate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        audioBase64:base64,mimeType:state.blob.type||"audio/webm",filename:"music-city-"+def.id+".webm"
      })});
      if(!response.ok)throw new Error("cleanup unavailable");
      const cleaned=await response.blob();if(cleaned&&cleaned.size)state.cleanBlob=cleaned;
      return state.cleanBlob||state.blob;
    }catch(error){return state.blob}
  }

  function makeImpulse(ctx,seconds,decay){
    const length=Math.max(1,Math.floor(ctx.sampleRate*seconds));
    const buffer=ctx.createBuffer(2,length,ctx.sampleRate);
    for(let ch=0;ch<2;ch++){const d=buffer.getChannelData(ch);for(let i=0;i<length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/length,decay)}
    return buffer;
  }

  function writeString(view,offset,string){for(let i=0;i<string.length;i++)view.setUint8(offset+i,string.charCodeAt(i))}
  function encodeWav(buffer){
    const channels=Math.min(2,buffer.numberOfChannels),length=buffer.length*channels*2,ab=new ArrayBuffer(44+length),view=new DataView(ab);
    writeString(view,0,"RIFF");view.setUint32(4,36+length,true);writeString(view,8,"WAVE");writeString(view,12,"fmt ");view.setUint32(16,16,true);
    view.setUint16(20,1,true);view.setUint16(22,channels,true);view.setUint32(24,buffer.sampleRate,true);view.setUint32(28,buffer.sampleRate*channels*2,true);
    view.setUint16(32,channels*2,true);view.setUint16(34,16,true);writeString(view,36,"data");view.setUint32(40,length,true);
    const data=[];for(let c=0;c<channels;c++)data.push(buffer.getChannelData(c));let offset=44;
    for(let i=0;i<buffer.length;i++){for(let c=0;c<channels;c++){let s=Math.max(-1,Math.min(1,data[c][i]||0));view.setInt16(offset,s<0?s*32768:s*32767,true);offset+=2}}
    return new Blob([ab],{type:"audio/wav"});
  }

  async function renderMaster(){
    if(!beat||!trackState.lead.blob)throw new Error("A beat and Lead Vocal are required before AI Mix.");
    const AudioCtx=root.AudioContext||root.webkitAudioContext;if(!AudioCtx)throw new Error("This browser cannot mix audio.");
    const decodeCtx=new AudioCtx();
    try{
      const decoded={beat:await blobBuffer(decodeCtx,beat.blob)};
      for(const def of TRACKS){
        const state=trackState[def.id];if(!state.blob||state.muted)continue;
        const sourceBlob=def.id==="lead" ? await cleanVocal(def,state) : state.blob;
        if(def.id==="lead")$("engineDetail").textContent="ElevenLabs cleanup: Lead Vocal";
        decoded[def.id]=await blobBuffer(decodeCtx,sourceBlob);
      }
      let duration=decoded.beat.duration;
      Object.keys(decoded).forEach(k=>duration=Math.max(duration,decoded[k].duration));
      const rate=44100,offline=new OfflineAudioContext(2,Math.ceil((duration+.7)*rate),rate);
      const master=offline.createDynamicsCompressor();master.threshold.value=-10;master.knee.value=18;master.ratio.value=3;master.attack.value=.006;master.release.value=.24;
      const masterGain=offline.createGain();masterGain.gain.value=.94;master.connect(masterGain).connect(offline.destination);

      const beatSource=offline.createBufferSource();beatSource.buffer=decoded.beat;
      const beatGain=offline.createGain();beatGain.gain.value=beat.muted?0:clamp(beat.level/100,0,1.2)*.90;
      beatSource.connect(beatGain).connect(master);beatSource.start(0);

      const reverb=offline.createConvolver();reverb.buffer=makeImpulse(offline,1.35,2.7);
      const reverbGain=offline.createGain();reverbGain.gain.value=.38;reverb.connect(reverbGain).connect(master);
      const delay=offline.createDelay(1);delay.delayTime.value=.19;
      const feedback=offline.createGain();feedback.gain.value=.20;delay.connect(feedback).connect(delay);
      const delayGain=offline.createGain();delayGain.gain.value=.25;delay.connect(delayGain).connect(master);

      for(const def of TRACKS){
        const buffer=decoded[def.id];if(!buffer)continue;
        const state=trackState[def.id],source=offline.createBufferSource();source.buffer=buffer;
        const hp=offline.createBiquadFilter();hp.type="highpass";hp.frequency.value=def.id==="lead"?78:95;hp.Q.value=.7;
        const presence=offline.createBiquadFilter();presence.type="peaking";presence.frequency.value=def.id==="lead"?3200:3800;presence.Q.value=.9;presence.gain.value=def.id==="lead"?2.3:1.4;
        const tame=offline.createBiquadFilter();tame.type="highshelf";tame.frequency.value=7200;tame.gain.value=def.id==="adlibs"?-1.5:-.7;
        const comp=offline.createDynamicsCompressor();comp.threshold.value=def.id==="lead"?-22:-25;comp.knee.value=18;comp.ratio.value=def.id==="lead"?3.4:4;comp.attack.value=.004;comp.release.value=.16;
        const gain=offline.createGain();gain.gain.value=clamp(state.level/100,0,1.25)*(def.id==="lead"?1:.88);
        source.connect(hp).connect(presence).connect(tame).connect(comp).connect(gain);
        let dry=gain;
        if(offline.createStereoPanner){const pan=offline.createStereoPanner();pan.pan.value=def.pan;gain.connect(pan);dry=pan}
        dry.connect(master);
        if(def.reverb){const send=offline.createGain();send.gain.value=def.reverb;dry.connect(send).connect(reverb)}
        if(def.delay){const sendD=offline.createGain();sendD.gain.value=def.delay;dry.connect(sendD).connect(delay)}
        source.start(0);
      }
      $("engineDetail").textContent="Mastering: balance, glue compression and loudness";
      return encodeWav(await offline.startRendering());
    }finally{decodeCtx.close().catch(()=>{})}
  }

  async function aiMix(){
    const button=$("aiMix");button.disabled=true;button.textContent="ENGINEERING…";stopSession();dispatchAudio(true);
    $("masterBadge").textContent="AI ENGINEER WORKING";$("masterSection").classList.add("working");
    setStatus("AI Engineer is cleaning the vocals and building one professional master…");
    try{
      const blob=await renderMaster();
      if(masterUrl)URL.revokeObjectURL(masterUrl);masterBlob=blob;masterUrl=URL.createObjectURL(blob);masterDirty=false;
      const player=$("masterAudio");player.src=masterUrl;player.hidden=false;$("saveMaster").disabled=false;$("masterBadge").textContent="MASTER READY";
      $("engineDetail").textContent="Done: vocal cleanup • EQ • compression • de-essing • space • stereo placement • master";
      setStatus("Master ready. Compare it with Play All. You can still mute or rebalance tracks, then run AI Mix again.","ok");
      await player.play().catch(()=>{});
    }catch(error){$("masterBadge").textContent="MIX NEEDS ATTENTION";setStatus(error.message||"AI Engineer could not finish this mix.","error")}
    finally{button.disabled=false;button.textContent="✨ AI MIX & MASTER";dispatchAudio(false);$("masterSection").classList.remove("working")}
  }

  function completePendingCollab(version){
    const pending=pendingCollab();if(!pending||!root.MCE)return null;
    let log=[];try{log=JSON.parse(localStorage.getItem("mceCollaborationsV1")||"[]");if(!Array.isArray(log))log=[]}catch(error){log=[]}
    const row=log.find(item=>String(item.id)===String(pending.id));if(!row||row.status==="completed"){localStorage.removeItem("mcePendingCollab");return null}
    const state=root.MCE.get(),fans=Math.max(0,Number(row.playerFans||pending.playerFans||0)),xp=Math.max(0,Number(row.playerXp||pending.playerXp||0)),rep=Math.max(0,Number(row.reputation||pending.reputation||0));
    state.fans=Number(state.fans||0)+fans;state.xp=Number(state.xp||0)+xp;state.reputation=Number(state.reputation||50)+rep;
    const release=(state.releases||[]).find(item=>String(item.id)===String(version.id));
    if(release)release.collaboration={artist:row.artist,district:row.district,genre:row.genre||"",manager:row.manager||"",collabId:row.id};
    root.MCE.save(state);row.status="completed";row.completedAt=new Date().toISOString();row.songId=version.id;row.songTitle=version.title;
    localStorage.setItem("mceCollaborationsV1",JSON.stringify(log));localStorage.removeItem("mcePendingCollab");
    const complete=log.filter(item=>!item.status||item.status==="completed"),unique=Array.from(new Set(complete.map(item=>item.districtId).filter(Boolean)));
    let bonus="";
    if(unique.length>=4&&localStorage.getItem("mceCollabNetworkBonusV1")!=="1"){const s=root.MCE.get();s.fans=Number(s.fans||0)+25;s.xp=Number(s.xp||0)+20;s.reputation=Number(s.reputation||50)+5;root.MCE.save(s);localStorage.setItem("mceCollabNetworkBonusV1","1");bonus=" City Connector bonus unlocked."}
    renderCollab();return {artist:row.artist,fans,xp,rep,bonus};
  }

  async function saveMaster(){
    if(!masterBlob){setStatus("Create the AI Master first.","error");return}
    const button=$("saveMaster");button.disabled=true;button.textContent="SAVING…";
    try{
      const title=String($("songTitle").value||"Untitled Song").trim()||"Untitled Song";
      const id="studio-master-"+Date.now().toString(36);
      await root.MusicCityCatalog.saveTrack({id,title,style:"Guided multitrack recording",studio,beat:beat?beat.name:"",provider:"ElevenLabs + Music City AI Engineer",createdAt:new Date().toISOString(),audioBlob:masterBlob});
      if(root.MCE){
        const state=root.MCE.get();
        if(!(state.releases||[]).some(r=>String(r.id)===id))root.MCE.addRelease({id,title,artistName:state.name,source:"music-city-studio",createdAt:new Date().toISOString(),style:"Guided multitrack recording",studio,beat:beat?beat.name:"",provider:"ElevenLabs + Music City AI Engineer",audioKey:id,radioStatus:"not-submitted"});
      }
      const collab=completePendingCollab({id,title});
      button.textContent="✓ SAVED TO CATALOG";
      setStatus("Finished master saved to your Artist Catalog."+(collab?" Collaboration with "+collab.artist+" complete: +"+collab.fans+" fans, +"+collab.xp+" XP, +"+collab.rep+" reputation."+collab.bonus:""),"ok");
    }catch(error){button.disabled=false;button.textContent="💿 SAVE MASTER";setStatus(error.message||"Could not save the master.","error")}
  }

  function bind(){
    $("backLink").href=studio==="bedroom"?"bedroom_studio.html":"begenius_studio.html";
    $("beatFile").onchange=async e=>{const f=e.target.files&&e.target.files[0];if(f)await loadBeatFile(f);e.target.value=""};
    $("beatPlay").onclick=toggleBeat;
    $("beatMute").onclick=toggleBeatMute;
    $("beatLevel").oninput=e=>{if(!beat)return;beat.level=Number(e.target.value);$("beatLevelValue").textContent=Math.round(beat.level)+"%";updateLiveGain("beat");markDirty()};
    $("generateBeat").onclick=generateBeat;
    $("playAll").onclick=playAll;
    $("aiMix").onclick=aiMix;
    $("saveMaster").onclick=saveMaster;
    $("masterAudio").onplay=()=>dispatchAudio(true);$("masterAudio").onpause=()=>dispatchAudio(false);$("masterAudio").onended=()=>dispatchAudio(false);
    root.addEventListener("beforeunload",()=>{stopSession();if(micStream)micStream.getTracks().forEach(t=>t.stop());Object.values(trackState).forEach(t=>{if(t.url)URL.revokeObjectURL(t.url)});if(masterUrl)URL.revokeObjectURL(masterUrl);if(beat&&beat.url&&beat.url.startsWith("blob:"))URL.revokeObjectURL(beat.url)});
  }

  async function checkApiStatus(){
    const badge=$("apiBadge");if(!badge)return;
    try{
      const response=await fetch("/api/elevenlabs/status",{cache:"no-store"});
      const data=await response.json();
      if(data&&data.connected){
        badge.textContent="ELEVENLABS • CONNECTED";
        badge.style.borderColor="#74eba2";
        badge.style.color="#a8f5c1";
      }else if(data&&data.configured){
        badge.textContent="ELEVENLABS • KEY FOUND / CHECK FAILED";
        badge.style.borderColor="#f2cf73";
        badge.style.color="#f4dda1";
      }else{
        badge.textContent="ELEVENLABS • KEY NOT FOUND";
        badge.style.borderColor="#ff6d7d";
        badge.style.color="#ffc0c8";
      }
    }catch(error){
      badge.textContent="ELEVENLABS • STATUS UNAVAILABLE";
      badge.style.borderColor="#ff6d7d";
      badge.style.color="#ffc0c8";
    }
  }

  function init(){
    bind();renderCollab();renderTrackRows();
    try{if(root.MCE)root.MCE.load()}catch(error){}
    $("beatPreview").hidden=true;
    checkApiStatus();
    setStatus("Step 1: load a beat. Then Music City will guide you through each vocal layer.");
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(window);
