(function (root) {
  var CAREER_KEY = "mce-save";
  var WORLD_KEYS = {
    fans: "mceFans",
    cash: "mceCash",
    xp: "mceXP",
    level: "mceLevel"
  };

  var DEFAULTS = {
    name: "Rookie",
    cash: 100,
    fans: 0,
    xp: 0,
    day: 1,
    level: 1,
    songs: 0,
    battles: 0,
    releases: [],
    flags: {},
    version: 1
  };

  var UNLOCKS = {
    studio: { label: "Your home base" },
    cafe: { xp: 10, label: "Requires 10 XP" },
    battle: { fans: 25, label: "Requires 25 fans" },
    nightclub: { fans: 50, xp: 75, label: "50 fans · 75 XP" },
    hiphop: { fans: 100, xp: 150, label: "100 fans · 150 XP" },
    rnb: { fans: 175, xp: 250, label: "175 fans · 250 XP" },
    downtown: { fans: 300, xp: 400, label: "300 fans · 400 XP" }
  };

  var CAREER_TITLES = [
    { xp: 400, title: "City Headliner" },
    { xp: 250, title: "Rising Star" },
    { xp: 150, title: "Local Favorite" },
    { xp: 75, title: "Opening Act" },
    { xp: 10, title: "Cafe Performer" },
    { xp: 0, title: "Bedroom Artist" }
  ];

  var XP_PER_LEVEL = 100;
  var memoryStore = {};
  var current = null;

  function storage() {
    if (api._storage) return api._storage;
    try {
      if (root.localStorage) return root.localStorage;
    } catch (err) {}
    return {
      getItem: function (key) {
        return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
      },
      setItem: function (key, value) {
        memoryStore[key] = String(value);
      },
      removeItem: function (key) {
        delete memoryStore[key];
      }
    };
  }

  function toNumber(value, fallback) {
    if (value === null || value === undefined || value === "") return fallback;
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function toCount(value, fallback) {
    var n = toNumber(value, fallback);
    if (n < 0) return fallback;
    return Math.floor(n);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readCareer() {
    var raw = storage().getItem(CAREER_KEY);
    if (raw === null || raw === undefined || raw === "") return null;
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      return parsed;
    } catch (err) {
      return null;
    }
  }

  function readWorldNumber(key) {
    var raw = storage().getItem(key);
    if (raw === null || raw === undefined || raw === "") return null;
    var n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  function numericLevel(xp, stored) {
    var fromXp = 1 + Math.floor(Math.max(0, toCount(xp, 0)) / XP_PER_LEVEL);
    return Math.max(1, toCount(stored, 1), fromXp);
  }

  function normalizeRelease(item, index) {
    if (!item || typeof item !== "object") {
      return {
        id: "release-" + (index + 1),
        title: "Bedroom Demo #" + (index + 1),
        source: "unknown"
      };
    }
    return {
      id: String(item.id || "release-" + (index + 1)),
      title: String(item.title || "Untitled"),
      source: String(item.source || "unknown"),
      day: item.day == null ? undefined : toCount(item.day, undefined),
      createdAt: item.createdAt || undefined
    };
  }

  function normalize(source) {
    var src = source && typeof source === "object" ? source : {};
    var releases = Array.isArray(src.releases) ? src.releases.map(normalizeRelease) : [];
    var songs = Math.max(toCount(src.songs, 0), releases.length);
    var flags = src.flags && typeof src.flags === "object" && !Array.isArray(src.flags) ? clone(src.flags) : {};
    var name = typeof src.name === "string" && src.name.trim() ? src.name.trim() : DEFAULTS.name;
    return {
      name: name,
      cash: toCount(src.cash, DEFAULTS.cash),
      fans: toCount(src.fans, DEFAULTS.fans),
      xp: toCount(src.xp, DEFAULTS.xp),
      day: Math.max(1, toCount(src.day, DEFAULTS.day)),
      level: numericLevel(src.xp, src.level),
      songs: songs,
      battles: toCount(src.battles, DEFAULTS.battles),
      releases: releases,
      flags: flags,
      version: 1
    };
  }

  function pickName(career) {
    if (career && typeof career.name === "string" && career.name.trim()) return career.name.trim();
    return DEFAULTS.name;
  }

  function maxField(a, b, fallback) {
    var left = a === null || a === undefined ? null : toNumber(a, null);
    var right = b === null || b === undefined ? null : toNumber(b, null);
    if (left === null && right === null) return fallback;
    if (left === null) return right;
    if (right === null) return left;
    return Math.max(left, right);
  }

  function worldLooksUnused(world) {
    if (!world) return true;
    var noFans = world.fans === null || world.fans === 0;
    var noXp = world.xp === null || world.xp === 0;
    var starterLevel = world.level === null || world.level === 1;
    var starterCash = world.cash === null || world.cash === 500;
    return noFans && noXp && starterLevel && starterCash;
  }

  function migrate(career, world) {
    var merged = clone(DEFAULTS);
    if (career) {
      merged.name = pickName(career);
      merged.cash = toCount(career.cash, merged.cash);
      merged.fans = toCount(career.fans, merged.fans);
      merged.xp = toCount(career.xp, merged.xp);
      merged.day = Math.max(1, toCount(career.day, merged.day));
      merged.songs = toCount(career.songs, merged.songs);
      merged.battles = toCount(career.battles, merged.battles);
      merged.level = toCount(career.level, merged.level);
      if (Array.isArray(career.releases)) merged.releases = career.releases.map(normalizeRelease);
      if (career.flags && typeof career.flags === "object") merged.flags = clone(career.flags);
    }
    merged.fans = maxField(career ? merged.fans : null, world.fans, DEFAULTS.fans);
    merged.xp = maxField(career ? merged.xp : null, world.xp, DEFAULTS.xp);
    merged.level = maxField(career ? merged.level : null, world.level, DEFAULTS.level);
    if (career && worldLooksUnused(world)) {
      merged.cash = toCount(career.cash, DEFAULTS.cash);
    } else {
      merged.cash = maxField(career ? merged.cash : null, world.cash, DEFAULTS.cash);
    }
    return normalize(merged);
  }

  function persist(state) {
    var store = storage();
    var careerPayload = {
      name: state.name,
      cash: state.cash,
      fans: state.fans,
      xp: state.xp,
      day: state.day,
      songs: state.songs,
      battles: state.battles,
      level: state.level,
      releases: state.releases,
      flags: state.flags,
      version: 1
    };
    store.setItem(CAREER_KEY, JSON.stringify(careerPayload));
    store.setItem(WORLD_KEYS.fans, String(state.fans));
    store.setItem(WORLD_KEYS.cash, String(state.cash));
    store.setItem(WORLD_KEYS.xp, String(state.xp));
    store.setItem(WORLD_KEYS.level, String(state.level));
  }

  function snapshot() {
    return clone(current || DEFAULTS);
  }

  function load() {
    current = migrate(readCareer(), {
      fans: readWorldNumber(WORLD_KEYS.fans),
      cash: readWorldNumber(WORLD_KEYS.cash),
      xp: readWorldNumber(WORLD_KEYS.xp),
      level: readWorldNumber(WORLD_KEYS.level)
    });
    persist(current);
    return snapshot();
  }

  function save(next) {
    if (!current) load();
    current = normalize(Object.assign({}, current, next || {}));
    persist(current);
    return snapshot();
  }

  function add(delta) {
    if (!current) load();
    var next = snapshot();
    var keys = ["cash", "fans", "xp", "day", "songs", "battles", "level"];
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (delta && delta[key] != null) next[key] = toNumber(next[key], 0) + toNumber(delta[key], 0);
    }
    if (delta && delta.name) next.name = delta.name;
    return save(next);
  }

  function addRelease(release) {
    if (!current) load();
    var next = snapshot();
    var entry = normalizeRelease(Object.assign({
      id: "release-" + Date.now(),
      source: "studio",
      day: next.day
    }, release || {}), next.releases.length);
    next.releases.push(entry);
    next.songs = Math.max(next.songs, next.releases.length);
    return save(next);
  }

  function meets(req, state) {
    var s = state || current || load();
    if (!req) return true;
    if (req.fans != null && s.fans < req.fans) return false;
    if (req.xp != null && s.xp < req.xp) return false;
    if (req.level != null && s.level < req.level) return false;
    if (req.day != null && s.day < req.day) return false;
    return true;
  }

  function isUnlocked(id, state) {
    return meets(UNLOCKS[id], state);
  }

  function needed(req, state) {
    var s = state || current || load();
    req = req || {};
    return {
      fans: Math.max(0, toCount(req.fans, 0) - s.fans),
      xp: Math.max(0, toCount(req.xp, 0) - s.xp)
    };
  }

  function getCareerTitle(state) {
    var s = state || current || load();
    for (var i = 0; i < CAREER_TITLES.length; i++) {
      if (s.xp >= CAREER_TITLES[i].xp) return CAREER_TITLES[i].title;
    }
    return CAREER_TITLES[CAREER_TITLES.length - 1].title;
  }

  function resetForTests(store) {
    current = null;
    memoryStore = {};
    api._storage = store || null;
  }

  var api = {
    DEFAULTS: clone(DEFAULTS),
    UNLOCKS: UNLOCKS,
    CAREER_TITLES: CAREER_TITLES,
    KEYS: {
      career: CAREER_KEY,
      fans: WORLD_KEYS.fans,
      cash: WORLD_KEYS.cash,
      xp: WORLD_KEYS.xp,
      level: WORLD_KEYS.level
    },
    XP_PER_LEVEL: XP_PER_LEVEL,
    load: load,
    save: save,
    get: function () {
      if (!current) load();
      return snapshot();
    },
    set: save,
    add: add,
    addRelease: addRelease,
    meets: meets,
    isUnlocked: isUnlocked,
    needed: needed,
    getCareerTitle: getCareerTitle,
    numericLevel: numericLevel,
    resetForTests: resetForTests
  };

  root.MCE = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
