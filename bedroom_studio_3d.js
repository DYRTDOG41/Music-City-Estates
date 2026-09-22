import { createRoom } from './mce_3d_room.js';

let state = window.MCE ? window.MCE.load() : { fans: 0, cash: 100, xp: 0, level: 1 };
const room = createRoom({ background: 0x07101c, fog: 0x07101c, fogDensity: 0.012, sky: 0x7697b8, spawn: [0, 1.7, 7.5], yaw: 0 });
const { THREE, scene, renderer } = room;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.outputColorSpace = THREE.SRGBColorSpace;
scene.add(new THREE.AmbientLight(0xb9d2ed, .48));
const windowLight = new THREE.DirectionalLight(0xffdfb8, 1.8);
windowLight.position.set(-7, 9, 6);
scene.add(windowLight);

function texture(draw, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d'); draw(context, canvas.width, canvas.height);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(repeatX, repeatY); return map;
}
const wood = texture((context, width, height) => { context.fillStyle = '#4a3125'; context.fillRect(0, 0, width, height); for (let x = 0; x < width; x += 64) { context.fillStyle = x % 128 ? '#54382a' : '#40291f'; context.fillRect(x, 0, 62, height); context.strokeStyle = '#24150f'; context.strokeRect(x, 0, 62, height); for (let y = 18; y < height; y += 68) { context.strokeStyle = '#69483855'; context.beginPath(); context.moveTo(x + 6, y); context.bezierCurveTo(x + 24, y - 8, x + 40, y + 8, x + 57, y); context.stroke(); } } }, 4, 3);
const acoustic = texture((context, width, height) => { context.fillStyle = '#151d2a'; context.fillRect(0, 0, width, height); for (let x = 0; x < width; x += 32) { context.fillStyle = x % 64 ? '#26354a' : '#101722'; context.fillRect(x, 0, 29, height); } }, 2, 1);
const rug = texture((context, width, height) => { context.fillStyle = '#101a2b'; context.fillRect(0, 0, width, height); context.strokeStyle = '#3db7db'; context.lineWidth = 18; context.strokeRect(28, 28, width - 56, height - 56); context.strokeStyle = '#7254c9'; context.lineWidth = 7; context.strokeRect(56, 56, width - 112, height - 112); });

room.wallBounds(20, 18, 6.8);
scene.getObjectByName('floor').material = new THREE.MeshStandardMaterial({ map: wood, color: 0xffffff, roughness: .78 });
for (const name of ['back wall', 'left wall', 'right wall', 'front-left', 'front-right']) scene.getObjectByName(name).material = new THREE.MeshStandardMaterial({ color: 0x596777, roughness: .87 });
room.box('area rug', [8.1, .035, 6.4], [-3.4, .03, 2.15], 0xffffff, { material: new THREE.MeshStandardMaterial({ map: rug, roughness: .83 }) });
room.box('bed frame', [5.5, .7, 3.3], [-6.7, .45, 4.7], 0x2b211e, { collider: true, roughness: .72 });
room.box('mattress', [5.25, .55, 3.08], [-6.7, 1.05, 4.7], 0xb8c1cd, { roughness: .9 });
room.box('blanket', [3.2, .13, 3.12], [-7.65, 1.39, 4.7], 0x203d68, { roughness: .95 });
room.box('pillow', [1.35, .28, 1.2], [-4.75, 1.45, 4.7], 0xdce2e8, { roughness: .96 });
room.box('night stand', [1.3, 1.3, 1.25], [-8.5, .68, 1.65], 0x31251f, { collider: true });
room.cylinder('lamp base', .25, .08, [-8.5, 1.4, 1.65], 0xb9a283, { metalness: .55, roughness: .32 });
room.cylinder('lamp stem', .04, .78, [-8.5, 1.82, 1.65], 0x8a745d, { metalness: .7, roughness: .25 }); room.light(0xffb66a, 7, [-8.5, 2.4, 1.65], 7);

