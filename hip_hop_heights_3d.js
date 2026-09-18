import { createRoom } from './mce_3d_room.js';

const state = window.MCE ? window.MCE.load() : { fans: 0, cash: 100, xp: 0 };
const room = createRoom({
  spawn: [0, 1.7, 38],
  background: 0x090815,
  fog: 0x17112a,
  fogDensity: .006,
  sky: 0x77699d
});
const { THREE, scene, renderer, camera } = room;
const clickables = [];

document.getElementById('fans').textContent = state.fans;
document.getElementById('cash').textContent = state.cash;
document.getElementById('xp').textContent = state.xp;

const ground = room.box('district ground', [72, .22, 92], [0, -.13, -4], 0x17151c, { roughness: .96 });
ground.receiveShadow = true;
room.box('main street', [17, .05, 90], [0, .02, -4], 0x15151a, { roughness: .96 });
for (const x of [-9.6, 9.6]) room.box('sidewalk', [3.8, .18, 90], [x, .06, -4], 0x5b5360, { roughness: .9 });
for (let z = -46; z < 40; z += 9) {
  room.box('lane light', [.15, .03, 4.4], [0, .07, z], 0xe0bd62, { metalness: .1 });
}
for (let z = -43; z <= 35; z += 13) {
  for (const x of [-11.1, 11.1]) {
    room.cylinder('street lamp pole', .08, 4.6, [x, 2.3, z], 0x24212b, { metalness: .85, roughness: .28 });
    room.light(0xffbf72, 5, [x, 4.7, z], 10).castShadow = false;
  }
}

const materials = {
  glassGold: new THREE.MeshStandardMaterial({ color: 0x80b9ff, emissive: 0x31207f, emissiveIntensity: .95, transparent: true, opacity: .42, roughness: .12, metalness: .32 }),
  glassOrange: new THREE.MeshStandardMaterial({ color: 0xff824f, emissive: 0x8d2f12, emissiveIntensity: .85, transparent: true, opacity: .58, roughness: .2 }),
  glassPurple: new THREE.MeshStandardMaterial({ color: 0xd76aff, emissive: 0x571a76, emissiveIntensity: .9, transparent: true, opacity: .56, roughness: .18 }),
  glassCyan: new THREE.MeshStandardMaterial({ color: 0x65dfff, emissive: 0x164f6c, emissiveIntensity: .9, transparent: true, opacity: .55, roughness: .17 })
};

function destinationAction(destination, name) {
  return () => {
    if (destination) {
      location.href = destination;
      return;
    }
    const toast = document.getElementById('toast');
    toast.textContent = name + ' interior is coming soon.';
    toast.classList.add('show');
    clearTimeout(window.mceToastTimer);
    window.mceToastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  };
}

function addClickable(mesh, action, name) {
  mesh.userData.action = action;
  mesh.userData.buildingName = name;
  clickables.push(mesh);
  return mesh;
}

