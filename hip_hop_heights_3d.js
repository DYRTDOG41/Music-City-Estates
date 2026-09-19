import { createRoom } from './mce_3d_room.js';

const state = window.MCE ? window.MCE.load() : { fans: 0, cash: 100, xp: 0 };
const room = createRoom({
  spawn: [0, 1.7, 38],
  background: 0x8ecdf4,
  fog: 0xb8d8e8,
  fogDensity: .0018,
  sky: 0xd9efff
});
const { THREE, scene, renderer, camera } = room;
const clickables = [];
const streetLamps = [];

// Centralized block dimensions keep the district mesh-ready. New GLB buildings can
// replace any procedural shell without moving its door, collider, or interaction.
const LAYOUT = Object.freeze({
  groundWidth: 84,
  blockLength: 108,
  roadWidth: 22,
  sidewalkWidth: 4.8,
  sidewalkCenterX: 13.6,
  curbX: 11.15,
  lampX: 15.2,
  facadeX: 18.5,
  lotCenterX: 27,
  lotOuterX: 35.5,
  lotWidth: 17,
  northVenueZ: 21,
  southVenueZ: -21
});

scene.userData.buildingSlots = [];

// Hip-Hop Heights now reads as a bright late-afternoon district instead of a dark room.
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;
renderer.outputColorSpace = THREE.SRGBColorSpace;
scene.children.forEach((child) => {
  if (child.isHemisphereLight) child.intensity = 1.08;
});
const sun = new THREE.DirectionalLight(0xffefd2, 3.15);
sun.position.set(18, 32, 24);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -48;
sun.shadow.camera.right = 48;
sun.shadow.camera.top = 52;
sun.shadow.camera.bottom = -52;
scene.add(sun);
const ambient = new THREE.AmbientLight(0xbcd7ea, .34);
scene.add(ambient);

document.getElementById('fans').textContent = state.fans;
document.getElementById('cash').textContent = state.cash;
document.getElementById('xp').textContent = state.xp;