room.box('studio desk', [7.1, .25, 2.25], [-4.7, 1.45, -6.75], 0x292026, { collider: true, metalness: .18, roughness: .45 });
for (const x of [-7.55, -1.85]) room.box('desk leg', [.28, 1.45, 1.65], [x, .73, -6.75], 0x11141b, { metalness: .75, roughness: .28 });
for (const x of [-6.2, -3.2]) { room.box('studio monitor', [2.35, 1.4, .18], [x, 2.55, -7.5], 0x080b11, { metalness: .48, roughness: .25 }); room.box('music software display', [2.13, 1.18, .05], [x, 2.55, -7.39], 0x268ce2, { material: new THREE.MeshBasicMaterial({ color: x < -5 ? 0x17619b : 0x653fa5, toneMapped: false }) }); }
for (const x of [-8.35, -.95]) { room.box('speaker', [1.05, 2.05, .9], [x, 2.25, -7.1], 0x11151b, { collider: true }); for (const y of [1.85, 2.62]) { const cone = room.cylinder('speaker cone', .25, .08, [x, y, -6.62], 0x26313e, { metalness: .32 }); cone.rotation.x = Math.PI / 2; } }
room.box('midi keyboard', [3.35, .16, .85], [-4.7, 1.72, -5.95], 0xe6e9ed, { roughness: .3 }); room.box('producer chair', [1.3, .22, 1.2], [-4.7, 1.05, -4.35], 0x171b23, { collider: true }); room.box('chair back', [1.35, 1.7, .22], [-4.7, 1.72, -4.85], 0x171b23, { roughness: .6 });

const glass = new THREE.MeshPhysicalMaterial({ color: 0x7fdfff, emissive: 0x0a3650, emissiveIntensity: .26, transparent: true, opacity: .25, roughness: .08, metalness: .08, clearcoat: 1, side: THREE.DoubleSide });
const boothFrame = new THREE.MeshStandardMaterial({ color: 0x152432, metalness: .72, roughness: .25 });
room.box('booth back acoustic wall', [7.2, 5.8, .25], [5.9, 3, -8.22], 0xffffff, { material: new THREE.MeshStandardMaterial({ map: acoustic, color: 0x8da2b8, roughness: .92 }) });
room.box('booth right wall', [.25, 5.8, 6.6], [9.4, 3, -5.05], 0xffffff, { material: new THREE.MeshStandardMaterial({ map: acoustic, color: 0x8da2b8, roughness: .92 }), collider: true });
room.box('booth glass front left', [2.6, 5.35, .12], [3.45, 2.85, -1.83], 0x75ddff, { material: glass }); room.box('booth glass front right', [2.6, 5.35, .12], [8.35, 2.85, -1.83], 0x75ddff, { material: glass }); room.box('booth glass door', [2.05, 5.1, .1], [5.9, 2.7, -1.83], 0x75ddff, { material: glass });
for (const x of [2.05, 4.78, 7.02, 9.72]) room.box('booth frame', [.12, 5.8, .2], [x, 3, -1.83], 0x182a3a, { material: boothFrame }); room.box('booth header', [7.8, .18, .22], [5.9, 5.88, -1.83], 0x182a3a, { material: boothFrame }); room.label('VOCAL BOOTH', [5.9, 5.45, -1.55], '#7ce8ff', [4.4, .75]);
for (const x of [3.15, 5.9, 8.65]) room.light(0x67dfff, 4.5, [x, 5.4, -4.7], 8);
room.cylinder('microphone stand', .055, 2.75, [5.9, 1.38, -5.25], 0x151b22, { metalness: .9, roughness: .18 }); const mic = room.cylinder('condenser microphone', .14, .62, [5.9, 2.96, -5.25], 0x9fb9c8, { metalness: .78, roughness: .25 }); mic.rotation.z = Math.PI / 2;
const pop = new THREE.Mesh(new THREE.TorusGeometry(.34, .035, 12, 36), new THREE.MeshStandardMaterial({ color: 0x16191d, roughness: .8 })); pop.position.set(5.9, 2.95, -4.72); pop.rotation.x = Math.PI / 2; scene.add(pop);
room.box('music stand', [1.4, .85, .08], [7.35, 2.15, -4.7], 0x121820, { metalness: .62, roughness: .32 }); room.cylinder('music stand pole', .04, 1.65, [7.35, 1.05, -4.7], 0x151a20, { metalness: .82, roughness: .2 }); room.box('booth rug', [5.9, .035, 4.9], [5.9, .03, -5.05], 0x18243a, { roughness: .92 });
for (const x of [-7.2, -4.7, -2.2]) room.box('acoustic panel', [1.8, 2.2, .16], [x, 4.25, -8.68], 0xffffff, { material: new THREE.MeshStandardMaterial({ map: acoustic, color: x === -4.7 ? 0x6d54a7 : 0x52677e, roughness: .93 }) }); room.label('EVERY SUPERSTAR STARTS SOMEWHERE', [-4.7, 5.95, -8.48], '#bfefff', [7.6, .75]);

// Graphics Pass 1 — believable starter-studio clutter and music-making detail.
const chrome=new THREE.MeshStandardMaterial({color:0x9ba7b2,metalness:.9,roughness:.18});
const rubberCable=new THREE.MeshStandardMaterial({color:0x101215,roughness:.72,metalness:.08});