function addStorefront(config) {
  const side = config.side;
  const xCenter = side * 23;
  const innerX = side * 15;
  const outerX = side * 31;
  const z = config.z;
  const wallMaterial = room.material(config.wall, .78, .13);
  const trimMaterial = room.material(config.trim, .36, .63);
  const action = destinationAction(config.destination, config.name);

  room.box(config.name + ' floor', [16, .25, 18], [xCenter, .05, z], config.floor, { roughness: .7 });
  room.box(config.name + ' roof', [16.5, .38, 18.5], [xCenter, 9, z], config.roof, { metalness: .25, roughness: .55 });
  room.box(config.name + ' outer wall', [.4, 9, 18], [outerX, 4.5, z], config.wall, { material: wallMaterial, collider: true });
  room.box(config.name + ' north wall', [16, 9, .4], [xCenter, 4.5, z - 9], config.wall, { material: wallMaterial, collider: true });
  room.box(config.name + ' south wall', [16, 9, .4], [xCenter, 4.5, z + 9], config.wall, { material: wallMaterial, collider: true });

  room.box(config.name + ' facade top', [.4, 3.2, 18], [innerX, 7.4, z], config.wall, { material: wallMaterial, collider: true });
  room.box(config.name + ' facade base', [.4, 1, 18], [innerX, .5, z], config.wall, { material: wallMaterial, collider: true });
  for (const offset of [-8.2, -2.5, 2.5, 8.2]) {
    room.box(config.name + ' facade column', [.48, 5.7, offset === -8.2 || offset === 8.2 ? 1.4 : .45], [innerX, 3.35, z + offset], config.trim, { material: trimMaterial, collider: true });
  }

  const glassX = innerX - side * .12;
  const leftWindow = room.box(config.name + ' display window', [.12, 4.7, 5], [glassX, 3.35, z - 5.15], config.glow, { material: config.glass });
  const rightWindow = room.box(config.name + ' display window', [.12, 4.7, 5], [glassX, 3.35, z + 5.15], config.glow, { material: config.glass });
  const door = room.box(config.name + ' entrance door', [.16, 4.9, 3.8], [glassX - side * .03, 3.25, z], config.trim, { material: new THREE.MeshStandardMaterial({ color: config.trim, emissive: config.glow, emissiveIntensity: .42, transparent: true, opacity: .78, metalness: .48, roughness: .25 }) });
  for (const mesh of [leftWindow, rightWindow, door]) addClickable(mesh, action, config.name);

  room.box(config.name + ' doorway frame top', [.5, .28, 4.2], [innerX - side * .06, 5.75, z], config.trim, { material: trimMaterial });
  for (const offset of [-2.05, 2.05]) room.box(config.name + ' doorway frame', [.5, 5, .22], [innerX - side * .06, 3.3, z + offset], config.trim, { material: trimMaterial });

  if (!config.customSign) {
    room.label(config.name.toUpperCase(), [innerX - side * .3, 7.55, z], config.label, [6.8, 1]);
    room.label('CLICK DOOR TO ENTER', [innerX - side * .36, 6.55, z], '#ffffff', [4.5, .46]);
  }

  room.interact('ENTER ' + config.name.toUpperCase(), [innerX - side * 1.35, 1.7, z], action, 3.25, config.glow);
  config.decorate({ xCenter, innerX, outerX, z, side });
  if (config.decorateExterior) config.decorateExterior({ xCenter, innerX, outerX, z, side, action, name: config.name });
}


function createBeGeniusLogoSign(position, action) {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 480;
  const context = canvas.getContext('2d');

  context.fillStyle = '#070b13';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const glow = '#73a9ff';
  context.strokeStyle = glow;
  context.lineWidth = 13;
  context.lineJoin = 'round';
  context.shadowColor = '#397cff';
  context.shadowBlur = 38;

  // BeGenius crown mark.
  context.beginPath();
  context.moveTo(625, 105);
  context.lineTo(680, 172);
  context.lineTo(753, 86);
  context.lineTo(826, 172);
  context.lineTo(884, 105);
  context.lineTo(861, 225);
  context.lineTo(648, 225);
  context.closePath();
  context.stroke();
  context.beginPath();
  context.arc(753, 58, 12, 0, Math.PI * 2);
  context.stroke();

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#eaf3ff';
  context.font = '900 118px Arial, sans-serif';
  context.fillText('BeGenius Studio', 768, 315);
  context.shadowBlur = 18;
  context.fillStyle = '#bfd7ff';
  context.font = '700 34px Arial, sans-serif';
  context.fillText('RECORD  •  CREATE  •  MIX  •  BELONG', 768, 415);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    toneMapped: false
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(14.7, 4.6), material);
  sign.name = 'illuminated BeGenius crown logo';
  sign.position.fromArray(position);
  sign.rotation.y = Math.PI / 2;
  scene.add(sign);
  addClickable(sign, action, 'BeGenius Studio');
  return sign;
}

