import { createRoom, buildAvatar } from './mce_3d_room.js';

let state = window.MCE ? window.MCE.load() : {
  fans: Number(localStorage.getItem('mceFans')) || 0,
  cash: Number(localStorage.getItem('mceCash')) || 500,
  xp: Number(localStorage.getItem('mceXP')) || 0,
  releases: []
};
const updateStats = () => {
  document.getElementById('fans').textContent = state.fans;
  document.getElementById('cash').textContent = state.cash;
  document.getElementById('xp').textContent = state.xp;
};
const addProgress = (delta) => {
  if (window.MCE) state = window.MCE.add(delta);
  else {
    state = { ...state, fans: state.fans + (delta.fans || 0), cash: state.cash + (delta.cash || 0), xp: state.xp + (delta.xp || 0) };
    localStorage.setItem('mceFans', state.fans);
    localStorage.setItem('mceCash', state.cash);
    localStorage.setItem('mceXP', state.xp);
  }
  updateStats();
};
updateStats();

const room = createRoom({ spawn: [0, 1.7, 11], background: 0x050203, fog: 0x160805, fogDensity: .012, sky: 0xb65b32 });
const { THREE, scene } = room;
function texture(draw, size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  draw(context, size);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return map;
}
const brick = texture((context, size) => {
  context.fillStyle = '#311913';
  context.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 58) {
    const offset = (y / 58) % 2 ? 45 : 0;
    for (let x = -90; x < size; x += 90) {
      const shade = 45 + Math.floor(Math.random() * 24);
      context.fillStyle = `rgb(${shade + 35},${shade + 8},${shade})`;
      context.fillRect(x + offset + 3, y + 3, 84, 52);
      context.strokeStyle = '#180b08';
      context.lineWidth = 4;
      context.strokeRect(x + offset + 3, y + 3, 84, 52);
    }
  }
});
brick.repeat.set(4, 2);
const floor = texture((context, size) => {
  context.fillStyle = '#21150f';
  context.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 52) {
    context.fillStyle = y % 104 ? '#392219' : '#2d1b14';
    context.fillRect(0, y, size, 48);
    context.strokeStyle = '#120b08';
    context.strokeRect(0, y, size, 48);
  }
});
floor.repeat.set(5, 5);

room.wallBounds(34, 28, 8);
scene.getObjectByName('floor').material = new THREE.MeshStandardMaterial({ map: floor, color: 0x9c7258, roughness: .77 });
for (const wallName of ['back wall', 'left wall', 'right wall', 'front-left', 'front-right']) scene.getObjectByName(wallName).material = new THREE.MeshStandardMaterial({ map: brick, color: 0xa36c5b, roughness: .93 });
for (let z = -12; z <= 12; z += 4) room.box('ceiling beam', [33, .18, .18], [0, 7.2, z], 0x342625, { metalness: .85, roughness: .3 });
for (const x of [-12, -4, 4, 12]) {
  const lamp = new THREE.SpotLight(0xffaf62, 38, 15, .45, .62, 1.5);
  lamp.position.set(x, 6.8, -3);
  lamp.target.position.set(x, 0, -7);
  scene.add(lamp, lamp.target);
  room.cylinder('café light', .25, .26, [x, 6.9, -3], 0x1c1110, { metalness: .82 });
}
const warm = room.light(0xff7438, 20, [-8, 3.8, -7], 18);
warm.shadow.mapSize.set(512, 512);
const purple = room.light(0xb84cff, 14, [8, 4, -8], 18);
purple.castShadow = false;

