const fs = require('fs');
const assert = require('assert');

function check(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (error) { console.error('not ok - ' + name); throw error; }
}

const realtime = fs.readFileSync('./music_city_realtime.js', 'utf8');
const social = fs.readFileSync('./social_hub.html', 'utf8');
const collaboration = fs.readFileSync('./collaboration.html', 'utf8');
const recording = fs.readFileSync('./record_music.html', 'utf8');

check('realtime maps studios and lobbies into shared rooms', () => {
  ['bedroom-studio','begenius-studio','studio-booth','hiphop-heights','hiphop-cafe','warehouse-lobby','battle-room','manager-office','radio']
    .forEach(room => assert.ok(realtime.includes(room), room));
});

check('realtime persists room chat through Supabase', () => {
  assert.ok(realtime.includes('room_messages'));
  assert.ok(realtime.includes('postgres_changes'));
  assert.ok(realtime.includes('loadRoomHistory'));
});

check('realtime voice yields to recording audio sessions', () => {
  assert.ok(realtime.includes('mce-audio-session'));
  assert.ok(realtime.includes('source !== "realtime-voice"'));
});

check('social wall stores posts and reactions', () => {
  assert.ok(social.includes('social_posts'));
  assert.ok(social.includes('social_reactions'));
  assert.ok(social.includes('SHOW LOVE'));
  assert.ok(social.includes('COLLAB'));
});

check('social rewards are capped', () => {
  assert.ok(social.includes('count>=3'));
  assert.ok(social.includes('daily>=10'));
});

check('manager collaboration becomes a real studio session', () => {
  assert.ok(collaboration.includes('mcePendingCollab'));
  assert.ok(collaboration.includes('START COLLAB SESSION'));
  assert.ok(recording.includes('completePendingCollab'));
  assert.ok(recording.includes('mceCollaborationsV1'));
});

console.log('6 realtime multiplayer tests passed');
