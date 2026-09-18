(function (root) {
  "use strict";

  var DB_NAME = "music-city-estates";
  var DB_VERSION = 1;
  var STORE_NAME = "tracks";

  function openDb() {
    return new Promise(function (resolve, reject) {
      if (!root.indexedDB) {
        reject(new Error("This browser does not support local song storage."));
        return;
      }

      var request = root.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = function () {
        resolve(request.result);
      };

      request.onerror = function () {
        reject(request.error || new Error("Music City could not open the song catalog."));
      };
    });
  }

  async function withStore(mode, work) {
    var db = await openDb();

    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE_NAME, mode);
      var store = tx.objectStore(STORE_NAME);
      var result;

      try {
        result = work(store);
      } catch (error) {
        db.close();
        reject(error);
        return;
      }

      tx.oncomplete = function () {
        db.close();
        resolve(result);
      };

      tx.onerror = function () {
        var error = tx.error || new Error("Music City catalog operation failed.");
        db.close();
        reject(error);
      };

      tx.onabort = function () {
        var error = tx.error || new Error("Music City catalog operation was cancelled.");
        db.close();
        reject(error);
      };
    });
  }

  async function saveTrack(track) {
    if (!track || !track.id) {
      throw new Error("A Music City track needs an ID before it can be saved.");
    }

    var payload = {
      id: String(track.id),
      title: String(track.title || "Untitled Song"),
      style: String(track.style || ""),
      studio: String(track.studio || ""),
      beat: String(track.beat || ""),
      provider: String(track.provider || ""),
      createdAt: track.createdAt || new Date().toISOString(),
      audioBlob: track.audioBlob || null
    };

    await withStore("readwrite", function (store) {
      store.put(payload);
    });

    return payload;
  }

  async function getTrack(id) {
    var db = await openDb();

    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE_NAME, "readonly");
      var request = tx.objectStore(STORE_NAME).get(String(id));

      request.onsuccess = function () {
        var value = request.result || null;
        db.close();
        resolve(value);
      };

      request.onerror = function () {
        var error = request.error || new Error("Music City could not read that song.");
        db.close();
        reject(error);
      };
    });
  }

  async function listTracks() {
    var db = await openDb();

    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE_NAME, "readonly");
      var request = tx.objectStore(STORE_NAME).getAll();

      request.onsuccess = function () {
        var values = (request.result || []).sort(function (a, b) {
          return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
        });
        db.close();
        resolve(values);
      };

      request.onerror = function () {
        var error = request.error || new Error("Music City could not load the song catalog.");
        db.close();
        reject(error);
      };
    });
  }

  async function deleteTrack(id) {
    await withStore("readwrite", function (store) {
      store.delete(String(id));
    });
  }

  root.MusicCityCatalog = {
    saveTrack: saveTrack,
    getTrack: getTrack,
    listTracks: listTracks,
    deleteTrack: deleteTrack
  };
})(window);
