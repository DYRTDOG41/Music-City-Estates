import { DISTRICTS, CONFIG } from './fusion-data.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export class FusionUI {
  constructor(engine,renderer){
    this.engine=engine;this.renderer=renderer;
    this.$=id=>document.getElementById(id);
    this.modal=this.$('fusionModal');
    this.busy=false;this.audioContext=null;this.playingAudio=null;
    this.$('roll').onclick=()=>this.moveCurrent();
    this.$('endTurn').onclick=()=>this.endTurn();
    this.$('newGame').onclick=()=>this.openSetup();
    this.$('visitHeights').onclick=()=>this.openBorough();
    this.$('leaveBorough').onclick=()=>this.closeBorough();
    renderer.addEventListener('pick',e=>{
      if(e.detail.type==='borough'){
        if(e.detail.id==='hiphop')this.openBorough();
        else this.$('instruction').textContent='The '+DISTRICTS.find(x=>x.id===e.detail.id)?.name+' producer is playable on the board. A walkable neighborhood is coming later.';
        return;
      }
      if(e.detail.type==='space'){
        const item=engine.state.spaces.find(x=>x.id===e.detail.id);
        if(item)this.$('instruction').textContent=item.name+' · '+(item.kind==='producer'?'Land here to choose a sound.':item.kind==='property'?'Land here to buy this music business.':item.effect||'');
      }
    });
    engine.addEventListener('state',()=>this.render());
    engine.addEventListener('landed',()=>this.render());
    engine.addEventListener('turn',()=>this.render());
    this.render();this.openSetup();
  }
  openBorough(){
    if(!this.modal.hidden)return;
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
    try{localStorage.setItem(CONFIG.saveKey,JSON.stringify(this.engine.exportState()));}
    catch(error){this.$('instruction').textContent='This device could not save the session. Audio files may be too large.';}
  }
  closeModal(){this.modal.hidden=true;this.modal.replaceChildren();}
  openModal(html){this.modal.innerHTML='<div class="fusion-card">'+html+'</div>';this.modal.hidden=false;}
  openSetup(){
    this.openModal('<h2>Music City Estates · Fusion Board</h2><p>Roll around the 3D city, meet four producers, build one song, buy a music business, hire a manager and get radio airplay. The first artist to reach the festival headlines the four-song showcase.</p>'+
      '<p><strong>Four artists enter the showcase.</strong> Uncheck “Computer artist” for each friend playing on this device. Online rooms are not connected in this prototype.</p>'+
      '<div id="setupRows"></div><div><button class="primary" id="begin">Start game</button><button id="continue">Continue saved game</button></div>');
    const rows=this.$('setupRows');
    const add=(name,bot=false)=>{
      if(rows.children.length>=4)return;
      const row=document.createElement('label');
      row.innerHTML='Artist '+(rows.children.length+1)+'<input maxlength="22" value="'+esc(name)+'" aria-label="Artist name"><label><input type="checkbox" '+(bot?'checked':'')+'> Computer artist</label>';
      rows.appendChild(row);
    };
    add('Artist 1');add('City Bot 2',true);add('City Bot 3',true);add('City Bot 4',true);
    this.$('begin').onclick=()=>{
      const entries=[...rows.children].map((row,i)=>({
        name:row.querySelector('input:not([type=checkbox])').value.trim()||'Artist '+(i+1),
        bot:row.querySelector('input[type=checkbox]').checked
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
  }
  render(){
    const s=this.engine.state,p=this.engine.currentPlayer,space=this.engine.currentSpace;
    this.$('artistName').textContent=p.name+(p.bot?' · computer':'');
    this.$('round').textContent=s.round;
    this.$('cash').textContent='$'+p.cash.toLocaleString();
    this.$('diceResult').textContent=s.lastRoll[0]?s.lastRoll.join(' + ')+' = '+(s.lastRoll[0]+s.lastRoll[1]):'Roll to move';
    this.$('pieces').innerHTML=DISTRICTS.map(d=>{
      const part=p.producerParts[d.id];
      return '<div class="fusion-piece '+(part?'done':'')+'"><b>'+esc(d.name)+'</b>'+esc(part?part.name:'Find producer')+'</div>';
    }).join('');
    this.$('career').textContent='Properties: '+this.engine.ownedCount(p)+' · Song: '+(p.song?p.song.title:'unfinished')+
      ' · Manager: '+(p.manager?'hired':'needed')+' · Radio: '+(p.radio?'played':'waiting');
    const canRoll=!this.busy&&!p.bot&&!s.showcaseComplete&&['ready','turn'].includes(s.phase);
    const canEnd=!this.busy&&!p.bot&&!s.showcaseComplete&&s.phase==='landed';
    this.$('roll').hidden=!canRoll;this.$('endTurn').hidden=!canEnd;
    const actions=this.$('actions');actions.replaceChildren();
    const action=(label,fn,secondary=false)=>{
      const button=document.createElement('button');button.textContent=label;
      if(secondary)button.className='secondary';
      button.disabled=this.busy||p.bot;button.onclick=fn;actions.appendChild(button);
    };
    if(canEnd){
      if(space.kind==='producer'){
        if(!p.producerParts[space.producer])action('Meet producer',()=>this.openProducer());
        else action('Choose another sound',()=>this.openProducer(),true);
      }
      if(space.kind==='property'&&!space.ownerId&&p.cash>=space.price)
        action('Buy '+space.name+' · $'+space.price,()=>this.act(()=>this.engine.buyProperty()));
      if(space.kind==='studio'){
        action('Record fusion song',()=>this.openStudio());
        if(this.engine.hasAllParts(p))action('Explore Hip-Hop Heights',()=>this.openBorough(),true);
      }
      if(space.kind==='radio')action('Submit to radio · $'+CONFIG.radioCost,()=>this.act(()=>this.engine.submitRadio()));
      if(space.kind==='festival')action('Book festival',()=>this.act(()=>this.engine.bookFinale()));
      if(!p.manager)action('Hire manager · $'+CONFIG.managerCost,()=>this.act(()=>this.engine.hireManager()),true);
    }
    if(this.engine.canShowcase()&&!s.showcaseComplete)action('Watch final showcase',()=>this.runShowcase());
    this.$('instruction').textContent=s.showcaseComplete?'Winner: '+s.players.find(x=>x.id===s.winnerId)?.name:
      p.bot?'Computer artist is taking a turn…':
      s.phase==='landed'?space.name+' · '+this.nextStep(p,space):
      'Roll the dice to reach producer blocks and music businesses.';
    this.$('gameLog').textContent=s.log[0]||'';
    this.renderer.syncOwnership(s);
  }
  nextStep(p,space){
    if(space.kind==='studio')return this.engine.hasAllParts(p)?'All four sounds ready. Record your song.':'Studio locked. Visit all four producers.';
    if(space.kind==='radio')return p.manager&&p.song?'Submit your song.':'A recorded song and manager are required.';
    if(space.kind==='festival')return p.radio?'Book the headline slot.':'Get radio airplay first.';
    if(space.kind==='producer')return p.producerParts[space.producer]?'You can swap this sound.':'Choose a sound for your song.';
    return space.kind==='property'?'Buy this business to fund your manager.':'Keep moving toward your next producer.';
  }
  act(fn){
    const result=fn();
    if(!result?.ok)this.$('instruction').textContent=result?.reason||'That action is unavailable.';
    else {this.save();this.render();}
  }
  async moveCurrent(){
    if(this.busy||this.engine.currentPlayer.bot&&this.modal.hidden===false)return;
    const roll=this.engine.rollDice();if(!roll)return;
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
    if(p.bot){this.botAction();await delay(450);this.endTurn();}
    else if(this.engine.currentSpace.kind==='producer'&&!p.producerParts[this.engine.currentSpace.producer])this.openProducer();
  }
  openProducer(){
    const space=this.engine.currentSpace;
    const district=DISTRICTS.find(x=>x.id===space.producer);
    if(!district)return;
    this.openModal('<small>PRODUCER SESSION</small><h2>'+esc(district.name)+'</h2><p>Pick one sound for your fusion song. Every artist can work with this producer.</p><div class="choices">'+
      district.parts.map(part=>'<button data-part="'+esc(part.id)+'">'+esc(part.name)+'</button>').join('')+
      '</div><button id="later">Decide later</button>');
    this.modal.querySelectorAll('[data-part]').forEach(button=>button.onclick=()=>{
      this.act(()=>this.engine.collectPart(button.dataset.part));
      this.closeModal();
    });
    this.$('later').onclick=()=>this.closeModal();
  }
  openStudio(){
    const p=this.engine.currentPlayer;
    if(!this.engine.hasAllParts(p)){this.$('instruction').textContent='Studio locked: collect all four producer sounds.';return;}
    this.openModal('<small>BEGENIUS STUDIO</small><h2>Make your fusion song</h2><p>Your four producers supplied the groove, percussion, melody and texture. Record a short original vocal or upload one to finish your song.</p>'+
      '<label>Song title<input id="songTitle" maxlength="44" placeholder="Name your song" value="'+esc(p.song?.title||'')+'"></label>'+
      '<button id="recordVocal">Record 12 seconds</button><label>Or upload your own short vocal<input id="vocalFile" type="file" accept="audio/*"></label>'+
      '<p id="vocalStatus" class="progress">A vocal is required for a human artist.</p><audio id="vocalPreview" controls hidden></audio>'+
      '<button class="primary" id="finishSong">Finish song</button><button id="leaveStudio">Return to board</button>');
    let vocalData=p.song?.vocalData||null;
    const setVocal=data=>{vocalData=data;this.$('vocalStatus').textContent='Vocal ready. Your four sounds will play beneath it at the showcase.';this.$('vocalPreview').src=data;this.$('vocalPreview').hidden=false;};
    if(vocalData)setVocal(vocalData);
    this.$('vocalFile').onchange=async e=>{
      const file=e.target.files?.[0];if(!file)return;
      if(file.size>700000){this.$('vocalStatus').textContent='Choose a short audio clip under 700 KB for device saving.';return;}
      const reader=new FileReader();reader.onload=()=>setVocal(reader.result);reader.readAsDataURL(file);
    };
    this.$('recordVocal').onclick=async()=>{
      if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){
        this.$('vocalStatus').textContent='Microphone recording is unavailable here. Upload a short audio clip instead.';return;
      }
      let stream;
      try{
        stream=await navigator.mediaDevices.getUserMedia({audio:true});
        const recorder=new MediaRecorder(stream),chunks=[];
        recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
        recorder.onstop=()=>{
          stream.getTracks().forEach(t=>t.stop());
          const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});
          if(blob.size>700000){this.$('vocalStatus').textContent='Recording too large; upload a shorter clip.';return;}
          const reader=new FileReader();reader.onload=()=>setVocal(reader.result);reader.readAsDataURL(blob);
        };
        recorder.start();this.$('recordVocal').disabled=true;
        this.$('vocalStatus').textContent='Recording… sing or rap your original hook.';
        setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},12000);
      }catch(error){stream?.getTracks().forEach(t=>t.stop());this.$('vocalStatus').textContent='Microphone unavailable. Upload a short clip instead.';}
    };
    this.$('finishSong').onclick=()=>{
      if(!vocalData){this.$('vocalStatus').textContent='Record or upload your vocal first.';return;}
      const result=this.engine.recordSong(this.$('songTitle').value,vocalData);
      if(!result.ok){this.$('vocalStatus').textContent=result.reason;return;}
      this.closeModal();this.save();this.render();
    };
    this.$('leaveStudio').onclick=()=>this.closeModal();
  }
  botAction(){
    const e=this.engine,p=e.currentPlayer,space=e.currentSpace;
    if(space.kind==='producer')e.collectPart(DISTRICTS.find(d=>d.id===space.producer).parts[(p.laps+p.position)%2].id);
    if(space.kind==='property'&&!space.ownerId&&p.cash>=space.price+75&&e.ownedCount(p)<2)e.buyProperty();
    if(!p.manager&&e.ownedCount(p)>0&&p.cash>=CONFIG.managerCost)e.hireManager();
    if(space.kind==='studio'&&e.hasAllParts(p)&&!p.song)e.recordSong(p.name+' Across the City');
    if(space.kind==='radio'&&p.song&&p.manager&&p.cash>=CONFIG.radioCost)e.submitRadio();
    if(space.kind==='festival'&&p.radio)e.bookFinale();
    this.save();this.render();
  }
  endTurn(){
    if(!this.engine.endTurn())return;
    this.save();this.render();
    if(this.engine.canShowcase()){this.runShowcase();return;}
    this.maybeBot();
  }
  maybeBot(){
    if(this.engine.currentPlayer.bot&&!this.engine.state.showcaseComplete&&this.modal.hidden)
      setTimeout(()=>this.moveCurrent(),600);
  }
  async playSong(p,duration=11000){
    this.stopAudio();
    const Context=window.AudioContext||window.webkitAudioContext;
    if(Context){
      this.audioContext=new Context();
      try{await this.audioContext.resume();}catch(e){}
      const context=this.audioContext,start=context.currentTime+.05;
      const sound=(time,frequency,length,volume,shape='sine')=>{
        const oscillator=context.createOscillator(),gain=context.createGain();
        oscillator.type=shape;oscillator.frequency.setValueAtTime(frequency,time);
        gain.gain.setValueAtTime(.001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.015);
        gain.gain.exponentialRampToValueAtTime(.001,time+length);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(time);oscillator.stop(time+length+.03);
      };
      for(let i=0;i<24;i++){
        const t=start+i*.43;
        if(p.producerParts.hiphop){if(i%4===0)sound(t,70,.20,.15);if(i%4===2)sound(t,175,.08,.07,'triangle');}
        if(p.producerParts.latin){if(i%3===0)sound(t+.12,460,.06,.055,'triangle');sound(t+.24,740,.04,.025);}
        if(p.producerParts.global&&i%2===0)sound(t+.06,[330,392,440,392][i%4],.24,.035);
        if(p.producerParts.country&&i%4===0){sound(t+.04,220,.28,.045,'sawtooth');sound(t+.04,330,.23,.025);}
      }
    }
    if(p.song?.vocalData){
      const audio=new Audio(p.song.vocalData);this.playingAudio=audio;
      audio.volume=.85;audio.play().catch(()=>{});
    }
    await delay(duration);this.stopAudio();
  }
  stopAudio(){
    this.playingAudio?.pause();this.playingAudio=null;
    this.audioContext?.close().catch(()=>{});this.audioContext=null;
  }
  async runShowcase(){
    if(!this.engine.canShowcase()||this.busy)return;
    this.busy=true;this.render();
    const players=this.engine.state.players;
    this.openModal('<small>LIVE FROM MUSIC CITY</small><h2>The Fusion Festival</h2><p>Every artist gets a stage moment. Listen to all the songs, then cast one vote per human player. The demo judges score career progress; they do not evaluate audio quality.</p><div id="showStage" class="fusion-spotlight">Stage lights coming up…</div>');
    for(let i=0;i<players.length;i++){
      const p=players[i];
      this.$('showStage').innerHTML='<strong>'+esc(p.name)+'</strong><span>“'+esc(p.song.title)+'”</span><span>'+Object.values(p.song.parts).map(x=>esc(x.name)).join(' · ')+'</span><p>Performance '+(i+1)+' of '+players.length+'</p>';
      await this.playSong(p);
    }
    this.busy=false;this.render();this.openVoting();
  }
  openVoting(){
    const s=this.engine.state,players=s.players;
    const humans=players.filter(x=>!x.bot);
    const votes={};let index=0;
    const base=p=>34+Object.keys(p.producerParts).length*7+(p.song?.vocalData?10:0)+(p.radio?8:0)+(s.headlineId===p.id?6:0);
    const showWinner=()=>{
      players.filter(x=>x.bot).forEach(bot=>{
        const choice=players.filter(x=>x.id!==bot.id).sort((a,b)=>base(b)-base(a))[0];
        votes[choice.id]=(votes[choice.id]||0)+1;
      });
      const sorted=[...players].sort((a,b)=>(base(b)+(votes[b.id]||0)*16)-(base(a)+(votes[a.id]||0)*16));
      const winner=sorted[0];s.judging={votes,scores:Object.fromEntries(players.map(p=>[p.id,base(p)+(votes[p.id]||0)*16]))};
      this.engine.finishShowcase(winner.id);this.save();
      this.openModal('<small>FESTIVAL FINALE</small><h2>'+esc(winner.name)+' wins $'+CONFIG.prize+'!</h2><p>The four songs played. Audience votes and career progress determined this demo result.</p>'+
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
