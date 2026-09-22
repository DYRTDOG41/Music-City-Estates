import { createRoom } from './mce_3d_room.js';

let state = { fans: 0, cash: 100, xp: 0, level: 1 };
try { if (window.MCE) state = { ...state, ...window.MCE.load() }; } catch (error) { console.warn('Player state unavailable', error); }
const fans = Number(state.fans) || 0;
document.getElementById('fans').textContent = fans.toLocaleString();
document.getElementById('cash').textContent = (Number(state.cash) || 0).toLocaleString();
document.getElementById('xp').textContent = (Number(state.xp) || 0).toLocaleString();
document.getElementById('level').textContent = Number(state.level || localStorage.getItem('mceLevel')) || 1;

const room = createRoom({
  spawn: [0, 1.7, 12.6],
  background: 0x18202b,
  fog: 0x252d38,
  fogDensity: .0038,
  sky: 0xc3d8ef
});
const { THREE, scene, renderer } = room;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.52;
renderer.outputColorSpace = THREE.SRGBColorSpace;
scene.children.forEach((child) => { if (child.isHemisphereLight) child.intensity = 1.6; });
scene.add(new THREE.AmbientLight(0xb9cee8, .58));
const lobbyFill = new THREE.DirectionalLight(0xffe2ba, 1.7);
lobbyFill.position.set(10, 15, 12);
lobbyFill.castShadow = false;
scene.add(lobbyFill);

function texture(draw, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  draw(context, 512, 512);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeatX, repeatY);
  map.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return map;
}

const concrete = texture((context, width, height) => {
  context.fillStyle = '#656a72';
  context.fillRect(0, 0, width, height);
  for (let i = 0; i < 650; i += 1) {
    const shade = 45 + (i % 8) * 5;
    context.fillStyle = `rgba(${shade},${shade + 2},${shade + 5},.42)`;
    context.fillRect((i * 79) % width, (i * 137) % height, 2 + (i % 4), 2 + (i % 3));
  }
  context.strokeStyle = '#24272d';
  context.lineWidth = 5;
  context.strokeRect(4, 4, width - 8, height - 8);
}, 5, 4);

const corrugated = texture((context, width, height) => {
  const gradient = context.createLinearGradient(0, 0, width, 0);
  for (let x = 0; x <= 1; x += .08) gradient.addColorStop(x, Math.round(x * 100) % 16 ? '#20252d' : '#343b45');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#69717c33';
  for (let y = 0; y < height; y += 90) context.fillRect(0, y, width, 4);
}, 3, 2);

room.wallBounds(38, 30, 9);
scene.getObjectByName('floor').material = new THREE.MeshPhysicalMaterial({ map: concrete, color: 0xd6d9df, roughness: .29, metalness: .16, clearcoat: .62, clearcoatRoughness: .2 });
for (const name of ['back wall', 'left wall', 'right wall', 'front-left', 'front-right']) {
  scene.getObjectByName(name).material = new THREE.MeshStandardMaterial({ map: corrugated, color: 0xffffff, roughness: .72, metalness: .34 });
}

const redGlow = new THREE.MeshStandardMaterial({ color: 0xff8a98, emissive: 0xe7183e, emissiveIntensity: 3, metalness: .28, roughness: .2 });
const goldGlow = new THREE.MeshStandardMaterial({ color: 0xffe4a0, emissive: 0xd49316, emissiveIntensity: 2.7, metalness: .28, roughness: .2 });
const blueGlow = new THREE.MeshStandardMaterial({ color: 0xb8ecff, emissive: 0x168cff, emissiveIntensity: 3, metalness: .28, roughness: .2 });
const darkMetal = new THREE.MeshStandardMaterial({ color: 0x151922, roughness: .35, metalness: .76 });

// Exposed trusses and pools of warm warehouse light.
for (let z = -13; z <= 13; z += 5.2) {
  room.box('ceiling truss', [37, .2, .22], [0, 8.35, z], 0x1b2028, { material: darkMetal });
  for (const x of [-12, 0, 12]) {
    room.cylinder('warehouse pendant', .16, .38, [x, 7.72, z], 0x1a1d24, { metalness: .8, roughness: .24 });
    const light = new THREE.SpotLight(0xffd6a0, 34, 15, .62, .62, 1.55);
    light.position.set(x, 7.55, z);
    light.target.position.set(x, 0, z - 1);
    light.castShadow = false;
    scene.add(light, light.target);
  }
}

