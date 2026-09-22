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

const room = createRoom({ spawn: [0, 1.7, 13.2], background: 0x10131a, fog: 0x161926, fogDensity: .0035, sky: 0xb9d8ff });
const { THREE, scene, renderer } = room;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.42;
renderer.outputColorSpace = THREE.SRGBColorSpace;
scene.children.forEach((child) => {
  if (child.isHemisphereLight) child.intensity = 1.55;
});
scene.add(new THREE.AmbientLight(0xb8ccff, .52));

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
  context.fillStyle = '#595b64';
  context.fillRect(0, 0, width, height);
  for (let index = 0; index < 110; index += 1) {
    context.strokeStyle = `rgba(225,232,255,${Math.random() * .18})`;
    context.lineWidth = Math.random() * 3.5 + .5;
    context.beginPath();
    const start = Math.random() * height;
    context.moveTo(0, start);
    context.bezierCurveTo(width * .3, start + Math.random() * 80 - 40, width * .7, start + Math.random() * 100 - 50, width, start + Math.random() * 70 - 35);
    context.stroke();
  }
});
marble.repeat.set(4, 4);
const wallPanels = canvasTexture((context, width, height) => {
  context.fillStyle = '#101117';
  context.fillRect(0, 0, width, height);
  context.strokeStyle = '#2e303b';
  context.lineWidth = 5;
  for (let x = 0; x <= width; x += 128) {
    context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke();
  }
  for (let y = 0; y <= height; y += 128) {
    context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
  }
});
wallPanels.repeat.set(5, 2);

room.wallBounds(40, 32, 9);
scene.getObjectByName('floor').material = new THREE.MeshPhysicalMaterial({ map: marble, color: 0xd4d6df, roughness: .2, metalness: .12, clearcoat: .75, clearcoatRoughness: .18 });
for (const wallName of ['back wall', 'left wall', 'right wall', 'front-left', 'front-right']) {
  scene.getObjectByName(wallName).material = new THREE.MeshStandardMaterial({ map: wallPanels, color: 0xffffff, roughness: .67, metalness: .08 });
}

const blueLED = new THREE.MeshStandardMaterial({ color: 0xd8f6ff, emissive: 0x147dff, emissiveIntensity: 3.2, metalness: .22, roughness: .18 });
const purpleLED = new THREE.MeshStandardMaterial({ color: 0xf2c9ff, emissive: 0x9b25ff, emissiveIntensity: 2.8, metalness: .18, roughness: .2 });
for (const x of [-18.8, -10, 10, 18.8]) room.box('black wall column', [.38, 8.7, .38], [x, 4.35, -4], 0x171922, { metalness: .62, roughness: .3 });
for (let z = -14; z <= 14; z += 4) room.box('ceiling beam', [39, .16, .16], [0, 8.25, z], 0x1b1c24, { metalness: .58, roughness: .38 });
for (const x of [-15, -7.5, 0, 7.5, 15]) {
  const downlight = new THREE.SpotLight(0xffedcf, 62, 20, .52, .55, 1.45);
  downlight.position.set(x, 8, 2);
  downlight.target.position.set(x, 0, -1);
  scene.add(downlight, downlight.target);
  room.cylinder('ceiling light', .22, .24, [x, 8.05, 2], 0x181a21, { metalness: .85 });
}
for (const x of [-16, -8, 0, 8, 16]) {
  room.box('blue ceiling light channel', [6.8, .08, .12], [x, 8.12, -13.7], 0x56b8ff, { material: blueLED, cast: false });
  room.box('purple ceiling light channel', [6.8, .08, .12], [x, 8.12, 8.8], 0xca66ff, { material: purpleLED, cast: false });
}
const warmLight = room.light(0xffd7a1, 18, [-12, 5.5, -4], 22);
warmLight.shadow.mapSize.set(512, 512);
const coolLight = room.light(0x5b9dff, 24, [10, 5, -6], 24);
coolLight.castShadow = false;
room.light(0xa942ff, 15, [13, 5, 6], 18).castShadow = false;

