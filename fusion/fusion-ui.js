import { DISTRICTS, CONFIG } from './fusion-data.js?v=4';
import { VEHICLES, RIMS, PAINTS, STARTER_VEHICLES, getVehicle } from './fusion-vehicles.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const openAudioDb=()=>new Promise((resolve,reject)=>{
  const request=indexedDB.open('mce-fusion-audio',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('songs');
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
});
const storeAudio=async(key,blob)=>{
  const db=await openAudioDb();
  try{await new Promise((resolve,reject)=>{
    const tx=db.transaction('songs','readwrite');tx.objectStore('songs').put(blob,key);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });}finally{db.close();}
};
const loadAudio=async key=>{
  const db=await openAudioDb();
  try{return await new Promise((resolve,reject)=>{
    const request=db.transaction('songs').objectStore('songs').get(key);
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });}finally{db.close();}
};
export class FusionUI {
  constructor(engine,renderer){
    this.engine=engine;this.renderer=renderer;
    this.$=id=>document.getElementById(id);
    this.modal=this.$('fusionModal');
    this.busy=false;this.playingAudio=null;
    this.$('roll').onclick=()=>this.moveCurrent();
    this.$('endTurn').onclick=()=>this.endTurn();
    this.$('statusToggle').onclick=()=>this.setStatusExpanded(!document.querySelector('.fusion-hud').classList.contains('expanded'));
    this.$('boardMenuToggle').onclick=()=>this.setMenuOpen(!this.$('boardMenu').classList.contains('open'));
    this.$('newGame').onclick=()=>{this.setMenuOpen(false);this.openSetup();};
    this.$('garageBtn').onclick=()=>{this.setMenuOpen(false);this.openGarage();};
    this.$('phoneBtn').onclick=()=>{this.setMenuOpen(false);this.openPhone();};
    this.$('visitHeights').onclick=()=>{this.setMenuOpen(false);this.openBorough();};
    this.$('leaveBorough').onclick=()=>this.closeBorough();
    document.addEventListener('pointerdown',e=>{
      if(!e.target.closest('.fusion-top'))this.setMenuOpen(false);
    });
    renderer.addEventListener('pick',e=>{
      if(e.detail.type==='borough'){
        if(e.detail.id==='hiphop')this.openBorough();
        else this.showNotice('The '+DISTRICTS.find(x=>x.id===e.detail.id)?.name+' producer is playable on the board.');
        return;
      }
      if(e.detail.type==='space'){
        const item=engine.state.spaces.find(x=>x.id===e.detail.id);
        if(item)this.showNotice(item.name+' · '+(item.kind==='producer'?'Land here to choose a prompt card.':item.kind==='property'?'Land here to buy this music business.':item.effect||''));
      }
    });
    engine.addEventListener('state',()=>this.render());
    engine.addEventListener('landed',()=>this.render());
    engine.addEventListener('turn',()=>this.render());
    this.render();this.openSetup();
  }
  setStatusExpanded(open){
    document.querySelector('.fusion-hud').classList.toggle('expanded',open);
    this.$('statusToggle').setAttribute('aria-expanded',String(open));
  }
  setMenuOpen(open){
    this.$('boardMenu').classList.toggle('open',open);
    this.$('boardMenuToggle').setAttribute('aria-expanded',String(open));
    this.$('boardMenuToggle').setAttribute('aria-label',open?'Close board menu':'Open board menu');
  }
  showNotice(message,ms=3200){
    const notice=this.$('gameNotice');
    clearTimeout(this.noticeTimer);
    notice.textContent=message;
    notice.classList.add('show');
    this.noticeTimer=setTimeout(()=>notice.classList.remove('show'),ms);
  }
  openBorough(){
    if(!this.modal.hidden)return;
    this.setStatusExpanded(false);this.setMenuOpen(false);
    const view=this.$('boroughView'),frame=this.$('boroughFrame');
    frame.src='hip_hop_heights.html?fusion=1';
    view.hidden=false;
    this.renderer.paused=true;
    this.$('leaveBorough').focus();
  }
  closeBorough(){
    this.$('boroughView').hidden=true;
    this.$('boroughFrame').removeAttribute('src');
    this.renderer.paused=false;
    this.$('visitHeights').focus();
  }
  save(){
    if(this.online?.isGuest)return; // The host alone persists the authoritative online match.
    try{localStorage.setItem(CONFIG.saveKey,JSON.stringify(this.engine.exportState()));}
    catch(error){this.showNotice('This device could not save the session. Audio files may be too large.',5000);}
  }
  closeModal(){this.modal.hidden=true;this.modal.replaceChildren();}
  openModal(html){this.modal.innerHTML='<div class="fusion-card">'+html+'</div>';this.modal.hidden=false;}
  openPhone(){
    if(this.busy||!this.modal.hidden||!this.$('boroughView').hidden)return;
    const players=this.engine.state.players;
    this.renderer.paused=true;
    this.openModal('<small>MUSIC CITY PHONE</small><h2>Connect with your crew</h2>'+ 
      '<p>'+(this.online?.active?'This phone connects you to your live board, invite link and room chat. Voice chat and shared audio are not yet part of the board.':'Create an online room below to play from separate phones, or use the local game on one device.')+'</p>'+ 
      '<div class="phone-actions"><button id="phoneShare" class="primary">Share test link</button><button id="phoneCopy">Copy link</button><a href="https://www.messenger.com/" target="_blank" rel="noopener noreferrer">Open Messenger ↗</a></div>'+ 
      '<p id="phoneStatus" class="progress" role="status">'+(this.online?.active?'Use your room phone below to exchange producer cards and chat.':'Start an online room to invite your crew; Messenger is optional.')+'</p>'+ 
      '<h3>Artists in this local game</h3><div class="phone-roster">'+players.map(p=>'<div><b>'+esc(p.name)+'</b><small>'+(p.bot?'Computer':this.online?.active?(this.online.canControl(p)?'This phone':'Online artist'):'On this device')+'</small></div>').join('')+'</div>'+ 
      '<button id="phoneClose">Return to board</button>');
    const link=this.online?.inviteLink() || new URL('fusion_board.html',location.href).href;
    this.$('phoneCopy').onclick=async()=>{
      try{await navigator.clipboard.writeText(link);this.$('phoneStatus').textContent='Test link copied. Paste it into your Messenger group.';}
      catch(error){this.$('phoneStatus').textContent='Copy this link: '+link;}
    };
    this.$('phoneShare').onclick=async()=>{
      if(navigator.share){
        try{await navigator.share({title:'Music City Estates · Fusion Board',text:this.online?.active?'Join my live Fusion Board game.':'Try the Music City Fusion Board.',url:link});}
        catch(error){if(error.name!=='AbortError')this.$('phoneStatus').textContent='Use Copy link to share this game.';}
      }else this.$('phoneCopy').click();
    };
    this.$('phoneClose').onclick=()=>{this.renderer.paused=false;this.closeModal();this.maybeBot();};
    this.online?.phoneView();
  }
  openSetup(){
    if(this.online?.active){this.showNotice('Leave the online room before starting another game.');return;}
    this.setStatusExpanded(false);this.setMenuOpen(false);
    this.openModal('<h2>Music City Estates · Fusion Board</h2><p>Roll around the 3D city, collect four producer prompt cards, create one fusion song, buy a music business, hire a manager and get radio airplay. The first artist to reach the festival headlines the showcase.</p>'+ 
      '<p><strong>Four artists enter the showcase.</strong> Uncheck “Computer artist” for each friend playing on this device. For a shared online board, start your local game first, open the phone and create a room. Friends can then claim a computer seat with your invite.</p>'+
      '<div id="setupRows"></div><div><button class="primary" id="begin">Start game</button><button id="continue">Continue saved game</button></div>');
    const rows=this.$('setupRows');
    const add=(name,bot=false)=>{
      if(rows.children.length>=4)return;
      const row=document.createElement('label');
      const initialCar=STARTER_VEHICLES[rows.children.length%STARTER_VEHICLES.length];
      row.innerHTML='Artist '+(rows.children.length+1)+'<input maxlength="22" value="'+esc(name)+'" aria-label="Artist name">'+
        '<label>Starting car<select aria-label="Starting car">'+STARTER_VEHICLES.map(id=>'<option value="'+id+'" '+(id===initialCar?'selected':'')+'>'+esc(getVehicle(id).name)+'</option>').join('')+'</select></label>'+
        '<label><input type="checkbox" '+(bot?'checked':'')+'> Computer artist</label>';
      rows.appendChild(row);
    };
    add('Artist 1');add('City Bot 2',true);add('City Bot 3',true);add('City Bot 4',true);
    this.$('begin').onclick=()=>{
      const entries=[...rows.children].map((row,i)=>({
        name:row.querySelector('input:not([type=checkbox])').value.trim()||'Artist '+(i+1),
        bot:row.querySelector('input[type=checkbox]').checked,
        vehicleId:row.querySelector('select').value
      }));
      this.engine.newGame(entries);this.renderer.setPlayers(this.engine.state.players);
      this.renderer.syncOwnership(this.engine.state);this.renderer.boardView();
      this.closeModal();this.save();this.render();this.maybeBot();
    };
    this.$('continue').onclick=()=>{
      try{
        this.engine.importState(JSON.parse(localStorage.getItem(CONFIG.saveKey)));
        this.renderer.setPlayers(this.engine.state.players);this.renderer.syncOwnership(this.engine.state);
        this.renderer.boardView();this.closeModal();this.render();this.maybeBot();
      }catch(e){this.$('continue').textContent='No saved game on this device';}
    };
    this.online?.setupView();
  }
  openGarage(){
    if(!this.modal.hidden||this.busy||!this.engine.garageAvailable())return;
    this.renderGarage(this.engine.currentPlayer.equippedVehicle||'city_standard');
  }
  renderGarage(selectedId){
    const p=this.engine.currentPlayer;
    const selected=VEHICLES.find(v=>v.id===selectedId)||VEHICLES[0];
    const gate=this.engine.vehicleStatus(selected.id,p),owned=(p.ownedVehicles||[]).includes(selected.id);
    const carList=VEHICLES.map(v=>{
      const available=this.engine.vehicleStatus(v.id,p),has=(p.ownedVehicles||[]).includes(v.id);
      const state=p.equippedVehicle===v.id?'Driving':has?'Owned':available.open?'Ready':'Locked';
      return '<button type="button" class="garage-car '+(v.id===selected.id?'selected':'')+'" data-garage-car="'+v.id+'"><b>'+esc(v.name)+'</b><small>'+esc(v.tier)+' · '+state+'</small></button>';
    }).join('');
    const rimList=RIMS.map(r=>{
      const unlocked=this.engine.rimStatus(r.id,p),has=(p.ownedRims||[]).includes(r.id);
      const active=p.equippedRim===r.id;
      return '<button type="button" class="garage-rim '+(active?'selected':'')+'" data-garage-rim="'+r.id+'" '+(!unlocked.open?'disabled':'')+'><b>'+esc(r.name)+'</b><small>'+esc(active?'Equipped':has?'Equip':unlocked.open?'Claim':'Locked · '+unlocked.reason)+'</small></button>';
    }).join('');
    const paintList=PAINTS.map(c=>'<button type="button" class="garage-paint '+(p.vehiclePaint===c.hex?'selected':'')+'" data-garage-paint="'+c.hex+'" style="--paint:'+c.hex+'" aria-label="'+esc(c.name)+'" title="'+esc(c.name)+'"></button>').join('');
    this.openModal('<small>MUSIC CITY ESTATES</small><h2>City Garage</h2><p>'+esc(p.name)+' · '+esc(getVehicle(p.equippedVehicle).name)+' · $'+p.cash.toLocaleString()+' cash. Detroit cars, rims and paint are cosmetic rewards; they never change your dice or rent.</p>'+
      '<div class="garage-layout"><div class="garage-car-list">'+carList+'</div><div class="garage-detail"><div class="garage-preview"><img id="garagePreview" alt="Preview of '+esc(selected.name)+'" hidden><span id="garagePreviewStatus">Loading 3D preview…</span></div><h3>'+esc(selected.name)+'</h3><p>'+esc(selected.description)+'</p><p>'+esc(gate.open?'Available now':gate.reason)+'</p><button id="garageAction" class="primary" '+(!gate.open||p.equippedVehicle===selected.id?'disabled':'')+'>'+(p.equippedVehicle===selected.id?'Currently driving':owned?'Drive this car':gate.open?'Claim & drive':'Locked')+'</button></div></div>'+
      '<h3>Rims</h3><div class="garage-rim-list">'+rimList+'</div><h3>Paint</h3><div class="garage-paint-list">'+paintList+'</div><p id="garageMessage" role="status"></p><button id="garageClose">Return to board</button>');
    const token=this.garageRenderToken=(this.garageRenderToken||0)+1;
    this.renderer.captureVehiclePreview(selected.id,p.vehiclePaint,p.equippedRim).then(src=>{
      if(this.garageRenderToken!==token||!this.$('garagePreview'))return;
      this.$('garagePreview').src=src;this.$('garagePreview').hidden=false;this.$('garagePreviewStatus').hidden=true;
    }).catch(()=>{if(this.garageRenderToken===token&&this.$('garagePreviewStatus'))this.$('garagePreviewStatus').textContent='3D preview unavailable. The board car still works.';});
    this.modal.querySelectorAll('[data-garage-car]').forEach(button=>button.onclick=()=>this.renderGarage(button.dataset.garageCar));
    const apply=fn=>{
      const result=fn();
      if(!result.ok){this.$('garageMessage').textContent=result.reason;return;}
      if(result.pending){this.$('garageMessage').textContent='Sent to room host…';return;}
      this.renderer.setPlayers(this.engine.state.players);this.save();this.render();
      this.renderGarage(selected.id);
    };
    this.$('garageAction').onclick=()=>apply(()=>this.perform(owned?'equipVehicle':'claimVehicle',[selected.id]));
    this.modal.querySelectorAll('[data-garage-rim]').forEach(button=>button.onclick=()=>apply(()=>
      this.perform((p.ownedRims||[]).includes(button.dataset.garageRim)?'equipRim':'claimRim',[button.dataset.garageRim])));
    this.modal.querySelectorAll('[data-garage-paint]').forEach(button=>button.onclick=()=>apply(()=>this.perform('setVehiclePaint',[button.dataset.garagePaint])));
    this.$('garageClose').onclick=()=>{this.garageRenderToken++;this.closeModal();};
  }
  render(){
    const s=this.engine.state,p=this.engine.currentPlayer,space=this.engine.currentSpace;
    this.$('artistName').textContent=p.name+(p.bot?' · computer':'');
    this.$('round').textContent=s.round;
    this.$('cash').textContent='$'+p.cash.toLocaleString();
    const cards=Object.keys(p.producerParts).length;
    this.$('goalCount').textContent=(cards+Number(Boolean(p.song)))+'/5';
    const shortNames={hiphop:'Hip-Hop',latin:'Latin',global:'Global',country:'Country'};
    this.$('goalStrip').innerHTML=[...DISTRICTS.map(d=>({name:shortNames[d.id]||d.name,done:Boolean(p.producerParts[d.id])})),{name:'Song',done:Boolean(p.song)}]
      .map(goal=>'<div class="fusion-goal '+(goal.done?'done':'pending')+'"><span class="fusion-goal-mark" aria-hidden="true">'+(goal.done?'✓':'○')+'</span><span>'+esc(goal.name)+'</span></div>').join('');
    this.$('diceResult').textContent=s.lastRoll[0]?s.lastRoll.join(' + ')+' = '+(s.lastRoll[0]+s.lastRoll[1]):'Roll to move';
    const goalRow=(label,done,detail)=>'<div class="fusion-check '+(done?'done':'pending')+'"><span class="fusion-check-mark" aria-hidden="true">'+(done?'✓':'○')+'</span><span><b>'+esc(label)+'</b><small>'+esc(detail)+'</small></span></div>';
    this.$('pieces').innerHTML=DISTRICTS.map(d=>{
      const part=p.producerParts[d.id];
      return goalRow(d.name,Boolean(part),part?part.name+' · prompt card':'Meet this producer');
    }).join('')+goalRow('Finish fusion song',Boolean(p.song),p.song?.title||'Combine four prompts, then upload the song');
    this.$('career').innerHTML=goalRow('Music business',this.engine.ownedCount(p)>0,this.engine.ownedCount(p)+' owned · earn cash for your career')+
      goalRow('Hire manager',Boolean(p.manager),p.manager?'Hired':'Cost $'+CONFIG.managerCost)+
      goalRow('Radio airplay',Boolean(p.radio),p.radio?'Played':'Submit song · $'+CONFIG.radioCost)+
      goalRow('Festival headline',s.headlineId===p.id,s.headlineId===p.id?'Booked':'Book after radio airplay');
    const canRoll=!this.busy&&!p.bot&&!s.showcaseComplete&&(!this.online||this.online.canControl(p))&&['ready','turn'].includes(s.phase);
    const canEnd=!this.busy&&!p.bot&&!s.showcaseComplete&&(!this.online||this.online.canControl(p))&&s.phase==='landed';
    this.$('phoneBtn').disabled=this.busy;
    this.$('garageBtn').disabled=this.busy||!this.engine.garageAvailable()||(this.online&&!this.online.canControl(p));
    this.$('roll').hidden=!canRoll;this.$('endTurn').hidden=!canEnd;
    this.$('roll').parentElement.classList.toggle('is-empty',!canRoll&&!canEnd);
    const actions=this.$('actions');actions.replaceChildren();
    const action=(label,fn,secondary=false)=>{
      const button=document.createElement('button');button.textContent=label;
      if(secondary)button.className='secondary';
      button.disabled=this.busy||p.bot||(this.online&&!this.online.canControl(p));button.onclick=fn;actions.appendChild(button);
    };
    if(canEnd){
      if(space.kind==='producer'){
        if(!p.producerParts[space.producer])action('Get prompt card',()=>this.openProducer());
        else if(!p.song)action('Swap prompt card',()=>this.openProducer(),true);
      }
      if(space.kind==='property'&&!space.ownerId&&p.cash>=space.price)
        action('Buy '+space.name+' · $'+space.price,()=>this.act('buyProperty'));
      if(space.kind==='studio'){
        action('Create fusion song',()=>this.openStudio());
        if(this.engine.hasAllParts(p))action('Explore Hip-Hop Heights',()=>this.openBorough(),true);
      }
      if(space.kind==='radio')action('Submit to radio · $'+CONFIG.radioCost,()=>this.act('submitRadio'));
      if(space.kind==='festival')action('Book festival',()=>this.act('bookFinale'));
      if(!p.manager)action('Hire manager · $'+CONFIG.managerCost,()=>this.act('hireManager'),true);
    }
    if(this.engine.canShowcase()&&!s.showcaseComplete)action('Watch final showcase',()=>this.runShowcase());
    this.$('instruction').textContent=s.showcaseComplete?'Winner: '+s.players.find(x=>x.id===s.winnerId)?.name:
      p.bot?'Computer artist is taking a turn…':
      s.phase==='landed'?space.name+' · '+this.nextStep(p,space):
      'Roll the dice to reach producer blocks and music businesses.';
    this.$('gameLog').textContent=s.log[0]||'';
    this.renderer.syncOwnership(s);
    this.online?.renderCollab();
  }
  nextStep(p,space){
    if(space.kind==='studio')return this.engine.hasAllParts(p)?'All four prompts ready. Make your song.':'Studio locked. Visit all four producers.';
    if(space.kind==='radio')return p.manager&&p.song?'Submit your song.':'A recorded song and manager are required.';
    if(space.kind==='festival')return p.radio?'Book the headline slot.':'Get radio airplay first.';
    if(space.kind==='producer')return p.song?'This prompt is locked into your finished song.':p.producerParts[space.producer]?'You can swap this prompt card.':'Choose a prompt card for your song.';
    return space.kind==='property'?'Buy this business to fund your manager.':'Keep moving toward your next producer.';
  }
  perform(name,args=[]){
    if(this.online?.isGuest){const sent=this.online.request(name,args);return {ok:sent,pending:sent,reason:'Host connection unavailable.'};}
    return this.engine[name](...args);
  }
  act(name,args=[]){
    const result=this.perform(name,args);
    if(!result?.ok){
      const message=result?.reason||'That action is unavailable.';
      this.$('instruction').textContent=message;this.showNotice(message);
    }else if(result.pending){this.showNotice('Sent to host…');}
    else {this.save();this.render();this.showNotice('Done · '+this.nextStep(this.engine.currentPlayer,this.engine.currentSpace));}
  }
  async moveCurrent(){
    if(this.online&&!this.engine.currentPlayer.bot&&!this.online.canControl(this.engine.currentPlayer)&&!this.online.executingRemote)return;
    if(this.online?.isGuest){this.online.request('roll');return;}
    if(this.busy||this.engine.currentPlayer.bot&&this.modal.hidden===false)return;
    const roll=this.engine.rollDice();if(!roll)return;
    this.setStatusExpanded(false);this.setMenuOpen(false);
    this.busy=true;this.render();
    const p=this.engine.currentPlayer,index=this.engine.state.turn;
    const bot=p.bot,oldReduce=this.renderer.reduceMotion;
    if(bot)this.renderer.reduceMotion=true;
    try{
      if(!bot)await this.renderer.rollDesignerDice(roll.a,roll.b);
      for(let i=0;i<roll.total;i++){this.engine.stepPlayer();await this.renderer.animatePlayerStep(p,index);}
      this.engine.resolveLanding();
      await this.renderer.droneReveal(p,index);
    }catch(error){console.warn('Board animation skipped:',error);if(this.engine.state.phase==='moving')this.engine.resolveLanding();}
    this.renderer.reduceMotion=oldReduce;
    this.busy=false;this.save();this.render();
    if(!p.bot)this.showNotice(this.engine.currentSpace.name+' · '+this.nextStep(p,this.engine.currentSpace));
    if(p.bot){this.botAction();await delay(450);this.endTurn();}
    else if((!this.online||this.online.canControl(p))&&this.engine.currentSpace.kind==='producer'&&!p.producerParts[this.engine.currentSpace.producer])this.openProducer();
  }
  openProducer(){
    const space=this.engine.currentSpace;
    const district=DISTRICTS.find(x=>x.id===space.producer);
    if(!district)return;
    this.openModal('<small>PRODUCER SESSION</small><h2>'+esc(district.name)+'</h2><p>Choose one short direction for your AI song prompt. You can swap it if you land here again.</p><div class="choices">'+
      district.parts.map(part=>'<button data-part="'+esc(part.id)+'"><strong>'+esc(part.name)+'</strong><small>'+esc(part.prompt)+'</small></button>').join('')+
      '</div><button id="later">Decide later</button>');
    this.modal.querySelectorAll('[data-part]').forEach(button=>button.onclick=()=>{
      this.act('collectPart',[button.dataset.part]);
      this.closeModal();
    });
    this.$('later').onclick=()=>this.closeModal();
  }
  composePrompt(p){
    const directions=DISTRICTS.map(d=>{
      const chosen=p.producerParts[d.id];
      return chosen.prompt||d.parts.find(part=>part.id===chosen.id)?.prompt||chosen.name;
    });
    return 'Create an original fusion song that blends these four producer directions into one coherent arrangement:\n'+
      directions.map((line,i)=>(i+1)+'. '+line).join('\n')+
      '\nLeave room for an original lead vocal and a memorable chorus. Avoid imitating a specific artist.';
  }
  openStudio(){
    const p=this.engine.currentPlayer;
    if(!this.engine.hasAllParts(p)){this.showNotice('Studio locked: collect all four producer prompts.');return;}
    const defaultPrompt=this.composePrompt(p);
    this.openModal('<small>BEGENIUS STUDIO · PROMPT LAB</small><h2>Make your fusion song</h2><p>Your four producer cards create one prompt. Copy it into the music generator you choose, then return and upload the finished audio. AI generation is not connected inside this game yet.</p>'+
      '<label>Combined song prompt<textarea id="songPrompt" rows="9" maxlength="3000"></textarea></label><button id="copyPrompt">Copy prompt</button><span id="copyStatus" class="progress" role="status"></span>'+
      '<label>Song title<input id="songTitle" maxlength="44" placeholder="Name your song" value="'+esc(p.song?.title||'')+'"></label>'+
      '<label>Upload your finished song (audio, up to 25 MB)<input id="songFile" type="file" accept="audio/*"></label>'+
      '<p id="songStatus" class="progress">Audio stays on this device. Bring back the track made from your four prompts.</p><audio id="songPreview" controls hidden></audio>'+
      '<button class="primary" id="finishSong">Finish song</button><button id="leaveStudio">Return to board</button>');
    this.$('songPrompt').value=p.song?.prompt||defaultPrompt;
    this.$('copyPrompt').onclick=async()=>{
      const field=this.$('songPrompt');
      try{await navigator.clipboard.writeText(field.value);this.$('copyStatus').textContent=' Copied!';}
      catch(error){field.focus();field.select();this.$('copyStatus').textContent=' Select and copy this prompt.';}
    };
    let file=null,previewUrl=null;
    this.$('songFile').onchange=e=>{
      file=e.target.files?.[0]||null;
      if(previewUrl)URL.revokeObjectURL(previewUrl);
      if(!file)return;
      if(file.size>25*1024*1024){this.$('songStatus').textContent='Choose an audio file under 25 MB.';file=null;return;}
      previewUrl=URL.createObjectURL(file);
      this.$('songPreview').src=previewUrl;this.$('songPreview').hidden=false;
      this.$('songStatus').textContent='Song ready to save on this device.';
    };
    this.$('finishSong').onclick=async()=>{
      const title=this.$('songTitle').value.trim(),prompt=this.$('songPrompt').value.trim();
      if(!title){this.$('songStatus').textContent='Name your song first.';return;}
      if(!prompt){this.$('songStatus').textContent='Keep a prompt for your song.';return;}
      if(!file&&!p.song?.audioKey){this.$('songStatus').textContent='Upload the finished audio first.';return;}
      const button=this.$('finishSong');button.disabled=true;
      try{
        let key=p.song?.audioKey||null;
        if(file){key=p.id+'-'+Date.now()+'-'+Math.random().toString(36).slice(2);await storeAudio(key,file);}
        const result=this.perform('recordSong',[title,key,prompt]);
        if(!result.ok){this.$('songStatus').textContent=result.reason;button.disabled=false;return;}
        if(previewUrl)URL.revokeObjectURL(previewUrl);
        this.closeModal();this.save();this.render();this.showNotice(result.pending?'Song details sent to host. Your audio stays on this phone.':'Song finished · your prompt and audio are saved on this device.');
      }catch(error){this.$('songStatus').textContent='Could not save audio on this device. Try a smaller file or free storage.';button.disabled=false;}
    };
    this.$('leaveStudio').onclick=()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);this.closeModal();};
  }
  botAction(){
    const e=this.engine,p=e.currentPlayer,space=e.currentSpace;
    if(space.kind==='producer')e.collectPart(DISTRICTS.find(d=>d.id===space.producer).parts[(p.laps+p.position)%2].id);
    if(space.kind==='property'&&!space.ownerId&&p.cash>=space.price+75&&e.ownedCount(p)<2)e.buyProperty();
    if(!p.manager&&e.ownedCount(p)>0&&p.cash>=CONFIG.managerCost)e.hireManager();
    if(space.kind==='studio'&&e.hasAllParts(p)&&!p.song)e.recordSong(p.name+' Across the City',null,this.composePrompt(p));
    if(space.kind==='radio'&&p.song&&p.manager&&p.cash>=CONFIG.radioCost)e.submitRadio();
    if(space.kind==='festival'&&p.radio)e.bookFinale();
    this.save();this.render();
  }
  endTurn(){
    if(this.online&&!this.online.canControl(this.engine.currentPlayer)&&!this.online.executingRemote)return;
    if(this.online?.isGuest){this.online.request('endTurn');return;}
    if(!this.engine.endTurn())return;
    this.setStatusExpanded(false);this.setMenuOpen(false);
    this.save();this.render();
    if(this.engine.canShowcase()){this.runShowcase();return;}
    this.maybeBot();
  }
  maybeBot(){
    if(this.online?.isGuest)return;
    if(this.engine.currentPlayer.bot&&!this.engine.state.showcaseComplete&&this.modal.hidden)
      setTimeout(()=>this.moveCurrent(),600);
  }
  async playSong(p){
    this.stopAudio();
    const stage=this.$('showStage');let blob=null,objectUrl=null;
    try{if(p.song?.audioKey)blob=await loadAudio(p.song.audioKey);}catch(error){}
    if(blob)objectUrl=URL.createObjectURL(blob);
    const source=objectUrl||p.song?.vocalData;
    const status=document.createElement('p');
    status.textContent=source?'Playing the artist’s uploaded audio.':'Prompt-only demo · no generated audio attached.';
    stage.appendChild(status);
    if(!source){await delay(3000);return;}
    const player=document.createElement('audio');player.controls=true;player.src=source;
    player.style.width='100%';stage.appendChild(player);this.playingAudio=player;
    const next=document.createElement('button');next.textContent='Next artist';stage.appendChild(next);
    await new Promise(resolve=>{
      let done=false;
      const finish=()=>{if(done)return;done=true;resolve();};
      player.onended=finish;player.onerror=()=>{status.textContent='Audio could not play on this device.';finish();};
      next.onclick=finish;
      player.play().catch(()=>{status.textContent='Tap play to hear this song, then continue.';});
    });
    this.stopAudio();if(objectUrl)URL.revokeObjectURL(objectUrl);
  }
  stopAudio(){
    this.playingAudio?.pause();this.playingAudio=null;
  }
  async runShowcase(){
    if(!this.engine.canShowcase()||this.busy)return;
    this.busy=true;this.render();
    const players=this.engine.state.players;
    this.openModal('<small>LIVE FROM MUSIC CITY</small><h2>The Fusion Festival</h2><p>Artists with uploaded audio play their songs. Computer artists without a generator show prompt-only demos. Then each human player votes; demo judges score career progress, not audio quality.</p><div id="showStage" class="fusion-spotlight">Stage lights coming up…</div>');
    for(let i=0;i<players.length;i++){
      const p=players[i];
      this.$('showStage').innerHTML='<strong>'+esc(p.name)+'</strong><span>“'+esc(p.song.title)+'”</span><span>'+Object.values(p.song.parts).map(x=>esc(x.name)).join(' · ')+'</span><p>Performance '+(i+1)+' of '+players.length+'</p><details><summary>See producer prompt</summary><p>'+esc(p.song.prompt||'Prompt not saved in this older song.')+'</p></details>';
      await this.playSong(p);
    }
    this.busy=false;this.render();this.openVoting();
  }
  openVoting(){
    const s=this.engine.state,players=s.players;
    const humans=players.filter(x=>!x.bot);
    const votes={};let index=0;
    const base=p=>34+Object.keys(p.producerParts).length*7+(p.song?.audioKey||p.song?.vocalData?10:0)+(p.radio?8:0)+(s.headlineId===p.id?6:0);
    const showWinner=()=>{
      players.filter(x=>x.bot).forEach(bot=>{
        const choice=players.filter(x=>x.id!==bot.id).sort((a,b)=>base(b)-base(a))[0];
        votes[choice.id]=(votes[choice.id]||0)+1;
      });
      const sorted=[...players].sort((a,b)=>(base(b)+(votes[b.id]||0)*16)-(base(a)+(votes[a.id]||0)*16));
      const winner=sorted[0];s.judging={votes,scores:Object.fromEntries(players.map(p=>[p.id,base(p)+(votes[p.id]||0)*16]))};
      this.engine.finishShowcase(winner.id);this.save();
      this.openModal('<small>FESTIVAL FINALE</small><h2>'+esc(winner.name)+' wins $'+CONFIG.prize+'!</h2><p>Uploaded songs played; prompt-only artist demos appeared on stage. Audience votes and career progress determined this demo result.</p>'+ 
        sorted.map(p=>'<p><strong>'+esc(p.name)+'</strong> · “'+esc(p.song.title)+'” · '+s.judging.scores[p.id]+' points</p>').join('')+
        '<button id="closeShow">View board</button>');
      this.$('closeShow').onclick=()=>{this.closeModal();this.render();};
    };
    const next=()=>{
      if(index>=humans.length){showWinner();return;}
      const voter=humans[index++];
      this.openModal('<small>FINAL JUDGMENT</small><h2>'+esc(voter.name)+', cast your vote</h2><p>Choose another artist whose fusion song you enjoyed. You cannot vote for yourself.</p><div class="fusion-judges">'+
        players.filter(p=>p.id!==voter.id).map(p=>'<button data-vote="'+p.id+'">'+esc(p.name)+' · “'+esc(p.song.title)+'”</button>').join('')+'</div>');
      this.modal.querySelectorAll('[data-vote]').forEach(button=>button.onclick=()=>{
        votes[button.dataset.vote]=(votes[button.dataset.vote]||0)+1;next();
      });
    };
    next();
  }
}