function canvasTexture(draw, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  draw(context, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function masonryTexture(base, mortar, accent) {
  return canvasTexture((context, width, height) => {
    context.fillStyle = base;
    context.fillRect(0, 0, width, height);
    for (let y = 0; y < height; y += 48) {
      const offset = (y / 48) % 2 ? 44 : 0;
      context.strokeStyle = mortar;
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
      for (let x = -offset; x < width; x += 88) {
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x, y + 48);
        context.stroke();
      }
    }
    context.globalAlpha = .18;
    for (let i = 0; i < 180; i++) {
      context.fillStyle = i % 3 ? '#ffffff' : accent;
      context.fillRect((i * 97) % width, (i * 53) % height, 2 + (i % 4), 2 + (i % 3));
    }
    context.globalAlpha = 1;
  }, 2.2, 2.2);
}

function bumpFrom(texture, repeatX = texture.repeat.x, repeatY = texture.repeat.y) {
  const bump = texture.clone();
  bump.colorSpace = THREE.NoColorSpace;
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(repeatX, repeatY);
  bump.needsUpdate = true;
  return bump;
}

function realisticSurface(map, options = {}) {
  return new THREE.MeshStandardMaterial({
    map,
    bumpMap: bumpFrom(map),
    bumpScale: options.bumpScale ?? .065,
    color: options.color ?? 0xffffff,
    roughness: options.roughness ?? .78,
    metalness: options.metalness ?? .04
  });
}

const asphaltTexture = canvasTexture((context, width, height) => {
  context.fillStyle = '#343840';
  context.fillRect(0, 0, width, height);
  for (let i = 0; i < 900; i++) {
    const shade = 42 + (i % 6) * 5;
    context.fillStyle = `rgb(${shade},${shade + 1},${shade + 4})`;
    context.fillRect((i * 73) % width, (i * 151) % height, 2, 2);
  }
}, 5, 8);
const concreteTexture = canvasTexture((context, width, height) => {
  context.fillStyle = '#aaa9a6';
  context.fillRect(0, 0, width, height);
  context.strokeStyle = '#77797b';
  context.lineWidth = 4;
  for (let x = 0; x <= width; x += 128) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
  context.globalAlpha = .2;
  for (let i = 0; i < 240; i++) { context.fillStyle = i % 2 ? '#fff' : '#353535'; context.fillRect((i * 61) % width, (i * 109) % height, 2, 2); }
  context.globalAlpha = 1;
}, 2, 10);

const ground = room.box('district ground', [LAYOUT.groundWidth, .22, LAYOUT.blockLength], [0, -.13, -4], 0x5e6670, { roughness: .96 });
ground.receiveShadow = true;
ground.material.map = concreteTexture;
ground.material.bumpMap = bumpFrom(concreteTexture);
ground.material.bumpScale = .045;
ground.material.needsUpdate = true;
room.box('main street', [LAYOUT.roadWidth, .05, LAYOUT.blockLength - 2], [0, .02, -4], 0x343840, { material: realisticSurface(asphaltTexture, { roughness: .92, bumpScale: .035 }) });
for (const x of [-LAYOUT.sidewalkCenterX, LAYOUT.sidewalkCenterX]) room.box('wide pedestrian sidewalk', [LAYOUT.sidewalkWidth, .18, LAYOUT.blockLength - 2], [x, .06, -4], 0xb5b4af, { material: realisticSurface(concreteTexture, { roughness: .82, bumpScale: .05 }) });
for (const x of [-LAYOUT.curbX, LAYOUT.curbX]) room.box('raised street curb', [.28, .3, LAYOUT.blockLength - 2], [x, .18, -4], 0x8d8d89, { material: realisticSurface(concreteTexture, { roughness: .86, bumpScale: .04 }) });
for (let z = -53; z < 48; z += 9) {
  room.box('lane light', [.15, .03, 4.4], [0, .07, z], 0xe0bd62, { metalness: .1 });
}
for (const x of [-9.3, 9.3]) room.box('road edge line', [.13, .026, LAYOUT.blockLength - 4], [x, .066, -4], 0xe8e4d8, { roughness: .9, cast: false });
for (let z = -49; z <= 43; z += 14) {
  for (const x of [-LAYOUT.lampX, LAYOUT.lampX]) {
    room.cylinder('street lamp pole', .08, 4.6, [x, 2.3, z], 0x24212b, { metalness: .85, roughness: .28 });
    const lamp = room.light(0xffd9a0, 2.6, [x, 4.7, z], 11);
    lamp.castShadow = false;
    streetLamps.push(lamp);
  }
}

const materials = {
  glassGold: new THREE.MeshPhysicalMaterial({ color: 0x79b5c9, emissive: 0x06344a, emissiveIntensity: .24, transparent: true, opacity: .48, roughness: .08, metalness: .08, clearcoat: .8, clearcoatRoughness: .08 }),
  glassOrange: new THREE.MeshPhysicalMaterial({ color: 0xa66c52, emissive: 0x3d1309, emissiveIntensity: .2, transparent: true, opacity: .52, roughness: .12, clearcoat: .72 }),
  glassPurple: new THREE.MeshPhysicalMaterial({ color: 0x775b80, emissive: 0x240d2c, emissiveIntensity: .2, transparent: true, opacity: .5, roughness: .12, clearcoat: .72 }),
  glassCyan: new THREE.MeshPhysicalMaterial({ color: 0x5c8791, emissive: 0x092a34, emissiveIntensity: .18, transparent: true, opacity: .5, roughness: .1, clearcoat: .75 }),
  upperGlass: new THREE.MeshPhysicalMaterial({ color: 0x30444c, roughness: .13, metalness: .16, transparent: true, opacity: .78, clearcoat: .82, clearcoatRoughness: .1 })
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

function createStorefrontSign(text, position, side, color, action, name) {
  const canvas = document.createElement('canvas');
  canvas.width = 1400;
  canvas.height = 300;
  const context = canvas.getContext('2d');
  context.fillStyle = '#10151ddd';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = color;
  context.lineWidth = 13;
  context.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '900 112px Arial Black, Arial, sans-serif';
  context.shadowColor = color;
  context.shadowBlur = 24;
  context.fillStyle = '#ffffff';
  context.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2 + 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 1.58), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true, toneMapped: false }));
  sign.position.fromArray(position);
  sign.rotation.y = Math.PI / 2;
  scene.add(sign);
  addClickable(sign, action, name);
  return sign;
}

