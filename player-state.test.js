var assert = require("assert");
var MCE = require("./player-state.js");

function memoryStorage(seed) {
  var data = Object.assign({}, seed || {});
  return {
    getItem: function (key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem: function (key, value) {
      data[key] = String(value);
    },
    removeItem: function (key) {
      delete data[key];
    },
    dump: function () {
      return Object.assign({}, data);
    }
  };
}

function start(seed) {
  MCE.resetForTests(memoryStorage(seed));
  return MCE.load();
}

var passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log("ok - " + name);
}

test("empty storage uses career defaults", function () {
  var state = start();
  assert.strictEqual(state.name, "Rookie");
  assert.strictEqual(state.cash, 100);
  assert.strictEqual(state.fans, 0);
  assert.strictEqual(state.xp, 0);
  assert.strictEqual(state.day, 1);
  assert.strictEqual(state.level, 1);
  assert.strictEqual(state.songs, 0);
});

test("career save is preserved and copied to world keys", function () {
  var state = start({
    "mce-save": JSON.stringify({ name: "Nova", cash: 80, fans: 40, xp: 30, day: 4, songs: 2, battles: 1 })
  });
  assert.strictEqual(state.name, "Nova");
  assert.strictEqual(state.cash, 80);
  assert.strictEqual(state.fans, 40);
  assert.strictEqual(state.xp, 30);
  assert.strictEqual(state.day, 4);
  assert.strictEqual(state.songs, 2);
  assert.strictEqual(state.battles, 1);
  var stored = MCE._storage.dump();
  assert.strictEqual(stored.mceFans, "40");
  assert.strictEqual(stored.mceCash, "80");
  assert.strictEqual(stored.mceXP, "30");
  assert.ok(JSON.parse(stored["mce-save"]).name === "Nova");
});

test("world save is preserved and copied to mce-save", function () {
  var state = start({
    mceFans: "18",
    mceCash: "540",
    mceXP: "45",
    mceLevel: "1"
  });
  assert.strictEqual(state.fans, 18);
  assert.strictEqual(state.cash, 540);
  assert.strictEqual(state.xp, 45);
  var career = JSON.parse(MCE._storage.dump()["mce-save"]);
  assert.strictEqual(career.fans, 18);
  assert.strictEqual(career.cash, 540);
});

test("merge keeps the higher earned stats", function () {
  var state = start({
    "mce-save": JSON.stringify({ name: "Nova", cash: 120, fans: 12, xp: 80, day: 3, songs: 4, battles: 0 }),
    mceFans: "30",
    mceCash: "90",
    mceXP: "20",
    mceLevel: "1"
  });
  assert.strictEqual(state.name, "Nova");
  assert.strictEqual(state.fans, 30);
  assert.strictEqual(state.cash, 120);
  assert.strictEqual(state.xp, 80);
  assert.strictEqual(state.songs, 4);
  assert.strictEqual(state.day, 3);
});

test("unused world $500 default does not overwrite career cash", function () {
  var state = start({
    "mce-save": JSON.stringify({ name: "Rookie", cash: 55, fans: 9, xp: 10, day: 2, songs: 1, battles: 0 }),
    mceFans: "0",
    mceCash: "500",
    mceXP: "0",
    mceLevel: "1"
  });
  assert.strictEqual(state.cash, 55);
  assert.strictEqual(state.fans, 9);
  assert.strictEqual(state.xp, 10);
});

test("corrupt career save falls back to world keys", function () {
  var state = start({
    "mce-save": "{not-json",
    mceFans: "7",
    mceCash: "200",
    mceXP: "11",
    mceLevel: "1"
  });
  assert.strictEqual(state.fans, 7);
  assert.strictEqual(state.cash, 200);
  assert.strictEqual(state.xp, 11);
});

test("saving a spend does not get merged back up", function () {
  start({ "mce-save": JSON.stringify({ cash: 100, fans: 0, xp: 0, day: 1, songs: 0, battles: 0 }) });
  var after = MCE.save({ cash: 85, fans: 5, xp: 5, day: 2 });
  assert.strictEqual(after.cash, 85);
  assert.strictEqual(JSON.parse(MCE._storage.dump()["mce-save"]).cash, 85);
  assert.strictEqual(MCE._storage.dump().mceCash, "85");
});

test("battle unlock lives in one config object", function () {
  assert.strictEqual(MCE.UNLOCKS.battle.fans, 25);
  var locked = start();
  assert.strictEqual(MCE.isUnlocked("battle", locked), false);
  var open = MCE.save({ fans: 25 });
  assert.strictEqual(MCE.isUnlocked("battle", open), true);
  assert.strictEqual(MCE.needed(MCE.UNLOCKS.battle, locked).fans, 25);
});

test("named releases increase song count", function () {
  start();
  var state = MCE.addRelease({ title: "Night Drive", source: "bedroom" });
  assert.strictEqual(state.songs, 1);
  assert.strictEqual(state.releases[0].title, "Night Drive");
});

test("AI release metadata survives normalization", function () {
  start();
  var state = MCE.addRelease({
    id: "ai-song-1",
    title: "Neon Block",
    source: "ai-elevenlabs",
    style: "melodic trap",
    studio: "begenius",
    beat: "Midnight Drive",
    provider: "ElevenLabs Music",
    audioKey: "ai-song-1",
    radioStatus: "not-submitted"
  });
  var release = state.releases[0];
  assert.strictEqual(release.style, "melodic trap");
  assert.strictEqual(release.studio, "begenius");
  assert.strictEqual(release.beat, "Midnight Drive");
  assert.strictEqual(release.provider, "ElevenLabs Music");
  assert.strictEqual(release.audioKey, "ai-song-1");
  assert.strictEqual(release.radioStatus, "not-submitted");
});

test("NaN world values are ignored", function () {
  var state = start({
    mceFans: "nope",
    mceCash: "also-nope",
    mceXP: "",
    mceLevel: "abc"
  });
  assert.strictEqual(state.fans, 0);
  assert.strictEqual(state.cash, 100);
});

console.log("\n" + passed + " tests passed");
