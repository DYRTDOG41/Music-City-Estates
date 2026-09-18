var assert = require("assert");

function splitTotal(splits) {
  return splits.reduce(function (sum, split) {
    return sum + Number(split.percentage || 0);
  }, 0);
}

function validate(data) {
  var errors = [];
  var total = splitTotal(data.splits || []);
  if (Math.abs(total - 100) > 0.001) errors.push("splits");
  if (!data.rights.masterRightsConfirmed) errors.push("master");
  if (!data.rights.creditsApproved) errors.push("credits");
  if (!data.rights.sampleRightsConfirmed) errors.push("samples");
  if (!data.rights.aiTermsConfirmed) errors.push("ai");
  return errors;
}

var passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log("ok - " + name);
}

test("record splits must total exactly 100 percent", function () {
  assert.strictEqual(splitTotal([
    { percentage: 40 },
    { percentage: 25 },
    { percentage: 20 },
    { percentage: 5 },
    { percentage: 10 }
  ]), 100);
});

test("certification rejects incomplete rights checklist", function () {
  var errors = validate({
    splits: [{ percentage: 100 }],
    rights: {
      masterRightsConfirmed: true,
      creditsApproved: false,
      sampleRightsConfirmed: true,
      aiTermsConfirmed: true
    }
  });
  assert.ok(errors.indexOf("credits") >= 0);
});

test("certification accepts complete rights and splits", function () {
  var errors = validate({
    splits: [{ percentage: 60 }, { percentage: 40 }],
    rights: {
      masterRightsConfirmed: true,
      creditsApproved: true,
      sampleRightsConfirmed: true,
      aiTermsConfirmed: true
    }
  });
  assert.strictEqual(errors.length, 0);
});

console.log("\n" + passed + " certification tests passed");
