var assert = require("assert");
var Craft = require("./music_city_song_craft.js");

var passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log("ok - " + name);
}

test("prompt-only first pass remains a quick draft", function () {
  var report = Craft.scoreSong({
    title: "Late Night",
    lyrics: "make a dark melodic song",
    style: "melodic trap",
    revisionCount: 0
  });
  assert.ok(report.score < 35);
  assert.strictEqual(report.tier, "Quick Draft");
});

test("artist-written lyrics materially raise authorship", function () {
  var lyrics = [
    "I took the long road home with a city on my back",
    "Every red light felt like a promise I could not take back",
    "Mama said keep your name clean when the money gets loud",
    "So I learned how to hear my own voice through the crowd"
  ].join("\n");

  var plain = Craft.scoreSong({
    title: "Long Road",
    lyrics: lyrics,
    style: "soulful southern hip-hop",
    originalLyricsConfirmed: false
  });

  var authored = Craft.scoreSong({
    title: "Long Road",
    lyrics: lyrics,
    style: "soulful southern hip-hop",
    originalLyricsConfirmed: true
  });

  assert.ok(authored.score > plain.score);
  assert.ok(authored.breakdown.authorship >= 18);
});

test("human reference and revisions reward deeper creative process", function () {
  var base = Craft.scoreSong({
    title: "Pressure",
    lyrics: "my original verse has enough words to establish an idea and direction for the song",
    style: "dark cinematic trap with live piano and dry drums",
    originalLyricsConfirmed: true,
    beat: "808 Pressure",
    audioAttached: false,
    revisionCount: 0
  });

  var developed = Craft.scoreSong({
    title: "Pressure",
    lyrics: "my original verse has enough words to establish an idea and direction for the song",
    style: "dark cinematic trap with live piano and dry drums",
    originalLyricsConfirmed: true,
    beat: "808 Pressure",
    audioAttached: true,
    referenceDurationMs: 18000,
    mode: "Use Recording as Reference",
    vocalStyle: "Reference-Guided Production",
    revisionCount: 3
  });

  assert.ok(developed.score > base.score);
  assert.ok(developed.breakdown.performance >= 17);
  assert.strictEqual(developed.breakdown.revision, 17);
});

test("four revision passes max the revision category", function () {
  var report = Craft.scoreSong({ revisionCount: 9 });
  assert.strictEqual(report.breakdown.revision, 20);
});

test("score always stays between zero and one hundred", function () {
  var report = Craft.scoreSong({
    title: "Everything",
    lyrics: Array(200).fill("original").join(" "),
    style: Array(50).fill("specific").join(" "),
    originalLyricsConfirmed: true,
    audioAttached: true,
    referenceDurationMs: 999999,
    beat: "Beat",
    revisionCount: 99,
    creativity: 0,
    influence: 100,
    mode: "Use Recording as Reference",
    vocalStyle: "Reference-Guided Production"
  });
  assert.ok(report.score >= 0);
  assert.ok(report.score <= 100);
  assert.strictEqual(report.tier, "Signature Record");
});

console.log("\n" + passed + " song craft tests passed");
