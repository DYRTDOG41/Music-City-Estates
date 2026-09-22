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
  if (window.MCE) {
    state = delta && delta.cash
      ? window.MCE.payShow(delta)
      : window.MCE.add(delta);
  }
  else {
    state = { ...state, fans: state.fans + (delta.fans || 0), cash: state.cash + (delta.cash || 0), xp: state.xp + (delta.xp || 0) };
    localStorage.setItem('mceFans', state.fans);
    localStorage.setItem('mceCash', state.cash);
    localStorage.setItem('mceXP', state.xp);
  }
  updateStats();
};
updateStats();

const room = createRoom({ spawn: [0, 1.7, 7.2], background: 0x050203, fog: 0x160805, fogDensity: .012, sky: 0xb65b32 });
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
room.interact('RETURN TO HIP-HOP HEIGHTS', [-11.5, 1.7, 12.2], () => { location.href = 'hip_hop_heights.html'; }, 2.15, 0xff9b45);
room.interact('VISIT BEGENIUS STUDIO', [0, 1.7, 12.45], () => { location.href = 'begenius_studio.html'; }, 1.9, 0xd8b765);
room.interact('RECORD A SONG', [11.5, 1.7, 12.2], () => { location.href = 'record_music.html?studio=begenius'; }, 2.15, 0x69bfff);
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
let usedActions = new Set();
let applauseUntil = 0;

function formatPerformanceTime(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  return Math.floor(value / 60) + ':' + String(value % 60).padStart(2, '0');
}

function crowdVerdict(value) {
  const vote = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  return {
    vote,
    label: vote >= 82 ? 'STANDING OVATION' : vote >= 62 ? 'BIG APPLAUSE' : 'AUDIENCE APPLAUSE'
  };
}

room.animated.push((time) => {
  if (active) {
    performer.position.y = .52 + Math.sin(time * .009) * .045;
    performer.rotation.z = Math.sin(time * .006) * .035;
  } else {
    performer.position.y += (.52 - performer.position.y) * .12;
    performer.rotation.z *= .88;
  }
  if (Date.now() < applauseUntil) {
    crowd.forEach(({ group, seed: memberSeed }) => {
      group.position.y += Math.abs(Math.sin(time * .018 + memberSeed)) * .025;
    });
  }
});

function releaseOptions() {
  return (state.releases || []).filter((release) => release.releaseStatus === 'released');
}

function cafeUnlocked() {
  return window.MCE ? window.MCE.isUnlocked('cafe', state) : state.xp >= 10;
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
  if (window.MCE) state = window.MCE.get();
  updateStats();
  startButton.style.display = '';

  const releases = releaseOptions();
  songSelect.replaceChildren(...releases.map((release, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = release.title;
    return option;
  }));

  if (!releases.length) {
    progress.innerHTML = '<b>NO RELEASED SONG READY</b>';
    roundText.textContent = 'A real live set needs one of your released songs.';
    log.innerHTML = 'Go to the Artist Catalog, release a song with saved audio, then return to perform the full track.';
    startButton.disabled = true;
    startButton.textContent = 'RELEASE A SONG FIRST';
    energy.style.width = '0%';
    actionButtons.forEach((button) => { button.disabled = true; });
    refreshNightclubButton();
    return;
  }

  const remaining = Math.max(0, 50 - state.fans);
  const xpNeeded = Math.max(0, 10 - state.xp);
  const nightclubFans = Math.max(0, 50 - state.fans);
  const nightclubXp = Math.max(0, 75 - state.xp);

  if (!cafeUnlocked()) {
    progress.innerHTML = `<b>CAFÉ PERFORMANCE LOCKED</b> • Earn ${xpNeeded} more XP to reach the 10 XP performance requirement.`;
    roundText.textContent = 'Build your career before taking the stage.';
    log.textContent = 'Release songs, invite listeners, rehearse, or promote until you have 10 XP.';
    startButton.disabled = true;
    startButton.textContent = `LOCKED — ${xpNeeded} XP NEEDED`;
  } else if (nightclubUnlocked()) {
    progress.innerHTML = '<span class="unlock">✓ NIGHTCLUB UNLOCKED — 50 FANS + 75 XP REACHED</span>';
    roundText.textContent = 'The café host says you are ready for the next stage.';
    log.innerHTML = 'You can keep performing here, or move up to the <b>Music City Nightclub</b>.';
    startButton.disabled = false;
    startButton.textContent = 'START FULL LIVE SET';
  } else {
    progress.innerHTML = remaining
      ? `<b>${state.fans}/50 fans</b> • Earn ${remaining} more to graduate from the café circuit.`
      : `<b>CAFÉ FANS COMPLETE</b> • Nightclub still needs ${nightclubFans} fans and ${nightclubXp} XP.`;
    roundText.textContent = 'The host is ready to introduce you.';
    log.textContent = 'Choose a released song, then perform the full record on the starter stage.';
    startButton.disabled = false;
    startButton.textContent = 'START FULL LIVE SET';
  }

  energy.style.width = '0%';
  actionButtons.forEach((button) => {
    button.disabled = true;
    button.style.opacity = '';
  });
  refreshNightclubButton();
}