function addStorefront(config) {
  const side = config.side;
  const xCenter = side * LAYOUT.lotCenterX;
  const innerX = side * LAYOUT.facadeX;
  const outerX = side * LAYOUT.lotOuterX;
  const z = config.z;
  const wallMaterial = realisticSurface(config.texture, { roughness: .84, metalness: .025, bumpScale: .085 });
  const trimMaterial = room.material(config.trim, .48, .48);
  const action = destinationAction(config.destination, config.name);

  const slot = { name: config.name, side, position: [xCenter, 0, z], facadeX: innerX, entrance: [innerX - side * 1.35, 1.7, z], destination: config.destination, assetUrl: config.assetUrl || null };
  scene.userData.buildingSlots.push(slot);
  const anchor = new THREE.Group();
  anchor.name = config.name + ' mesh anchor';
  anchor.position.set(xCenter, 0, z);
  anchor.userData.buildingSlot = slot;
  scene.add(anchor);

  room.box(config.name + ' floor', [LAYOUT.lotWidth, .25, 18], [xCenter, .05, z], config.floor, { roughness: .7 });
  room.box(config.name + ' outer wall', [.4, 9, 18], [outerX, 4.5, z], config.wall, { material: wallMaterial, collider: true });
  room.box(config.name + ' north wall', [16, 9, .4], [xCenter, 4.5, z - 9], config.wall, { material: wallMaterial, collider: true });
  room.box(config.name + ' south wall', [16, 9, .4], [xCenter, 4.5, z + 9], config.wall, { material: wallMaterial, collider: true });

  if (config.signatureProfile) {
    // A stepped roofline keeps the flagship studio from reading as one big rectangle.
    room.box(config.name + ' center roof', [16.5, .38, 7.2], [xCenter, 9.75, z], config.roof, { metalness: .25, roughness: .55 });
    room.box(config.name + ' north wing roof', [16.5, .38, 5.7], [xCenter, 8.65, z - 6.15], config.roof, { metalness: .25, roughness: .55 });
    room.box(config.name + ' south wing roof', [16.5, .38, 5.7], [xCenter, 8.65, z + 6.15], config.roof, { metalness: .25, roughness: .55 });
  } else {
    room.box(config.name + ' roof', [16.5, .38, 18.5], [xCenter, 9, z], config.roof, { metalness: .25, roughness: .55 });
    room.box(config.name + ' roof parapet', [.65, .72, 18.6], [innerX, 9.22, z], config.wall, { material: wallMaterial });
    room.box(config.name + ' stone base course', [.72, .62, 18.15], [innerX - side * .12, .44, z], 0x777879, { roughness: .86, metalness: .02 });
    room.box(config.name + ' facade shadow line', [.65, .16, 18.25], [innerX - side * .1, 5.93, z], 0x24272b, { roughness: .62, metalness: .24 });

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

    // Window mullions, sill blocks and an awning give every shop real storefront depth.
    for (const windowOffset of [-5.15, 5.15]) {
      room.box(config.name + ' window mullion', [.28, 4.7, .12], [innerX - side * .22, 3.35, z + windowOffset], config.trim, { material: trimMaterial });
      room.box(config.name + ' window sill', [.72, .22, 5.1], [innerX - side * .34, 1.02, z + windowOffset], config.trim, { material: trimMaterial });
    }
    room.box(config.name + ' storefront awning', [2.25, .3, 15.5], [innerX - side * 1.02, 6.18, z], config.trim, { material: trimMaterial });

    for (const upperOffset of [-5.9, 5.9]) {
      room.box(config.name + ' upper window', [.12, 1.35, 2.65], [innerX - side * .24, 7.75, z + upperOffset], 0x30444c, { material: materials.upperGlass });
      room.box(config.name + ' upper window lintel', [.52, .18, 2.92], [innerX - side * .17, 8.52, z + upperOffset], 0x494d50, { metalness: .3, roughness: .58 });
      room.box(config.name + ' upper window sill', [.58, .2, 2.92], [innerX - side * .2, 6.98, z + upperOffset], 0x6d7071, { roughness: .72 });
    }

    // Rooftop utilities, rainwater pipe and service boxes break the perfect block silhouette.
    room.box(config.name + ' rooftop HVAC', [3.4, 1.15, 2.7], [xCenter, 9.68, z - 3.8], 0x72777b, { metalness: .58, roughness: .52 });
    for (const vent of [-.85, 0, .85]) room.box(config.name + ' HVAC vent', [3.45, .1, .12], [xCenter - side * 1.73, 9.68, z - 3.8 + vent], 0x34393d, { metalness: .72, roughness: .4 });
    room.cylinder(config.name + ' rain downspout', .09, 8.1, [innerX - side * .3, 4.05, z + 8.45], 0x565b5f, { metalness: .72, roughness: .38 });
    room.box(config.name + ' utility box', [.45, 1.2, 1.45], [innerX - side * .28, 1.55, z + 7.3], 0x596067, { metalness: .55, roughness: .56 });

    room.box(config.name + ' doorway frame top', [.5, .28, 4.2], [innerX - side * .06, 5.75, z], config.trim, { material: trimMaterial });
    for (const offset of [-2.05, 2.05]) room.box(config.name + ' doorway frame', [.5, 5, .22], [innerX - side * .06, 3.3, z + offset], config.trim, { material: trimMaterial });

    if (!config.customSign) {
      createStorefrontSign(config.name, [innerX - side * .25, 7.6, z], side, config.label, action, config.name);
      room.label('CLICK DOOR TO ENTER', [innerX - side * .5, 6.55, z], '#ffffff', [4.5, .46]);
    }
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

  context.fillStyle = '#05090f';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const glow = '#5ed9ff';
  const edge = '#d8f8ff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.shadowColor = '#159cff';
  context.shadowBlur = 34;

  // Approved B Genius wordmark treatment: black varsity letters with electric-blue neon edge.
  context.font = '900 150px Impact, Arial Black, sans-serif';
  context.lineWidth = 10;
  context.strokeStyle = glow;
  context.fillStyle = '#05080d';
  context.strokeText('BEGEN', 540, 205);
  context.fillText('BEGEN', 540, 205);
  context.strokeText('US', 1115, 205);
  context.fillText('US', 1115, 205);

  // Faceted microphone mark replaces the I in BEGENIUS.
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

  // STUDIOS lockup and horizontal neon rules.
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
  context.letterSpacing = '8px';
  context.fillText('S T U D I O S', 770, 385);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    toneMapped: false
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 3.4), material);
  sign.name = 'illuminated BeGenius microphone logo';
  sign.position.fromArray(position);
  sign.rotation.y = Math.PI / 2;
  scene.add(sign);
  addClickable(sign, action, 'BeGenius Studio');
  return sign;
}

