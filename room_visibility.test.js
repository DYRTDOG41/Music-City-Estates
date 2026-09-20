const assert = require('assert');
const fs = require('fs');

function check(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (error) { console.error('not ok - ' + name); throw error; }
}

const radio = fs.readFileSync('music_city_radio_player.js', 'utf8');
const missions = fs.readFileSync('music_city_missions.js', 'utf8');
const rooms = fs.readFileSync('mce_3d_room.js', 'utf8');

check('mobile radio stays compact and away from movement controls', () => {
  assert.match(radio, /width:min\(210px/);
  assert.match(radio, /top:112px/);
  assert.doesNotMatch(radio, /bottom:116px/);
});

check('3D room mission header moves away from interaction prompt', () => {
  assert.match(missions, /room-mode/);
  assert.match(missions, /top:164px/);
  assert.match(missions, /collapsed", "room-mode/);
});

check('every shared 3D room receives visibility lighting', () => {
  assert.match(rooms, /HemisphereLight/);
  assert.match(rooms, /AmbientLight/);
  assert.match(rooms, /DirectionalLight/);
  assert.match(rooms, /toneMappingExposure/);
});

console.log('3 room visibility tests passed');
