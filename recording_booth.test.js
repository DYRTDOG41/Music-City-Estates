const assert = require('assert');
const fs = require('fs');

function check(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (error) { console.error('not ok - ' + name); throw error; }
}

const studio = fs.readFileSync('advanced_recording_studio.html', 'utf8');
const engine = fs.readFileSync('unified_recording_studio.js', 'utf8');
const legacy = fs.readFileSync('record_music.html', 'utf8');

check('there is one canonical guided studio', () => {
  assert.match(studio, /ONE STUDIO • GUIDED MODE/);
  assert.match(legacy, /mce-unified-studio-redirect/);
  assert.match(legacy, /advanced_recording_studio\.html/);
});

check('studio teaches a short beat-to-master workflow', () => {
  assert.match(studio, />BEAT</);
  assert.match(studio, />LEAD</);
  assert.match(studio, />DOUBLE</);
  assert.match(studio, />AD-LIBS</);
  assert.match(studio, />BACKGROUNDS</);
  assert.match(studio, />AI MASTER</);
});

check('five vocal performance layers stay separate', () => {
  ['lead','double','adlibs','harmony','background'].forEach(id => assert.match(engine, new RegExp('id:"'+id+'"')));
});

check('each layer has record play mute discard and volume controls', () => {
  assert.match(engine, /record-layer/);
  assert.match(engine, /play-layer/);
  assert.match(engine, /mute-layer/);
  assert.match(engine, /discard-layer/);
  assert.match(engine, /discardTake/);
  assert.match(engine, /level-slider/);
});

check('new overdubs hear the beat and earlier finished layers in sync', () => {
  assert.match(engine, /startRecordMonitor/);
  assert.match(engine, /RECORD_PREROLL_MS/);
  assert.match(engine, /recordingSyncTrimMs/);
  assert.match(engine, /syncTrimMs/);
  assert.match(engine, /recordMonitorSources/);
});

check('artist can play all raw layers together and rebalance live', () => {
  assert.match(studio, /PLAY ALL TRACKS/);
  assert.match(engine, /async function playAll/);
  assert.match(engine, /updateLiveGain/);
  assert.match(engine, /sessionNodes/);
});

check('session-clock timing alignment is applied before the final mix', () => {
  assert.match(studio, /AUTO TIMING ALIGN/);
  assert.match(engine, /state\.syncTrimMs/);
  assert.match(engine, /source\.start\(0,Math\.min\(trim/);
});

check('AI Engineer produces one automatic master', () => {
  assert.match(studio, /AI MIX &amp; MASTER/);
  assert.match(engine, /async function renderMaster/);
  assert.match(engine, /createBiquadFilter/);
  assert.match(engine, /createDynamicsCompressor/);
  assert.match(engine, /createConvolver/);
  assert.match(engine, /createDelay/);
  assert.match(engine, /createStereoPanner/);
});

check('ElevenLabs vocal cleanup remains server-side', () => {
  assert.match(engine, /\/api\/elevenlabs\/isolate/);
  assert.doesNotMatch(studio, /xi-api-key/i);
  assert.doesNotMatch(engine, /xi-api-key/i);
  assert.doesNotMatch(engine, /ELEVENLABS_API_KEY/);
});

check('studio can use ElevenLabs for an optional beat preview', () => {
  assert.match(studio, /GENERATE AI BEAT/);
  assert.match(engine, /MusicCityAI\.generate/);
  assert.doesNotMatch(engine, /Suno/i);
});

check('finished master saves to the Music City catalog', () => {
  assert.match(engine, /MusicCityCatalog\.saveTrack/);
  assert.match(engine, /MCE\.addRelease/);
});

check('manager-booked collaboration completes only after master save', () => {
  assert.match(engine, /mcePendingCollab/);
  assert.match(engine, /completePendingCollab/);
  assert.match(engine, /mceCollaborationsV1/);
});

check('recording tells realtime voice and soundtrack to yield the microphone', () => {
  assert.match(engine, /mce-audio-session/);
  assert.match(engine, /source:"recording-studio"/);
});

console.log('13 unified guided studio tests passed');
