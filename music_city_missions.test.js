const assert = require('assert');
const missions = require('./music_city_missions.js');

function state(patch) {
  return Object.assign({
    name: 'Rookie',
    cash: 100,
    fans: 0,
    xp: 0,
    battles: 0,
    releases: [],
    manager: { hired: false }
  }, patch || {});
}

function check(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (error) { console.error('not ok - ' + name); throw error; }
}

const emptyContext = { avatar: null, cafePerformances: 0 };

check('new players start by creating an artist', () => {
  const result = missions.career(state(), emptyContext);
  assert.equal(result.current.id, 'artist');
  assert.equal(result.completedCount, 0);
});

check('saved artist advances to recording', () => {
  const result = missions.career(state({ name: 'Midnight Will' }), emptyContext);
  assert.equal(result.current.id, 'record');
});

check('a catalog draft advances to release', () => {
  const result = missions.career(state({
    name: 'Midnight Will',
    releases: [{ id: 'one', releaseStatus: 'draft' }]
  }), emptyContext);
  assert.equal(result.current.id, 'release');
});

check('a released track advances to the first show', () => {
  const result = missions.career(state({
    name: 'Midnight Will',
    releases: [{ id: 'one', releaseStatus: 'released' }]
  }), emptyContext);
  assert.equal(result.current.id, 'first-show');
});

check('the first cafe show advances to the fan goal', () => {
  const result = missions.career(state({
    name: 'Midnight Will', fans: 12,
    releases: [{ id: 'one', releaseStatus: 'released' }]
  }), { avatar: null, cafePerformances: 1 });
  assert.equal(result.current.id, 'battle-access');
  assert.deepEqual(missions.progressFor(result.current, state({ fans: 12 })), {
    value: 12, goal: 25, unit: 'fans', percent: 48
  });
});

check('battle completion advances to management', () => {
  const result = missions.career(state({
    name: 'Midnight Will', fans: 30, battles: 1,
    releases: [{ id: 'one', releaseStatus: 'released' }]
  }), { avatar: null, cafePerformances: 2 });
  assert.equal(result.current.id, 'manager');
});

check('manager and promotion advance to radio readiness', () => {
  const result = missions.career(state({
    name: 'Midnight Will', fans: 40, xp: 80, battles: 1,
    manager: { hired: true },
    releases: [{ id: 'one', releaseStatus: 'released', promotionCount: 1 }]
  }), { avatar: null, cafePerformances: 2 });
  assert.equal(result.current.id, 'radio-access');
});

check('radio submission completes the first career run', () => {
  const result = missions.career(state({
    name: 'Midnight Will', fans: 120, xp: 175, battles: 1,
    manager: { hired: true },
    releases: [{ id: 'one', releaseStatus: 'released', promotionCount: 1, radioStatus: 'submitted' }]
  }), { avatar: null, cafePerformances: 3 });
  assert.equal(result.finished, true);
  assert.equal(result.completedCount, missions.MISSIONS.length);
});

console.log('8 mission loop tests passed');