function addCable(points){
  const curve=new THREE.CatmullRomCurve3(points.map(point=>new THREE.Vector3(...point)));
  const cable=new THREE.Mesh(new THREE.TubeGeometry(curve,24,.022,5,false),rubberCable);
  cable.castShadow=false;scene.add(cable);
}
function addWallPoster(x,y,z,text,color){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=1024;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#10151c';ctx.fillRect(0,0,768,1024);
  ctx.strokeStyle=color;ctx.lineWidth=18;ctx.strokeRect(24,24,720,976);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 72px Arial Black, Arial';
  const lines=text.split('\n');lines.forEach((line,index)=>{ctx.fillStyle=index===0?'#fff':color;ctx.fillText(line,384,380+index*110)});
  ctx.font='800 25px Arial';ctx.fillStyle='#a9b6c4';ctx.fillText('MUSIC CITY ESTATES',384,840);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2.1,2.8),new THREE.MeshStandardMaterial({map:tex,roughness:.78,side:THREE.DoubleSide}));
  mesh.position.set(x,y,z);scene.add(mesh);
}

// Everyday objects make the room feel lived-in without adding expensive models.
room.box('laptop base',[1.7,.08,1.12],[-4.72,1.88,-6.25],0x606770,{material:chrome});
const laptopScreen=room.box('laptop screen',[1.7,1.08,.07],[-4.72,2.38,-6.76],0x20242a,{material:chrome});
laptopScreen.rotation.x=-.12;
room.box('laptop display',[1.48,.84,.02],[-4.72,2.4,-6.71],0x247ac1,{material:new THREE.MeshBasicMaterial({color:0x237cc9,toneMapped:false})});
room.box('notebook',[1.15,.035,.82],[-2.55,1.9,-5.85],0xe3dccb,{roughness:.92});
for(let line=-.34;line<=.34;line+=.17) room.box('notebook line',[.86,.006,.018],[-2.55,1.925,-5.85+line],0x7d8da0,{roughness:.9,cast:false});
room.cylinder('pen',.025,.92,[-2.15,1.98,-5.78],0x173b67,{metalness:.18,roughness:.42}).rotation.z=Math.PI/2;

// Headphones resting near the production desk.
const headphoneBand=new THREE.Mesh(new THREE.TorusGeometry(.42,.055,10,28,Math.PI),new THREE.MeshStandardMaterial({color:0x171a20,roughness:.52,metalness:.38}));
headphoneBand.position.set(-7.55,1.98,-5.75);headphoneBand.rotation.z=Math.PI;scene.add(headphoneBand);
for(const dx of [-.43,.43]) room.box('headphone earcup',[.18,.42,.3],[-7.55+dx,1.72,-5.75],0x111419,{metalness:.42,roughness:.48});

// Cable runs under the desk and into the booth give the gear physical continuity.
addCable([[-6.2,.08,-6.1],[-5.8,.06,-5.1],[-4.2,.06,-4.2],[-2.8,.06,-3.4]]);
addCable([[-3.2,.07,-6.2],[-2.5,.06,-5.2],[1.4,.06,-4.8],[4.9,.06,-4.9]]);
addCable([[5.9,.07,-4.8],[5.5,.06,-3.2],[4.8,.06,-2.3]]);

addWallPoster(-9.78,4.15,-2.2,'WRITE IT\nRECORD IT','#62dfff');
addWallPoster(-9.78,4.15,-5.6,'START HERE\nGO GLOBAL','#a984ff');

// Cheap acoustic treatment and a small record shelf complete the home-studio story.
for(let y=2.1;y<=5.1;y+=1.05) for(let z=1.2;z<=5.8;z+=1.15){
  room.box('bedroom foam tile',[.08,.84,.92],[-9.78,y,z],0x28374a,{roughness:.94,cast:false});
}
room.box('record shelf',[2.9,1.75,.48],[8.7,.95,4.9],0x2c221c,{roughness:.76,collider:true});
for(let i=0;i<11;i++) room.box('record sleeve',[.08,1.18,.36],[7.55+i*.22,1.2,4.62],i%3===0?0x8b3f59:i%3===1?0x385b7d:0xc19a4b,{roughness:.75});