function beGeniusExterior({ innerX, z, side, action }) {
  const facadeX = innerX - side * .42;
  const neonBlue = new THREE.MeshStandardMaterial({ color: 0xb8d8ff, emissive: 0x276dff, emissiveIntensity: 2.2, metalness: .35, roughness: .2 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x171a22, roughness: .72, metalness: .18 });

  // Deep black-stone entrance and illuminated canopy from the approved reference.
  room.box('BeGenius stone sign wall', [.62, 2.8, 16.4], [innerX - side * .12, 7.35, z], 0x11151e, { material: stone });
  room.box('BeGenius entrance canopy', [3.4, .34, 16.6], [innerX - side * 1.55, 5.82, z], 0x11131a, { metalness: .62, roughness: .28 });
  room.box('BeGenius blue canopy strip', [3.45, .1, 16.8], [innerX - side * 1.57, 5.62, z], 0x80baff, { material: neonBlue });
  for (const dz of [-5.8, -2.9, 0, 2.9, 5.8]) {
    room.cylinder('BeGenius canopy downlight', .11, .08, [innerX - side * 2.35, 5.55, z + dz], 0xeef6ff, { metalness: .7, roughness: .14 });
  }

  createBeGeniusLogoSign([facadeX - side * .08, 7.42, z], action);
  const logoLight = room.light(0x4d86ff, 9, [innerX - side * 2.6, 7.2, z], 13);
  logoLight.castShadow = false;

  // Matching service board and brand poster flank the glass entry.
  room.box('BeGenius service board', [.16, 4.55, 3.35], [facadeX - side * .06, 3.2, z - 6.35], 0x080b12, { metalness: .4, roughness: .3 });
  room.label('VOCALS\nBEATS\nMIXING\nMASTERING\nARTIST DEVELOPMENT', [facadeX - side * .18, 3.38, z - 6.35], '#c9dcff', [3.05, 3.15]);
  room.box('BeGenius quote poster', [.16, 4.45, 3.15], [facadeX - side * .06, 3.2, z + 6.35], 0x0c1018, { metalness: .35, roughness: .35 });
  room.label('Good Music\nBetter People', [facadeX - side * .18, 3.42, z + 6.35], '#d4ddff', [2.65, 1.7]);

  // Double glass-door details.
  room.box('BeGenius door divider', [.22, 4.65, .09], [facadeX - side * .08, 3.22, z], 0x1b2130, { metalness: .85, roughness: .18 });
  for (const dz of [-.72, .72]) {
    room.cylinder('BeGenius door handle', .045, 1.15, [facadeX - side * .22, 3.15, z + dz], 0xbec9dc, { metalness: .95, roughness: .12 });
  }

  // Street planters soften the entrance like the reference.
  for (const dz of [-7.35, 7.35]) {
    room.cylinder('BeGenius planter', .55, 1.45, [innerX - side * 1.35, .76, z + dz], 0x161922, { metalness: .25, roughness: .5 });
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(.2, 8, 6), room.material(0x2d6845, .82, .02));
      leaf.scale.set(.6, 2.5, .6);
      leaf.position.set(innerX - side * (1.35 + i * .05), 1.7 + (i % 2) * .22, z + dz + (i - 2) * .18);
      leaf.rotation.z = (i - 2) * .22;
      scene.add(leaf);
    }
  }
}

function plaquesInterior({ outerX, z, side }) {
  for (let i = -2; i <= 2; i++) {
    const plaque = room.box('gold record plaque', [.13, 1.25, 1.15], [outerX - side * .28, 4.2, z + i * 2.1], 0x1b1712, { metalness: .55, roughness: .35 });
    room.cylinder('gold record', .34, .06, [outerX - side * .38, 4.2, z + i * 2.1], 0xe0bd52, { metalness: .92, roughness: .2 }).rotation.z = Math.PI / 2;
  }
  room.box('BeGenius reception desk', [3, 1.25, 5.4], [-25.4, .72, z], 0x11141c, { metalness: .32, roughness: .42 });
  room.box('BeGenius reception glow', [.14, .16, 4.9], [-23.86, .7, z], 0x6f8cff, { material: new THREE.MeshStandardMaterial({ color: 0x8ab7ff, emissive: 0x3926c9, emissiveIntensity: 2 }) });
  room.label('♛', [outerX - side * .38, 3.1, z], '#e1bf57', [2.3, .85]);
  room.light(0x6e77ff, 14, [-25, 4.8, z], 13).castShadow = false;
  room.light(0xeac454, 6, [-28, 3.8, z], 10).castShadow = false;
}

function cafeInterior({ outerX, z, side }) {
  room.box('café interior stage', [3.5, .42, 7], [outerX - side * 2.15, .28, z], 0x211316, { metalness: .14, roughness: .6 });
  room.cylinder('café microphone stand', .055, 2.7, [outerX - side * 3, 1.45, z], 0x202026, { metalness: .9, roughness: .2 });
  for (const dz of [-2.5, 2.5]) room.box('café interior speaker', [1.1, 2.3, 1], [outerX - side * 1.5, 1.25, z + dz], 0x0d0b10, { metalness: .3, roughness: .48 });
  room.light(0xff7638, 12, [25, 5, z], 13).castShadow = false;
}

