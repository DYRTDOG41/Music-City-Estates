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
  assert.strictEqual(state.reputation, 50);
  assert.strictEqual(state.business.meter, 0);
  assert.strictEqual(state.business.pendingEventId, null);
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
    craftScore: 78,
    craftTier: "Standout",
    craftBreakdown: { authorship: 24, revision: 17 },
    revisionCount: 3,
    originalLyricsConfirmed: true,
    radioStatus: "not-submitted"
  });
  var release = state.releases[0];
  assert.strictEqual(release.style, "melodic trap");
  assert.strictEqual(release.studio, "begenius");
  assert.strictEqual(release.beat, "Midnight Drive");
  assert.strictEqual(release.provider, "ElevenLabs Music");
  assert.strictEqual(release.audioKey, "ai-song-1");
  assert.strictEqual(release.craftScore, 78);
  assert.strictEqual(release.craftTier, "Standout");
  assert.strictEqual(release.craftBreakdown.authorship, 24);
  assert.strictEqual(release.revisionCount, 3);
  assert.strictEqual(release.originalLyricsConfirmed, true);
  assert.strictEqual(release.radioStatus, "not-submitted");
});

test("Record Passport metadata survives career state before minting", function () {
  start();
  MCE.addRelease({ id: "cert-song", title: "Certified Test" });

  var ready = MCE.markReleasePassportReady("cert-song", {
    id: "MCE-ABC123",
    passportReadyAt: "2026-09-18T12:00:00.000Z",
    master: { sha256: "masterhash" },
    metadataHash: { sha256: "metadatahash" },
    chain: { status: "not-minted" }
  });

  var release = ready.releases[0];
  assert.strictEqual(release.certificationStatus, "passport-ready");
  assert.strictEqual(release.passportId, "MCE-ABC123");
  assert.strictEqual(release.certificationMasterHash, "masterhash");
  assert.strictEqual(release.certificationMetadataHash, "metadatahash");
  assert.strictEqual(release.blockchainStatus, "not-minted");
});

