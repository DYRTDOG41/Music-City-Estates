import { BOARD_SPACES, LANDMARKS, DISTRICTS, CONFIG } from './fusion-data.js?v=6';
import { VEHICLES, RIMS, PAINTS, STARTER_VEHICLES, vehicleGate, rimGate } from './fusion-vehicles.js';

const copy = value => JSON.parse(JSON.stringify(value));
const COLORS=['#47a9ff','#f29964','#ba8cf5','#6bd2ad'];
export class FusionEngine extends EventTarget {
  constructor(){super();this.newGame();}
  emit(type,detail={}){this.dispatchEvent(new CustomEvent(type,{detail}));}
  newGame(entries=[{name:'Artist 1',bot:false},{name:'City Bot',bot:true}]){
    this.state={
      version:1,boardArtworkVersion:'approved-art-v1',turn:0,round:1,phase:'ready',lastRoll:[0,0],headlineId:null,
      showcaseComplete:false,winnerId:null,selected:{type:'space',id:'start'},
      spaces:copy(BOARD_SPACES),landmarks:copy(LANDMARKS),log:[],
      players:entries.slice(0,4).map((entry,i)=>({
        id:'p'+(i+1),name:String(entry.name||'Artist '+(i+1)).slice(0,22),
        bot:!!entry.bot,color:COLORS[i],cash:CONFIG.startCash,position:0,laps:0,
        producerParts:{},song:null,studioBooked:false,managerUnlockLap:null,manager:false,radio:false,radioRound:null,
        ownedVehicles:['city_standard',...(STARTER_VEHICLES.includes(entry.vehicleId)&&entry.vehicleId!=='city_standard'?[entry.vehicleId]:[])],
        equippedVehicle:STARTER_VEHICLES.includes(entry.vehicleId)?entry.vehicleId:'city_standard',
        ownedRims:['factory'],equippedRim:'factory',vehiclePaint:COLORS[i],
      }))
    };
    this.log('Collect four cards and finish two laps, then book your $500 BeGenius session from the in-game phone.');
    this.emit('state');
  }
  get currentPlayer(){return this.state.players[this.state.turn];}
  get currentSpace(){return this.state.spaces[this.currentPlayer.position];}
  log(message){this.state.log.unshift(message);this.state.log=this.state.log.slice(0,40);this.emit('log');}
  setSelected(type,id){this.state.selected={type,id};this.emit('selection');}
  getSelected(){return this.state.selected.type==='landmark'
    ?this.state.landmarks.find(x=>x.id===this.state.selected.id)
    :this.state.spaces.find(x=>x.id===this.state.selected.id);}
  ownedCount(p=this.currentPlayer){
    return [...this.state.spaces,...this.state.landmarks].filter(x=>x.ownerId===p.id).length;
  }
  garageAvailable(){return this.state.phase!=='moving'&&!this.state.showcaseComplete&&!this.currentPlayer.bot;}
  vehicleStatus(id,p=this.currentPlayer){return vehicleGate(id,p,this.state,this.ownedCount(p));}
  rimStatus(id,p=this.currentPlayer){return rimGate(id,p,this.ownedCount(p));}
  claimVehicle(id){
    const p=this.currentPlayer,vehicle=VEHICLES.find(v=>v.id===id);
    if(!this.garageAvailable()||!vehicle)return {ok:false,reason:'Choose a car on your turn.'};
    if(!this.vehicleStatus(id,p).open)return {ok:false,reason:this.vehicleStatus(id,p).reason};
    p.ownedVehicles ||= ['city_standard'];
    if(!p.ownedVehicles.includes(id))p.ownedVehicles.push(id);
    p.equippedVehicle=id;this.log(p.name+' is driving the '+vehicle.name+'.');this.emit('state');return {ok:true};
  }
  equipVehicle(id){
    if(!(this.currentPlayer.ownedVehicles||[]).includes(id))return {ok:false,reason:'Earn this car first.'};
    return this.claimVehicle(id);
  }
  claimRim(id){
    const p=this.currentPlayer,rim=RIMS.find(r=>r.id===id);
    if(!this.garageAvailable()||!rim)return {ok:false,reason:'Choose rims on your turn.'};
    if(!this.rimStatus(id,p).open)return {ok:false,reason:this.rimStatus(id,p).reason};
    p.ownedRims ||= ['factory'];
    if(!p.ownedRims.includes(id))p.ownedRims.push(id);
    p.equippedRim=id;this.log(p.name+' fitted '+rim.name+' rims.');this.emit('state');return {ok:true};
  }
  equipRim(id){
    if(!(this.currentPlayer.ownedRims||[]).includes(id))return {ok:false,reason:'Earn these rims first.'};
    return this.claimRim(id);
  }
  setVehiclePaint(hex){
    if(!this.garageAvailable()||!PAINTS.some(p=>p.hex===hex))return {ok:false,reason:'Choose an available paint finish.'};
    this.currentPlayer.vehiclePaint=hex;this.emit('state');return {ok:true};
  }
  hasAllParts(p=this.currentPlayer){return DISTRICTS.every(d=>p.producerParts[d.id]);}
  canAct(){return this.state.phase==='landed'&&!this.state.showcaseComplete;}
  rollDice(){
    if(!['ready','turn'].includes(this.state.phase))return null;
    const a=1+Math.floor(Math.random()*6),b=1+Math.floor(Math.random()*6);
    this.state.lastRoll=[a,b];this.state.phase='moving';this.emit('state');
    return {a,b,total:a+b};
  }
  stepPlayer(){
    const p=this.currentPlayer;
    p.position=(p.position+1)%this.state.spaces.length;
    if(p.position===0){
      const royalties=this.ownedCount(p)*25;
      p.cash+=CONFIG.passStart+royalties;p.laps++;
      this.log(p.name+' collected $'+CONFIG.passStart+' for the lap'+(royalties?' and $'+royalties+' from music properties':'')+'.');
    }
    this.emit('step',{player:p,position:p.position});
    return p.position;
  }
  resolveLanding(){
    const p=this.currentPlayer,space=this.currentSpace;
    this.state.phase='landed';this.setSelected('space',space.id);
    if(space.kind==='property'&&space.ownerId&&space.ownerId!==p.id){
      const owner=this.state.players.find(x=>x.id===space.ownerId);
      const paid=Math.min(p.cash,space.baseRent||25);
      p.cash-=paid;owner.cash+=paid;
      this.log(p.name+' paid '+owner.name+' $'+paid+' at '+space.name+'.');
    }else if(space.kind==='producer'){
      this.log(p.name+' met the '+space.name+'. Choose a prompt card for the fusion song.');
    }else if(space.kind==='event'){
      const payout=25+Math.floor(Math.random()*36);
      p.cash+=payout;this.log(p.name+' earned $'+payout+' from a Music City opportunity.');
    }else this.log(p.name+' landed at '+space.name+'.');
    this.emit('landed',{player:p,space});
    return space;
  }
  collectPart(partId){
    const p=this.currentPlayer,space=this.currentSpace;
    if(!this.canAct()||space.kind!=='producer')return {ok:false,reason:'Land on a producer block first.'};
    if(p.song)return {ok:false,reason:'Your producer cards are locked into your finished song.'};
    const district=DISTRICTS.find(d=>d.id===space.producer);
    const part=district?.parts.find(x=>x.id===partId);
    if(!part)return {ok:false,reason:'Choose a prompt card from this producer.'};
    p.producerParts[district.id]={id:part.id,name:part.name,prompt:part.prompt,district:district.name};
    this.log(p.name+' collected the '+part.name+' prompt card from '+district.name+'.');
    this.emit('state');return {ok:true};
  }
  // A producer prompt can be offered to another human artist without giving up the original.
  // Validating the sender ID here keeps sharing safe when the host handles remote phone commands.
  sharePart(fromId,toId,districtId){
    const sender=this.state.players.find(p=>p.id===fromId);
    const recipient=this.state.players.find(p=>p.id===toId);
    const district=DISTRICTS.find(d=>d.id===districtId);
    if(this.state.showcaseComplete)return {ok:false,reason:'The final showcase has finished.'};
    if(!sender||!recipient||sender.id===recipient.id||sender.bot||recipient.bot)
      return {ok:false,reason:'Choose another human artist in this game.'};
    if(!district)return {ok:false,reason:'Choose one of the four music boroughs.'};
    const part=sender.producerParts?.[district.id];
    if(!part || !district.parts.some(card=>card.id===part.id))
      return {ok:false,reason:'Collect this producer card yourself before sharing it.'};
    if(recipient.song)return {ok:false,reason:'This artist already finished their song.'};
    if(recipient.producerParts?.[district.id])
      return {ok:false,reason:'That artist already has a prompt from this producer.'};
    recipient.producerParts ||= {};
    recipient.producerParts[district.id]={...copy(part),sharedFrom:sender.id,sharedBy:sender.name};
    this.log(sender.name+' shared a '+district.name+' producer prompt with '+recipient.name+'.');
    this.emit('state');
    return {ok:true,from:sender.name,to:recipient.name,district:district.name};
  }
  studioStatus(p=this.currentPlayer){
    if(p.song)return {ok:false,reason:'Your fusion song is already recorded.'};
    if(!this.hasAllParts(p))return {ok:false,reason:'Collect all four producer prompt cards first.'};
    if(p.studioBooked)return {ok:true,booked:true,reason:'Your BeGenius Studio session is booked.'};
    if(p.laps<CONFIG.studioMinLaps)return {ok:false,reason:'Complete '+(CONFIG.studioMinLaps-p.laps)+' more lap'+(CONFIG.studioMinLaps-p.laps===1?'':'s')+' before booking BeGenius Studio.'};
    if(p.cash<CONFIG.studioSessionFee)return {ok:false,reason:'Earn $'+(CONFIG.studioSessionFee-p.cash)+' more for your $'+CONFIG.studioSessionFee+' studio session.'};
    return {ok:true,reason:'You can book your $'+CONFIG.studioSessionFee+' BeGenius Studio session now.'};
  }
  // Pay once from any square on your turn; entry is through the in-game phone.
  bookStudio(){
    if(!this.canAct())return {ok:false,reason:'Book the studio on your turn after rolling.'};
    const p=this.currentPlayer,status=this.studioStatus(p);
    if(p.studioBooked)return {ok:false,reason:'You already paid for this studio session. Enter from the phone.'};
    if(!status.ok)return status;
    p.cash-=CONFIG.studioSessionFee;
    p.studioBooked=true;
    this.log(p.name+' booked BeGenius Studio for $'+CONFIG.studioSessionFee+'. Enter from your phone to finish the song.');
    this.emit('state');return {ok:true};
  }
  buyProperty(type='space',id=this.currentSpace.id){
    const p=this.currentPlayer;
    const item=type==='landmark'?this.state.landmarks.find(x=>x.id===id):this.currentSpace;
    if(!this.canAct()||!item||item.kind==='producer'||!item.price||item.ownerId)
      return {ok:false,reason:'This business is not available.'};
    if(type!=='landmark'&&item.id!==id)return {ok:false,reason:'Land here to buy.'};
    if(p.cash<item.price)return {ok:false,reason:'You need $'+item.price+'.'};
    p.cash-=item.price;item.ownerId=p.id;
    this.log(p.name+' bought '+item.name+' for $'+item.price+'.');
    this.emit('state');return {ok:true};
  }
  hireManager(){
    const p=this.currentPlayer;
    if(!this.canAct()||p.manager)return {ok:false,reason:'Manager already hired or turn unavailable.'};
    if(!p.song)return {ok:false,reason:'Record your fusion song before hiring a manager.'};
    if(p.laps<(p.managerUnlockLap??p.laps+1))return {ok:false,reason:'Complete a full lap after recording before hiring your manager.'};
    if(this.ownedCount(p)<1)return {ok:false,reason:'Buy a music property before hiring a manager.'};
    if(p.cash<CONFIG.managerCost)return {ok:false,reason:'Manager costs $'+CONFIG.managerCost+'.'};
    p.cash-=CONFIG.managerCost;p.manager=true;this.log(p.name+' hired a manager.');
    this.emit('state');return {ok:true};
  }
  recordSong(title,audioKey=null,prompt=''){
    const p=this.currentPlayer;
    if(!this.canAct())return {ok:false,reason:'Finish your studio session on your turn after rolling.'};
    if(!p.studioBooked)return {ok:false,reason:'Book the $'+CONFIG.studioSessionFee+' BeGenius session from your phone first.'};
    if(!this.hasAllParts(p))return {ok:false,reason:'Collect a prompt card from all four producers first.'};
    const safeTitle=String(title||'').trim().slice(0,44);
    if(!safeTitle)return {ok:false,reason:'Give your fusion song a title.'};
    if(!p.bot&&!audioKey)return {ok:false,reason:'Upload the song made from your prompt before finishing.'};
    if(!p.song)p.managerUnlockLap=p.laps+1; // Come back to the board for at least one more lap.
    p.song={title:safeTitle,audioKey:audioKey||null,prompt:String(prompt||'').trim().slice(0,3000),parts:copy(p.producerParts)};
    this.log(p.name+(audioKey?' uploaded':' drafted')+' “'+safeTitle+'” at BeGenius Studio.');
    this.emit('state');return {ok:true};
  }
  submitRadio(){
    const p=this.currentPlayer;
    if(!this.canAct()||this.currentSpace.kind!=='radio')return {ok:false,reason:'Land on Music City Radio.'};
    if(!p.song||!p.manager)return {ok:false,reason:'Finish a song and hire your manager first.'};
    if(p.radio)return {ok:false,reason:'Your song has already played on radio.'};
    if(p.cash<CONFIG.radioCost)return {ok:false,reason:'Radio submission costs $'+CONFIG.radioCost+'.'};
    p.cash-=CONFIG.radioCost;p.radio=true;p.radioRound=this.state.round;
    this.log('ON AIR: '+p.name+' — “'+p.song.title+'” played on Music City Radio!');
    this.emit('state');return {ok:true};
  }
  bookFinale(){
    const p=this.currentPlayer;
    if(!this.canAct()||this.currentSpace.kind!=='festival')return {ok:false,reason:'Land at the Festival Finale.'};
    if(!p.radio)return {ok:false,reason:'Your song must play on radio first.'};
    if(!this.state.headlineId){
      this.state.headlineId=p.id;this.log(p.name+' booked the headline slot. The final showcase opens when every artist has a song.');
    }else this.log(p.name+' joined the festival lineup.');
    this.emit('state');return {ok:true};
  }
  canShowcase(){return !!this.state.headlineId&&this.state.players.every(p=>!!p.song);}
  finishShowcase(winnerId){
    if(!this.canShowcase()||this.state.showcaseComplete)return false;
    const winner=this.state.players.find(x=>x.id===winnerId);
    if(!winner)return false;
    winner.cash+=CONFIG.prize;this.state.winnerId=winner.id;
    this.state.showcaseComplete=true;this.state.phase='showcase';
    this.log(winner.name+' won the $'+CONFIG.prize+' festival prize!');
    this.emit('state');return true;
  }
  endTurn(){
    if(this.state.phase!=='landed')return false;
    this.state.turn=(this.state.turn+1)%this.state.players.length;
    if(this.state.turn===0)this.state.round++;
    this.state.lastRoll=[0,0];this.state.phase='turn';
    this.log(this.currentPlayer.name+' is up.');this.emit('turn');return true;
  }
  exportState(){return copy(this.state);}
  importState(value){
    if(value?.version!==1||!Array.isArray(value.players)||value.players.length<2||value.players.length>4)throw Error('Invalid fusion save');
    // Keep each existing property owner, manager and song when moving from the
    // old generic board to the exact approved artwork's road and neighborhoods.
    // IDs/indexes and producer-stop indexes are unchanged; only the artwork-
    // aligned borough names and the prompt associated with three sides change.
    if(value.boardArtworkVersion!=='approved-art-v1'){
      const ownedSpaces=new Map((value.spaces||[]).map(s=>[s.id,s]));
      const ownedLandmarks=new Map((value.landmarks||[]).map(l=>[l.id,l]));
      value.spaces=copy(BOARD_SPACES).map(s=>({
        ...s,ownerId:ownedSpaces.get(s.id)?.ownerId||null
      }));
      value.landmarks=copy(LANDMARKS).map(l=>{
        const old=ownedLandmarks.get(l.id);
        return {...l,ownerId:old?.ownerId||null,level:old?.level||l.level};
      });
      value.boardArtworkVersion='approved-art-v1';
    }
    value.players.forEach(p=>{
      // Migration: legacy finished songs keep their career progress and do not owe a retroactive fee.
      p.studioBooked=Boolean(p.studioBooked||p.song);
      if(!Number.isInteger(p.managerUnlockLap))p.managerUnlockLap=p.song?p.laps:null;
      p.ownedVehicles ||= ['city_standard'];p.ownedRims ||= ['factory'];
      if(!VEHICLES.some(v=>v.id===p.equippedVehicle))p.equippedVehicle='city_standard';
      if(!RIMS.some(r=>r.id===p.equippedRim))p.equippedRim='factory';
      if(!p.ownedVehicles.includes(p.equippedVehicle))p.ownedVehicles.push(p.equippedVehicle);
      if(!p.ownedRims.includes(p.equippedRim))p.ownedRims.push(p.equippedRim);
      p.vehiclePaint ||= p.color;
    });
    this.state=value;this.emit('state');
  }
}