function beGeniusExterior({ innerX, z, side, action }) {
  const frontX = innerX - side * .62;
  const recessedX = innerX + side * 1.15;
  const neonBlue = new THREE.MeshStandardMaterial({
    color: 0xc8f5ff,
    emissive: 0x159dff,
    emissiveIntensity: 2.35,
    metalness: .4,
    roughness: .18
  });
  const studioStoneTexture = masonryTexture('#25384a', '#111c27', '#55bff0');
  const stone = realisticSurface(studioStoneTexture, { roughness: .74, metalness: .04, bumpScale: .09 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x111722, roughness: .32, metalness: .74 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x7fe3ff,
    emissive: 0x0a5479,
    emissiveIntensity: .62,
    transparent: true,
    opacity: .34,
    roughness: .12,
    metalness: .22
  });

  // Stepped flagship silhouette: tall center tower with lower side wings.
  room.box('BeGenius center tower', [.9, 5.05, 10.2], [frontX, 7.45, z], 0x0b111a, { material: stone, collider: true });
  room.box('BeGenius left wing cap', [.72, 2.35, 3.25], [innerX, 7.15, z - 6.65], 0x0a0f16, { material: stone, collider: true });
  room.box('BeGenius right wing cap', [.72, 2.35, 3.25], [innerX, 7.15, z + 6.65], 0x0a0f16, { material: stone, collider: true });

  // Vertical light fins emphasize height rather than a flat horizontal box.
  for (const dz of [-5.2, 5.2]) {
    room.box('BeGenius vertical neon fin', [.34, 7.1, .16], [frontX - side * .08, 4.35, z + dz], 0x7ddcff, { material: neonBlue });
  }
  room.box('BeGenius tower crown line', [.24, .14, 10.6], [frontX - side * .08, 9.92, z], 0x7ddcff, { material: neonBlue });

  // Recessed center entrance creates real architectural depth.
  const entryBack = room.box('BeGenius recessed glass lobby', [.14, 5.15, 6.35], [recessedX, 3.25, z], 0x6bdcff, { material: glass });
  addClickable(entryBack, action, 'BeGenius Studio');

  // Angled glass wings funnel the player toward the doors.
  for (const direction of [-1, 1]) {
    const wing = room.box(
      'BeGenius angled glass wing',
      [.16, 4.95, 4.45],
      [innerX - side * .18, 3.25, z + direction * 5.05],
      0x6bdcff,
      { material: glass }
    );
    wing.rotation.y = direction * side * .12;
    addClickable(wing, action, 'BeGenius Studio');

    const wingFrame = room.box(
      'BeGenius angled wing frame',
      [.42, 5.25, .28],
      [frontX, 3.4, z + direction * 7.45],
      0x172335,
      { material: darkMetal, collider: true }
    );
    wingFrame.rotation.y = direction * side * .08;
  }

  // Double doors sit deeper than the front columns.
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0x9deaff,
    emissive: 0x0b6c9f,
    emissiveIntensity: .55,
    transparent: true,
    opacity: .42,
    metalness: .34,
    roughness: .16
  });
  for (const dz of [-1.05, 1.05]) {
    const door = room.box('BeGenius recessed entrance door', [.18, 4.75, 2.02], [recessedX - side * .06, 3.05, z + dz], 0x8ce7ff, { material: doorMaterial });
    addClickable(door, action, 'BeGenius Studio');
    room.cylinder('BeGenius door pull', .045, 1.25, [recessedX - side * .18, 3.05, z + dz + (dz < 0 ? .5 : -.5)], 0xc7f3ff, { metalness: .95, roughness: .1 });
  }
  room.box('BeGenius center door mullion', [.28, 4.9, .12], [recessedX - side * .08, 3.1, z], 0x172335, { material: darkMetal });

  // Projecting center canopy plus two shorter wing canopies.
  room.box('BeGenius center canopy', [3.8, .3, 10.1], [frontX - side * 1.52, 5.82, z], 0x0b1119, { material: darkMetal });
  room.box('BeGenius center canopy light', [3.82, .1, 10.15], [frontX - side * 1.54, 5.62, z], 0x82e4ff, { material: neonBlue });
  for (const direction of [-1, 1]) {
    const sideCanopy = room.box('BeGenius wing canopy', [2.35, .22, 3.45], [innerX - side * .8, 5.35, z + direction * 6.35], 0x0a0f16, { material: darkMetal });
    sideCanopy.rotation.y = direction * side * .06;
  }

  for (const dz of [-3.7, -1.85, 0, 1.85, 3.7]) {
    room.cylinder('BeGenius canopy downlight', .105, .08, [frontX - side * 2.2, 5.53, z + dz], 0xf2fbff, { metalness: .72, roughness: .12 });
  }

  // The approved microphone wordmark now sits on the raised center tower.
  // Keep the sign just in front of the tower so it cannot disappear inside the wall.
  createBeGeniusLogoSign([frontX - side * .58, 7.9, z], action);
  const logoLight = room.light(0x36baff, 11, [frontX - side * 2.8, 7.55, z], 15);
  logoLight.castShadow = false;

  // Architectural side pylons and display boards break up the flat facade.
  for (const direction of [-1, 1]) {
    room.cylinder('BeGenius round entry column', .34, 6.55, [frontX - side * .08, 3.3, z + direction * 8.05], 0x152131, { metalness: .72, roughness: .28 });
  }

  room.box('BeGenius service board', [.18, 4.35, 2.7], [frontX - side * .05, 3.15, z - 6.55], 0x070b11, { material: darkMetal });
  room.label('VOCALS\nBEATS\nMIXING\nMASTERING', [frontX - side * .18, 3.3, z - 6.55], '#c9efff', [2.35, 2.65]);

  room.box('BeGenius quote poster', [.18, 4.35, 2.7], [frontX - side * .05, 3.15, z + 6.55], 0x070b11, { material: darkMetal });
  room.label('Good Music\nBetter People', [frontX - side * .18, 3.35, z + 6.55], '#d8f8ff', [2.25, 1.55]);

  // Tapered landscaping and low benches soften the corners.
  for (const direction of [-1, 1]) {
    room.box('BeGenius low bench', [1.25, .48, 2.55], [frontX - side * 1.2, .34, z + direction * 6.25], 0x171d27, { metalness: .18, roughness: .58 });
    room.cylinder('BeGenius planter', .62, 1.35, [frontX - side * 1.65, .72, z + direction * 7.45], 0x161d27, { metalness: .25, roughness: .5 });
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(.2, 8, 6), room.material(0x2f6f49, .82, .02));
      leaf.scale.set(.55, 2.5, .58);
      leaf.position.set(frontX - side * (1.65 + i * .035), 1.58 + (i % 2) * .2, z + direction * 7.45 + (i - 2.5) * .17);
      leaf.rotation.z = (i - 2.5) * .18;
      scene.add(leaf);
    }
  }
}