test("Music City certification requires a confirmed blockchain mint", function () {
  start();
  MCE.addRelease({ id: "mint-song", title: "Mint Test" });

  assert.throws(function () {
    MCE.markReleaseCertified("mint-song", {
      id: "MCE-PASSPORT",
      master: { sha256: "masterhash" },
      metadataHash: { sha256: "metadatahash" },
      chain: { status: "not-minted" }
    });
  });

  var certified = MCE.markReleaseCertified("mint-song", {
    id: "MCE-PASSPORT",
    passportReadyAt: "2026-09-18T12:00:00.000Z",
    master: { sha256: "masterhash" },
    metadataHash: { sha256: "metadatahash" },
    chain: {
      status: "minted",
      tokenId: "token-77",
      transactionId: "tx-88",
      mintedAt: "2026-09-18T13:00:00.000Z"
    }
  });

  var release = certified.releases[0];
  assert.strictEqual(release.certificationStatus, "certified");
  assert.strictEqual(release.certificationId, "token-77");
  assert.strictEqual(release.blockchainStatus, "minted");
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

test("high Song Craft adds a controlled release bonus", function () {
  start();
  MCE.addRelease({
    id: "craft-release",
    title: "Signature Song",
    craftScore: 90,
    craftTier: "Signature Record"
  });

  var released = MCE.releaseSong("craft-release");
  assert.strictEqual(released.fans, 9);
  assert.strictEqual(released.xp, 10);
  assert.strictEqual(released.releases[0].releaseCraftBonusFans, 6);
  assert.strictEqual(released.releases[0].releaseCraftBonusXp, 5);
});

test("Song Craft strengthens manager promotion without replacing manager value", function () {
  start();
  MCE.save({ cash: 500 });
  MCE.addRelease({
    id: "craft-promo",
    title: "Developed Song",
    craftScore: 80,
    craftTier: "Standout"
  });
  MCE.releaseSong("craft-promo");
  MCE.hireManager("hustler");

  var before = MCE.get();
  var promoted = MCE.promoteRelease("craft-promo");
  assert.strictEqual(promoted.fans - before.fans, 10);
  assert.strictEqual(promoted.xp - before.xp, 7);
});

test("Song Craft contributes transparent radio influence", function () {
  start();
  MCE.save({ cash: 1000, fans: 100, xp: 150 });
  MCE.addRelease({
    id: "craft-radio",
    title: "Radio Craft",
    craftScore: 90,
    craftTier: "Signature Record"
  });
  MCE.releaseSong("craft-radio");
  MCE.hireManager("hustler");

  var submitted = MCE.submitReleaseToRadio("craft-radio");
  assert.strictEqual(submitted.releases[0].radioCraftInfluence, 9);
  assert.strictEqual(submitted.releases[0].radioInfluence, 9);
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
  assert.strictEqual(promoted.fans, 9);
  assert.strictEqual(promoted.xp, 9);
  assert.strictEqual(promoted.releases[0].promotionCount, 1);
  assert.strictEqual(promoted.releases[0].promotionSpend, 25);
  assert.strictEqual(promoted.releases[0].promotionManager, "The Hustler");

  var again = MCE.promoteRelease("release-loop-2");
  assert.strictEqual(again.cash, 75);
  assert.strictEqual(again.fans, 9);
  assert.strictEqual(again.xp, 9);
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
  assert.strictEqual(submitted.cash, 140);
  assert.strictEqual(submitted.releases[0].radioStatus, "submitted");
  assert.strictEqual(submitted.releases[0].radioFeePaid, 60);
  assert.strictEqual(submitted.releases[0].radioManager, "The Hustler");
  assert.strictEqual(submitted.releases[0].radioInfluence, 0);
  assert.strictEqual(submitted.manager.radioSpend, 60);
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
  assert.strictEqual(quote.commission, 10);
  assert.strictEqual(quote.net, 90);

  var paid = MCE.payShow({ cash: 100, fans: 4, xp: 6 });
  assert.strictEqual(paid.cash, 140);
  assert.strictEqual(paid.fans, 4);
  assert.strictEqual(paid.xp, 6);
  assert.strictEqual(paid.manager.totalCommission, 10);
});

test("manager profiles create distinct career strategies", function () {
  start();
  assert.strictEqual(MCE.MANAGER_PROFILES.hustler.commissionPct, 10);
  assert.strictEqual(MCE.MANAGER_PROFILES.hustler.radioFee, 60);
  assert.strictEqual(MCE.MANAGER_PROFILES.connector.promotionFans, 11);
  assert.strictEqual(MCE.MANAGER_PROFILES.connector.radioInfluence, 12);
  assert.strictEqual(MCE.MANAGER_PROFILES.executive.promotionFans, 18);
  assert.strictEqual(MCE.MANAGER_PROFILES.executive.radioFee, 25);
  assert.strictEqual(MCE.MANAGER_PROFILES.executive.radioInfluence, 25);
});

test("manager upgrades require career milestones and only move upward", function () {
  start();
  MCE.save({ cash: 1200 });
  MCE.hireManager("hustler");

  assert.throws(function () {
    MCE.hireManager("connector");
  });

  MCE.save({ fans: 50, xp: 75 });
  var connector = MCE.hireManager("connector");
  assert.strictEqual(connector.manager.profileId, "connector");
  assert.strictEqual(connector.manager.role, "The Connector");

  assert.throws(function () {
    MCE.hireManager("hustler");
  });

  assert.throws(function () {
    MCE.hireManager("executive");
  });

  MCE.save({ fans: 100, xp: 150, cash: 1000 });
  var executive = MCE.hireManager("executive");
  assert.strictEqual(executive.manager.profileId, "executive");
  assert.strictEqual(executive.manager.role, "The Executive");
});

test("connector changes commission promotion and radio economics", function () {
  start();
  MCE.save({ cash: 1000, fans: 50, xp: 75 });
  MCE.hireManager("connector");

  var quote = MCE.getShowPayout(100);
  assert.strictEqual(quote.commission, 15);
  assert.strictEqual(quote.net, 85);

  MCE.addRelease({ id: "connector-song", title: "Network Record" });
  MCE.releaseSong("connector-song");
  var promoted = MCE.promoteRelease("connector-song");
  assert.strictEqual(promoted.releases[0].promotionManager, "The Connector");
  assert.strictEqual(promoted.releases[0].promotionSpend, 35);

  MCE.save({ fans: 100, xp: 150 });
  var submitted = MCE.submitReleaseToRadio("connector-song");
  assert.strictEqual(submitted.releases[0].radioFeePaid, 40);
  assert.strictEqual(submitted.releases[0].radioInfluence, 12);
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

test("Business Deck queues after two meaningful career actions", function () {
  start();
  MCE.addRelease({ id: "deck-song", title: "Deck Song" });
  var afterRelease = MCE.releaseSong("deck-song");
  assert.strictEqual(afterRelease.business.meter, 1);
  assert.strictEqual(afterRelease.business.pendingEventId, null);

  var afterShow = MCE.payShow({ cash: 20, fans: 2, xp: 1 });
  assert.strictEqual(afterShow.business.meter, 2);
  assert.strictEqual(afterShow.business.pendingEventId, "viral-street-clip");

  var event = MCE.getPendingBusinessEvent();
  assert.strictEqual(event.id, "viral-street-clip");
});

test("Business Deck choices apply reputation and cannot overspend", function () {
  start();
  MCE.addRelease({ id: "deck-choice", title: "Choice Song" });
  MCE.releaseSong("deck-choice");
  MCE.payShow({ cash: 0, fans: 0, xp: 0 });

  MCE.save({ cash: 0 });
  assert.throws(function () {
    MCE.resolveBusinessEvent("boost");
  });

  var resolved = MCE.resolveBusinessEvent("organic");
  assert.strictEqual(resolved.reputation, 52);
  assert.strictEqual(resolved.business.pendingEventId, null);
  assert.strictEqual(resolved.business.meter, 0);
  assert.strictEqual(resolved.business.history.length, 1);
  assert.strictEqual(resolved.day, 2);
});

test("opening slot card boosts the next show once", function () {
  start();
  MCE.save({
    cash: 400,
    xp: 10,
    business: {
      actionCount: 0,
      meter: 0,
      drawCursor: 1,
      pendingEventId: null,
      history: [],
      effects: {}
    }
  });
  MCE.addRelease({ id: "opening-song", title: "Opening Song" });
  MCE.releaseSong("opening-song");
  MCE.hireManager("hustler");

  var queued = MCE.get();
  assert.strictEqual(queued.business.pendingEventId, "opening-slot");
  var event = MCE.getPendingBusinessEvent();
  assert.strictEqual(event.id, "opening-slot");

  var resolved = MCE.resolveBusinessEvent("take-slot");
  assert.strictEqual(resolved.business.effects.showCashBonus, 45);
  assert.strictEqual(resolved.business.effects.showFanBonus, 6);
  assert.strictEqual(resolved.business.effects.showXpBonus, 3);

  var quote = MCE.getShowPayout(50);
  assert.strictEqual(quote.gross, 95);
  assert.strictEqual(quote.commission, 9);
  assert.strictEqual(quote.net, 86);

  var beforeFans = MCE.get().fans;
  var beforeXp = MCE.get().xp;
  var paid = MCE.payShow({ cash: 50, fans: 2, xp: 1 });
  assert.strictEqual(paid.fans, beforeFans + 8);
  assert.strictEqual(paid.xp, beforeXp + 4);
  assert.strictEqual(paid.business.effects.showCashBonus, 0);
  assert.strictEqual(paid.business.effects.showFanBonus, 0);
  assert.strictEqual(paid.business.effects.showXpBonus, 0);
});

test("content package card boosts the next manager promotion once", function () {
  start();
  MCE.save({ cash: 1200, fans: 60, xp: 80 });
  MCE.hireManager("connector");
  MCE.addRelease({ id: "promo-event", title: "Promo Event" });
  MCE.releaseSong("promo-event");

  MCE.save({
    business: {
      actionCount: 0,
      meter: 2,
      drawCursor: 0,
      pendingEventId: "studio-bundle",
      history: [],
      effects: {}
    }
  });

  var resolved = MCE.resolveBusinessEvent("buy-package");
  assert.strictEqual(resolved.business.effects.promotionFanBonus, 8);
  assert.strictEqual(resolved.business.effects.promotionXpBonus, 4);

  var fansBefore = resolved.fans;
  var xpBefore = resolved.xp;
  var promoted = MCE.promoteRelease("promo-event");
  assert.strictEqual(promoted.fans, fansBefore + 19);
  assert.strictEqual(promoted.xp, xpBefore + 10);
  assert.strictEqual(promoted.business.effects.promotionFanBonus, 0);
  assert.strictEqual(promoted.business.effects.promotionXpBonus, 0);
});

test("DJ pool card discounts and strengthens the next radio submission", function () {
  start();
  MCE.save({ cash: 1000, fans: 100, xp: 150 });
  MCE.hireManager("hustler");
  MCE.addRelease({ id: "radio-event", title: "Radio Event" });
  MCE.releaseSong("radio-event");

  MCE.save({
    business: {
      actionCount: 0,
      meter: 2,
      drawCursor: 0,
      pendingEventId: "dj-pool",
      history: [],
      effects: {}
    }
  });

  var resolved = MCE.resolveBusinessEvent("service-record");
  assert.strictEqual(resolved.business.effects.radioDiscount, 20);
  assert.strictEqual(resolved.business.effects.radioInfluenceBonus, 5);

  var cashBefore = resolved.cash;
  var submitted = MCE.submitReleaseToRadio("radio-event");
  assert.strictEqual(submitted.cash, cashBefore - 40);
  assert.strictEqual(submitted.releases[0].radioFeePaid, 40);
  assert.strictEqual(submitted.releases[0].radioInfluence, 5);
  assert.strictEqual(submitted.business.effects.radioDiscount, 0);
  assert.strictEqual(submitted.business.effects.radioInfluenceBonus, 0);
});

test("every Business Deck card has a no-cash escape choice", function () {
  MCE.BUSINESS_EVENTS.forEach(function (event) {
    var freeChoice = event.choices.some(function (choice) {
      return Number(choice.cost || 0) === 0;
    });
    assert.strictEqual(freeChoice, true, event.id + " must have a free choice");
  });
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