room.label('WORD SLAUGHTER', [0, 7.45, -14.65], '#ffffff', [11, 1.25]);
room.label('DA WAREHOUSE', [0, 6.38, -14.62], '#ff3d59', [8.4, 1.05]);
room.label('BARS • BATTLES • COMMUNITY • LEGACY', [0, 5.55, -14.6], '#ffc956', [9, .52]);

function addEntrance({ x, name, subtitle, destination, color, glowMaterial, lockedText }) {
  room.box(`${name} portal back`, [8.4, 5.25, .35], [x, 2.68, -14.28], 0x090b10, { material: darkMetal, collider: true });
  room.box(`${name} portal top`, [8.8, .35, 1.05], [x, 5.38, -13.95], color, { material: glowMaterial });
  room.box(`${name} portal left`, [.35, 5.45, 1.05], [x - 4.22, 2.68, -13.95], color, { material: glowMaterial });
  room.box(`${name} portal right`, [.35, 5.45, 1.05], [x + 4.22, 2.68, -13.95], color, { material: glowMaterial });
  const doorGlass = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .42, transparent: true, opacity: .3, roughness: .18, metalness: .42 });
  room.box(`${name} glass doors`, [7.7, 4.65, .18], [x, 2.42, -13.72], color, { material: doorGlass });
  room.box(`${name} door split`, [.16, 4.65, .3], [x, 2.42, -13.56], 0xdde4ed, { metalness: .82, roughness: .18 });
  room.label(name, [x, 4.68, -13.32], '#ffffff', [6.5, .72]);
  room.label(subtitle, [x, 3.95, -13.3], lockedText ? '#ff8191' : '#d9e7f3', [6.2, .43]);
  room.interact(`ENTER ${name}`, [x, 1.7, -10.9], () => { location.href = destination; }, 3.25, color);
}

addEntrance({
  x: -12.2,
  name: 'BATTLE STAGE',
  subtitle: fans < 25 ? `3D TOUR OPEN • ${25 - fans} MORE FANS TO BATTLE` : 'BATTLE READY • ENTER THE CIRCLE',
  destination: 'battle_room.html',
  color: 0xff314e,
  glowMaterial: redGlow,
  lockedText: fans < 25
});
addEntrance({ x: 0, name: 'COMMUNITY SPACE', subtitle: 'NETWORK • COLLABORATE • BUILD', destination: 'warehouse_hangout_viewer.html', color: 0xffc23e, glowMaterial: goldGlow });
addEntrance({ x: 12.2, name: 'MERCH & BACKSTAGE', subtitle: 'CHECK IN • SHOP • SUPPORT ARTISTS', destination: 'merch_backstage.html', color: 0x43bfff, glowMaterial: blueGlow });

// Industrial waiting area and battle-culture details.
for (const x of [-12.5, -6.5, 6.5, 12.5]) {
  room.box('warehouse bench seat', [4.5, .35, 1.4], [x, .72, 6.2], 0x181c24, { material: darkMetal, collider: true });
  room.box('warehouse bench back', [4.5, 1.15, .28], [x, 1.25, 6.82], 0x11151c, { material: darkMetal, collider: true });
}
room.box('center emblem platform', [7.4, .2, 7.4], [0, .13, 2.2], 0x12151c, { metalness: .42, roughness: .5 });
const ring = new THREE.Mesh(new THREE.TorusGeometry(2.55, .09, 12, 64), redGlow);
ring.rotation.x = Math.PI / 2;
ring.position.set(0, .29, 2.2);
scene.add(ring);
room.label('RESPECT THE MIC', [0, .45, 2.2], '#ffffff', [4.4, .58]);

for (const [x, text, color] of [[-18.5, 'GOOD BARS\nBETTER PEOPLE', '#ff7184'], [18.5, 'WORDS BUILD\nEMPIRES', '#74d3ff']]) {
  room.box('culture poster', [.22, 4.6, 5.2], [x, 3.25, -2], 0x090b10, { metalness: .35, roughness: .46 });
  room.label(text, [x * .985, 3.25, -2], color, [4.2, 1.65]);
}

// Graphics Pass 1 — make the warehouse feel like a real converted industrial venue.
const pipeMetal = new THREE.MeshStandardMaterial({ color:0x4f555d, metalness:.82, roughness:.32 });
const safetyYellow = new THREE.MeshStandardMaterial({ color:0xd9a827, emissive:0x6b4304, emissiveIntensity:.18, metalness:.26, roughness:.52 });

