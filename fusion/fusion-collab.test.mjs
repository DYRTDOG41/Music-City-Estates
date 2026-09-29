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
  recipient.position=8; // BeGenius Studio.
  const song=reloaded.recordSong('Across Music City','local-audio-key','Four original directions');
  assert.equal(song.ok,true);
  assert.equal(recipient.song.parts.country.sharedBy,'Lead');
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
