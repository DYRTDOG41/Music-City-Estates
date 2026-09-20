(function (root) {
  "use strict";

  var DB_NAME = "music-city-cinema";
  var DB_VERSION = 1;
  var STORE_NAME = "videos";

  function openDb() {
    return new Promise(function (resolve, reject) {
      if (!root.indexedDB) {
        reject(new Error("This browser does not support local cinema storage."));
        return;
      }
      var request = root.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () {
        reject(request.error || new Error("Music City could not open cinema storage."));
      };
    });
  }

  async function useStore(mode, work) {
    var db = await openDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE_NAME, mode);
      var result;
      try {
        result = work(tx.objectStore(STORE_NAME));
      } catch (error) {
        db.close();
        reject(error);
        return;
      }
      tx.oncomplete = function () { db.close(); resolve(result); };
      tx.onerror = tx.onabort = function () {
        var error = tx.error || new Error("Cinema storage operation failed.");
        db.close();
        reject(error);
      };
    });
  }

  async function saveVideo(video) {
    if (!video || !video.id || !video.videoBlob) {
      throw new Error("A video file and submission ID are required.");
    }
    var payload = {
      id: String(video.id),
      title: String(video.title || "Untitled Video"),
      creator: String(video.creator || "Music City Creator"),
      contentType: String(video.contentType || "short-film"),
      productionMethod: String(video.productionMethod || "live-action"),
      aiTools: String(video.aiTools || ""),
      createdAt: video.createdAt || new Date().toISOString(),
      fileName: String(video.fileName || "video"),
      mimeType: String(video.mimeType || video.videoBlob.type || "video/mp4"),
      size: Number(video.size || video.videoBlob.size || 0),
      videoBlob: video.videoBlob
    };
    await useStore("readwrite", function (store) { store.put(payload); });
    return payload;
  }

  async function listVideos() {
    var db = await openDb();
    return new Promise(function (resolve, reject) {
      var request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
      request.onsuccess = function () {
        var values = (request.result || []).sort(function (a, b) {
          return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
        });
        db.close();
        resolve(values);
      };
      request.onerror = function () {
        var error = request.error || new Error("Music City could not load cinema submissions.");
        db.close();
        reject(error);
      };
    });
  }

  async function deleteVideo(id) {
    await useStore("readwrite", function (store) { store.delete(String(id)); });
  }

  root.MusicCityCinema = {
    saveVideo: saveVideo,
    listVideos: listVideos,
    deleteVideo: deleteVideo
  };
})(window);
