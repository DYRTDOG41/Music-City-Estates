var assert = require("assert");
var Tezos = require("./music_city_tezos.js");

var passport = {
  id: "MCE-TEST123",
  title: "Midnight Drive",
  artist: "Nova",
  passportReadyAt: "2026-09-18T12:00:00.000Z",
  credits: [
    { role: "Artist", name: "Nova" },
    { role: "Producer", name: "Beatmaker" }
  ],
  master: { sha256: "masterhash" },
  metadataHash: { sha256: "passporthash" },
  splitAgreement: { sha256: "splithash" },
  craft: { score: 88, tier: "Signature Record" },
  aiAssistance: { used: true }
};

var passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log("ok - " + name);
}

test("certified record metadata binds to passport hashes", function () {
  var md = Tezos.buildTzip21Metadata(passport, {
    assetClass: "certified-record",
    artifactUri: "ipfs://audio",
    displayUri: "ipfs://cover",
    mimeType: "audio/mpeg",
    fileSize: 1234,
    mediaHash: "audiohash"
  });

  assert.strictEqual(md.artifactUri, "ipfs://audio");
  assert.strictEqual(md.isTransferable, false);
  assert.strictEqual(md.attributes[0].value, "MCE-TEST123");
  assert.ok(md.attributes.some(function (a) {
    return a.name === "Master SHA-256" && a.value === "masterhash";
  }));
});

test("video edition is transferable and carries multimedia format", function () {
  var md = Tezos.buildTzip21Metadata(passport, {
    assetClass: "video-edition",
    title: "Midnight Drive — Official Visual",
    artifactUri: "ipfs://video",
    displayUri: "ipfs://poster",
    thumbnailUri: "ipfs://thumb",
    mimeType: "video/mp4",
    mediaHash: "videohash"
  });

  assert.strictEqual(md.isTransferable, true);
  assert.strictEqual(md.formats[0].mimeType, "video/mp4");
  assert.ok(md.tags.indexOf("Video") >= 0);
});

test("video edition validation requires wallet-friendly preview media", function () {
  var result = Tezos.validateMintPreparation(passport, {
    assetClass: "video-edition",
    artifactUri: "ipfs://video",
    mimeType: "video/mp4"
  });
  assert.strictEqual(result.valid, false);
});

test("direct token fields include record provenance", function () {
  var fields = Tezos.buildDirectTokenFields(passport, {
    assetClass: "certified-record",
    artifactUri: "ipfs://audio",
    displayUri: "ipfs://cover",
    mimeType: "audio/mpeg"
  });

  assert.strictEqual(fields.recordPassport, "MCE-TEST123");
  assert.strictEqual(fields.masterSha256, "masterhash");
  assert.strictEqual(fields.passportSha256, "passporthash");
  assert.strictEqual(fields.splitSha256, "splithash");
});


test("contract routing starts on the tutorial fallback", function () {
  assert.strictEqual(
    Tezos.contractForAssetClass("certified-record"),
    Tezos.CONFIG.tutorialMintContract
  );
  assert.strictEqual(
    Tezos.contractForAssetClass("video-edition"),
    Tezos.CONFIG.tutorialMintContract
  );
  assert.strictEqual(
    Tezos.usingMusicCityContract("certified-record"),
    false
  );
});

test("deployment registry routes each asset class independently", function () {
  Tezos.saveDeployment("certifiedRecord", {
    address: "KT1CertifiedMusicCity123456789012345",
    network: "shadownet",
    transactionId: "opCertified",
    sourceCommit: "abc123"
  });

  assert.strictEqual(
    Tezos.contractForAssetClass("certified-record"),
    "KT1CertifiedMusicCity123456789012345"
  );
  assert.strictEqual(
    Tezos.contractForAssetClass("video-edition"),
    Tezos.CONFIG.tutorialMintContract
  );

  Tezos.saveDeployment("collectibles", {
    address: "KT1CollectiblesMusicCity12345678901",
    network: "shadownet",
    transactionId: "opCollectibles",
    sourceCommit: "abc123"
  });

  assert.strictEqual(
    Tezos.contractForAssetClass("video-edition"),
    "KT1CollectiblesMusicCity12345678901"
  );
  assert.strictEqual(
    Tezos.usingMusicCityContract("video-edition"),
    true
  );
});

test("deployment registry rejects non-KT1 addresses", function () {
  assert.throws(function () {
    Tezos.saveDeployment("certifiedRecord", {
      address: "tz1NotAContract",
      network: "shadownet"
    });
  });
});

test("compiled build URLs point to the public tezos-builds branch", function () {
  assert.strictEqual(
    Tezos.buildUrl("certifiedRecord", "contract.tz"),
    Tezos.CONFIG.buildBaseUrl + "/certified/contract.tz"
  );
  assert.strictEqual(
    Tezos.buildUrl("collectibles", "storage.tz"),
    Tezos.CONFIG.buildBaseUrl + "/collectibles/storage.tz"
  );
});

console.log("\n" + passed + " Tezos metadata/routing tests passed");
