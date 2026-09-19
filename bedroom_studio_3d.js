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

const boothUI = document.getElementById('boothUI'), status = document.getElementById('status'), releaseButton = document.getElementById('releaseSong'), draftStatus = document.getElementById('draftStatus'); let savedDraft = null;
function updateStats() { state = window.MCE ? window.MCE.load() : state; for (const key of ['fans', 'cash', 'xp', 'level']) document.getElementById(key).textContent = Number(state[key] || (key === 'level' ? 1 : 0)).toLocaleString(); }
function loadDraft() { try { savedDraft = JSON.parse(localStorage.getItem('musicCitySongDraft') || 'null'); } catch (error) { savedDraft = null; } const ready = savedDraft && savedDraft.studio === 'bedroom' && savedDraft.title; draftStatus.textContent = ready ? 'READY TO RELEASE: “' + savedDraft.title + '” has returned from your recording session.' : 'No song draft yet. Open the recorder to choose a beat, record vocals, build a hook, and polish your song.'; releaseButton.disabled = !ready; }
function enterBooth() { loadDraft(); boothUI.classList.add('show'); document.getElementById('openRecorder').focus(); }
function leaveBooth() { boothUI.classList.remove('show'); document.querySelector('canvas')?.focus(); }
room.interact('ENTER VOCAL BOOTH', [5.9, 1.7, -.45], enterBooth, 3, 0x66e6ff); room.interact('OPEN PRODUCER DESK', [-4.7, 1.7, -3.35], () => { location.href = 'record_music.html?studio=bedroom'; }, 2.7, 0x8b66ff);
document.getElementById('leaveBooth').onclick = leaveBooth; document.getElementById('openRecorder').onclick = () => { location.href = 'record_music.html?studio=bedroom'; };
document.getElementById('previewBeat').onclick = (event) => { const playing = event.currentTarget.textContent.includes('STOP'); event.currentTarget.textContent = playing ? '▶ PREVIEW' : '■ STOP PREVIEW'; status.textContent = playing ? 'Beat preview stopped.' : document.getElementById('beatStyle').value + ' preview playing. Full audio selection opens inside the recording workflow.'; };
releaseButton.onclick = () => { loadDraft(); if (!savedDraft || savedDraft.studio !== 'bedroom' || !savedDraft.title) return; window.MCE.addRelease({ title: savedDraft.title, source: 'bedroom' }); state = window.MCE.add({ fans: 10, xp: 15 }); status.textContent = '🔥 “' + savedDraft.title + '” released! +10 Fans • +15 XP'; localStorage.removeItem('musicCitySongDraft'); savedDraft = null; releaseButton.disabled = true; loadDraft(); updateStats(); };
boothUI.addEventListener('click', (event) => { if (event.target === boothUI) leaveBooth(); }); addEventListener('keydown', (event) => { if (event.key === 'Escape' && boothUI.classList.contains('show')) leaveBooth(); }); updateStats(); loadDraft();
