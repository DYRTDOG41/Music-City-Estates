var assert = require("assert");
var Assets = require("./music_city_assets.js");

var passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log("ok - " + name);
}

test("record splits must total exactly 100 percent", function () {
  assert.strictEqual(
    Assets.splitTotal([
      { name: "Artist", percentage: 40 },
      { name: "Producer", percentage: 25 },
      { name: "Writer", percentage: 20 },
      { name: "Engineer", percentage: 5 },
      { name: "Other", percentage: 10 }
    ]),
    100
  );
});

test("certification rejects incomplete rights checklist", function () {
  var result = Assets.validateCertificationInput({
    title: "Test",
    artist: "Nova",
    credits: [{ role: "Artist", name: "Nova" }],
    splits: [{ role: "Artist", name: "Nova", percentage: 100 }],
    rights: {
      masterRightsConfirmed: true,
      creditsApproved: false,
      sampleRightsConfirmed: true,
      aiTermsConfirmed: true
    }
  });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(function (error) {
    return /approved/i.test(error);
  }));
});

test("certification accepts complete rights and splits", function () {
  var result = Assets.validateCertificationInput({
    title: "Test",
    artist: "Nova",
    credits: [
      { role: "Artist", name: "Nova" },
      { role: "Producer", name: "Beatmaker" }
    ],
    splits: [
      { role: "Artist", name: "Nova", percentage: 60 },
      { role: "Producer", name: "Beatmaker", percentage: 40 }
    ],
    rights: {
      masterRightsConfirmed: true,
      creditsApproved: true,
      sampleRightsConfirmed: true,
      aiTermsConfirmed: true
    }
  });
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.splitTotal, 100);
});

test("canonical passport JSON is deterministic", function () {
  var left = Assets.canonicalJson({ b: 2, a: { y: 2, x: 1 } });
  var right = Assets.canonicalJson({ a: { x: 1, y: 2 }, b: 2 });
  assert.strictEqual(left, right);
});

console.log("\n" + passed + " certification tests passed");
