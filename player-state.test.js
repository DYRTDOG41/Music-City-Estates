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
  assert.strictEqual(state.manager.hired, false);
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

test("releasing a song rewards fans and XP once", function () {
  start();
  MCE.addRelease({ id: "release-loop-1", title: "First Drop" });
  var first = MCE.releaseSong("release-loop-1");
  assert.strictEqual(first.fans, 3);
  assert.strictEqual(first.xp, 5);
  assert.strictEqual(first.releases[0].releaseStatus, "released");
  var second = MCE.releaseSong("release-loop-1");
  assert.strictEqual(second.fans, 3);
  assert.strictEqual(second.xp, 5);
});

test("managed promotion requires manager, costs cash, and rewards once", function () {
  start();
  MCE.save({ cash: 300 });
  MCE.addRelease({ id: "release-loop-2", title: "Promo Song" });
  MCE.releaseSong("release-loop-2");

  assert.throws(function () {
    MCE.promoteRelease("release-loop-2");
  });

  var managed = MCE.hireManager();
  assert.strictEqual(managed.cash, 100);

  var promoted = MCE.promoteRelease("release-loop-2");
  assert.strictEqual(promoted.cash, 75);
  assert.strictEqual(promoted.fans, 11);
  assert.strictEqual(promoted.xp, 10);
  assert.strictEqual(promoted.releases[0].promotionCount, 1);
  assert.strictEqual(promoted.releases[0].promotionSpend, 25);

  var again = MCE.promoteRelease("release-loop-2");
  assert.strictEqual(again.cash, 75);
  assert.strictEqual(again.fans, 11);
  assert.strictEqual(again.xp, 10);
});

test("radio submission requires manager, eligibility, and the submission fee", function () {
  start();
  MCE.save({ cash: 400 });
  MCE.addRelease({ id: "release-loop-3", title: "Radio Song" });
  MCE.releaseSong("release-loop-3");

  MCE.save({ fans: 100, xp: 150 });
  assert.throws(function () {
    MCE.submitReleaseToRadio("release-loop-3");
  });

  MCE.hireManager();
  var before = MCE.get();
  assert.strictEqual(before.cash, 200);

  var submitted = MCE.submitReleaseToRadio("release-loop-3");
  assert.strictEqual(submitted.cash, 150);
  assert.strictEqual(submitted.releases[0].radioStatus, "submitted");
  assert.strictEqual(submitted.releases[0].radioFeePaid, 50);
  assert.strictEqual(submitted.manager.radioSpend, 50);
  assert.ok(submitted.releases[0].radioSubmittedAt);
});

test("manager hiring requires cash and charges the signing fee", function () {
  start();
  assert.throws(function () {
    MCE.hireManager();
  });

  MCE.save({ cash: 250 });
  var hired = MCE.hireManager();
  assert.strictEqual(hired.manager.hired, true);
  assert.strictEqual(hired.cash, 50);
  assert.strictEqual(MCE.ECONOMY.managerHiringFee, 200);
});

test("manager commission is deducted from paid shows", function () {
  start();
  MCE.save({ cash: 250 });
  MCE.hireManager();

  var quote = MCE.getShowPayout(100);
  assert.strictEqual(quote.gross, 100);
  assert.strictEqual(quote.commission, 15);
  assert.strictEqual(quote.net, 85);

  var paid = MCE.payShow({ cash: 100, fans: 4, xp: 6 });
  assert.strictEqual(paid.cash, 135);
  assert.strictEqual(paid.fans, 4);
  assert.strictEqual(paid.xp, 6);
  assert.strictEqual(paid.manager.totalCommission, 15);
});

test("shared progression gates match the venue plan", function () {
  var state = start();
  assert.strictEqual(MCE.isUnlocked("cafe", state), false);
  assert.strictEqual(MCE.isUnlocked("battle", state), false);
  assert.strictEqual(MCE.isUnlocked("nightclub", state), false);
  assert.strictEqual(MCE.isUnlocked("radio", state), false);

  state = MCE.save({ fans: 25, xp: 10 });
  assert.strictEqual(MCE.isUnlocked("cafe", state), true);
  assert.strictEqual(MCE.isUnlocked("battle", state), true);

  state = MCE.save({ fans: 50, xp: 75 });
  assert.strictEqual(MCE.isUnlocked("nightclub", state), true);

  state = MCE.save({ fans: 100, xp: 150 });
  assert.strictEqual(MCE.isUnlocked("radio", state), true);
});

test("manager cannot bypass radio career eligibility", function () {
  start();
  MCE.save({ cash: 300 });
  MCE.addRelease({ id: "radio-gate", title: "Gate Test" });
  MCE.releaseSong("radio-gate");
  MCE.hireManager();

  assert.throws(function () {
    MCE.submitReleaseToRadio("radio-gate");
  });

  MCE.save({ fans: 100, xp: 150 });
  var submitted = MCE.submitReleaseToRadio("radio-gate");
  assert.strictEqual(submitted.releases[0].radioStatus, "submitted");
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
