import { createRoom } from './mce_3d_room.js';

const state = window.MCE ? window.MCE.load() : { fans: 0, cash: 100, xp: 0 };
const room = createRoom({
  spawn: [0, 1.7, 38],
  background: 0x8ecdf4,
  fog: 0xb8d8e8,
  fogDensity: .0028,
  sky: 0xd9efff
});
const { THREE, scene, renderer, camera } = room;
const clickables = [];

// Hip-Hop Heights now reads as a bright late-afternoon district instead of a dark room.
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
renderer.outputColorSpace = THREE.SRGBColorSpace;
scene.children.forEach((child) => {
  if (child.isHemisphereLight) child.intensity = 1.7;
});
const sun = new THREE.DirectionalLight(0xfff3d2, 2.8);
sun.position.set(18, 32, 24);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -48;
sun.shadow.camera.right = 48;
sun.shadow.camera.top = 52;
sun.shadow.camera.bottom = -52;
scene.add(sun);
scene.add(new THREE.AmbientLight(0xbcdfff, .62));

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

const ground = room.box('district ground', [72, .22, 92], [0, -.13, -4], 0x5e6670, { roughness: .96 });
ground.receiveShadow = true;
ground.material.map = concreteTexture;
ground.material.needsUpdate = true;
room.box('main street', [17, .05, 90], [0, .02, -4], 0x343840, { material: new THREE.MeshStandardMaterial({ map: asphaltTexture, color: 0xffffff, roughness: .93 }) });
for (const x of [-9.6, 9.6]) room.box('sidewalk', [3.8, .18, 90], [x, .06, -4], 0xb5b4af, { material: new THREE.MeshStandardMaterial({ map: concreteTexture, color: 0xffffff, roughness: .88 }) });
for (let z = -46; z < 40; z += 9) {
  room.box('lane light', [.15, .03, 4.4], [0, .07, z], 0xe0bd62, { metalness: .1 });
}
for (let z = -43; z <= 35; z += 13) {
  for (const x of [-11.1, 11.1]) {
    room.cylinder('street lamp pole', .08, 4.6, [x, 2.3, z], 0x24212b, { metalness: .85, roughness: .28 });
    room.light(0xffd9a0, 2.6, [x, 4.7, z], 10).castShadow = false;
  }
}

const materials = {
  glassGold: new THREE.MeshStandardMaterial({ color: 0x76dfff, emissive: 0x0d6fa8, emissiveIntensity: 1.15, transparent: true, opacity: .42, roughness: .12, metalness: .32 }),
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
  const xCenter = side * 23;
  const innerX = side * 15;
  const outerX = side * 31;
  const z = config.z;
  const wallMaterial = new THREE.MeshStandardMaterial({ map: config.texture, color: 0xffffff, roughness: .8, metalness: .06 });
  const trimMaterial = room.material(config.trim, .36, .63);
  const action = destinationAction(config.destination, config.name);

  room.box(config.name + ' floor', [16, .25, 18], [xCenter, .05, z], config.floor, { roughness: .7 });
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
  const stone = new THREE.MeshStandardMaterial({ map: studioStoneTexture, color: 0xffffff, roughness: .72, metalness: .08 });
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

function plaquesInterior({ outerX, z, side }) {
  for (let i = -2; i <= 2; i++) {
    const plaque = room.box('gold record plaque', [.13, 1.25, 1.15], [outerX - side * .28, 4.2, z + i * 2.1], 0x1b1712, { metalness: .55, roughness: .35 });
    room.cylinder('gold record', .34, .06, [outerX - side * .38, 4.2, z + i * 2.1], 0xe0bd52, { metalness: .92, roughness: .2 }).rotation.z = Math.PI / 2;
  }
  room.box('BeGenius reception desk', [3, 1.25, 5.4], [-25.4, .72, z], 0x11141c, { metalness: .32, roughness: .42 });
  room.box('BeGenius reception glow', [.14, .16, 4.9], [-23.86, .7, z], 0x6f8cff, { material: new THREE.MeshStandardMaterial({ color: 0x8ab7ff, emissive: 0x3926c9, emissiveIntensity: 2 }) });
  room.label('BEGENIUS', [outerX - side * .38, 3.1, z], '#7fdcff', [3.2, .68]);
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
  wall: 0x090d14, trim: 0x2fb7ff, floor: 0x161c24, roof: 0x05070b, glow: 0x43c7ff,
  texture: masonryTexture('#263b4d', '#101b25', '#59caff'),
  glass: materials.glassGold, label: '#d8f8ff', customSign: true, signatureProfile: true, decorate: plaquesInterior, decorateExterior: beGeniusExterior
});
addStorefront({
  name: 'Hip-Hop Café', side: 1, z: 17, destination: 'hiphop_cafe.html',
  wall: 0x6b3326, trim: 0xff8a4f, floor: 0x3b241c, roof: 0x211418, glow: 0xff7444,
  texture: masonryTexture('#9a513b', '#57281f', '#ffc08a'),
  glass: materials.glassOrange, label: '#ffc08a', decorate: cafeInterior
});
addStorefront({
  name: 'DA Warehouse', side: -1, z: -18, destination: 'warehouse.html',
  wall: 0x29212e, trim: 0x9d46b7, floor: 0x1e1922, roof: 0x111016, glow: 0xd75cff,
  texture: masonryTexture('#55435c', '#261d2b', '#e9a4ff'),
  glass: materials.glassPurple, label: '#e9a4ff', decorate: warehouseInterior
});
addStorefront({
  name: 'Record Store', side: 1, z: -18, destination: null,
  wall: 0x17303a, trim: 0x41a9c2, floor: 0x17252b, roof: 0x0d171b, glow: 0x55dcff,
  texture: masonryTexture('#376674', '#17333b', '#92ecff'),
  glass: materials.glassCyan, label: '#92ecff', decorate: recordStoreInterior
});

// Street furniture, trees and art make the district feel inhabited in daylight.
for (const z of [-37, -27, -8, 3, 28, 36]) {
  const side = (Math.abs(z) % 2 ? -1 : 1);
  const x = side * 12.1;
  room.cylinder('tree trunk', .2, 2.25, [x, 1.15, z], 0x6f4326, { roughness: .92 });
  for (const y of [2.35, 2.9, 3.42]) {
    const crown = new THREE.Mesh(new THREE.SphereGeometry(.9 - (y - 2.35) * .12, 12, 9), room.material(0x3c8b52, .88, .01));
    crown.position.set(x, y, z);
    crown.scale.set(1.15, .75, 1.05);
    crown.castShadow = true;
    scene.add(crown);
  }
  room.box('street bench', [1.45, .18, 3.2], [-side * 11.55, .55, z + 2.4], 0x704b31, { roughness: .68, metalness: .06 });
}

for (const z of [-40, -30, -6, 5, 31]) {
  room.box('crosswalk stripe', [15.2, .025, .52], [0, .062, z], 0xf2ede0, { roughness: .88, cast: false });
}

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