function cafeExterior({ innerX, z, side }) {
  const frontX = innerX - side * .62;
  const warmMetal = new THREE.MeshStandardMaterial({ color: 0x3c1711, roughness: .42, metalness: .5 });
  const amberGlass = new THREE.MeshPhysicalMaterial({ color: 0xff9d62, emissive: 0x5d1f0a, emissiveIntensity: .4, transparent: true, opacity: .5, roughness: .1, clearcoat: .75 });

  // A deep café canopy, corner columns and rooftop lantern make this venue read
  // as a performance lounge instead of another rectangular retail shell.
  const canopy = room.box('café deep street canopy', [2.8, .34, 13.8], [frontX - side * 1.45, 5.95, z], 0x3c1711, { material: warmMetal });
  canopy.rotation.z = side * -.035;
  room.box('café canopy glow', [2.82, .09, 13.9], [frontX - side * 1.47, 5.75, z], 0xffa168, { material: new THREE.MeshStandardMaterial({ color: 0xffd1a6, emissive: 0xff6d2d, emissiveIntensity: 2.2 }) });
  for (const dz of [-7.25, 7.25]) {
    room.cylinder('café rounded brick column', .48, 6.15, [frontX, 3.08, z + dz], 0x703424, { roughness: .76, metalness: .02 });
  }
  room.box('café rooftop lantern', [2.8, 2.1, 5.2], [innerX + side * .1, 9.85, z], 0x2b1412, { material: warmMetal });
  room.box('café rooftop lantern glass', [.18, 1.35, 4.15], [frontX - side * .1, 9.9, z], 0xff9d62, { material: amberGlass });
  room.label('LIVE MUSIC • OPEN MIC', [frontX - side * .35, 4.95, z], '#ffd0a2', [5.7, .55]);
}

function warehouseExterior({ innerX, z, side }) {
  const frontX = innerX - side * .64;
  const steel = new THREE.MeshStandardMaterial({ color: 0x25212b, roughness: .5, metalness: .62 });
  const door = room.box('warehouse rolling battle door', [.2, 5.9, 8.4], [frontX - side * .08, 3.05, z], 0x17141b, { material: steel });
  for (let y = .55; y < 5.7; y += .42) {
    room.box('warehouse rolling door slat', [.24, .055, 8.45], [frontX - side * .12, y, z], 0x5d5264, { metalness: .68, roughness: .44 });
  }
  room.box('warehouse loading lintel', [1.5, .55, 10.1], [frontX - side * .58, 6.25, z], 0x17141b, { material: steel });
  for (const dz of [-7.7, 7.7]) {
    room.box('warehouse structural pier', [1.05, 8.5, 1.05], [frontX, 4.25, z + dz], 0x332b38, { material: steel, collider: true });
    room.light(0xda79ff, 5.5, [frontX - side * 1.15, 6.65, z + dz], 8).castShadow = false;
  }
  for (const dz of [-5.2, 0, 5.2]) {
    const roofMonitor = room.box('warehouse sawtooth roof monitor', [4.3, 1.35, 3.6], [innerX + side * 4.1, 9.65 + (dz === 0 ? .5 : 0), z + dz], 0x2b2630, { material: steel });
    roofMonitor.rotation.z = side * .09;
  }
  room.label('WORD SLAUGHTER • BATTLE ENTRANCE', [frontX - side * .38, 7.35, z], '#e7a2ff', [7.1, .62]);
  door.userData.industrialEntrance = true;
}

