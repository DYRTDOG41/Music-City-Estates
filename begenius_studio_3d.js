import { createRoom, buildAvatar } from './mce_3d_room.js';
import { beGeniusPlaques, beGeniusReleases } from './begenius_catalog.js';

let state = window.MCE ? window.MCE.load() : {
  fans: Number(localStorage.getItem('mceFans')) || 0,
  cash: Number(localStorage.getItem('mceCash')) || 500,
  xp: Number(localStorage.getItem('mceXP')) || 0
};
const updateStats = () => {
  document.getElementById('fans').textContent = state.fans;
  document.getElementById('cash').textContent = state.cash;
  document.getElementById('xp').textContent = state.xp;
};
updateStats();

const room = createRoom({ spawn: [0, 1.7, 13.2], background: 0x030303, fog: 0x090806, fogDensity: .009, sky: 0x725f35 });
const { THREE, scene } = room;

function canvasTexture(draw, width = 512, height = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  draw(context, width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return map;
}

const marble = canvasTexture((context, width, height) => {
  context.fillStyle = '#141312';
  context.fillRect(0, 0, width, height);
  for (let index = 0; index < 85; index += 1) {
    context.strokeStyle = `rgba(210,190,130,${Math.random() * .12})`;
    context.lineWidth = Math.random() * 3 + .5;
    context.beginPath();
    const start = Math.random() * height;
    context.moveTo(0, start);
    context.bezierCurveTo(width * .3, start + Math.random() * 80 - 40, width * .7, start + Math.random() * 100 - 50, width, start + Math.random() * 70 - 35);
    context.stroke();
  }
});
marble.repeat.set(4, 4);
const wood = canvasTexture((context, width, height) => {
  context.fillStyle = '#24150e';
  context.fillRect(0, 0, width, height);
  for (let x = 0; x < width; x += 38) {
    context.fillStyle = x % 76 ? '#321f15' : '#1a100b';
    context.fillRect(x, 0, 32, height);
    context.strokeStyle = '#6b472b44';
    for (let y = 20; y < height; y += 80) {
      context.beginPath();
      context.moveTo(x, y);
      context.quadraticCurveTo(x + 18, y + 8, x + 32, y);
      context.stroke();
    }
  }
});
wood.repeat.set(5, 2);

room.wallBounds(40, 32, 9);
scene.getObjectByName('floor').material = new THREE.MeshStandardMaterial({ map: marble, color: 0x67625c, roughness: .34, metalness: .15 });
for (const wallName of ['back wall', 'left wall', 'right wall', 'front-left', 'front-right']) {
  scene.getObjectByName(wallName).material = new THREE.MeshStandardMaterial({ map: wood, color: 0x76513b, roughness: .72, metalness: .06 });
}

for (const x of [-18.8, -10, 10, 18.8]) room.box('brass column', [.38, 8.7, .38], [x, 4.35, -4], 0xb99a4d, { metalness: .85, roughness: .24 });
for (let z = -14; z <= 14; z += 4) room.box('ceiling beam', [39, .16, .16], [0, 8.25, z], 0x2c2720, { metalness: .72, roughness: .34 });
for (const x of [-15, -7.5, 0, 7.5, 15]) {
  const downlight = new THREE.SpotLight(0xffe8b0, 42, 18, .48, .6, 1.6);
  downlight.position.set(x, 8, 1);
  downlight.target.position.set(x, 0, -2);
  scene.add(downlight, downlight.target);
  room.cylinder('ceiling light', .22, .24, [x, 8.05, 1], 0x181613, { metalness: .85 });
}
const goldLight = room.light(0xffcf69, 15, [-12, 4, -6], 20);
goldLight.shadow.mapSize.set(512, 512);
const coolLight = room.light(0x6ba8ff, 11, [12, 4, -6], 20);
coolLight.castShadow = false;
room.label('BEGENIUS', [0, 7.15, -15.75], '#f1e4bd', [12, 1.8]);
room.label('MUSIC • MEDIA • PUBLISHING • DEVELOPMENT', [0, 6.08, -15.72], '#d8b765', [12, .66]);

// Release art rotates every five seconds. Playback only begins after a player click.
const screenCanvas = document.createElement('canvas');
screenCanvas.width = 1280;
screenCanvas.height = 720;
const screenContext = screenCanvas.getContext('2d');
const screenTexture = new THREE.CanvasTexture(screenCanvas);
screenTexture.colorSpace = THREE.SRGBColorSpace;
room.box('streaming wall frame', [15.1, 8.9, .28], [0, 3.55, -15.93], 0x17130d, { metalness: .68, roughness: .26, collider: true });
const screen = new THREE.Mesh(new THREE.PlaneGeometry(14.2, 8), new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false }));
screen.position.set(0, 3.55, -15.74);
screen.renderOrder = 2;
scene.add(screen);
room.label('OFFICIAL YOUTUBE RELEASE WALL', [0, 8.15, -15.55], '#f6d77d', [9, .72]);

