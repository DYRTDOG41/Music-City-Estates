const assert = require('assert');
const fs = require('fs');

function check(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (error) { console.error('not ok - ' + name); throw error; }
}

const booth = fs.readFileSync('record_music.html', 'utf8');

check('booth explains the three-step creative flow', () => {
  assert.match(booth, /Pick a beat/);
  assert.match(booth, /Preview &amp; write/);
  assert.match(booth, /Record with beat/);
});

check('instrumental has a writing mode independent of recording', () => {
  assert.match(booth, /PLAY INSTRUMENTAL/);
  assert.match(booth, /mode:"writing"/);
  assert.match(booth, /Your microphone is off/);
});

check('selected beat starts before the vocal recorder', () => {
  const recordingFunction = booth.slice(booth.indexOf('async function toggleRecording'), booth.indexOf('function loadUploadedAudio'));
  assert.ok(recordingFunction.indexOf('await startBeatPlayback({ mode:"recording" })') >= 0);
  assert.ok(recordingFunction.indexOf('await startBeatPlayback({ mode:"recording" })') < recordingFunction.indexOf('mediaRecorder.start()'));
});

check('engineering session exposes one beat and four vocal lanes', () => {
  ['beat', 'lead', 'double', 'adlibs', 'harmony'].forEach(trackName => {
    assert.match(booth, new RegExp('data-track="' + trackName + '"'));
  });
  assert.match(booth, /recordingTrack = armedTrack/);
  assert.match(booth, /renderRecordedTrack\(recordingTrack\)/);
});

check('AI Mix Assist applies and teaches a starter balance', () => {
  assert.match(booth, /function applyAIMix/);
  assert.match(booth, /starterMix = \{ beat:72, lead:100, double:64, adlibs:56, harmony:52 \}/);
  assert.match(booth, /Lead stays centered and loud for clarity/);
});

check('mixdown renders one compressed WAV master in the browser', () => {
  assert.match(booth, /async function renderSessionMix/);
  assert.match(booth, /new OfflineContext\(2,/);
  assert.match(booth, /createDynamicsCompressor\(\)/);
  assert.match(booth, /audioBufferToWave/);
  assert.match(booth, /This mix works inside Music City and does not require ElevenLabs/);
});

check('Suno handoff exports the rough mix and returns through master import', () => {
  assert.match(booth, /async function finishInSuno/);
  assert.match(booth, /https:\/\/suno\.com\/create/);
  assert.match(booth, /IMPORT SUNO MASTER/);
  assert.match(booth, /function importSunoMaster/);
});

check('recording booth persists tracks and masters before external handoff', () => {
  assert.match(booth, /indexedDB\.open\("music-city-recording-booth", 1\)/);
  assert.match(booth, /async function saveBoothSession/);
  assert.match(booth, /async function restoreBoothSession/);
  assert.match(booth, /await saveBoothSession\(false\)/);
});

check('demo reference workflow no longer falsely requires ElevenLabs', () => {
  assert.match(booth, /provider !== "elevenlabs" && provider !== "demo"/);
  assert.match(booth, /Demo reference attached/);
});

console.log('9 recording booth tests passed');