function recordStoreExterior({ innerX, z, side }) {
  const frontX = innerX - side * .62;
  const cyanMetal = new THREE.MeshStandardMaterial({ color: 0x18333e, roughness: .35, metalness: .68 });
  const neon = new THREE.MeshStandardMaterial({ color: 0xc7f8ff, emissive: 0x21bce8, emissiveIntensity: 2.45, roughness: .18, metalness: .3 });

  room.box('record store corner marquee', [2.5, .3, 14.2], [frontX - side * 1.3, 5.95, z], 0x18333e, { material: cyanMetal });
  for (const dz of [-6.7, 6.7]) room.cylinder('record store rounded corner', .44, 6.1, [frontX, 3.05, z + dz], 0x214b58, { roughness: .55, metalness: .35 });
  const vinyl = room.cylinder('record store giant vinyl sign', 1.6, .22, [frontX - side * .3, 8.15, z], 0x101216, { roughness: .32, metalness: .55 });
  vinyl.rotation.z = Math.PI / 2;
  const label = room.cylinder('record store vinyl label', .58, .25, [frontX - side * .46, 8.15, z], 0x59dbf4, { roughness: .32, metalness: .42 });
  label.rotation.z = Math.PI / 2;
  room.cylinder('record store vinyl spindle', .11, .28, [frontX - side * .62, 8.15, z], 0xeafcff, { roughness: .2, metalness: .8 }).rotation.z = Math.PI / 2;
  for (const dz of [-5.4, 5.4]) room.box('record store neon window fin', [.28, 5.1, .14], [frontX - side * .22, 3.35, z + dz], 0x8beaff, { material: neon });
  room.label('VINYL • DROPS • LISTENING BAR', [frontX - side * .38, 4.95, z], '#a7efff', [6.2, .54]);
}

function plaquesInterior({ outerX, z, side }) {
  for (let i = -2; i <= 2; i++) {
    const plaque = room.box('gold record plaque', [.13, 1.25, 1.15], [outerX - side * .28, 4.2, z + i * 2.1], 0x1b1712, { metalness: .55, roughness: .35 });
    room.cylinder('gold record', .34, .06, [outerX - side * .38, 4.2, z + i * 2.1], 0xe0bd52, { metalness: .92, roughness: .2 }).rotation.z = Math.PI / 2;
  }
  const deskX = outerX - side * 10.1;
  room.box('BeGenius reception desk', [3, 1.25, 5.4], [deskX, .72, z], 0x11141c, { metalness: .32, roughness: .42 });
  room.box('BeGenius reception glow', [.14, .16, 4.9], [deskX - side * 1.54, .7, z], 0x6f8cff, { material: new THREE.MeshStandardMaterial({ color: 0x8ab7ff, emissive: 0x3926c9, emissiveIntensity: 2 }) });
  room.label('BEGENIUS', [outerX - side * .38, 3.1, z], '#7fdcff', [3.2, .68]);
  room.light(0x6e77ff, 14, [deskX, 4.8, z], 13).castShadow = false;
  room.light(0xeac454, 6, [xCenterForSide(side), 3.8, z], 10).castShadow = false;
}

function xCenterForSide(side) {
  return side * LAYOUT.lotCenterX;
}

function cafeInterior({ outerX, z, side, xCenter }) {
  room.box('café interior stage', [3.5, .42, 7], [outerX - side * 2.15, .28, z], 0x211316, { metalness: .14, roughness: .6 });
  room.cylinder('café microphone stand', .055, 2.7, [outerX - side * 3, 1.45, z], 0x202026, { metalness: .9, roughness: .2 });
  for (const dz of [-2.5, 2.5]) room.box('café interior speaker', [1.1, 2.3, 1], [outerX - side * 1.5, 1.25, z + dz], 0x0d0b10, { metalness: .3, roughness: .48 });
  room.light(0xff7638, 12, [xCenter, 5, z], 13).castShadow = false;
}

function warehouseInterior({ outerX, z, side, xCenter }) {
  room.box('warehouse battle floor', [5.8, .08, 8], [outerX - side * 3.5, .2, z], 0x23172a, { metalness: .15, roughness: .6 });
  for (const dz of [-3.4, 3.4]) room.box('battle rail', [4.8, .12, .12], [outerX - side * 3.5, 1.15, z + dz], 0xd865ff, { metalness: .72, roughness: .25 });
  room.label('WORD SLAUGHTER', [outerX - side * .32, 4.5, z], '#dc69ff', [5.5, .8]);
  room.light(0xce55ff, 13, [xCenter, 4.4, z], 14).castShadow = false;
}

function recordStoreInterior({ outerX, z, side, xCenter }) {
  for (const dz of [-5, -2.5, 0, 2.5, 5]) {
    room.box('record bin', [4.7, 1.25, 1.1], [outerX - side * 3.3, .75, z + dz], 0x17272d, { roughness: .55 });
    for (let i = -2; i <= 2; i++) room.box('album', [.8, .08, .75], [outerX - side * 4.3, 1.45, z + dz + i * .16], 0x5bdcf2, { metalness: .18, roughness: .4 });
  }
  room.light(0x5edcff, 12, [xCenter, 4.5, z], 14).castShadow = false;
}