// Starter stage.
room.box('café stage', [15, .42, 6.4], [0, .21, -10.4], 0x181013, { collider: true, roughness: .52, metalness: .15 });
room.box('stage glow', [15.2, .13, .13], [0, .42, -7.17], 0xff6536, { metalness: .5 });
room.label('HIP-HOP CAFÉ', [0, 6.25, -13.7], '#fff0db', [11, 1.55]);
room.label('FIRST SHOW • FIRST FANS • YOUR STORY', [0, 5.15, -13.68], '#ff9b45', [9, .65]);
room.label('OPEN MIC', [0, 3.85, -13.62], '#d95fff', [5, .92]);
for (const x of [-5.5, 5.5]) {
  room.box('stage speaker', [1.6, 3.3, 1.2], [x, 1.85, -12.2], 0x0c0a0d, { collider: true, metalness: .28, roughness: .5 });
  for (const y of [1, 2.1, 3.15]) {
    const cone = room.cylinder('speaker cone', .38, .09, [x, y, -11.55], 0x332d36, { metalness: .4 });
    cone.rotation.x = Math.PI / 2;
  }
}
const micStand = room.cylinder('microphone stand', .055, 2.8, [0, 1.4, -9.7], 0x1b1b1e, { metalness: .9, roughness: .2 });
micStand.position.y = 1.4;
const mic = room.cylinder('microphone', .09, .48, [0, 2.9, -9.7], 0x29292e, { metalness: .92, roughness: .18 });
mic.rotation.z = .25;
const avatarData = JSON.parse(localStorage.getItem('mceAvatar') || 'null') || { name: state.name || 'New Artist' };
const performer = buildAvatar(room, avatarData, [0, .52, -10.7], .96);
performer.rotation.y = Math.PI;
room.label((avatarData.name || state.name || 'NEW ARTIST').toUpperCase(), [0, 4.1, -10.7], '#ffffff', [4.2, .58]);

// Café counter and future commerce zone.
room.box('café counter', [10, 1.25, 2], [11.2, .63, 4.5], 0x3b2116, { collider: true, roughness: .6 });
room.box('counter top', [10.4, .16, 2.25], [11.2, 1.3, 4.5], 0x171212, { metalness: .38, roughness: .36 });
room.label('BEATS • COFFEE • CULTURE', [11.2, 2, 3.42], '#ffc279', [6, .66]);
for (const x of [8.2, 11.2, 14.2]) {
  room.cylinder('counter stool', .42, .18, [x, .85, 2.5], 0x5b3322, { roughness: .72 });
  room.cylinder('stool leg', .08, 1.6, [x, .8, 2.5], 0x3f3835, { metalness: .85 });
}
const barista = buildAvatar(room, { skin: '#78482f', hairStyle: 'afro', hairColor: '#151013', shirtColor: '#9b392a', pantsColor: '#171313' }, [11.2, 0, 6], .82);
barista.rotation.y = Math.PI;
room.interact('VISIT CAFÉ COUNTER', [11.2, 1.7, 1.8], () => document.getElementById('counterPanel').classList.add('show'), 2.8, 0xff9b45);

// Tables and intimate starter crowd.
const crowd = [];
const skinColors = [0x4c2a1b, 0x73462e, 0x9d6748, 0xc9916c, 0x633824];
const shirtColors = [0x3e2030, 0x213653, 0x5e2a1f, 0x29252f, 0x6b2438];
function audienceMember(x, z, seed) {
  const group = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.22, .55, 3, 8), room.material(shirtColors[seed % shirtColors.length], .82, .04));
  torso.position.y = 1.05;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.21, 10, 8), room.material(skinColors[(seed * 3) % skinColors.length], .8, .02));
  head.position.y = 1.66;
  group.add(head);
  group.position.set(x, 0, z);
  group.rotation.y = Math.PI;
  scene.add(group);
  crowd.push({ group, seed });
}
let seed = 0;
for (const z of [-3.8, .3, 4.2]) {
  for (const x of [-10, -6, -2, 2, 6]) {
    room.cylinder('café table', .72, .18, [x, .82, z], 0x4b2d20, { roughness: .68 });
    room.cylinder('table leg', .08, 1.5, [x, .75, z], 0x272326, { metalness: .82 });
    if ((seed + 1) % 3 !== 0) audienceMember(x - .9, z + .25, seed++);
  }
}
room.animated.push((time) => crowd.forEach(({ group, seed: memberSeed }) => {
  group.position.y = Math.sin(time * .0025 + memberSeed) * .035;
  group.rotation.z = Math.sin(time * .0019 + memberSeed) * .012;
}));

