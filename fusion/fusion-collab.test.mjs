import test from 'node:test';
import assert from 'node:assert/strict';
import { FusionEngine } from './fusion-engine.js';
import { FusionRoom } from './fusion-room.js';
import { DISTRICTS } from './fusion-data.js';

function makeGame(){
  const game=new FusionEngine();
  game.newGame([{name:'Lead',bot:false},{name:'Collaborator',bot:false},{name:'City Bot',bot:true}]);
  return game;
}
function earned(game,playerId,districtId){
  const district=DISTRICTS.find(d=>d.id===districtId),card=district.parts[0];
  const player=game.state.players.find(p=>p.id===playerId);
  player.producerParts[districtId]={...card,district:district.name};
  return player.producerParts[districtId];
}

test('an artist can share an earned prompt off-turn without losing their own card',()=>{
  const game=makeGame(),original=earned(game,'p1','hiphop');
  game.state.turn=1;
  const result=game.sharePart('p1','p2','hiphop');
  assert.equal(result.ok,true);
  assert.equal(result.from,'Lead');
  const received=game.state.players[1].producerParts.hiphop;
  assert.equal(received.prompt,original.prompt);
  assert.equal(received.sharedBy,'Lead');
  assert.equal(received.sharedFrom,'p1');
  assert.equal(game.state.players[0].producerParts.hiphop.prompt,original.prompt);
  assert.notStrictEqual(received,original);
});

test('prompt exchange rejects missing cards, invalid districts, self-gifts and computer seats',()=>{
  const game=makeGame();
  assert.equal(game.sharePart('p1','p2','hiphop').ok,false);
  earned(game,'p1','hiphop');
  assert.equal(game.sharePart('p1','p2','nonexistent').ok,false);
  assert.equal(game.sharePart('p1','p1','hiphop').ok,false);
  assert.equal(game.sharePart('p1','p3','hiphop').ok,false);
  assert.equal(game.sharePart('p3','p2','hiphop').ok,false);
  assert.equal(game.sharePart('unknown','p2','hiphop').ok,false);
  assert.equal(Object.keys(game.state.players[1].producerParts).length,0);
});

test('sharing never overwrites an existing card or a completed song',()=>{
  const game=makeGame();
  earned(game,'p1','hiphop');
  const old=earned(game,'p2','hiphop');
  assert.equal(game.sharePart('p1','p2','hiphop').ok,false);
  assert.strictEqual(game.state.players[1].producerParts.hiphop,old);
  game.state.players[1].producerParts={};
  game.state.players[1].song={title:'Released'};
  assert.equal(game.sharePart('p1','p2','hiphop').ok,false);
  game.state.players[1].song=null;
  game.state.showcaseComplete=true;
  assert.equal(game.sharePart('p1','p2','hiphop').ok,false);
});

test('four shared prompts persist through save/load and unlock the studio song',()=>{
  const game=makeGame();
  for(const district of DISTRICTS){
    earned(game,'p1',district.id);
    assert.equal(game.sharePart('p1','p2',district.id).ok,true);
  }
  const reloaded=new FusionEngine();
  reloaded.importState(game.exportState());
  const recipient=reloaded.state.players[1];
  assert.equal(reloaded.hasAllParts(recipient),true);
  assert.equal(Object.keys(recipient.producerParts).length,4);
  assert.ok(DISTRICTS.every(d=>recipient.producerParts[d.id].sharedBy==='Lead'));
  reloaded.state.turn=1;
  reloaded.state.phase='landed';
  recipient.position=13; // Record from any board square once the session is booked.
  recipient.laps=2;
  assert.equal(reloaded.bookStudio().ok,true);
  assert.equal(recipient.cash,500);
  const song=reloaded.recordSong('Across Music City','local-audio-key','Four original directions');
  assert.equal(song.ok,true);
  assert.equal(recipient.song.parts.country.sharedBy,'Lead');
});

test('players begin with $1,000 and receive $200 every time they pass GO',()=>{
  const game=makeGame(),p=game.currentPlayer;
  assert.equal(p.cash,1000);
  p.position=game.state.spaces.length-1;
  game.stepPlayer();
  assert.equal(p.position,0);
  assert.equal(p.laps,1);
  assert.equal(p.cash,1200);
  p.position=game.state.spaces.length-1;
  game.stepPlayer();
  assert.equal(p.laps,2);
  assert.equal(p.cash,1400);
});

test('collecting all four cards does not bypass the two-lap or $500 studio gates',()=>{
  const game=makeGame(),p=game.currentPlayer;
  for(const district of DISTRICTS)earned(game,p.id,district.id);
  game.state.phase='landed';
  assert.match(game.bookStudio().reason,/2 more laps/);
  p.laps=1;
  assert.match(game.bookStudio().reason,/1 more lap/);
  p.laps=2;
  p.cash=499;
  assert.match(game.bookStudio().reason,/Earn $1 more/);
  assert.equal(game.recordSong('Too Soon','audio','prompt').ok,false);
  p.cash=500;
  assert.equal(game.bookStudio().ok,true);
  assert.equal(p.cash,0);
  assert.equal(p.studioBooked,true);
  assert.equal(game.bookStudio().ok,false,'Do not charge twice');
});

