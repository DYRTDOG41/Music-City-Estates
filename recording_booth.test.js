const assert = require('assert');
const fs = require('fs');

function check(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (error) { console.error('not ok - ' + name); throw error; }
}

const booth = fs.readFileSync('record_music.html', 'utf8');

check('studio teaches the six-step standard song workflow', () => {
  assert.match(booth, /1 • BEAT/);
  assert.match(booth, /2 • LEAD/);
  assert.match(booth, /3 • DOUBLES/);
  assert.match(booth, /4 • AD-LIBS/);
  assert.match(booth, /5 • AI ENGINEER/);
  assert.match(booth, /6 • FINISHED/);
});

check('studio records separate vocal layers', () => {
  assert.match(booth, /const vocalTakes = \{lead:null,double:null,adlibs:null,harmony:null\}/);
  assert.match(booth, /selectVocalTrack\('lead'\)/);
  assert.match(booth, /selectVocalTrack\('double'\)/);
  assert.match(booth, /selectVocalTrack\('adlibs'\)/);
  assert.match(booth, /selectVocalTrack\('harmony'\)/);
});

check('AI Engineer exposes simple artist-facing styles and intensity', () => {
  assert.match(booth, /CLEAN \/ NATURAL/);
  assert.match(booth, /MODERN HIP-HOP/);
  assert.match(booth, /TRAP/);
  assert.match(booth, /MELODIC/);
  assert.match(booth, /AGGRESSIVE/);
  assert.match(booth, /RADIO READY/);
  assert.match(booth, /engineerIntensity/);
});

check('automatic engineer performs track-aware DSP', () => {
  assert.match(booth, /createBiquadFilter/);
  assert.match(booth, /createDynamicsCompressor/);
  assert.match(booth, /createConvolver/);
  assert.match(booth, /createDelay/);
  assert.match(booth, /createStereoPanner/);
  assert.match(booth, /roles=\{/);
});

check('ElevenLabs is the only studio AI provider', () => {
  assert.match(booth, /value="elevenlabs"/);
  assert.match(booth, /ElevenLabs Music v2\.5 — the only studio AI engine/);
  assert.doesNotMatch(booth, /Suno/i);
  assert.doesNotMatch(booth, /music-city-native/i);
});

check('studio API secret is never embedded in the browser page', () => {
  assert.doesNotMatch(booth, /xi-api-key/i);
  assert.doesNotMatch(booth, /process\.env/);
  assert.match(booth, /API key never appears in this page or in GitHub/);
});

check('lead cleanup uses ElevenLabs Voice Isolator', () => {
  assert.match(booth, /async function cleanVoiceWithElevenLabs/);
  assert.match(booth, /\/api\/elevenlabs\/isolate/);
  assert.match(booth, /ElevenLabs is cleaning the lead vocal before the mix/);
});

check('vocal transcription still uses ElevenLabs Scribe', () => {
  assert.match(booth, /async function transcribeCurrentTake/);
  assert.match(booth, /\/api\/elevenlabs\/transcribe/);
});

check('studio engineer voice still uses ElevenLabs TTS', () => {
  assert.match(booth, /async function playEngineerVoice/);
  assert.match(booth, /\/api\/elevenlabs\/tts/);
});

check('recording over a selected beat remains available', () => {
  assert.match(booth, /async function toggleVoiceRecording/);
  assert.match(booth, /recordingBeatAudio=new Audio/);
});

check('AI Engineer creates clean and creative A-B mixes', () => {
  assert.match(booth, /A • Clean Mix/);
  assert.match(booth, /B • Creative Mix/);
  assert.match(booth, /AI Engineer finished both mixes/);
});

console.log('11 guided AI engineer studio tests passed');
