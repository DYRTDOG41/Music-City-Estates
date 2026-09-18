(function (root) {
  "use strict";

  var CONFIG = {
    network: "shadownet",
    rpcUrl: "https://rpc.shadownet.teztnets.com",
    explorerBase: "https://shadownet.tzkt.io",
    tutorialMintContract: "KT1NbqYinUijW68V3fxboo4EzQPFgRcdfaYQ",
    symbol: "MCE"
  };

  function clean(value, fallback) {
    var text = String(value == null ? "" : value).trim();
    return text || (fallback || "");
  }

  function isMediaUri(value) {
    var uri = clean(value);
    return /^ipfs:\/\//i.test(uri) || /^https:\/\//i.test(uri);
  }

  function creatorsFromPassport(passport) {
    var names = [];
    if (passport && passport.artist) names.push(passport.artist);
    (passport && passport.credits || []).forEach(function (credit) {
      if (
        credit &&
        /artist|songwriter|producer|engineer/i.test(clean(credit.role)) &&
        clean(credit.name) &&
        names.indexOf(clean(credit.name)) < 0
      ) {
        names.push(clean(credit.name));
      }
    });
    return names;
  }

  function contributorsFromPassport(passport) {
    return (passport && passport.credits || [])
      .map(function (credit) { return clean(credit.name); })
      .filter(Boolean)
      .filter(function (name, index, all) {
        return all.indexOf(name) === index;
      });
  }

  function buildTzip21Metadata(passport, media) {
    if (!passport || !passport.id) {
      throw new Error("A Record Passport is required.");
    }

    var input = media && typeof media === "object" ? media : {};
    var artifactUri = clean(input.artifactUri);

    if (!isMediaUri(artifactUri)) {
      throw new Error("A valid IPFS or HTTPS artifact URI is required.");
    }

    var assetClass = clean(input.assetClass, "certified-record");
    var isVideo = /^video\//i.test(clean(input.mimeType));
    var title = clean(
      input.title,
      assetClass === "video-edition"
        ? passport.title + " — Visual Edition"
        : passport.title + " — Music City Certified Record"
    );

    var description =
      assetClass === "video-edition"
        ? "Official visual edition tied to Music City Record Passport " + passport.id + "."
        : "Music City Certified Record credential tied to Record Passport " + passport.id + ".";

    var format = {
      uri: artifactUri,
      mimeType: clean(input.mimeType, "audio/mpeg")
    };

    if (input.fileSize) format.fileSize = Number(input.fileSize);
    if (clean(input.fileName)) format.fileName = clean(input.fileName);
    if (clean(input.mediaHash)) format.hash = clean(input.mediaHash);
    if (clean(input.duration)) format.duration = clean(input.duration);

    var metadata = {
      name: title,
      symbol: CONFIG.symbol,
      decimals: "0",
      description: description,
      artifactUri: artifactUri,
      displayUri: clean(input.displayUri, artifactUri),
      thumbnailUri: clean(input.thumbnailUri, clean(input.displayUri, artifactUri)),
      externalUri: clean(input.externalUri),
      creators: creatorsFromPassport(passport),
      contributors: contributorsFromPassport(passport),
      date: passport.passportReadyAt || new Date().toISOString(),
      rights:
        "Music City Record Passport provenance credential. Token ownership alone does not transfer copyright, publishing, master ownership, or royalties.",
      isBooleanAmount: true,
      isTransferable: assetClass === "video-edition",
      tags: [
        "Music City Estates",
        "Record Passport",
        assetClass === "video-edition" ? "Video Edition" : "Certified Record",
        passport.craft && passport.craft.tier || "Music"
      ],
      formats: [format],
      attributes: [
        { name: "Record Passport", value: passport.id },
        { name: "Master SHA-256", value: passport.master && passport.master.sha256 || "" },
        { name: "Passport Metadata SHA-256", value: passport.metadataHash && passport.metadataHash.sha256 || "" },
        { name: "Split Agreement SHA-256", value: passport.splitAgreement && passport.splitAgreement.sha256 || "" },
        { name: "Craft Score", value: String(passport.craft && passport.craft.score || 0), type: "integer" },
        { name: "Craft Tier", value: passport.craft && passport.craft.tier || "Quick Draft" },
        { name: "AI Assisted", value: passport.aiAssistance && passport.aiAssistance.used ? "Yes" : "No" },
        { name: "Asset Class", value: assetClass }
      ]
    };

    if (isVideo) {
      metadata.tags.push("Video");
    }

    if (!metadata.externalUri) delete metadata.externalUri;

    return metadata;
  }

  function buildDirectTokenFields(passport, media) {
    var metadata = buildTzip21Metadata(passport, media);
    var input = media || {};

    var fields = {
      name: metadata.name,
      symbol: metadata.symbol,
      decimals: "0",
      artifactUri: metadata.artifactUri,
      displayUri: metadata.displayUri,
      thumbnailUri: metadata.thumbnailUri,
      description: metadata.description,
      recordPassport: passport.id,
      masterSha256: passport.master && passport.master.sha256 || "",
      passportSha256: passport.metadataHash && passport.metadataHash.sha256 || "",
      splitSha256: passport.splitAgreement && passport.splitAgreement.sha256 || "",
      craftScore: String(passport.craft && passport.craft.score || 0),
      craftTier: passport.craft && passport.craft.tier || "Quick Draft",
      assetClass: clean(input.assetClass, "certified-record"),
      mimeType: clean(input.mimeType, "audio/mpeg")
    };

    if (clean(input.metadataUri)) {
      fields[""] = clean(input.metadataUri);
    }

    if (clean(input.mediaHash)) {
      fields.mediaSha256 = clean(input.mediaHash);
    }

    return fields;
  }

  function validateMintPreparation(passport, media) {
    var errors = [];
    var input = media && typeof media === "object" ? media : {};

    if (!passport || !passport.id) errors.push("Record Passport is required.");
    if (!isMediaUri(input.artifactUri)) {
      errors.push("Artifact URI must be an ipfs:// or https:// URI.");
    }

    if (clean(input.assetClass) === "video-edition") {
      if (!/^video\//i.test(clean(input.mimeType))) {
        errors.push("Video Edition requires a video MIME type.");
      }
      if (!isMediaUri(input.displayUri) && !isMediaUri(input.thumbnailUri)) {
        errors.push("Video Edition needs a display or thumbnail URI for wallets.");
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  function explorerOperationUrl(opHash) {
    return CONFIG.explorerBase + "/" + encodeURIComponent(clean(opHash));
  }

  root.MusicCityTezos = {
    CONFIG: CONFIG,
    isMediaUri: isMediaUri,
    buildTzip21Metadata: buildTzip21Metadata,
    buildDirectTokenFields: buildDirectTokenFields,
    validateMintPreparation: validateMintPreparation,
    explorerOperationUrl: explorerOperationUrl
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = root.MusicCityTezos;
  }
})(typeof window !== "undefined" ? window : globalThis);
