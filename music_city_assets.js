(function (root) {
  "use strict";

  var DB_NAME = "music-city-assets";
  var DB_VERSION = 1;
  var CERT_STORE = "certificates";
  var ITEM_STORE = "items";
  var adapters = {};

  function clean(value, fallback) {
    var text = String(value == null ? "" : value).trim();
    return text || (fallback || "");
  }

  function openDb() {
    return new Promise(function (resolve, reject) {
      if (!root.indexedDB) {
        reject(new Error("This browser does not support Music City asset storage."));
        return;
      }

      var request = root.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains(CERT_STORE)) {
          db.createObjectStore(CERT_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(ITEM_STORE)) {
          db.createObjectStore(ITEM_STORE, { keyPath: "id" });
        }
      };

      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () {
        reject(request.error || new Error("Music City could not open the asset locker."));
      };
    });
  }

  async function storeValue(storeName, value) {
    var db = await openDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).put(value);
      tx.oncomplete = function () {
        db.close();
        resolve(value);
      };
      tx.onerror = function () {
        var error = tx.error || new Error("Music City asset save failed.");
        db.close();
        reject(error);
      };
    });
  }

  async function getValue(storeName, id) {
    var db = await openDb();
    return new Promise(function (resolve, reject) {
      var request = db.transaction(storeName, "readonly")
        .objectStore(storeName)
        .get(String(id));

      request.onsuccess = function () {
        var value = request.result || null;
        db.close();
        resolve(value);
      };
      request.onerror = function () {
        var error = request.error || new Error("Music City could not read that asset.");
        db.close();
        reject(error);
      };
    });
  }

  async function listValues(storeName) {
    var db = await openDb();
    return new Promise(function (resolve, reject) {
      var request = db.transaction(storeName, "readonly")
        .objectStore(storeName)
        .getAll();

      request.onsuccess = function () {
        var values = request.result || [];
        db.close();
        resolve(values);
      };
      request.onerror = function () {
        var error = request.error || new Error("Music City could not load the asset locker.");
        db.close();
        reject(error);
      };
    });
  }

  function stable(value) {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === "object") {
      var output = {};
      Object.keys(value).sort().forEach(function (key) {
        output[key] = stable(value[key]);
      });
      return output;
    }
    return value;
  }

  function canonicalJson(value) {
    return JSON.stringify(stable(value));
  }

  function bytesToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(function (byte) { return byte.toString(16).padStart(2, "0"); })
      .join("");
  }

  async function sha256Bytes(bytes) {
    if (!root.crypto || !root.crypto.subtle) {
      throw new Error("Secure hashing is not available in this browser.");
    }
    return bytesToHex(await root.crypto.subtle.digest("SHA-256", bytes));
  }

  async function sha256Blob(blob) {
    if (!(blob instanceof Blob) || !blob.size) {
      throw new Error("A finalized master audio file is required for certification.");
    }
    return sha256Bytes(await blob.arrayBuffer());
  }

  async function sha256Text(text) {
    var data = new TextEncoder().encode(String(text || ""));
    return sha256Bytes(data);
  }

  function normalizeCredits(credits) {
    return (Array.isArray(credits) ? credits : [])
      .map(function (credit) {
        return {
          role: clean(credit.role),
          name: clean(credit.name),
          walletAddress: clean(credit.walletAddress)
        };
      })
      .filter(function (credit) {
        return credit.role && credit.name;
      });
  }

  function normalizeSplits(splits) {
    return (Array.isArray(splits) ? splits : [])
      .map(function (split) {
        return {
          role: clean(split.role),
          name: clean(split.name),
          percentage: Number(split.percentage || 0),
          walletAddress: clean(split.walletAddress)
        };
      })
      .filter(function (split) {
        return split.name && split.percentage > 0;
      });
  }

  function splitTotal(splits) {
    return normalizeSplits(splits)
      .reduce(function (sum, split) { return sum + split.percentage; }, 0);
  }

  function validateCertificationInput(input) {
    var data = input || {};
    var errors = [];
    var credits = normalizeCredits(data.credits);
    var splits = normalizeSplits(data.splits);
    var total = splitTotal(splits);
    var rights = data.rights || {};

    if (!clean(data.title)) errors.push("Song title is required.");
    if (!clean(data.artist)) errors.push("Artist name is required.");
    if (!credits.length) errors.push("At least one credit is required.");
    if (!splits.length) errors.push("At least one split is required.");
    if (Math.abs(total - 100) > 0.001) {
      errors.push("Contributor splits must total exactly 100%.");
    }
    if (!rights.masterRightsConfirmed) {
      errors.push("Master-rights confirmation is required.");
    }
    if (!rights.creditsApproved) {
      errors.push("All credits and splits must be approved.");
    }
    if (!rights.sampleRightsConfirmed) {
      errors.push("Sample/beat rights must be cleared or confirmed.");
    }
    if (!rights.aiTermsConfirmed) {
      errors.push("AI/provider usage terms must be confirmed.");
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      credits: credits,
      splits: splits,
      splitTotal: total
    };
  }

  function certificateId(metadataHash) {
    return "MCE-" + metadataHash.slice(0, 12).toUpperCase();
  }

  async function issueCertificate(input) {
    var validation = validateCertificationInput(input);
    if (!validation.valid) {
      throw new Error(validation.errors.join(" "));
    }

    var masterHash = await sha256Blob(input.audioBlob);
    var splitDocument = {
      title: clean(input.title),
      artist: clean(input.artist),
      credits: validation.credits,
      splits: validation.splits,
      approvedAt: input.approvedAt || new Date().toISOString()
    };
    var splitAgreementHash = await sha256Text(canonicalJson(splitDocument));

    var passportCore = {
      schema: "music-city-record-passport/v1",
      trackId: clean(input.trackId),
      title: clean(input.title),
      artist: clean(input.artist),
      credits: validation.credits,
      splits: validation.splits,
      rights: {
        masterRightsConfirmed: true,
        creditsApproved: true,
        sampleRightsConfirmed: true,
        aiTermsConfirmed: true
      },
      aiAssistance: {
        used: Boolean(input.aiAssistance && input.aiAssistance.used),
        provider: clean(input.aiAssistance && input.aiAssistance.provider),
        model: clean(input.aiAssistance && input.aiAssistance.model),
        disclosure: clean(input.aiAssistance && input.aiAssistance.disclosure)
      },
      craft: {
        score: Number(input.craftScore || 0),
        tier: clean(input.craftTier, "Quick Draft"),
        revisionCount: Number(input.revisionCount || 0),
        originalLyricsConfirmed: Boolean(input.originalLyricsConfirmed)
      },
      master: {
        hashAlgorithm: "SHA-256",
        sha256: masterHash,
        mimeType: clean(input.audioBlob.type, "audio/mpeg"),
        byteLength: input.audioBlob.size
      },
      splitAgreement: {
        hashAlgorithm: "SHA-256",
        sha256: splitAgreementHash,
        totalPercentage: validation.splitTotal
      },
      passportReadyAt: new Date().toISOString()
    };

    var metadataHash = await sha256Text(canonicalJson(passportCore));
    var id = certificateId(metadataHash);

    var certificate = Object.assign({}, passportCore, {
      id: id,
      metadataHash: {
        algorithm: "SHA-256",
        sha256: metadataHash
      },
      chain: {
        provider: "none",
        network: "off-chain",
        status: "not-minted",
        tokenId: null,
        transactionId: null,
        explorerUrl: null
      },
      transferPolicy: "certificate-only-no-copyright-transfer"
    });

    await storeValue(CERT_STORE, certificate);

    await storeValue(ITEM_STORE, {
      id: "item-" + id,
      type: "certified-record",
      rarity: "certified",
      name: clean(input.title),
      certificateId: id,
      trackId: clean(input.trackId),
      createdAt: certificate.passportReadyAt,
      chainStatus: "not-minted"
    });

    return certificate;
  }

  async function getCertificate(id) {
    return getValue(CERT_STORE, id);
  }

  async function getCertificateForTrack(trackId) {
    var values = await listValues(CERT_STORE);
    var target = String(trackId);
    return values.find(function (certificate) {
      return String(certificate.trackId) === target;
    }) || null;
  }

  async function listCertificates() {
    var values = await listValues(CERT_STORE);
    return values.sort(function (a, b) {
      return String(b.passportReadyAt || "").localeCompare(String(a.passportReadyAt || ""));
    });
  }

  async function listItems() {
    var values = await listValues(ITEM_STORE);
    return values.sort(function (a, b) {
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
  }

  function registerChainAdapter(name, adapter) {
    if (!name || !adapter || typeof adapter.mint !== "function") {
      throw new Error("A blockchain adapter must provide a mint() function.");
    }
    adapters[String(name)] = adapter;
  }

  async function mintCertificate(certificateIdValue, providerName) {
    var certificate = await getCertificate(certificateIdValue);
    if (!certificate) throw new Error("Certified record not found.");

    var adapter = adapters[String(providerName || "")];
    if (!adapter) {
      throw new Error(
        "That blockchain provider is not connected yet. The Music City Record Passport is certified locally, but no token has been minted."
      );
    }

    var result = await adapter.mint(certificate);
    certificate.chain = {
      provider: clean(providerName),
      network: clean(result.network),
      status: "minted",
      tokenId: clean(result.tokenId),
      transactionId: clean(result.transactionId),
      explorerUrl: clean(result.explorerUrl),
      mintedAt: new Date().toISOString()
    };

    await storeValue(CERT_STORE, certificate);

    await storeValue(ITEM_STORE, {
      id: "item-" + certificate.id,
      type: "certified-record",
      rarity: "certified",
      name: certificate.title,
      certificateId: certificate.id,
      trackId: certificate.trackId,
      createdAt: certificate.chain.mintedAt,
      chainStatus: "minted",
      provider: certificate.chain.provider,
      tokenId: certificate.chain.tokenId
    });

    if (root.MCE && typeof root.MCE.markReleaseCertified === "function") {
      root.MCE.markReleaseCertified(certificate.trackId, certificate);
    }

    return certificate;
  }

  root.MusicCityAssets = {
    canonicalJson: canonicalJson,
    sha256Blob: sha256Blob,
    sha256Text: sha256Text,
    splitTotal: splitTotal,
    validateCertificationInput: validateCertificationInput,
    issueCertificate: issueCertificate,
    getCertificate: getCertificate,
    getCertificateForTrack: getCertificateForTrack,
    listCertificates: listCertificates,
    listItems: listItems,
    registerChainAdapter: registerChainAdapter,
    mintCertificate: mintCertificate
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = root.MusicCityAssets;
  }
})(typeof window !== "undefined" ? window : globalThis);