function openPerformancePanel() {
  refreshPerformancePanel();
  panel.classList.add('show');
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

function completePerformance(reaction) {
  active = false;
  actionButtons.forEach((button) => { button.disabled = true; });

  const selected = releaseOptions()[Number(songSelect.value) || 0];
  if (!selected) return refreshPerformancePanel();

  const fanReward = Math.min(score >= 60 ? 8 : 5, Math.max(0, 50 - state.fans));
  const cashReward = score >= 60 ? 35 : 25;
  const xpReward = score >= 60 ? 12 : 8;
  const rewardInput = {
    fans: fanReward,
    cash: cashReward,
    xp: xpReward,
    songId: selected.id,
    venue: 'hiphop-cafe'
  };

  const reward = window.MCE
    ? window.MCE.getPerformanceReward(rewardInput, state)
    : { mode:'new-song', fans:fanReward, xp:xpReward, grossCash:cashReward, cash:cashReward, commission:0, popularDemand:false };

  const demand = window.MCE && reward.popularDemand
    ? window.MCE.getPopularDemandStatus(selected.id, state)
    : { requests:[] };
  const requester = demand.requests && demand.requests[0] ? demand.requests[0].requesterName : '';

  addProgress(rewardInput);
  const performances = Number(localStorage.getItem('mceCafePerformances')) || 0;
  localStorage.setItem('mceCafePerformances', String(performances + 1));
  localStorage.setItem('mceLastCafeSong', selected.title);

  const verdict = crowdVerdict(score);
  const reactionLabel = reaction && reaction.label ? reaction.label : verdict.label;
  energy.style.width = `${Math.min(score, 100)}%`;

  const rewardLabel = reward.mode === 'popular-demand'
    ? '🔥 POPULAR DEMAND — FULL REWARD RESTORED' + (requester ? ' • Requested by ' + requester : '')
    : reward.mode === 'repeat'
      ? '↻ REPEAT SONG — REDUCED REWARD'
      : '✨ NEW SONG AT THIS VENUE — FULL REWARD';

  log.innerHTML =
    `<b class="unlock">SET COMPLETE!</b><br><b>🗳 CROWD VERDICT: ${verdict.vote}% • ${reactionLabel}</b><br>` +
    `<b>${rewardLabel}</b><br>${selected.title} earned +${reward.fans} Fans • +${reward.xp} XP • Show pay $${reward.grossCash}`;

  if (reward.commission > 0) {
    log.innerHTML += `<br>Manager commission: -$${reward.commission} • Artist net: $${reward.cash}`;
  } else {
    log.innerHTML += `<br>Artist net: $${reward.cash}`;
  }

  if (reward.mode === 'repeat') {
    log.innerHTML += '<br>Bring a new song for full rewards, or have a real listener request this record through Popular Demand.';
  }
  if (fanReward === 0) {
    log.innerHTML += '<br>You have graduated from the café circuit. Your next performances belong on a larger stage.';
  }

  roundText.textContent = (reaction && reaction.standing)
    ? 'The room is on its feet — standing ovation.'
    : 'The song is over and the crowd has voted.';

  startButton.disabled = false;
  startButton.style.display = '';
  startButton.textContent = 'PERFORM ANOTHER SET';
  songSelect.disabled = false;
  refreshProgressOnly();
}

const reactions = {
  timing: ['You lock into the pocket and heads start nodding.', 'Your timing lands clean over the café system.'],
  presence: ['You command the tiny stage like it is an arena.', 'The front tables stop talking and focus on your set.'],
  crowd: ['The café answers your call-and-response.', 'Phones rise as the crowd joins the hook.']
};

startButton.onclick = async () => {
  if (!cafeUnlocked() || active) return;

  const selected = releaseOptions()[Number(songSelect.value) || 0];
  if (!selected) return;

  const trackId = selected.audioKey || selected.id;
  let track = null;
  try {
    track = window.MusicCityCatalog && trackId
      ? await window.MusicCityCatalog.getTrack(trackId)
      : null;
  } catch (error) {}

  if (!track || !track.audioBlob) {
    log.innerHTML = '<b>FULL LIVE SET NEEDS SONG AUDIO.</b><br>Record/import the finished song and save it to the Artist Catalog before performing it on stage.';
    return;
  }

  const craftScore = Number(selected.craftScore || track.craftScore || 0);
  const craftEnergy = Math.floor(craftScore / 10);
  round = 1;
  score = craftEnergy;
  active = true;
  usedActions = new Set();
  songSelect.disabled = true;

  const performanceStatus = window.MCE
    ? window.MCE.getSongPerformanceStatus(selected.id, 'hiphop-cafe', state)
    : { count:0, popularDemandCount:0 };
  const performanceNote = performanceStatus.count > 0
    ? (performanceStatus.popularDemandCount > 0
        ? ' 🔥 A REAL LISTENER REQUESTED THIS SONG — Popular Demand will restore full rewards.'
        : ' You have already performed this song at the Café. Repeat rewards will be reduced; a new song earns full rewards.')
    : ' This is your first Café performance of this song, so full rewards are available.';

  roundText.textContent = 'LIVE • Part 1 of 3 • Make the first impression';
  log.textContent =
    '🎤 LIVE NOW: ' + selected.title + ' is playing through the Café PA. Perform the whole song.' +
    (craftEnergy
      ? ' Your ' + (selected.craftTier || track.craftTier || 'developed') +
        ' record starts with +' + craftEnergy + ' crowd energy.'
      : '') +
    performanceNote;

  energy.style.width = Math.max(8, craftEnergy) + '%';
  startButton.disabled = true;
  startButton.style.display = 'none';
  actionButtons.forEach((button) => {
    button.disabled = false;
    button.style.opacity = '';
  });

  try {
    await window.MusicCityLivePerformance.play({
      blob: track.audioBlob,
      source: 'hiphop-cafe-live-set',
      getScore: () => score,
      onProgress: ({ current, duration, percent }) => {
        if (!active) return;
        const part = percent < .34 ? 1 : percent < .67 ? 2 : 3;
        round = part;
        const phase = part === 1 ? 'Make the first impression' : part === 2 ? 'Build the connection' : 'Finish strong';
        roundText.textContent =
          'LIVE • Part ' + part + ' of 3 • ' + phase +
          (duration ? ' • ' + formatPerformanceTime(current) + ' / ' + formatPerformanceTime(duration) : '');
      },
      onTrackEnded: () => {
        if (!active) return;
        applauseUntil = Date.now() + 4600;
        const verdict = crowdVerdict(score);
        roundText.textContent = 'SONG COMPLETE • CROWD VOTE ' + verdict.vote + '%';
        log.textContent = verdict.vote >= 82
          ? 'The final note lands. The room jumps to its feet.'
          : 'The final note lands. The room breaks into applause.';
        actionButtons.forEach((button) => { button.disabled = true; });
      },
      onComplete: (reaction) => {
        if (!active) return;
        completePerformance(reaction);
      },
      onStop: () => {
        active = false;
        songSelect.disabled = false;
        actionButtons.forEach((button) => { button.disabled = true; });
        startButton.disabled = false;
        startButton.style.display = '';
      },
      onError: (error) => {
        active = false;
        songSelect.disabled = false;
        actionButtons.forEach((button) => { button.disabled = true; });
        startButton.disabled = false;
        startButton.style.display = '';
        log.textContent = error.message || 'The song could not play.';
      }
    });
  } catch (error) {
    active = false;
    songSelect.disabled = false;
    actionButtons.forEach((button) => { button.disabled = true; });
    startButton.disabled = false;
    startButton.style.display = '';
    log.textContent = error.message || 'The song could not play.';
  }
};

actionButtons.forEach((button) => {
  button.onclick = () => {
    const type = button.dataset.performance;
    if (!active || usedActions.has(type)) return;

    usedActions.add(type);
    const gain = 18 + Math.floor(Math.random() * 15);
    score += gain;
    energy.style.width = `${Math.min(score, 100)}%`;

    const lines = reactions[type];
    log.textContent =
      `${lines[Math.floor(Math.random() * lines.length)]} +${gain} crowd energy. The song keeps playing.`;

    button.disabled = true;
    button.style.opacity = '.55';
  };
});

function closePerformancePanel() {
  if (active && window.MusicCityLivePerformance) {
    window.MusicCityLivePerformance.stop('closed');
  }
  active = false;
  songSelect.disabled = false;
  actionButtons.forEach((button) => { button.disabled = true; });
  startButton.disabled = false;
  startButton.style.display = '';
  panel.classList.remove('show');
}

nightclubButton.onclick = () => {
  if (!nightclubUnlocked()) return;
  location.href = 'nightclub.html';
};

document.getElementById('closePerformance').onclick = closePerformancePanel;
document.getElementById('closeCounter').onclick = () => document.getElementById('counterPanel').classList.remove('show');

for (const modal of document.querySelectorAll('.modal')) {
  modal.addEventListener('click', (event) => {
    if (event.target !== modal) return;
    if (modal === panel) closePerformancePanel();
    else modal.classList.remove('show');
  });
}

addEventListener('pagehide', () => {
  if (window.MusicCityLivePerformance) window.MusicCityLivePerformance.stop('pagehide');
});
