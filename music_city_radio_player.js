(function(root){
  'use strict';
  if(root.MusicCityRoomRadio)return;

  var SESSION_KEY='mce-radio-session';
  var audio=new Audio();
  var queue=[];
  var currentIndex=0;
  var currentUrl='';
  var wantsPlayback=false;
  var widget=null;
  var lastSavedSecond=-1;

  function safeParse(value,fallback){try{return JSON.parse(value)||fallback}catch(error){return fallback}}
  function saveSession(){
    var item=queue[currentIndex];
    if(!item)return;
    localStorage.setItem(SESSION_KEY,JSON.stringify({releaseId:item.release.id,time:Number(audio.currentTime||0),playing:wantsPlayback,updatedAt:Date.now()}));
  }
  function artistFor(release,state){return String(release.artistName||state.name||'Music City Artist')}
  function buildWidget(){
    var style=document.createElement('style');
    style.textContent='.mce-room-radio{position:fixed;z-index:24;right:12px;top:72px;width:min(300px,calc(100% - 24px));display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:7px;align-items:center;padding:6px 7px;border:1px solid #55dfff88;border-radius:12px;background:#020916e8;color:#fff;box-shadow:0 5px 22px #0009,0 0 18px #169fff2e;backdrop-filter:blur(10px);font-family:Arial,sans-serif}.mce-radio-icon{width:33px;height:33px;display:grid;place-items:center;border:1px solid #55dfff;border-radius:50%;background:#082342;color:#fff;text-decoration:none;font-size:16px;box-shadow:0 0 12px #22bfff42}.mce-radio-copy{min-width:0}.mce-radio-station{color:#69dcff;font-size:6px;font-weight:900;letter-spacing:.13em}.mce-radio-title,.mce-radio-artist{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mce-radio-title{margin-top:2px;font-size:10px;font-weight:900}.mce-radio-artist{margin-top:1px;color:#9fb7cf;font-size:7px}.mce-radio-actions{display:flex;gap:4px}.mce-radio-actions button{width:29px;height:29px;padding:0;border:1px solid #4381aa;border-radius:8px;background:#0a1d31;color:#fff;font-size:10px;font-weight:900;cursor:pointer}.mce-radio-actions button:disabled{opacity:.4;cursor:not-allowed}.mce-room-radio.on-air .mce-radio-icon{animation:mceRadioPulse 1.8s ease-in-out infinite}@keyframes mceRadioPulse{50%{box-shadow:0 0 20px #22dfff99}}@media(max-width:720px),(pointer:coarse){.mce-room-radio{right:8px;top:112px;width:min(210px,calc(100% - 16px));grid-template-columns:30px minmax(0,1fr) auto;gap:5px;padding:5px 6px}.mce-radio-icon{width:28px;height:28px;font-size:13px}.mce-radio-station{display:none}.mce-radio-title{margin-top:0;font-size:9px}.mce-radio-artist{font-size:6px}.mce-radio-actions button{width:26px;height:26px;font-size:9px}}@media(pointer:coarse) and (orientation:landscape){.mce-room-radio{top:70px;right:8px;width:210px}}';
    document.head.appendChild(style);
    widget=document.createElement('section');widget.className='mce-room-radio';widget.setAttribute('aria-label','Music City Radio player');
    widget.innerHTML='<a class="mce-radio-icon" href="music_city_radio.html" aria-label="Open Music City Radio">📻</a><div class="mce-radio-copy"><div class="mce-radio-station">MUSIC CITY ESTATES RADIO</div><strong class="mce-radio-title">Loading the station…</strong><span class="mce-radio-artist">ON AIR</span></div><div class="mce-radio-actions"><button class="mce-radio-play" type="button" aria-label="Play radio">▶</button><button class="mce-radio-next" type="button" aria-label="Next song">›</button></div>';
    document.body.appendChild(widget);
    widget.querySelector('.mce-radio-play').onclick=toggle;
    widget.querySelector('.mce-radio-next').onclick=next;
  }
  function render(){
    if(!widget)return;
    var title=widget.querySelector('.mce-radio-title'),artist=widget.querySelector('.mce-radio-artist'),play=widget.querySelector('.mce-radio-play'),nextButton=widget.querySelector('.mce-radio-next');
    if(!queue.length){title.textContent='No submitted songs on air';artist.textContent='Visit Radio to submit a released record';play.disabled=true;nextButton.disabled=true;widget.classList.remove('on-air');return}
    var item=queue[currentIndex];title.textContent=item.release.title||item.track.title||'Untitled Song';artist.textContent=item.artist+' • ON AIR';play.disabled=false;nextButton.disabled=queue.length<2;play.textContent=audio.paused?'▶':'Ⅱ';widget.classList.toggle('on-air',!audio.paused);
  }
  function setTrack(index,resumeTime){
    if(!queue.length)return;
    currentIndex=(index+queue.length)%queue.length;
    lastSavedSecond=-1;
    if(currentUrl)URL.revokeObjectURL(currentUrl);
    currentUrl=URL.createObjectURL(queue[currentIndex].track.audioBlob);
    audio.src=currentUrl;audio.volume=.58;
    audio.addEventListener('loadedmetadata',function restore(){audio.removeEventListener('loadedmetadata',restore);if(resumeTime&&Number.isFinite(audio.duration))audio.currentTime=Math.min(resumeTime,Math.max(0,audio.duration-.25))});
    render();saveSession();
  }
  function play(){if(!queue.length)return;wantsPlayback=true;audio.play().then(render).catch(function(){render()})}
  function pause(){wantsPlayback=false;audio.pause();saveSession();render()}
  function toggle(){audio.paused?play():pause()}
  function next(){if(!queue.length)return;setTrack(currentIndex+1,0);if(wantsPlayback)play()}
  async function load(){
    buildWidget();
    if(!root.MCE||!root.MusicCityCatalog){render();return}
    try{
      var state=root.MCE.load();
      var releases=state.releases.filter(function(release){return release.radioStatus==='submitted'});
      var tracks=await root.MusicCityCatalog.listTracks();
      var trackMap={};tracks.forEach(function(track){if(track.audioBlob)trackMap[String(track.id)]=track});
      queue=releases.map(function(release){var track=trackMap[String(release.audioKey||release.id)];return track?{release:release,track:track,artist:artistFor(release,state)}:null}).filter(Boolean);
      var session=safeParse(localStorage.getItem(SESSION_KEY),{});
      var savedIndex=queue.findIndex(function(item){return String(item.release.id)===String(session.releaseId)});
      wantsPlayback=Boolean(session.playing);
      setTrack(savedIndex>=0?savedIndex:0,savedIndex>=0?Number(session.time||0):0);
      if(wantsPlayback)play();
    }catch(error){widget.querySelector('.mce-radio-title').textContent='Station temporarily unavailable';widget.querySelector('.mce-radio-artist').textContent=error.message;widget.querySelector('.mce-radio-play').disabled=true;widget.querySelector('.mce-radio-next').disabled=true}
  }
  audio.addEventListener('play',function(){wantsPlayback=true;render()});audio.addEventListener('pause',render);audio.addEventListener('ended',next);audio.addEventListener('timeupdate',function(){var second=Math.floor(audio.currentTime);if(second!==lastSavedSecond&&second%5===0){lastSavedSecond=second;saveSession()}});
  addEventListener('beforeunload',function(){saveSession();if(currentUrl)URL.revokeObjectURL(currentUrl)});
  addEventListener('mce-live-arena-ui',function(event){if(event.detail&&['battle','voting'].includes(event.detail.phase))pause()});
  root.MusicCityRoomRadio={play:play,pause:pause,next:next,reload:load};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})(window);