let selectedReleaseIndex = 0;
let wallRotationPaused = false;
let artworkRequest = 0;
function drawReleaseFallback(release) {
  const gradient = screenContext.createLinearGradient(0, 0, 1280, 720);
  gradient.addColorStop(0, '#080808');
  gradient.addColorStop(.52, '#30230f');
  gradient.addColorStop(1, '#090909');
  screenContext.fillStyle = gradient;
  screenContext.fillRect(0, 0, 1280, 720);
  screenContext.fillStyle = '#d8b765';
  screenContext.fillRect(0, 0, 18, 720);
  screenContext.font = '900 28px Arial';
  screenContext.fillStyle = '#d8b765';
  screenContext.fillText('BEGENIUS PRESENTS', 72, 100);
  screenContext.font = '900 74px Arial';
  screenContext.fillStyle = '#ffffff';
  screenContext.fillText(release.title.toUpperCase().slice(0, 25), 72, 205);
  screenContext.font = '700 39px Arial';
  screenContext.fillStyle = '#d8d0b8';
  screenContext.fillText(release.artist.toUpperCase().slice(0, 38), 72, 270);
  screenContext.font = '700 25px Arial';
  screenContext.fillStyle = '#e2c46e';
  screenContext.fillText('APPROACH THE WALL TO WATCH ON YOUTUBE', 72, 640);
  screenTexture.needsUpdate = true;
}
function coverCrop(image, context, width, height) {
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;
  let sourceX = 0;
  let sourceY = 0;
  if (imageRatio > targetRatio) {
    sourceWidth = image.naturalHeight * targetRatio;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = image.naturalWidth / targetRatio;
    sourceY = (image.naturalHeight - sourceHeight) / 2;
  }
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
}
function renderStreamingWall(index) {
  selectedReleaseIndex = (index + beGeniusReleases.length) % beGeniusReleases.length;
  const release = beGeniusReleases[selectedReleaseIndex];
  const request = ++artworkRequest;
  drawReleaseFallback(release);
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => {
    if (request !== artworkRequest) return;
    coverCrop(image, screenContext, 1280, 720);
    const shade = screenContext.createLinearGradient(0, 0, 1280, 0);
    shade.addColorStop(0, 'rgba(0,0,0,.88)');
    shade.addColorStop(.53, 'rgba(0,0,0,.28)');
    shade.addColorStop(1, 'rgba(0,0,0,.08)');
    screenContext.fillStyle = shade;
    screenContext.fillRect(0, 0, 1280, 720);
    screenContext.fillStyle = '#d8b765';
    screenContext.fillRect(0, 0, 18, 720);
    screenContext.font = '900 27px Arial';
    screenContext.fillStyle = '#d8b765';
    screenContext.fillText('BEGENIUS OFFICIAL RELEASE WALL', 68, 90);
    screenContext.font = '900 68px Arial';
    screenContext.fillStyle = '#fff';
    screenContext.fillText(release.title.toUpperCase().slice(0, 26), 68, 190);
    screenContext.font = '700 34px Arial';
    screenContext.fillStyle = '#e8e0cc';
    screenContext.fillText(release.artist.toUpperCase().slice(0, 42), 68, 248);
    screenContext.font = '700 23px Arial';
    screenContext.fillStyle = '#f0ce70';
    screenContext.fillText('E / TAP TO OPEN THE OFFICIAL YOUTUBE PLAYER', 68, 650);
    screenTexture.needsUpdate = true;
  };
  image.onerror = () => drawReleaseFallback(release);
  image.src = release.thumbnailUrl;
}
renderStreamingWall(0);
setInterval(() => {
  if (!wallRotationPaused) renderStreamingWall(selectedReleaseIndex + 1);
}, 5000);