addStorefront({
  name: 'BeGenius Studio', side: -1, z: LAYOUT.northVenueZ, destination: 'begenius_studio.html',
  wall: 0x090d14, trim: 0x2fb7ff, floor: 0x161c24, roof: 0x05070b, glow: 0x43c7ff,
  texture: masonryTexture('#263b4d', '#101b25', '#59caff'),
  glass: materials.glassGold, label: '#d8f8ff', customSign: true, signatureProfile: true, decorate: plaquesInterior, decorateExterior: beGeniusExterior
});
addStorefront({
  name: 'Hip-Hop Café', side: 1, z: LAYOUT.northVenueZ, destination: 'hiphop_cafe.html',
  wall: 0x6b3326, trim: 0xff8a4f, floor: 0x3b241c, roof: 0x211418, glow: 0xff7444,
  texture: masonryTexture('#9a513b', '#57281f', '#ffc08a'),
  glass: materials.glassOrange, label: '#ffc08a', decorate: cafeInterior, decorateExterior: cafeExterior
});
addStorefront({
  name: 'DA Warehouse', side: -1, z: LAYOUT.southVenueZ, destination: 'warehouse.html',
  wall: 0x29212e, trim: 0x9d46b7, floor: 0x1e1922, roof: 0x111016, glow: 0xd75cff,
  texture: masonryTexture('#55435c', '#261d2b', '#e9a4ff'),
  glass: materials.glassPurple, label: '#e9a4ff', decorate: warehouseInterior, decorateExterior: warehouseExterior
});
addStorefront({
  name: 'Record Store', side: 1, z: LAYOUT.southVenueZ, destination: null,
  wall: 0x17303a, trim: 0x41a9c2, floor: 0x17252b, roof: 0x0d171b, glow: 0x55dcff,
  texture: masonryTexture('#376674', '#17333b', '#92ecff'),
  glass: materials.glassCyan, label: '#92ecff', decorate: recordStoreInterior, decorateExterior: recordStoreExterior
});

// Street furniture, trees and art make the district feel inhabited in daylight.
for (const z of [-45, -32, -8, 5, 33, 44]) {
  const side = (Math.abs(z) % 2 ? -1 : 1);
  const x = side * 15.35;
  room.cylinder('tree trunk', .2, 2.25, [x, 1.15, z], 0x6f4326, { roughness: .92 });
  for (const y of [2.35, 2.9, 3.42]) {
    const crown = new THREE.Mesh(new THREE.SphereGeometry(.9 - (y - 2.35) * .12, 12, 9), room.material(0x3c8b52, .88, .01));
    crown.position.set(x, y, z);
    crown.scale.set(1.15, .75, 1.05);
    crown.castShadow = true;
    scene.add(crown);
  }
  room.box('street bench', [1.45, .18, 3.2], [-side * 14.6, .55, z + 2.4], 0x704b31, { roughness: .68, metalness: .06 });
}

for (const z of [-47, -33, -8, 8, 35]) {
  room.box('crosswalk stripe', [20.6, .025, .52], [0, .062, z], 0xf2ede0, { roughness: .88, cast: false });
}

// Street wear and municipal details keep the road from reading as a clean game board.
for (const [x, z] of [[-8.7, -40], [8.8, -12], [-8.6, 15], [8.7, 39]]) {
  room.box('storm drain frame', [1.15, .035, .62], [x, .075, z], 0x25282b, { metalness: .76, roughness: .48, cast: false });
  for (let slot = -.42; slot <= .42; slot += .21) room.box('storm drain slot', [.055, .02, .5], [x + slot, .097, z], 0x08090a, { metalness: .4, roughness: .7, cast: false });
}
for (const [x, z] of [[-2.8, -24], [3.4, 20]]) {
  const cover = room.cylinder('manhole cover', .72, .035, [x, .09, z], 0x34383b, { metalness: .72, roughness: .55 });
  for (let radius = .2; radius <= .55; radius += .18) {
    const groove = new THREE.Mesh(new THREE.TorusGeometry(radius, .018, 6, 30), new THREE.MeshBasicMaterial({ color: 0x111315 }));
    groove.rotation.x = Math.PI / 2;
    groove.position.set(x, .115, z);
    scene.add(groove);
  }
}

function addTrashCan(x, z) {
  const can = room.cylinder('street trash can', .42, 1.05, [x, .58, z], 0x343a3d, { metalness: .68, roughness: .5 });
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
    room.box('trash can slat', [.06, .88, .06], [x + Math.cos(angle) * .39, .58, z + Math.sin(angle) * .39], 0x171a1c, { metalness: .62, roughness: .5 });
  }
  room.cylinder('trash can rim', .48, .09, [x, 1.12, z], 0x1f2325, { metalness: .78, roughness: .42 });
  return can;
}
addTrashCan(-14.5, -29);
addTrashCan(14.5, 10);