function addWallPipe(x,zStart,zEnd,height){
  room.cylinder('industrial pipe',.11,Math.abs(zEnd-zStart),[x,height,(zStart+zEnd)/2],0x555b62,{metalness:.84,roughness:.33}).rotation.x=Math.PI/2;
  for(const z of [zStart,zEnd]){
    const joint=room.cylinder('pipe joint',.17,.11,[x,height,z],0x3d4248,{metalness:.88,roughness:.28});
    joint.rotation.x=Math.PI/2;
  }
}
function addRoadCase(x,z,label){
  room.box('tour road case',[2.2,1.3,1.45],[x,.72,z],0x15191f,{metalness:.66,roughness:.35,collider:true});
  for(const dx of [-1.04,1.04]) for(const dz of [-.66,.66]) room.box('road case edge',[.08,1.34,.08],[x+dx,.72,z+dz],0x858b91,{metalness:.92,roughness:.18});
  room.label(label,[x,1.12,z-.75],'#dce6ee',[1.65,.35]);
}
function addBarrier(x,z,rotation=0){
  const group=new THREE.Group();
  const mat=room.material(0x777c82,.35,.82);
  const top=new THREE.Mesh(new THREE.BoxGeometry(4,.1,.1),mat);top.position.y=1.05;group.add(top);
  const bottom=new THREE.Mesh(new THREE.BoxGeometry(4,.1,.1),mat);bottom.position.y=.18;group.add(bottom);
  for(let dx=-1.8;dx<=1.8;dx+=.45){const bar=new THREE.Mesh(new THREE.BoxGeometry(.05,.95,.05),mat);bar.position.set(dx,.62,0);group.add(bar)}
  group.position.set(x,0,z);group.rotation.y=rotation;scene.add(group);
}

// Visible utilities, cable management and safety markings sell the converted-warehouse architecture.
addWallPipe(-18.35,-11.8,11.8,6.7);
addWallPipe(18.35,-11.8,11.8,6.1);
for(const x of [-16.8,16.8]){
  for(const z of [-8.5,0,8.5]){
    room.box('electrical panel',[.24,1.65,1.35],[x,2.05,z],0x4d5359,{metalness:.58,roughness:.48});
    room.box('electrical caution',[.255,.42,.58],[x*.999,2.22,z],0xd5a72d,{material:safetyYellow,cast:false});
  }
}

// Touring gear and crowd-control barriers create a believable event load-in zone.
addRoadCase(-15.2,10.6,'AUDIO');
addRoadCase(-12.4,10.6,'LIGHTS');
addRoadCase(12.4,10.6,'MERCH');
addRoadCase(15.2,10.6,'STAGE');
addBarrier(-8.2,9.8,0);
addBarrier(8.2,9.8,0);

// A compact venue check-in station reinforces that this is an operating music space.
room.box('venue checkin desk',[5.2,1.18,1.35],[0,.62,10.6],0x11151b,{material:darkMetal,collider:true});
room.box('checkin desk red edge',[5.28,.1,.08],[0,1.18,9.94],0xff3856,{material:redGlow,cast:false});
room.label('TONIGHT: WORD SLAUGHTER',[0,1.65,9.9],'#ffd9de',[4.5,.46]);
room.label('CHECK IN • FIND YOUR ROOM',[0,1.12,9.88],'#ffffff',[3.6,.3]);

// Floor tape and hazard stripes add subtle industrial wear without expensive textures.
for(const x of [-17.2,17.2]){
  for(let z=-12;z<=10;z+=2.5){
    room.box('warehouse hazard stripe',[.52,.025,1.2],[x,.135,z],(Math.round(z*10)%2)?0xe0aa26:0x1b1b1b,{roughness:.72,cast:false});
  }
}

// Directional floor lights lead players from spawn to each doorway.
for (const [x, material, color] of [[-12.2, redGlow, 0xff314e], [0, goldGlow, 0xffc23e], [12.2, blueGlow, 0x43bfff]]) {
  for (let z = -8.2; z <= 8; z += 3.2) room.box('floor guide light', [1.35, .04, .14], [x, .13, z], color, { material, cast: false });
}

room.light(0xff2848, 14, [-12, 5, -9], 17).castShadow = false;
room.light(0xffbd3d, 13, [0, 5, -9], 17).castShadow = false;
room.light(0x269cff, 14, [12, 5, -9], 17).castShadow = false;