function addLobbyBrand() {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 480;
  const context = canvas.getContext('2d');
  context.fillStyle = '#05090f';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const glow = '#5ed9ff';
  const edge = '#d8f8ff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  // Match the exterior identity: the faceted microphone is the I in BEGENIUS.
  context.shadowColor = '#159cff';
  context.shadowBlur = 34;
  context.font = '900 150px Impact, Arial Black, sans-serif';
  context.lineJoin = 'round';
  context.lineWidth = 10;
  context.strokeStyle = glow;
  context.fillStyle = '#05080d';
  context.strokeText('BEGEN', 540, 205);
  context.fillText('BEGEN', 540, 205);
  context.strokeText('US', 1115, 205);
  context.fillText('US', 1115, 205);

  context.strokeStyle = edge;
  context.lineWidth = 8;
  context.shadowColor = '#27b7ff';
  context.shadowBlur = 30;
  context.beginPath();
  context.moveTo(770, 65);
  context.lineTo(815, 43);
  context.lineTo(860, 65);
  context.lineTo(875, 118);
  context.lineTo(850, 165);
  context.lineTo(780, 165);
  context.lineTo(755, 118);
  context.closePath();
  context.stroke();
  context.beginPath();
  context.moveTo(770, 65);
  context.lineTo(815, 100);
  context.lineTo(860, 65);
  context.moveTo(755, 118);
  context.lineTo(815, 100);
  context.lineTo(875, 118);
  context.moveTo(780, 165);
  context.lineTo(815, 100);
  context.lineTo(850, 165);
  context.stroke();
  context.beginPath();
  context.moveTo(790, 165);
  context.lineTo(790, 292);
  context.lineTo(815, 348);
  context.lineTo(840, 292);
  context.lineTo(840, 165);
  context.moveTo(796, 292);
  context.lineTo(834, 292);
  context.stroke();

  context.shadowBlur = 18;
  context.strokeStyle = glow;
  context.fillStyle = '#dff8ff';
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(415, 385);
  context.lineTo(610, 385);
  context.moveTo(930, 385);
  context.lineTo(1125, 385);
  context.stroke();
  context.font = '800 58px Arial, sans-serif';
  context.fillText('S T U D I O S', 770, 385);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(12.4, 3.88), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  sign.name = 'BeGenius microphone lobby logo';
  sign.position.set(0, 6.8, -15.72);
  scene.add(sign);
}
addLobbyBrand();

// Release art rotates every five seconds. Playback only begins after a player click.
const screenCanvas = document.createElement('canvas');
screenCanvas.width = 1280;
screenCanvas.height = 720;
const screenContext = screenCanvas.getContext('2d');
const screenTexture = new THREE.CanvasTexture(screenCanvas);
screenTexture.colorSpace = THREE.SRGBColorSpace;
room.box('streaming wall frame', [9.2, 4.9, .28], [-5.2, 2.75, -15.93], 0x171922, { metalness: .68, roughness: .26, collider: true });
const screen = new THREE.Mesh(new THREE.PlaneGeometry(8.55, 4.25), new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false }));
screen.position.set(-5.2, 2.75, -15.74);
screen.renderOrder = 2;
scene.add(screen);
room.label('OFFICIAL RELEASE WALL', [-5.2, 5.42, -15.55], '#79c8ff', [6.4, .62]);

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

// Feature awards behind reception echo the framed platinum and academy pieces.
for (const [index, x] of [1.6, 4.45, 7.25].entries()) {
  room.box('reception feature award frame', [2.35, 3.45, .22], [x, 3.15, -15.82], 0xc5a76a, { metalness: .76, roughness: .24 });
  room.box('reception feature award mat', [2.02, 3.1, .16], [x, 3.15, -15.67], index === 1 ? 0xe4dfd1 : 0x171922, { roughness: .45 });
  if (index !== 1) {
    const disc = room.cylinder('reception platinum record', .62, .08, [x, 3.5, -15.51], index === 0 ? 0xd0b26a : 0xc9ced8, { metalness: .94, roughness: .16 });
    disc.rotation.x = Math.PI / 2;
  }
  room.label(index === 1 ? 'GRAMMY\nRECOGNITION' : 'PLATINUM\nRECORD', [x, 2.25, -15.45], '#f6e5bf', [1.72, .7]);
}