// RushDee plaque gallery. The discs are visual placeholders for approved plaque photography.
room.label('RUSHDEE PLAQUE GALLERY', [-19.28, 7.25, -1], '#f1d27a', [6.8, .68]);
const plaqueMetal = [0xd2ad49, 0xbfc2c4, 0xd2ad49, 0xbfc2c4, 0xd2ad49, 0xbfc2c4];
beGeniusPlaques.forEach((plaque, index) => {
  const row = Math.floor(index / 2);
  const column = index % 2;
  const z = -9 + row * 6.1;
  const y = 5.6 - column * 3.1;
  room.box('plaque frame', [.24, 2.55, 4.7], [-19.54, y, z], 0x17130e, { metalness: .62, roughness: .32, collider: true });
  const disc = room.cylinder('plaque record', .82, .1, [-19.36, y + .22, z], plaqueMetal[index], { metalness: .9, roughness: .18 });
  disc.rotation.z = Math.PI / 2;
  room.label(`${plaque.title.toUpperCase()}\n${plaque.subtitle.toUpperCase()}`, [-19.15, y - .65, z], '#f4e6ba', [3.65, .82]);
});

// Reception, lounge, and connections to the universal studio workflow.
room.box('reception desk', [8, 1.25, 1.8], [10.7, .63, 5], 0x17130e, { collider: true, metalness: .34, roughness: .46 });
room.box('desk trim', [8.1, .12, .12], [10.7, 1.2, 4.06], 0xc6a653, { metalness: .86, roughness: .2 });
room.label('BEGENIUS RECEPTION', [10.7, 1.55, 4], '#f0d178', [5.2, .62]);
const receptionist = buildAvatar(room, { skin: '#815139', hairStyle: 'braids', hairColor: '#141015', shirtColor: '#171717', pantsColor: '#111111' }, [10.7, 0, 6.3], .88);
receptionist.rotation.y = Math.PI;
for (const x of [-6.5, 0, 6.5]) {
  room.box('lounge sofa', [4.6, .75, 1.55], [x, .58, 7.5], 0x243026, { collider: true, roughness: .82 });
  room.box('sofa back', [4.6, 1.15, .52], [x, 1.15, 8.1], 0x1c281f, { collider: true, roughness: .82 });
}
room.box('lobby table', [5.2, .18, 2.4], [0, .76, 3.2], 0x4a311e, { collider: true, roughness: .44, metalness: .12 });
for (const x of [-2.1, 2.1]) room.box('table leg', [.22, .75, .22], [x, .38, 3.2], 0xb3934e, { metalness: .82, roughness: .22 });

room.box('recording entrance', [6.2, 4.7, .32], [14.6, 2.35, -14.1], 0x0e0d0b, { collider: true, metalness: .48, roughness: .34 });
room.label('RECORDING SUITE', [14.6, 4.05, -13.9], '#e7c66e', [4.7, .72]);
room.label('CREATE • RECORD • RELEASE', [14.6, 3.25, -13.88], '#ffffff', [4.5, .48]);
room.interact('ENTER RECORDING SUITE', [14.6, 1.7, -11.6], () => { location.href = 'record_music.html?studio=begenius'; }, 3, 0xd8b765);
room.box('exit arch', [6.2, 4.7, .32], [-14.6, 2.35, 14.1], 0x0e0d0b, { collider: true, metalness: .48, roughness: .34 });
room.label('HIP-HOP HEIGHTS', [-14.6, 4.05, 13.9], '#e7c66e', [4.7, .72]);
room.interact('RETURN TO HIP-HOP HEIGHTS', [-14.6, 1.7, 11.5], () => { location.href = 'hip_hop_heights.html'; }, 3, 0xd8b765);