function warehouseInterior({ outerX, z, side }) {
  room.box('warehouse battle floor', [5.8, .08, 8], [outerX - side * 3.5, .2, z], 0x23172a, { metalness: .15, roughness: .6 });
  for (const dz of [-3.4, 3.4]) room.box('battle rail', [4.8, .12, .12], [outerX - side * 3.5, 1.15, z + dz], 0xd865ff, { metalness: .72, roughness: .25 });
  room.label('WORD SLAUGHTER', [outerX - side * .32, 4.5, z], '#dc69ff', [5.5, .8]);
  room.light(0xce55ff, 13, [-25, 4.4, z], 14).castShadow = false;
}

function recordStoreInterior({ outerX, z, side }) {
  for (const dz of [-5, -2.5, 0, 2.5, 5]) {
    room.box('record bin', [4.7, 1.25, 1.1], [outerX - side * 3.3, .75, z + dz], 0x17272d, { roughness: .55 });
    for (let i = -2; i <= 2; i++) room.box('album', [.8, .08, .75], [outerX - side * 4.3, 1.45, z + dz + i * .16], 0x5bdcf2, { metalness: .18, roughness: .4 });
  }
  room.light(0x5edcff, 12, [25, 4.5, z], 14).castShadow = false;
}

addStorefront({
  name: 'BeGenius Studio', side: -1, z: 17, destination: 'begenius_studio.html',
  wall: 0x151820, trim: 0x29344d, floor: 0x20242d, roof: 0x0b0d12, glow: 0x6f8cff,
  glass: materials.glassGold, label: '#b9d8ff', customSign: true, decorate: plaquesInterior, decorateExterior: beGeniusExterior
});
addStorefront({
  name: 'Hip-Hop Café', side: 1, z: 17, destination: 'hiphop_cafe.html',
  wall: 0x6b3326, trim: 0xff8a4f, floor: 0x3b241c, roof: 0x211418, glow: 0xff7444,
  glass: materials.glassOrange, label: '#ffc08a', decorate: cafeInterior
});
addStorefront({
  name: 'DA Warehouse', side: -1, z: -18, destination: 'warehouse.html',
  wall: 0x29212e, trim: 0x9d46b7, floor: 0x1e1922, roof: 0x111016, glow: 0xd75cff,
  glass: materials.glassPurple, label: '#e9a4ff', decorate: warehouseInterior
});
addStorefront({
  name: 'Record Store', side: 1, z: -18, destination: null,
  wall: 0x17303a, trim: 0x41a9c2, floor: 0x17252b, roof: 0x0d171b, glow: 0x55dcff,
  glass: materials.glassCyan, label: '#92ecff', decorate: recordStoreInterior
});

room.label('HIP-HOP HEIGHTS', [0, 9.2, -47], '#ffd268', [12, 1.6]);
room.label('MUSIC • CULTURE • LEGACY', [0, 7.9, -46.9], '#ffffff', [8, .65]);
room.light(0x8d55ff, 16, [0, 9, -30], 32).castShadow = false;
room.light(0xffa14f, 14, [0, 8, 20], 32).castShadow = false;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pressPoint = null;

renderer.domElement.addEventListener('pointerdown', (event) => {
  pressPoint = { x: event.clientX, y: event.clientY };
});
renderer.domElement.addEventListener('pointerup', (event) => {
  if (!pressPoint || Math.hypot(event.clientX - pressPoint.x, event.clientY - pressPoint.y) > 9) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(clickables, false)[0];
  if (hit && hit.object.userData.action) hit.object.userData.action();
});

renderer.domElement.addEventListener('pointermove', (event) => {
  if (event.buttons) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(clickables, false)[0];
  renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
  document.getElementById('aimHint').textContent = hit ? 'CLICK TO ENTER ' + hit.object.userData.buildingName.toUpperCase() : 'DRAG TO LOOK • WALK TO A STOREFRONT • CLICK ITS DOOR';
});