// Navigation and stage interaction.
room.interact('PERFORM AT OPEN MIC', [0, 1.7, -6.3], openPerformancePanel, 3.3, 0xd95fff);
room.interact('RETURN TO HIP-HOP HEIGHTS', [-11.5, 1.7, 11.5], () => { location.href = 'hip_hop_heights.html'; }, 2.8, 0xff9b45);
room.interact('VISIT BEGENIUS STUDIO', [0, 1.7, 11.5], () => { location.href = 'begenius_studio.html'; }, 2.8, 0xd8b765);
room.interact('RECORD A SONG', [11.5, 1.7, 11.5], () => { location.href = 'record_music.html?studio=begenius'; }, 2.8, 0x69bfff);
room.label('HIP-HOP HEIGHTS', [-11.5, 3, 13.7], '#ffad67', [4, .62]);
room.label('BEGENIUS STUDIO', [0, 3, 13.7], '#e7c66e', [4, .62]);
room.label('RECORD MUSIC', [11.5, 3, 13.7], '#69bfff', [3.6, .62]);

const panel = document.getElementById('performancePanel');
const songSelect = document.getElementById('songSelect');
const startButton = document.getElementById('startPerformance');
const actionButtons = [...document.querySelectorAll('[data-performance]')];
const log = document.getElementById('performanceLog');
const roundText = document.getElementById('roundText');
const energy = document.getElementById('crowdEnergy');
const progress = document.getElementById('venueProgress');
const nightclubButton = document.getElementById('nightclubButton');
let round = 0;
let score = 0;
let active = false;

function releaseOptions() {
  const releases = (state.releases || [])
    .filter((release) => release.releaseStatus === 'released');
  if (!releases.length) return [{ id: 'open-mic-freestyle', title: 'First City Freestyle', source: 'café house beat' }];
  return releases;
}

function cafeUnlocked() {
  return window.MCE
    ? window.MCE.isUnlocked('cafe', state)
    : state.xp >= 10;
}

function nightclubUnlocked() {
  return window.MCE
    ? window.MCE.isUnlocked('nightclub', state)
    : state.fans >= 50 && state.xp >= 75;
}
function refreshNightclubButton() {
  if (nightclubUnlocked()) {
    nightclubButton.disabled = false;
    nightclubButton.textContent = '🌃 ENTER MUSIC CITY NIGHTCLUB';
  } else {
    const gap = window.MCE
      ? window.MCE.needed(window.MCE.UNLOCKS.nightclub, state)
      : { fans: Math.max(0, 50 - state.fans), xp: Math.max(0, 75 - state.xp) };
    nightclubButton.disabled = true;
    nightclubButton.textContent =
      '🔒 NIGHTCLUB — NEED ' + gap.fans + ' FANS / ' + gap.xp + ' XP';
  }
}