const boothUI = document.getElementById('boothUI'), status = document.getElementById('status'), releaseButton = document.getElementById('releaseSong'), draftStatus = document.getElementById('draftStatus'); let savedDraft = null;
const previewButton = document.getElementById('previewBeat'), micButton = document.getElementById('testMic'), micLevel = document.getElementById('micLevel'), micDb = document.getElementById('micDb'), micWave = [...document.querySelectorAll('#micWave i')];
let boothAudioContext = null, beatMaster = null, beatTimer = null, beatStopTimer = null, beatStep = 0;
let micStream = null, micContext = null, micAnalyser = null, micFrame = null;
function updateStats() { state = window.MCE ? window.MCE.load() : state; for (const key of ['fans', 'cash', 'xp', 'level']) document.getElementById(key).textContent = Number(state[key] || (key === 'level' ? 1 : 0)).toLocaleString(); }
function loadDraft() { try { savedDraft = JSON.parse(localStorage.getItem('musicCitySongDraft') || 'null'); } catch (error) { savedDraft = null; } const ready = savedDraft && savedDraft.studio === 'bedroom' && savedDraft.title; draftStatus.textContent = ready ? 'READY TO RELEASE: “' + savedDraft.title + '” has returned from your recording session.' : 'No song draft yet. Open the recorder to choose a beat, record vocals, build a hook, and polish your song.'; releaseButton.disabled = !ready; }
function enterBooth() { loadDraft(); boothUI.classList.add('show'); document.getElementById('openRecorder').focus(); }
function stopBeatPreview() {
  if (beatTimer) clearInterval(beatTimer);
  if (beatStopTimer) clearTimeout(beatStopTimer);
  beatTimer = beatStopTimer = null;
  if (beatMaster) { try { beatMaster.disconnect(); } catch (error) {} }
  beatMaster = null;
  beatStep = 0;
  previewButton.textContent = '▶ PREVIEW';
}
function hitKick(time) {
  const oscillator = boothAudioContext.createOscillator(), gain = boothAudioContext.createGain();
  oscillator.frequency.setValueAtTime(145, time); oscillator.frequency.exponentialRampToValueAtTime(46, time + .13);
  gain.gain.setValueAtTime(.85, time); gain.gain.exponentialRampToValueAtTime(.001, time + .18);
  oscillator.connect(gain).connect(beatMaster); oscillator.start(time); oscillator.stop(time + .2);
}
function hitHat(time) {
  const length = Math.floor(boothAudioContext.sampleRate * .035), buffer = boothAudioContext.createBuffer(1, length, boothAudioContext.sampleRate), data = buffer.getChannelData(0);
  for (let index = 0; index < length; index++) data[index] = Math.random() * 2 - 1;
  const source = boothAudioContext.createBufferSource(), filter = boothAudioContext.createBiquadFilter(), gain = boothAudioContext.createGain();
  source.buffer = buffer; filter.type = 'highpass'; filter.frequency.value = 6500; gain.gain.setValueAtTime(.11, time); gain.gain.exponentialRampToValueAtTime(.001, time + .04);
  source.connect(filter).connect(gain).connect(beatMaster); source.start(time);
}
function hitSnare(time) {
  const length = Math.floor(boothAudioContext.sampleRate * .12), buffer = boothAudioContext.createBuffer(1, length, boothAudioContext.sampleRate), data = buffer.getChannelData(0);
  for (let index = 0; index < length; index++) data[index] = Math.random() * 2 - 1;
  const source = boothAudioContext.createBufferSource(), filter = boothAudioContext.createBiquadFilter(), gain = boothAudioContext.createGain();
  source.buffer = buffer; filter.type = 'highpass'; filter.frequency.value = 1100; gain.gain.setValueAtTime(.28, time); gain.gain.exponentialRampToValueAtTime(.001, time + .13);
  source.connect(filter).connect(gain).connect(beatMaster); source.start(time);
}
async function toggleBeatPreview() {
  if (beatTimer) { stopBeatPreview(); status.textContent = 'Beat preview stopped.'; return; }
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) { status.textContent = 'Beat preview is not supported in this browser.'; return; }
  boothAudioContext = boothAudioContext || new AudioContext();
  await boothAudioContext.resume();
  beatMaster = boothAudioContext.createGain(); beatMaster.gain.value = .42; beatMaster.connect(boothAudioContext.destination);
  const tick = () => { const time = boothAudioContext.currentTime + .02; if (beatStep % 8 === 0 || beatStep % 8 === 6) hitKick(time); if (beatStep % 8 === 4) hitSnare(time); hitHat(time); beatStep++; };
  tick(); beatTimer = setInterval(tick, 250); beatStopTimer = setTimeout(() => { stopBeatPreview(); status.textContent = 'Beat preview complete. Choose a style or start your recording session.'; }, 8000);
  previewButton.textContent = '■ STOP PREVIEW';
  status.textContent = document.getElementById('beatStyle').value + ' preview playing through the booth monitors.';
}
function stopMicTest(message) {
  if (micFrame) cancelAnimationFrame(micFrame);
  micFrame = null;
  if (micStream) micStream.getTracks().forEach(track => track.stop());
  micStream = null; micAnalyser = null;
  if (micContext) micContext.close().catch(() => {});
  micContext = null;
  micLevel.style.width = '0%'; micDb.textContent = 'OFF'; micButton.textContent = 'TEST MIC'; micButton.classList.remove('active'); document.getElementById('micWave').classList.remove('mic-live');
  micWave.forEach(bar => { bar.style.transform = ''; bar.style.opacity = ''; });
  if (message) status.textContent = message;
}
function renderMicLevel() {
  if (!micAnalyser) return;
  const samples = new Uint8Array(micAnalyser.fftSize); micAnalyser.getByteTimeDomainData(samples);
  let sum = 0; for (const sample of samples) { const centered = (sample - 128) / 128; sum += centered * centered; }
  const rms = Math.sqrt(sum / samples.length), decibels = Math.max(-60, 20 * Math.log10(Math.max(rms, .001))), percent = Math.max(2, Math.min(100, ((decibels + 60) / 60) * 100));
  micLevel.style.width = percent.toFixed(0) + '%'; micDb.textContent = decibels.toFixed(0) + ' dB';
  micWave.forEach((bar, index) => { const energy = Math.max(.18, percent / 100 * (index % 2 ? 1 : .72)); bar.style.transform = 'scaleY(' + energy.toFixed(2) + ')'; bar.style.opacity = String(Math.max(.35, energy)); });
  micFrame = requestAnimationFrame(renderMicLevel);
}
async function toggleMicTest() {
  if (micStream) { stopMicTest('Mic test stopped. No audio was saved or uploaded.'); return; }
  if (!navigator.mediaDevices?.getUserMedia) { status.textContent = 'Microphone testing is not supported in this browser.'; return; }
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
    const AudioContext = window.AudioContext || window.webkitAudioContext; micContext = new AudioContext(); micAnalyser = micContext.createAnalyser(); micAnalyser.fftSize = 512;
    micContext.createMediaStreamSource(micStream).connect(micAnalyser);
    micButton.textContent = 'STOP MIC TEST'; micButton.classList.add('active'); document.getElementById('micWave').classList.add('mic-live'); status.textContent = 'Mic test is live locally. Speak to check your level; nothing is being recorded or uploaded.'; renderMicLevel();
  } catch (error) { stopMicTest(); status.textContent = error.name === 'NotAllowedError' ? 'Microphone permission was not granted. You can still enter the recording workflow.' : 'Microphone test could not start: ' + error.message; }
}
function leaveBooth() { stopBeatPreview(); stopMicTest(); boothUI.classList.remove('show'); document.querySelector('canvas')?.focus(); }
room.interact('ENTER VOCAL BOOTH', [5.9, 1.7, -.45], enterBooth, 3, 0x66e6ff); room.interact('OPEN PRODUCER DESK', [-4.7, 1.7, -3.35], () => { location.href = 'record_music.html?studio=bedroom'; }, 2.7, 0x8b66ff);
document.getElementById('boothShortcut').onclick = enterBooth;
document.getElementById('leaveBooth').onclick = leaveBooth; document.getElementById('openRecorder').onclick = () => { stopBeatPreview(); stopMicTest(); location.href = 'record_music.html?studio=bedroom'; };
previewButton.onclick = toggleBeatPreview; micButton.onclick = toggleMicTest;
releaseButton.onclick = () => { loadDraft(); if (!savedDraft || savedDraft.studio !== 'bedroom' || !savedDraft.title) return; window.MCE.addRelease({ title: savedDraft.title, source: 'bedroom' }); state = window.MCE.add({ fans: 10, xp: 15 }); status.textContent = '🔥 “' + savedDraft.title + '” released! +10 Fans • +15 XP'; localStorage.removeItem('musicCitySongDraft'); savedDraft = null; releaseButton.disabled = true; loadDraft(); updateStats(); };
boothUI.addEventListener('click', (event) => { if (event.target === boothUI) leaveBooth(); }); addEventListener('keydown', (event) => { if (event.key === 'Escape' && boothUI.classList.contains('show')) leaveBooth(); }); addEventListener('beforeunload', () => { stopBeatPreview(); stopMicTest(); }); updateStats(); loadDraft();
