import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FusionEngine} from './fusion-engine.js';
import {BOARD_SPACES,DISTRICTS,CONFIG} from './fusion-data.js';
import {
  ART_WIDTH,ART_HEIGHT,ART_IMAGE_SHA256,ART_ROAD_PIXELS,
  ART_DISTRICT_PIXELS,ART_PRODUCER_ICON_PIXELS,artPixelToWorld,artLandingSlot
} from './fusion-art-map.js';

test('the board texture is byte-for-byte the actual approved image, not a traced substitute',()=>{
  const png=readFileSync(new URL('../assets/fusion/board-approved-original.png',import.meta.url));
  assert.equal(createHash('sha256').update(png).digest('hex'),ART_IMAGE_SHA256);
  assert.equal(png.length,2856862);
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
});

test('the single 40-stop car circuit follows the image with unique in-bounds road locations',()=>{
  assert.equal(ART_WIDTH,1448);
  assert.equal(ART_HEIGHT,1086);
  assert.equal(ART_ROAD_PIXELS.length,BOARD_SPACES.length);
  assert.equal(new Set(ART_ROAD_PIXELS.map(x=>x.join(','))).size,40);
  for(const pixel of ART_ROAD_PIXELS){
    assert.ok(pixel[0]>=0&&pixel[0]<ART_WIDTH);
    assert.ok(pixel[1]>=0&&pixel[1]<ART_HEIGHT);
    const world=artPixelToWorld(pixel);
    assert.ok(world.every(Number.isFinite));
  }
  for(let i=0;i<40;i++){
    const car=artLandingSlot(i,0);
    assert.ok([car.x,car.y,car.z,car.rotation].every(Number.isFinite));
    assert.deepEqual(artLandingSlot(i+40,0),car);
    assert.notDeepEqual(artLandingSlot(i,0),artLandingSlot(i,1),
      'Separate artist cars must not spawn directly on top of one another');
  }
});

test('four producer locations and their named music styles match the approved artwork',()=>{
  const intended={
    hiphop:{name:'Hip-Hop Heights',side:'North',stops:[3,4,5]},
    country:{name:'Country Crossings',side:'East',stops:[13,14,15]},
    global:{name:'Velvet Grove',side:'South',stops:[23,24,25]},
    latin:{name:'Latin Quarter',side:'West',stops:[33,34,35]}
  };
  assert.equal(DISTRICTS.length,4);
  for(const [id,expected] of Object.entries(intended)){
    const district=DISTRICTS.find(d=>d.id===id);
    assert.ok(district);
    assert.equal(district.name,expected.name);
    assert.equal(district.side,expected.side);
    assert.ok(ART_DISTRICT_PIXELS[id]);
    assert.ok(ART_PRODUCER_ICON_PIXELS[id]);
    for(const stop of expected.stops){
      assert.equal(BOARD_SPACES[stop].kind,'producer');
      assert.equal(BOARD_SPACES[stop].producer,id);
    }
  }
});

test('existing saved money, cars, purchases, cards and sessions migrate to the new art layout',()=>{
  const original=new FusionEngine();
  original.newGame([{name:'Tester'},{name:'Friend'}]);
  const p=original.state.players[0];
  p.cash=765;p.laps=3;p.position=33;
  p.producerParts.global={id:'hand',name:'Hand-drum texture',prompt:'Old card direction'};
  p.studioBooked=true;
  original.state.spaces[1].ownerId=p.id;
  original.state.landmarks[0].ownerId=p.id;
  const oldSave=original.exportState();
  delete oldSave.boardArtworkVersion;
  oldSave.spaces[1].name='Old Street Label';
  oldSave.landmarks[0].name='Old Landmark Label';
  const revived=new FusionEngine();
  revived.importState(oldSave);
  const a=revived.state.players[0];
  assert.equal(revived.state.boardArtworkVersion,'approved-art-v1');
  assert.equal(a.cash,765);
  assert.equal(a.laps,3);
  assert.equal(a.position,33);
  assert.equal(a.producerParts.global.id,'hand');
  assert.equal(a.studioBooked,true);
  assert.equal(revived.state.spaces[1].ownerId,a.id);
  assert.equal(revived.state.landmarks[0].ownerId,a.id);
  assert.equal(revived.state.spaces[1].name,BOARD_SPACES[1].name);
});

test('same four-card mission, $1,000 start, $200 GO and two-lap $500 session still work on the new layout',()=>{
  const game=new FusionEngine(),p=game.currentPlayer;
  assert.equal(p.cash,CONFIG.startCash);
  assert.equal(CONFIG.startCash,1000);
  assert.equal(CONFIG.passStart,200);
  assert.equal(CONFIG.studioSessionFee,500);
  assert.equal(CONFIG.studioMinLaps,2);
  game.state.phase='landed';
  for(const district of DISTRICTS)p.producerParts[district.id]={...district.parts[0],district:district.name};
  assert.equal(game.hasAllParts(p),true);
  assert.match(game.bookStudio().reason,/2 more laps/);
  p.laps=2;
  assert.equal(game.bookStudio().ok,true);
  assert.equal(p.cash,500);
  assert.equal(game.recordSong('All Four Districts','audio-key','Four original directions').ok,true);
});
