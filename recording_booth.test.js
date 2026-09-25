const assert = require('assert');
const fs = require('fs');

function check(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (error) { console.error('not ok - ' + name); throw error; }
}

const booth = fs.readFileSync('record_music.html', 'utf8');

check('studio explains the three-step ElevenLabs creative flow', () => {
  assert.match(booth, /1 • DESCRIBE IT/);
  assert.match(booth, /2 • RECORD IT/);
  assert.match(booth, /3 • CREATE IT/);
  assert.match(booth, /Eleven Music v2\.5 generates through the secure Music City server/);
});

check('ElevenLabs is the only studio AI engine', () => {
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

check('music generation routes through the shared ElevenLabs engine', () => {
  assert.match(booth, /window\.MusicCityAI\.generate/);
  assert.match(booth, /provider,title:details\.title/);
  assert.match(booth, /Generating one secure ElevenLabs Music v2\.5 base track/);
});

check('recorded vocals can be cleaned with ElevenLabs Voice Isolator', () => {
  assert.match(booth, /async function cleanVoiceWithElevenLabs/);
  assert.match(booth, /\/api\/elevenlabs\/isolate/);
  assert.match(booth, /Cleaning your vocal with ElevenLabs Voice Isolator/);
});

check('recorded vocals can be transcribed with ElevenLabs Scribe', () => {
  assert.match(booth, /async function transcribeCurrentTake/);
  assert.match(booth, /\/api\/elevenlabs\/transcribe/);
  assert.match(booth, /ElevenLabs Scribe returned the vocal transcript/);
});

check('studio engineer voice uses ElevenLabs TTS', () => {
  assert.match(booth, /async function playEngineerVoice/);
  assert.match(booth, /\/api\/elevenlabs\/tts/);
  assert.match(booth, /Live ElevenLabs studio-engineer audio returned successfully/);
});

check('recording over a selected beat remains available', () => {
  assert.match(booth, /async function toggleVoiceRecording/);
  assert.match(booth, /recordingBeatAudio=new Audio/);
  assert.match(booth, /RECORD OVER BEAT/);
});

check('one ElevenLabs generation can produce two local mix choices', () => {
  assert.match(booth, /async function createTwoVersions/);
  assert.match(booth, /Version A/);
  assert.match(booth, /Version B/);
  assert.match(booth, /Two mixes are ready from one ElevenLabs generation/);
});

console.log('9 ElevenLabs recording studio tests passed');