// Illuminated marble reception desk anchors the lobby like the reference studio.
const deskMarble = new THREE.MeshPhysicalMaterial({ map: marble, color: 0x343845, roughness: .22, metalness: .18, clearcoat: .82, clearcoatRoughness: .15 });
room.box('reception desk', [9.4, 1.65, 2.25], [0, .83, -9.3], 0x20232d, { material: deskMarble, collider: true });
room.box('desk blue top trim', [9.55, .12, 2.32], [0, 1.68, -9.3], 0x58c7ff, { material: blueLED });
room.box('desk blue base trim', [9.5, .12, .16], [0, .18, -8.14], 0x58c7ff, { material: blueLED });
room.label('BEGENIUS STUDIO', [0, 1.05, -8.08], '#aeeaff', [5.8, .72]);
room.label('TAMPA • ATL • THE WORLD', [0, .54, -8.05], '#ffffff', [4.4, .34]);
const receptionist = buildAvatar(room, { skin: '#815139', hairStyle: 'braids', hairColor: '#141015', shirtColor: '#171717', pantsColor: '#111111' }, [0, 0, -10.8], .88);
receptionist.rotation.y = Math.PI;
for (const x of [-14.4, -8.9]) {
  room.box('lounge sofa', [4.4, .75, 1.55], [x, .58, 7.4], 0x171922, { collider: true, roughness: .62 });
  room.box('sofa back', [4.4, 1.15, .52], [x, 1.15, 8], 0x11131a, { collider: true, roughness: .62 });
  room.box('sofa blue piping', [4.45, .08, .08], [x, .95, 7.18], 0x64cfff, { material: blueLED, cast: false });
}
room.box('lobby table', [4.8, .18, 2.2], [-11.65, .76, 3.7], 0x171922, { material: deskMarble, collider: true });
for (const x of [-13.6, -9.7]) room.box('table leg', [.22, .75, .22], [x, .38, 3.7], 0x4d5261, { metalness: .82, roughness: .22 });

// Right-side recording hallway with labeled rooms and continuous LED guidance.
room.box('hallway divider', [.32, 7.5, 19.5], [8.75, 3.75, -5.65], 0x11131a, { material: new THREE.MeshStandardMaterial({ map: wallPanels, color: 0xffffff, roughness: .68 }), collider: true });
room.box('hallway blue ceiling rail', [.12, .12, 23], [18.9, 7.72, -3.8], 0x62cfff, { material: blueLED, cast: false });
room.box('hallway purple ceiling rail', [.12, .12, 23], [9.05, 7.72, -3.8], 0xd76bff, { material: purpleLED, cast: false });
room.label('ARTISTS LIVE HERE', [13.8, 6.85, -14.9], '#f2d8ff', [6.4, .72]);
const hallwayDoors = [
  { z: 4, label: 'CONTROL ROOM' },
  { z: -1.5, label: 'PRODUCER SUITE' },
  { z: -7, label: 'RECORDING ROOM' }
];
hallwayDoors.forEach((door, index) => {
  room.box('studio hallway door', [.28, 4.8, 3.6], [19.68, 2.4, door.z], 0x090b11, { metalness: .58, roughness: .33 });
  room.box('studio door blue edge', [.32, 4.9, .11], [19.5, 2.45, door.z - 1.82], 0x5bc9ff, { material: index % 2 ? purpleLED : blueLED });
  room.label(door.label, [19.3, 5.25, door.z], index % 2 ? '#e0a5ff' : '#9cdeff', [4.1, .48]);
});
room.label('CREATE\nCOLLABORATE\nELEVATE', [8.52, 3.4, -9.6], '#ffffff', [3.25, 2.25]);

// Graphics Pass 1 — premium studio architecture and material depth.
const walnutSlat=new THREE.MeshStandardMaterial({color:0x4d3327,roughness:.68,metalness:.03});
const smokedGlass=new THREE.MeshPhysicalMaterial({color:0x486273,transparent:true,opacity:.24,roughness:.08,metalness:.08,clearcoat:1,clearcoatRoughness:.08});
const brass=new THREE.MeshStandardMaterial({color:0xc6a35a,metalness:.88,roughness:.2});

// Acoustic ceiling clouds make the lobby read like a music facility instead of a generic luxury room.
for(const z of [-10.5,-5.2,.1,5.4,10.7]){
  room.box('acoustic ceiling cloud',[8.4,.22,2.15],[-3.8,7.55,z],0x1a1d25,{roughness:.84,metalness:.04});
  room.box('ceiling cloud blue reveal',[8.05,.055,.08],[-3.8,7.39,z+1.03],0x58c9ff,{material:blueLED,cast:false});
}
for(const z of [-9,-5,-1,3,7]){
  room.box('hallway acoustic cloud',[7.3,.18,1.35],[14.25,7.42,z],0x15171d,{roughness:.88,metalness:.03});
}

// Warm walnut slat wall gives the lounge a premium studio material contrast.
for(let z=-3.6;z<=8.4;z+=.34){
  room.box('walnut acoustic slat',[.22,5.7,.17],[-19.58,3.25,z],0x4d3327,{material:walnutSlat,cast:false});
}
room.label('MUSIC IS THE BUSINESS',[-19.18,6.15,2.4],'#f5dfaa',[4.8,.58]);

