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
    style.textContent='.mce-room-radio{position:fixed;z-index:92;right:14px;bottom:14px;width:min(390px,calc(100% - 28px));display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 10px;border:1px solid #55dfff88;border-radius:14px;background:#020916ed;color:#fff;box-shadow:0 0 30px #169fff42;backdrop-filter:blur(12px);font-family:Arial,sans-serif}.mce-radio-icon{width:45px;height:45px;display:grid;place-items:center;border:1px solid #55dfff;border-radius:50%;background:#082342;color:#fff;text-decoration:none;font-size:22px;box-shadow:0 0 18px #22bfff55}.mce-radio-copy{min-width:0}.mce-radio-station{color:#69dcff;font-size:8px;font-weight:900;letter-spacing:.15em}.mce-radio-title,.mce-radio-artist{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mce-radio-title{margin-top:3px;font-size:12px;font-weight:900}.mce-radio-artist{margin-top:2px;color:#9fb7cf;font-size:9px}.mce-radio-actions{display:flex;gap:5px}.mce-radio-actions button{width:36px;height:36px;border:1px solid #4381aa;border-radius:9px;background:#0a1d31;color:#fff;font-weight:900;cursor:pointer}.mce-radio-actions button:disabled{opacity:.4;cursor:not-allowed}.mce-room-radio.on-air .mce-radio-icon{animation:mceRadioPulse 1.8s ease-in-out infinite}@keyframes mceRadioPulse{50%{box-shadow:0 0 28px #22dfffaa}}@media(max-width:720px){.mce-room-radio{right:8px;bottom:116px;width:calc(100% - 16px);grid-template-columns:40px minmax(0,1fr) auto;padding:7px}.mce-radio-icon{width:38px;height:38px;font-size:18px}.mce-radio-actions button{width:33px;height:33px}}';
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