const streamPanel = document.getElementById('streamPanel');
const releaseMedia = document.getElementById('releaseMedia');
const poster = document.getElementById('releasePoster');
const player = document.getElementById('youtubePlayer');
const currentRelease = () => beGeniusReleases[selectedReleaseIndex];
function stopVideo() {
  player.src = '';
  releaseMedia.classList.remove('playing');
  document.getElementById('playRelease').textContent = 'PLAY OFFICIAL VIDEO';
}
function updateStreamPanel() {
  const release = currentRelease();
  stopVideo();
  document.getElementById('releaseTitle').textContent = release.title;
  document.getElementById('releaseArtist').textContent = release.artist;
  document.getElementById('releaseCredit').textContent = release.credit;
  document.getElementById('releaseCounter').textContent = `${selectedReleaseIndex + 1} OF ${beGeniusReleases.length}`;
  poster.src = release.thumbnailUrl;
  poster.alt = `${release.title} by ${release.artist}`;
}
function openStreamPanel() {
  wallRotationPaused = true;
  updateStreamPanel();
  streamPanel.classList.add('show');
}
room.interact('OPEN YOUTUBE RELEASE WALL', [0, 1.7, -10.3], openStreamPanel, 4.2, 0xd8b765);

function trackReleaseAction(action) {
  let history = [];
  try { history = JSON.parse(localStorage.getItem('mceBeGeniusReleaseActions') || '[]'); } catch (error) {}
  history.push({ releaseId: currentRelease().id, action, at: new Date().toISOString() });
  localStorage.setItem('mceBeGeniusReleaseActions', JSON.stringify(history.slice(-100)));
}
document.getElementById('playRelease').onclick = () => {
  const release = currentRelease();
  player.src = `https://www.youtube-nocookie.com/embed/${release.youtubeId}?autoplay=1&rel=0&origin=${encodeURIComponent(location.origin)}`;
  releaseMedia.classList.add('playing');
  document.getElementById('playRelease').textContent = 'PLAYING ON YOUTUBE';
  trackReleaseAction('embed-play');
};
document.getElementById('openYouTube').onclick = () => {
  trackReleaseAction('open-youtube');
  const destination = window.open(currentRelease().youtubeUrl, '_blank', 'noopener,noreferrer');
  if (destination) destination.opener = null;
};
document.getElementById('previousRelease').onclick = () => { renderStreamingWall(selectedReleaseIndex - 1); updateStreamPanel(); };
document.getElementById('nextRelease').onclick = () => { renderStreamingWall(selectedReleaseIndex + 1); updateStreamPanel(); };
document.getElementById('closeStream').onclick = () => {
  stopVideo();
  streamPanel.classList.remove('show');
  wallRotationPaused = false;
};

const plaquePanel = document.getElementById('plaquePanel');
function openPlaquePanel() { plaquePanel.classList.add('show'); }
room.interact('VIEW RUSHDEE PLAQUES', [-15.4, 1.7, -1], openPlaquePanel, 3.2, 0xd8b765);
document.getElementById('plaqueList').innerHTML = beGeniusPlaques.map((plaque) => `<div class="plaque-card"><strong>${plaque.title}</strong><br><small>${plaque.subtitle}</small></div>`).join('');
document.getElementById('closePlaques').onclick = () => plaquePanel.classList.remove('show');
for (const modal of document.querySelectorAll('.modal')) {
  modal.addEventListener('click', (event) => {
    if (event.target !== modal) return;
    if (modal === streamPanel) { stopVideo(); wallRotationPaused = false; }
    modal.classList.remove('show');
  });
}