function refreshPerformancePanel() {
  const releases = releaseOptions();
  songSelect.replaceChildren(...releases.map((release, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = release.title;
    return option;
  }));
  const remaining = Math.max(0, 50 - state.fans);
  const xpNeeded = Math.max(0, 10 - state.xp);
  const nightclubFans = Math.max(0, 50 - state.fans);
  const nightclubXp = Math.max(0, 75 - state.xp);

  if (!cafeUnlocked()) {
    progress.innerHTML = `<b>CAFÉ PERFORMANCE LOCKED</b> • Earn ${xpNeeded} more XP to reach the 10 XP performance requirement.`;
    roundText.textContent = 'Build your career before taking the stage.';
    log.textContent = 'Release songs, promote them, and return when you have 10 XP.';
    startButton.disabled = true;
    startButton.textContent = `LOCKED — ${xpNeeded} XP NEEDED`;
  } else if (nightclubUnlocked()) {
    progress.innerHTML = '<span class="unlock">✓ NIGHTCLUB UNLOCKED — 50 FANS + 75 XP REACHED</span>';
    roundText.textContent = 'The café host says you are ready for the next stage.';
    log.innerHTML = 'You can keep performing here, or move up to the <b>Music City Nightclub</b>.';
    startButton.disabled = false;
    startButton.textContent = 'START THREE-PART SET';
  } else {
    progress.innerHTML = remaining
      ? `<b>${state.fans}/50 fans</b> • Earn ${remaining} more to graduate from the café circuit.`
      : `<b>CAFÉ FANS COMPLETE</b> • Nightclub still needs ${nightclubFans} fans and ${nightclubXp} XP.`;
    roundText.textContent = 'The host is ready to introduce you.';
    log.textContent = 'Choose a released song or freestyle, then step onto the starter stage.';
    startButton.disabled = false;
    startButton.textContent = 'START THREE-PART SET';
  }
  energy.style.width = '0%';
  actionButtons.forEach((button) => { button.disabled = true; });

  refreshNightclubButton();
}
function openPerformancePanel() {
  refreshPerformancePanel();
  panel.classList.add('show');
}
function completePerformance() {
  active = false;
  actionButtons.forEach((button) => { button.disabled = true; });
  const selected = releaseOptions()[Number(songSelect.value) || 0];
  const fanReward = Math.min(score >= 60 ? 8 : 5, Math.max(0, 50 - state.fans));
  const cashReward = score >= 60 ? 35 : 25;
  const xpReward = score >= 60 ? 12 : 8;
  addProgress({ fans: fanReward, cash: cashReward, xp: xpReward });
  const performances = Number(localStorage.getItem('mceCafePerformances')) || 0;
  localStorage.setItem('mceCafePerformances', String(performances + 1));
  localStorage.setItem('mceLastCafeSong', selected.title);
  energy.style.width = `${Math.min(score, 100)}%`;
  log.innerHTML = `<b class="unlock">SET COMPLETE!</b><br>${selected.title} earned +${fanReward} Fans • +$${cashReward} • +${xpReward} XP`;
  if (fanReward === 0) log.innerHTML += '<br>You have graduated from the café circuit. Your next performances belong on a larger stage.';
  roundText.textContent = 'The crowd applauds your final song.';
  startButton.disabled = false;
  startButton.textContent = 'PERFORM ANOTHER SET';
  refreshProgressOnly();
}
function refreshProgressOnly() {
  refreshNightclubButton();
  const remaining = Math.max(0, 50 - state.fans);
  const nightclubXp = Math.max(0, 75 - state.xp);
  if (nightclubUnlocked()) {
    progress.innerHTML = '<span class="unlock">✓ NIGHTCLUB UNLOCKED — NEXT VENUE READY</span>';
  } else if (remaining > 0) {
    progress.innerHTML = `<b>${state.fans}/50 fans</b> • Earn ${remaining} more to graduate from the café circuit.`;
  } else {
    progress.innerHTML = `<b>50/50 fans</b> • Earn ${nightclubXp} more XP to unlock the Nightclub.`;
  }
}
const reactions = {
  timing: ['You lock into the pocket and heads start nodding.', 'Your timing lands clean over the café system.'],
  presence: ['You command the tiny stage like it is an arena.', 'The front tables stop talking and focus on your set.'],
  crowd: ['The café answers your call-and-response.', 'Phones rise as the crowd joins the hook.']
};
startButton.onclick = () => {
  if (!cafeUnlocked()) return;
  round = 1;
  score = 0;
  active = true;
  songSelect.disabled = true;
  roundText.textContent = 'Part 1 of 3 • Make the first impression';
  log.textContent = 'The host says your name. The beat drops through the café speakers.';
  energy.style.width = '8%';
  startButton.disabled = true;
  actionButtons.forEach((button) => { button.disabled = false; });
};
actionButtons.forEach((button) => {
  button.onclick = () => {
    if (!active) return;
    const type = button.dataset.performance;
    const gain = 18 + Math.floor(Math.random() * 15);
    score += gain;
    energy.style.width = `${Math.min(score, 100)}%`;
    const lines = reactions[type];
    log.textContent = `${lines[Math.floor(Math.random() * lines.length)]} +${gain} crowd energy.`;
    if (round >= 3) {
      songSelect.disabled = false;
      completePerformance();
    } else {
      round += 1;
      roundText.textContent = `Part ${round} of 3 • ${round === 2 ? 'Build the connection' : 'Finish strong'}`;
    }
  };
});
function closePerformancePanel() {
  active = false;
  songSelect.disabled = false;
  panel.classList.remove('show');
}
nightclubButton.onclick = () => {
  if (!nightclubUnlocked()) return;
  location.href = 'nightclub.html';
};

document.getElementById('closePerformance').onclick = closePerformancePanel;
document.getElementById('closeCounter').onclick = () => document.getElementById('counterPanel').classList.remove('show');
for (const modal of document.querySelectorAll('.modal')) modal.addEventListener('click', (event) => {
  if (event.target !== modal) return;
  if (modal === panel) closePerformancePanel();
  else modal.classList.remove('show');
});