function addHydrant(x, z) {
  room.cylinder('fire hydrant body', .22, .92, [x, .52, z], 0xb63d32, { metalness: .36, roughness: .5 });
  room.cylinder('fire hydrant bonnet', .31, .16, [x, 1.02, z], 0xc44a3d, { metalness: .36, roughness: .48 });
  const sideCap = room.cylinder('fire hydrant side cap', .15, .48, [x, .62, z], 0x9f332c, { metalness: .42, roughness: .44 });
  sideCap.rotation.z = Math.PI / 2;
}
addHydrant(14.4, -39);

function addParkedCar(x, z, color) {
  const paint = new THREE.MeshPhysicalMaterial({ color, roughness: .24, metalness: .32, clearcoat: .8, clearcoatRoughness: .15 });
  room.box('parked car body', [2.15, .72, 4.15], [x, .66, z], color, { material: paint });
  const cabin = room.box('parked car cabin', [1.75, .72, 2.05], [x, 1.31, z - .2], color, { material: paint });
  cabin.scale.x = .88;
  const windshield = new THREE.MeshStandardMaterial({ color: 0x29404b, roughness: .12, metalness: .18, transparent: true, opacity: .72 });
  room.box('parked car windshield', [1.58, .56, .08], [x, 1.35, z + .86], 0x29404b, { material: windshield });
  for (const dx of [-1.05, 1.05]) for (const dz of [-1.35, 1.35]) {
    const wheel = room.cylinder('parked car wheel', .34, .24, [x + dx, .42, z + dz], 0x111214, { metalness: .12, roughness: .88 });
    wheel.rotation.z = Math.PI / 2;
  }
  for (const dz of [-2.1, 2.1]) room.box('car bumper', [1.92, .18, .16], [x, .52, z + dz], 0x2d3033, { metalness: .72, roughness: .35 });
}
addParkedCar(-7.8, -46, 0x343a43);
addParkedCar(7.8, 10, 0x6e2427);

// Utility lines and a distant skyline add depth without loading heavy external models.
for (const x of [-LAYOUT.lampX, LAYOUT.lampX]) {
  const points = [];
  for (let z = -49; z <= 43; z += 14) points.push(new THREE.Vector3(x, 4.92 - ((z + 49) % 28 === 14 ? .34 : 0), z));
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, .025, 5, false), new THREE.MeshStandardMaterial({ color: 0x151719, roughness: .72, metalness: .4 }));
  cable.castShadow = true;
  scene.add(cable);
}
for (const [x, height, width] of [[-24, 17, 11], [-9, 22, 10], [8, 15, 9], [23, 24, 12]]) {
  room.box('distant skyline building', [width, height, 5], [x, height / 2 - .1, -55], 0x5e6973, { roughness: .82, metalness: .08, cast: false });
  for (let y = 3; y < height - 1; y += 2.4) for (let wx = -width / 2 + 1.1; wx < width / 2; wx += 2.2) room.box('distant window', [.72, .72, .06], [x + wx, y, -52.46], (Math.round(wx + y) % 3) ? 0x9cb2bd : 0xe1bd79, { roughness: .4, cast: false });
}

room.label('HIP-HOP HEIGHTS', [0, 9.2, -55], '#ffd268', [12, 1.6]);
room.label('MUSIC • CULTURE • LEGACY', [0, 7.9, -54.9], '#ffffff', [8, .65]);
room.light(0x8d55ff, 16, [0, 9, -30], 32).castShadow = false;
room.light(0xffa14f, 14, [0, 8, 20], 32).castShadow = false;

const atmospherePresets = [
  { name: 'DAYLIGHT', icon: '☀', background: 0x8ecdf4, fog: 0xb8d8e8, exposure: 1.16, sun: 0xffefd2, sunIntensity: 3.15, ambient: 0xbcd7ea, ambientIntensity: .34, lampIntensity: .4 },
  { name: 'GOLDEN HOUR', icon: '◐', background: 0xf19c70, fog: 0xdca584, exposure: 1.1, sun: 0xffb56b, sunIntensity: 3.7, ambient: 0xb993aa, ambientIntensity: .28, lampIntensity: 2.1 },
  { name: 'NIGHT', icon: '☾', background: 0x101a35, fog: 0x182441, exposure: .84, sun: 0x739dff, sunIntensity: .55, ambient: 0x4d67a3, ambientIntensity: .2, lampIntensity: 7.5 }
];
let atmosphereIndex = 0;
function applyAtmosphere(index) {
  const preset = atmospherePresets[index];
  scene.background.setHex(preset.background);
  scene.fog.color.setHex(preset.fog);
  renderer.toneMappingExposure = preset.exposure;
  sun.color.setHex(preset.sun);
  sun.intensity = preset.sunIntensity;
  ambient.color.setHex(preset.ambient);
  ambient.intensity = preset.ambientIntensity;
  streetLamps.forEach((lamp) => { lamp.intensity = preset.lampIntensity; });
  document.getElementById('atmosphereToggle').textContent = `${preset.icon} ${preset.name}`;
}
document.getElementById('atmosphereToggle').addEventListener('click', () => {
  atmosphereIndex = (atmosphereIndex + 1) % atmospherePresets.length;
  applyAtmosphere(atmosphereIndex);
});
applyAtmosphere(0);

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