test('a booked session records from any square and saves the fee, unlock and song',()=>{
  const game=makeGame(),p=game.currentPlayer;
  for(const district of DISTRICTS)earned(game,p.id,district.id);
  game.state.phase='landed';
  p.position=12;p.laps=2;
  assert.equal(game.bookStudio().ok,true);
  assert.equal(p.cash,500);
  const saved=new FusionEngine();
  saved.importState(game.exportState());
  assert.equal(saved.currentPlayer.studioBooked,true);
  assert.equal(saved.currentPlayer.cash,500);
  assert.equal(saved.currentPlayer.position,12);
  assert.equal(saved.recordSong('Across Music City','local-file','original four-card prompt').ok,true);
  assert.equal(saved.currentPlayer.song.title,'Across Music City');
  assert.equal(saved.currentPlayer.managerUnlockLap,3);
});

test('manager needs a finished song, property, money and one additional lap',()=>{
  const game=makeGame(),p=game.currentPlayer;
  game.state.phase='landed';
  assert.match(game.hireManager().reason,/Record your fusion song/);
  for(const district of DISTRICTS)earned(game,p.id,district.id);
  p.laps=2;p.position=1;
  assert.equal(game.bookStudio().ok,true);
  assert.equal(game.recordSong('Live from BeGenius','local-file','four cards').ok,true);
  assert.match(game.hireManager().reason,/full lap after recording/);
  p.laps=3;
  assert.match(game.hireManager().reason,/Buy a music property/);
  assert.equal(game.buyProperty().ok,true);
  p.cash=299;
  assert.match(game.hireManager().reason,/costs $300/);
  p.cash=300;
  assert.equal(game.hireManager().ok,true);
  assert.equal(p.cash,0);
  assert.equal(p.manager,true);
});

test('host authorizes booking from the current guest seat and rejects early or repeated booking',async()=>{
  const game=makeGame(),p=game.state.players[1];
  for(const district of DISTRICTS)earned(game,p.id,district.id);
  game.state.turn=1;game.state.phase='landed';
  const oldLocation=globalThis.location,oldDocument=globalThis.document;
  globalThis.location={href:'https://example.test/fusion_board.html'};
  globalThis.document={getElementById:()=>null};
  try{
    const outbound=[],conn={peer:'guest-booker',open:true,send:m=>outbound.push(m)};
    const ui={busy:false,save:()=>{},showNotice:()=>{},render:()=>{}};
    const room=new FusionRoom(game,{},ui);
    room.role='host';room.seatId='p1';
    room.seats.set('guest-booker','p2');room.connections.set('guest-booker',conn);
    await room.hostCommand(conn,{action:'bookStudio',args:[]});
    assert.ok(outbound.some(m=>m.type==='error'));
    assert.equal(p.cash,1000);
    p.laps=2;outbound.length=0;
    await room.hostCommand(conn,{action:'bookStudio',args:[]});
    assert.equal(p.cash,500);
    assert.equal(p.studioBooked,true);
    assert.ok(outbound.some(m=>m.type==='ack'));
    await room.hostCommand(conn,{action:'bookStudio',args:[]});
    assert.equal(p.cash,500,'Repeats are free of extra charges but rejected');
    assert.ok(outbound.filter(m=>m.type==='error').length>0);
  }finally{
    if(oldLocation===undefined)delete globalThis.location;else globalThis.location=oldLocation;
    if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
  }
});

test('online invitations preserve Vercel protected-preview guest access',()=>{
  const previousLocation=globalThis.location;
  globalThis.location={href:'https://example.test/fusion_board.html?_vercel_share=test-guest-token'};
  try{
    const room=new FusionRoom(makeGame(),{}, {showNotice:()=>{}});
    room.roomId='mce-fusion-123abc';
    const link=new URL(room.inviteLink());
    assert.equal(link.searchParams.get('room'),'mce-fusion-123abc');
    assert.equal(link.searchParams.get('_vercel_share'),'test-guest-token');
    assert.equal(link.pathname,'/fusion_board.html');
  }finally{
    if(previousLocation===undefined)delete globalThis.location;
    else globalThis.location=previousLocation;
  }
});

test('host uses the authenticated guest seat when accepting an off-turn phone exchange',async()=>{
  const game=makeGame();
  earned(game,'p2','hiphop');
  game.state.turn=0; // The guest is NOT the current player.
  const oldLocation=globalThis.location,oldDocument=globalThis.document;
  globalThis.location={href:'https://example.test/fusion_board.html'};
  globalThis.document={getElementById:()=>null};
  try{
    const outgoing=[],conn={peer:'guest-peer',open:true,send:message=>outgoing.push(message)};
    const ui={busy:false,save:()=>{},showNotice:()=>{},render:()=>{}};
    const room=new FusionRoom(game,{},ui);
    room.role='host';room.seatId='p1';
    room.seats.set('guest-peer','p2');
    room.connections.set('guest-peer',conn);
    await room.hostCommand(conn,{action:'sharePart',args:['p1','hiphop','forged-p1']});
    await Promise.resolve();
    assert.equal(game.state.players[0].producerParts.hiphop.sharedFrom,'p2');
    assert.ok(outgoing.some(m=>m.type==='ack'));
    assert.ok(outgoing.some(m=>m.type==='chat'&&m.from==='Producer Network'));
    const prior=outgoing.length;
    await room.hostCommand(conn,{action:'sharePart',args:['p3','hiphop']});
    assert.ok(outgoing.slice(prior).some(m=>m.type==='error'));
  }finally{
    if(oldLocation===undefined)delete globalThis.location;
    else globalThis.location=oldLocation;
    if(oldDocument===undefined)delete globalThis.document;
    else globalThis.document=oldDocument;
  }
});