// Glass-and-brass trophy case near reception.
room.box('trophy case base',[6.2,.62,1.55],[5.1,.34,9.9],0x161922,{material:deskMarble,collider:true});
for(const x of [2.15,8.05]) room.box('trophy case side',[.1,3.55,1.4],[x,2.15,9.9],0x5b7485,{material:smokedGlass});
room.box('trophy case back',[5.8,3.45,.08],[5.1,2.15,10.58],0x4d6676,{material:smokedGlass});
room.box('trophy case top',[6.1,.09,1.45],[5.1,3.9,9.9],0xb9d6e2,{material:smokedGlass});
for(const x of [3.25,5.1,6.95]){
  room.box('award pedestal',[1.15,.2,.9],[x,1.05,9.65],0x11141a,{metalness:.4,roughness:.38});
  const award=room.cylinder('display award',.38,.08,[x,2.05,9.65],0xd1b15c,{material:brass});
  award.rotation.x=Math.PI/2;
  room.cylinder('award stem',.06,1.2,[x,1.48,9.65],0xc2a15b,{material:brass});
}
room.label('BEGENIUS LEGACY',[5.1,3.45,10.48],'#f7df9c',[4.4,.5]);

// Studio diffuser blocks and a low lounge rug add texture at player eye level.
for(let row=0;row<3;row++) for(let column=0;column<7;column++){
  const depth=.15+((row*7+column)%4)*.07;
  room.box('acoustic diffuser block',[.18,.72,.56+depth],[8.49,2.55+row*.78,-12.15+column*.72],0x394553,{roughness:.82,metalness:.03});
}
room.box('premium lounge rug',[10.8,.025,6.6],[-11.8,.035,5.6],0x1a2637,{roughness:.97,cast:false});
room.box('rug inset',[9.8,.012,5.6],[-11.8,.052,5.6],0x293f59,{roughness:.96,cast:false});

// Small practical desk lights create richer pools of light without adding shadow cost.
for(const [x,z,color] of [[-13.7,3.7,0xffc774],[-9.6,3.7,0x7fcfff],[4.9,-8.2,0xe5b8ff]]){
  room.cylinder('table lamp base',.18,.08,[x,.92,z],0x9b8b72,{metalness:.66,roughness:.3});
  room.cylinder('table lamp stem',.035,.52,[x,1.2,z],0x85775f,{metalness:.72,roughness:.26});
  room.light(color,2.8,[x,1.55,z],4.5).castShadow=false;
}

// Plants and warm sconces keep the dark luxury palette from feeling gloomy.
for (const [x, z] of [[-17.2, 9.2], [-7.2, -11.4], [7.25, -11.4], [17.6, 8.6]]) {
  room.cylinder('black lobby planter', .48, .92, [x, .48, z], 0x171922, { metalness: .42, roughness: .38 });
  for (let leafIndex = 0; leafIndex < 7; leafIndex += 1) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(.2, 8, 6), room.material(0x2f764d, .78, .02));
    leaf.scale.set(.48, 2.4, .55);
    leaf.position.set(x + (leafIndex - 3) * .08, 1.38 + (leafIndex % 2) * .18, z + (leafIndex % 3 - 1) * .1);
    leaf.rotation.z = (leafIndex - 3) * .18;
    leaf.castShadow = true;
    scene.add(leaf);
  }
}
for (const [x, z] of [[-19.2, -12], [-19.2, 10], [19.2, -11], [19.2, 10]]) {
  room.box('warm wall sconce', [.16, 1.05, .22], [x, 4.6, z], 0xffdca8, { material: new THREE.MeshStandardMaterial({ color: 0xffedcf, emissive: 0xffb45b, emissiveIntensity: 2.5 }) });
  room.light(0xffc678, 4.5, [x * .96, 4.6, z], 7).castShadow = false;
}

room.box('recording entrance', [6.2, 4.7, .32], [14.6, 2.35, -14.1], 0x0e0d0b, { collider: true, metalness: .48, roughness: .34 });
room.label('RECORDING SUITE', [14.6, 4.05, -13.9], '#e7c66e', [4.7, .72]);
room.label('CREATE • RECORD • RELEASE', [14.6, 3.25, -13.88], '#ffffff', [4.5, .48]);
room.interact('ENTER RECORDING SUITE', [14.6, 1.7, -11.6], () => {
  try {
    if (window.MusicCitySoundtrack && window.MusicCitySoundtrack.pauseForSession) window.MusicCitySoundtrack.pauseForSession();
    window.dispatchEvent(new CustomEvent('mce-audio-session',{detail:{active:true,source:'begenius-recording-suite'}}));
  } catch (error) {}
  location.href = 'record_music.html?studio=begenius';
}, 3, 0xd8b765);
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
room.interact('OPEN YOUTUBE RELEASE WALL', [-5.2, 1.7, -11.6], openStreamPanel, 4.2, 0x55bfff);

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
