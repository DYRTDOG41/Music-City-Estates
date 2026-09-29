import { DISTRICTS } from './fusion-data.js?v=4';

// Peer-to-peer playtest rooms for the Fusion Board.
// The host is authoritative for turns and cash. No API key or paid backend required.
// This is not production multiplayer: keep the host tab open; public PeerJS signalling
// has no account, moderation, server persistence, or guaranteed reconnect.
const html = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const nameOf = value => String(value || 'Guest Artist').trim().slice(0,22) || 'Guest Artist';
const allowed = new Set(['collectPart','buyProperty','hireManager','recordSong','submitRadio','bookFinale',
  'claimVehicle','equipVehicle','claimRim','equipRim','setVehiclePaint']);
const roomPattern = /^mce-fusion-[a-z0-9]{6,14}$/;

export class FusionRoom {
  constructor(engine, renderer, ui) {
    this.engine=engine; this.renderer=renderer; this.ui=ui;
    this.role='solo'; this.peer=null; this.roomId=''; this.seatId='';
    this.connections=new Map(); this.seats=new Map(); this.chat=[];
    this.joinName=''; this.connection=null; this.executingRemote=false; this.sending=false;
    this.lastRevision=0; this.revision=0; this.lastCars='';
    this.invitedRoom=new URL(location.href).searchParams.get('room') || '';
    engine.addEventListener('state',()=>this.queueBroadcast());
    engine.addEventListener('landed',()=>this.queueBroadcast());
    engine.addEventListener('turn',()=>this.queueBroadcast());
  }
  get active(){return this.role!=='solo';}
  get isGuest(){return this.role==='guest';}
  canControl(player){
    if(this.role==='solo')return true;
    if(this.role==='host')return player.id===this.seatId;
    return player.id===this.seatId && Boolean(this.connection?.open);
  }
  notice(message){this.ui.showNotice(message,4300); this.updatePanel(message);}
  updatePanel(message){
    for(const id of ['roomStatus','phoneRoomStatus']){
      const element=document.getElementById(id);
      if(element)element.textContent=message;
    }
  }
  inviteLink(){
    const url=new URL('fusion_board.html',location.href);
    // Vercel's preview Share link grants invited friends access to the protected branch.
    // Keep that share parameter when the phone creates a new room invite.
    const access=new URL(location.href).searchParams.get('_vercel_share');
    if(access)url.searchParams.set('_vercel_share',access);
    if(this.roomId)url.searchParams.set('room',this.roomId);
    return url.href;
  }
  setupView(){
    const rows=document.getElementById('setupRows');
    if(!rows || this.active)return;
    rows.insertAdjacentHTML('afterend',
      '<section class="fusion-online-join"><h3>Join friends on another phone</h3>'+
      '<p>Enter a room code or open the invitation link. One phone per artist; the host keeps the game running.</p>'+
      '<label>Your artist name<input id="joinArtist" maxlength="22" placeholder="Artist name" value=""></label>'+
      '<label>Online room code<input id="joinCode" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="mce-fusion-xxxxxx" value="'+html(this.invitedRoom)+'"></label>'+
      '<button type="button" id="joinFusion" class="primary">Join online board</button>'+
      '<p id="roomStatus" role="status"></p>'+
      '</section>');
    document.getElementById('joinFusion').onclick=()=>{
      this.joinRoom(document.getElementById('joinCode').value,document.getElementById('joinArtist').value);
    };
    if(this.invitedRoom)document.getElementById('joinArtist').focus();
  }
  phoneView(){
    const roster=document.querySelector('.phone-roster');
    if(!roster)return;
    const existing=document.getElementById('livePhonePanel');
    if(existing)existing.remove();
    const panel=document.createElement('section');
    panel.id='livePhonePanel'; panel.className='fusion-online-panel';
    if(!this.active){
      panel.innerHTML='<h3>Online game room</h3>'+
        '<p>Host a shared board for up to four artists. Use the invite to connect separate phones. Text chat works inside the phone; voice chat is a later milestone.</p>'+
        '<button id="createFusionRoom" class="primary">Create online room</button>'+
        '<p id="phoneRoomStatus" role="status">For friends to join, keep this tab open.</p>';
      roster.after(panel);
      this.renderCollab();
      document.getElementById('createFusionRoom').onclick=()=>this.hostRoom();
      return;
    }
    const host=this.role==='host';
    panel.innerHTML='<h3>Live game · '+(host?'Host':'Guest')+'</h3>'+
      '<p><strong>Room code:</strong> <code>'+html(this.roomId)+'</code></p>'+
      '<p id="phoneRoomStatus" role="status">'+(host?'Friends can join with your invite.':'Connected to the host board.')+'</p>'+
      (host?'<button id="copyRoomInvite" class="primary">Copy online invite</button>':'')+
      '<button id="leaveFusionRoom" type="button">Leave online room</button>'+
      '<h3>Room messages</h3><div id="roomMessages" class="fusion-room-messages" role="log" aria-live="polite"></div>'+
      '<form id="roomChatForm"><label>Message your crew<input id="roomChat" maxlength="240" placeholder="Type a message" autocomplete="off"></label>'+
      '<button type="submit">Send</button></form>'+
      '<p class="fusion-room-note">Text only. Host tab must stay open. Finished audio remains on the artist’s device; it is not shared through the room yet.</p>';
    roster.after(panel);
    this.renderCollab();
    if(host)document.getElementById('copyRoomInvite').onclick=async()=>{
      try{await navigator.clipboard.writeText(this.inviteLink());this.updatePanel('Online invite copied for Messenger.');}
      catch(e){this.updatePanel('Copy this invite: '+this.inviteLink());}
    };
    document.getElementById('leaveFusionRoom').onclick=()=>this.leave();
    document.getElementById('roomChatForm').onsubmit=event=>{
      event.preventDefault();
      const input=document.getElementById('roomChat');this.sendChat(input.value);input.value='';
    };
    this.drawChat();
  }
  // Every artist carries their own producer cards in the phone, even off-turn.
  // Exchanging a card is host-validated and changes only the recipient's missing slot.
  renderCollab(){
    const roster=document.querySelector('.phone-roster');
    if(!roster)return;
    let zone=document.getElementById('phoneCollabPanel');
    if(!zone){zone=document.createElement('section');zone.id='phoneCollabPanel';zone.className='fusion-online-panel';}
    roster.after(zone);
    const me=this.active?this.engine.state.players.find(p=>p.id===this.seatId):this.engine.currentPlayer;
    if(!me){zone.innerHTML='<h3>Producer network</h3><p>Connecting your artist seat…</p>';return;}
    const owned=DISTRICTS.filter(d=>me.producerParts?.[d.id]);
    const cards=DISTRICTS.map(d=>{
      const part=me.producerParts?.[d.id];
      return '<div class="fusion-prompt-card"><b>'+html(d.name)+'</b><span>'+
        (part?html(part.name)+' · '+html(part.prompt)+(part.sharedBy?' <em>Shared by '+html(part.sharedBy)+'</em>':''):'Visit this producer or receive a card from a friend.')+
        '</span></div>';
    }).join('');
    const receivers=this.active?this.engine.state.players.filter(p=>p.id!==me.id&&!p.bot):[];
    const canOffer=owned.length>0&&receivers.length>0&&!me.song&&!this.engine.state.showcaseComplete&&
      (this.role==='host'||Boolean(this.connection?.open));
    const possible=DISTRICTS.filter(d=>me.producerParts?.[d.id]&&receivers.some(p=>!p.producerParts?.[d.id]&&!p.song));
    zone.innerHTML='<h3>Producer network · '+owned.length+'/4 cards</h3>'+
      '<p>Earn cards on producer blocks. You keep your card when you share it with a friend who needs that borough.</p>'+
      '<div class="fusion-prompt-cards">'+cards+'</div>'+
      (canOffer&&possible.length?'<form id="sharePromptForm" class="fusion-share-form">'+
        '<label>Send to<select id="sharePromptArtist">'+receivers.map(p=>'<option value="'+html(p.id)+'">'+html(p.name)+'</option>').join('')+'</select></label>'+
        '<label>Your card<select id="sharePromptDistrict">'+possible.map(d=>'<option value="'+html(d.id)+'">'+html(d.name)+'</option>').join('')+'</select></label>'+
        '<button type="submit" class="primary">Share card</button></form>'+
        '<p id="sharePromptStatus" role="status"></p>':
        this.active?'<p>Connect another artist or collect a card they are missing to exchange prompts.</p>':'<p>Start an online room to exchange cards with artists on other phones.</p>')+
      (owned.length===4?'<details class="fusion-song-draft"><summary>Preview your four-prompt song</summary>'+
        '<textarea id="phoneSongDraft" readonly rows="8">'+html(this.ui.composePrompt(me))+'</textarea>'+
        '<button id="copyPhoneSongPrompt" type="button">Copy song prompt</button>'+
        '<p id="phonePromptCopyStatus" role="status"></p>'+
        '<p>Bring this prompt to BeGenius Studio when you land there to finish the song.</p></details>':'');
    document.getElementById('sharePromptForm')?.addEventListener('submit',event=>{
      event.preventDefault();
      const target=document.getElementById('sharePromptArtist').value;
      const district=document.getElementById('sharePromptDistrict').value;
      this.sharePart(target,district);
    });
    document.getElementById('copyPhoneSongPrompt')?.addEventListener('click',async()=>{
      const box=document.getElementById('phoneSongDraft');
      try{await navigator.clipboard.writeText(box.value);document.getElementById('phonePromptCopyStatus').textContent='Prompt copied.';}
      catch(error){box.focus();box.select();document.getElementById('phonePromptCopyStatus').textContent='Select and copy this prompt.';}
    });
  }
  announcePartShare(result){
    const message={type:'chat',from:'Producer Network',text:result.from+' shared a '+result.district+' card with '+result.to+'.'};
    this.appendChat(message);this.broadcast(message);
  }
  sharePart(toId,districtId){
    if(!this.active){this.notice('Create or join a room to share producer prompts.');return;}
    if(this.isGuest){
      const sent=this.request('sharePart',[toId,districtId]);
      const status=document.getElementById('sharePromptStatus');
      if(status)status.textContent=sent?'Offer sent to the host…':'Could not contact the host.';
      return;
    }
    const result=this.engine.sharePart(this.seatId,toId,districtId);
    if(!result.ok){this.notice(result.reason);return;}
    this.ui.save();this.announcePartShare(result);this.queueBroadcast();
    this.renderCollab();
  }
  drawChat(){
    const box=document.getElementById('roomMessages');
    if(!box)return;
    box.innerHTML=this.chat.slice(-40).map(m=>'<p><b>'+html(m.from)+'</b>: '+html(m.text)+'</p>').join('') ||
      '<p>Messages from your crew will show here.</p>';
    box.scrollTop=box.scrollHeight;
  }
  appendChat(message){
    this.chat.push({from:nameOf(message.from),text:String(message.text || '').slice(0,240)});
    this.chat=this.chat.slice(-40);this.drawChat();
  }
  sendChat(raw){
    const value=String(raw || '').trim().slice(0,240);
    if(!value || !this.active)return;
    if(this.role==='host'){
      const from=this.engine.state.players.find(p=>p.id===this.seatId)?.name || 'Host';
      const message={type:'chat',from,text:value};
      this.appendChat(message);this.broadcast(message);
    }else if(this.connection?.open)this.connection.send({type:'chat',text:value});
    else this.notice('Message not sent: reconnect to the room.');
  }
  async hostRoom(){
    if(this.active)return;
    if(typeof Peer==='undefined'){this.notice('Online service could not load. Check your connection.');return;}
    const bytes=new Uint8Array(5);crypto.getRandomValues(bytes);
    const roomId='mce-fusion-'+[...bytes].map(n=>n.toString(16).padStart(2,'0')).join('');
    this.role='host';this.roomId=roomId;this.seatId=this.engine.state.players[0].id;
    this.peer=new Peer(roomId);
    this.peer.on('open',()=>{
      this.notice('Room live. Copy the online invite from your phone.');
      this.phoneView();
    });
    this.peer.on('connection',conn=>this.acceptGuest(conn));
    this.peer.on('error',err=>{
      this.notice('Room connection failed: '+(err?.type || 'network error'));
      if(!this.connections.size)this.leave(true);
    });
    this.peer.on('disconnected',()=>this.notice('Signalling disconnected. Existing players may continue until their connections close.'));
    this.phoneView();
  }
  async joinRoom(rawCode,rawName){
    if(this.active)return;
    if(typeof Peer==='undefined'){this.notice('Online service could not load. Check your connection.');return;}
    const code=String(rawCode || '').trim().toLowerCase();
    if(!roomPattern.test(code)){this.updatePanel('Use the room code from your friend’s invite.');return;}
    this.role='guest';this.roomId=code;this.joinName=nameOf(rawName);
    this.updatePanel('Connecting to your friend’s game…');
    this.peer=new Peer();
    this.peer.on('open',()=>{
      const conn=this.peer.connect(code,{reliable:true});
      this.connection=conn;
      conn.on('open',()=>conn.send({type:'hello',name:this.joinName}));
      conn.on('data',data=>this.onGuestMessage(data));
      conn.on('close',()=>this.disconnected());
      conn.on('error',()=>this.disconnected());
    });
    this.peer.on('error',err=>{this.notice('Could not join room: '+(err?.type || 'connection problem'));this.disconnected();});
  }
  acceptGuest(conn){
    if(this.role!=='host'){conn.close();return;}
    conn.on('data',message=>{
      if(!message || typeof message!=='object')return;
      if(!this.seats.has(conn.peer)){
        if(message.type!=='hello')return;
        const taken=new Set([this.seatId,...this.seats.values()]);
        const slot=this.engine.state.players.find(p=>!p.bot && !taken.has(p.id)) ||
          this.engine.state.players.find(p=>p.bot && !taken.has(p.id));
        if(!slot){conn.send({type:'rejected',reason:'Room full (four artists maximum).'});conn.close();return;}
        slot.bot=false;slot.name=nameOf(message.name);
        this.connections.set(conn.peer,conn);this.seats.set(conn.peer,slot.id);
        this.renderer.setPlayers(this.engine.state.players);
        this.engine.log(slot.name+' joined the online board.');
        conn.send({type:'welcome',seat:slot.id,roomId:this.roomId,state:this.engine.exportState(),
          revision:++this.revision,chat:this.chat});
        this.broadcastState();this.updatePanel(slot.name+' joined your game.');
        this.ui.render();return;
      }
      if(message.type==='chat'){
        const text=String(message.text || '').trim().slice(0,240);
        if(!text)return;
        const seat=this.seats.get(conn.peer),player=this.engine.state.players.find(p=>p.id===seat);
        const chat={type:'chat',from:player?.name || 'Guest',text};
        this.appendChat(chat);this.broadcast(chat);
      }else if(message.type==='command')this.hostCommand(conn,message);
    });
    conn.on('close',()=>this.removeGuest(conn));
    conn.on('error',()=>this.removeGuest(conn));
  }
  removeGuest(conn){
    const seat=this.seats.get(conn.peer);
    this.connections.delete(conn.peer);this.seats.delete(conn.peer);
    if(!seat)return;
    const player=this.engine.state.players.find(p=>p.id===seat);
    if(player){player.bot=true;this.engine.log(player.name+' left; computer artist takes over.');}
    this.queueBroadcast();this.ui.render();this.ui.maybeBot();
  }
  async hostCommand(conn,message){
    const seat=this.seats.get(conn.peer),player=this.engine.currentPlayer;
    const action=String(message.action || '');
    if(action==='sharePart'){
      const args=Array.isArray(message.args)?message.args.slice(0,2):[];
      const result=this.engine.sharePart(seat,args[0],args[1]);
      if(!result.ok){conn.send({type:'error',text:result.reason});return;}
      this.ui.save();this.announcePartShare(result);this.queueBroadcast();
      conn.send({type:'ack',text:'Producer card shared.'});return;
    }
    if(seat!==player.id || this.ui.busy || player.bot || this.engine.state.showcaseComplete){
      conn.send({type:'error',text:'Wait for your turn to take that action.'});return;
    }
    if(action==='roll'){
      if(!['ready','turn'].includes(this.engine.state.phase)){
        conn.send({type:'error',text:'Dice are unavailable right now.'});return;
      }
      this.executingRemote=true;
      try{await this.ui.moveCurrent();}finally{this.executingRemote=false;this.queueBroadcast();}
      return;
    }
    if(action==='endTurn'){
      this.executingRemote=true;
      try{this.ui.endTurn();}finally{this.executingRemote=false;this.queueBroadcast();}
      return;
    }
    if(!allowed.has(action)){conn.send({type:'error',text:'Unknown game action.'});return;}
    const args=Array.isArray(message.args)?message.args.slice(0,4):[];
    let result;
    try{result=this.engine[action](...args);}catch(e){result={ok:false,reason:'Invalid game action.'};}
    if(!result?.ok){conn.send({type:'error',text:result?.reason || 'Action unavailable.'});return;}
    this.ui.save();this.ui.render();this.queueBroadcast();
    conn.send({type:'ack',text:'Action saved on the host.'});
  }
  request(action,args=[]){
    if(!this.isGuest || !this.connection?.open){this.notice('Not connected to the host.');return false;}
    this.connection.send({type:'command',action,args});return true;
  }
  onGuestMessage(data){
    if(!data || typeof data!=='object')return;
    if(data.type==='rejected'){this.notice(data.reason);this.disconnected();return;}
    if(data.type==='error' || data.type==='ack'){if(data.type==='error')this.notice(data.text);return;}
    if(data.type==='chat'){this.appendChat(data);return;}
    if(data.type==='welcome'){
      this.seatId=data.seat;this.chat=Array.isArray(data.chat)?data.chat.slice(-40):[];
      this.ui.closeModal();this.renderer.paused=false;
      this.updatePanel('Joined your friend’s board.');
    }
    if(data.type==='welcome' || data.type==='state'){
      if(!data.state || data.revision<=this.lastRevision)return;
      this.lastRevision=data.revision;
      try{
        this.engine.importState(data.state);
        const cars=JSON.stringify(this.engine.state.players.map(p=>[p.id,p.equippedVehicle,p.equippedRim,p.vehiclePaint]));
        if(data.type==='welcome'||cars!==this.lastCars){
          this.renderer.setPlayers(this.engine.state.players);
          this.lastCars=cars;
        }else this.engine.state.players.forEach((p,i)=>this.renderer.snapPlayer(p,i));
        this.renderer.syncOwnership(this.engine.state);
        if(data.type==='welcome')this.renderer.boardView();
        this.ui.render();this.drawChat();
        if(data.type==='welcome')this.notice('Connected! You control '+this.engine.state.players.find(p=>p.id===this.seatId)?.name+'.');
      }catch(e){this.notice('Could not read the host game state.');}
    }
  }
  queueBroadcast(){
    if(this.role!=='host'||this.sending)return;
    this.sending=true;
    queueMicrotask(()=>{this.sending=false;this.broadcastState();});
  }
  broadcastState(){
    if(this.role!=='host')return;
    const message={type:'state',revision:++this.revision,state:this.engine.exportState()};
    this.broadcast(message);
  }
  broadcast(message){
    for(const conn of this.connections.values())if(conn.open)conn.send(message);
  }
  disconnected(){
    if(this.role!=='guest')return;
    const hadSeat=Boolean(this.seatId);
    this.connection=null;
    if(!hadSeat){
      this.role='solo';this.peer?.destroy();this.peer=null;this.roomId='';
      this.updatePanel('Could not connect. Check the room code and try again.');
      return;
    }
    this.notice('Host connection ended. Online game paused. Open the phone to leave this room.');
    if(!this.ui.modal.hidden)this.phoneView();
    this.ui.render();
  }
  leave(silent=false){
    if(this.role==='solo')return;
    const wasGuest=this.role==='guest';
    this.role='solo';this.connection?.close();this.peer?.destroy();
    this.peer=null;this.connection=null;this.connections.clear();this.seats.clear();
    this.roomId='';this.seatId='';this.lastRevision=0;this.lastCars='';
    if(wasGuest){this.engine.newGame();this.renderer.setPlayers(this.engine.state.players);this.renderer.boardView();}
    this.ui.closeModal();this.renderer.paused=false;this.ui.render();
    if(!silent)this.notice(wasGuest?'Left the room. Start a solo game or join another room.':'Room closed. Your local game is still saved.');
    this.ui.openSetup();
  }
}
