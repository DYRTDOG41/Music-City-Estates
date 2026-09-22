(function (root) {
  var CAREER_KEY = "mce-save";
  var PLAYER_ID_KEY = "mce-player-id";
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
    reputation: 50,
    day: 1,
    level: 1,
    songs: 0,
    battles: 0,
    manager: {
      hired: false,
      profileId: null,
      role: "Independent Manager",
      hiredAt: null,
      totalCommission: 0,
      promotionSpend: 0,
      radioSpend: 0,
      syncSpend: 0,
      cinemaSpend: 0
    },
    business: {
      actionCount: 0,
      meter: 0,
      drawCursor: 0,
      pendingEventId: null,
      history: [],
      effects: {
        showCashBonus: 0,
        showFanBonus: 0,
        showXpBonus: 0,
        promotionFanBonus: 0,
        promotionXpBonus: 0,
        radioDiscount: 0,
        radioInfluenceBonus: 0
      }
    },
    releases: [],
    flags: {},
    version: 1
  };

  var UNLOCKS = {
    studio: { label: "Your home base" },
    cafe: { xp: 10, label: "Requires 10 XP" },
    battle: { fans: 25, label: "Requires 25 fans" },
    nightclub: { fans: 50, xp: 75, label: "50 fans · 75 XP" },
    radio: { fans: 100, xp: 150, label: "100 fans · 150 XP" },
    hiphop: { fans: 100, xp: 150, label: "100 fans · 150 XP" },
    rnb: { fans: 175, xp: 250, label: "175 fans · 250 XP" },
    downtown: { fans: 300, xp: 400, label: "300 fans · 400 XP" }
  };

  var PERKS = {
    socialMediaSuite: {
      id: "socialMediaSuite",
      label: "The Viral Gallery",
      description: "A permanent social media exhibit with rotating content screens and career campaign tools.",
      requires: { xp: 50 },
      price: 250
    }
  };

  var MANAGER_PROFILES = {
    hustler: {
      id: "hustler",
      name: "The Hustler",
      rank: 1,
      signingFee: 200,
      commissionPct: 10,
      promotionFee: 25,
      promotionFans: 6,
      promotionXp: 4,
      radioFee: 60,
      radioInfluence: 0,
      requires: { fans: 0, xp: 0 },
      specialty: "Keeps more of your show money."
    },
    connector: {
      id: "connector",
      name: "The Connector",
      rank: 2,
      signingFee: 450,
      commissionPct: 15,
      promotionFee: 35,
      promotionFans: 11,
      promotionXp: 6,
      radioFee: 40,
      radioInfluence: 12,
      requires: { fans: 50, xp: 75 },
      specialty: "Balanced promotion and stronger industry access."
    },
    executive: {
      id: "executive",
      name: "The Executive",
      rank: 3,
      signingFee: 900,
      commissionPct: 22,
      promotionFee: 50,
      promotionFans: 18,
      promotionXp: 9,
      radioFee: 25,
      radioInfluence: 25,
      requires: { fans: 100, xp: 150 },
      specialty: "Aggressive career growth and the strongest radio leverage."
    }
  };

  var ECONOMY = {
    managerHiringFee: MANAGER_PROFILES.hustler.signingFee,
    managerCommissionPct: MANAGER_PROFILES.hustler.commissionPct,
    managedPromotionFee: MANAGER_PROFILES.hustler.promotionFee,
    radioSubmissionFee: MANAGER_PROFILES.hustler.radioFee
  };

  var SYNC_BRIEFS = [
    {
      id: "midnight-run",
      title: "Midnight Run",
      production: "Action Film Trailer",
      scene: "A getaway car cuts through neon streets as the trailer builds to its final hit.",
      wants: ["hip-hop", "trap", "cinematic", "dark", "energetic"],
      avoids: "Uncleared samples, artist tags, or long intros",
      fee: 35,
      threshold: 58,
      reward: { cash: 180, fans: 10, xp: 16 }
    },
    {
      id: "last-light",
      title: "Last Light",
      production: "Drama End Credits",
      scene: "The lead walks away from home while the final credits begin to roll.",
      wants: ["r&b", "soul", "emotional", "acoustic", "melodic"],
      avoids: "Explicit lyrics or an abrupt ending",
      fee: 30,
      threshold: 54,
      reward: { cash: 155, fans: 8, xp: 14 }
    },
    {
      id: "city-after-dark",
      title: "City After Dark",
      production: "Streaming Series Montage",
      scene: "Friends move through clubs, rooftops, and late-night city blocks.",
      wants: ["upbeat", "pop", "hip-hop", "dance", "night"],
      avoids: "Slow openings or references to competing brands",
      fee: 25,
      threshold: 50,
      reward: { cash: 130, fans: 7, xp: 12 }
    }
  ];

  var CINEMA = {
    submissionFee: 20,
    submissionXp: 5,
    contentTypes: ["short-film", "music-video", "documentary", "performance", "visualizer"],
    productionMethods: ["live-action", "ai-generated", "hybrid"]
  };

  var BUSINESS_EVENTS = [
    {
      id: "viral-street-clip",
      title: "The Clip Is Moving",
      category: "Buzz",
      description: "A fan posts a performance clip and it starts moving around Music City overnight.",
      requires: {},
      choices: [
        {
          id: "boost",
          label: "Put $20 behind the clip",
          cost: 20,
          delta: { fans: 10, xp: 3, reputation: 1 },
          result: "The paid boost catches the wave while it is hot."
        },
        {
          id: "organic",
          label: "Let the fans carry it",
          cost: 0,
          delta: { fans: 4, reputation: 2 },
          result: "The smaller organic bump feels authentic and helps your reputation."
        }
      ]
    },
    {
      id: "opening-slot",
      title: "Last-Minute Opening Slot",
      category: "Live Opportunity",
      description: "A promoter has a hole on tonight's bill. You can take the stage, but travel and crew costs come out of your pocket.",
      requires: { xp: 10 },
      choices: [
        {
          id: "take-slot",
          label: "Pay $30 and take the slot",
          cost: 30,
          delta: { reputation: 2 },
          effects: { showCashBonus: 45, showFanBonus: 6, showXpBonus: 3 },
          result: "Your next paid show gets a stronger crowd and a better check."
        },
        {
          id: "pass",
          label: "Pass and protect the cash",
          cost: 0,
          delta: {},
          result: "You keep your money and wait for a cleaner opportunity."
        }
      ]
    },
    {
      id: "equipment-breakdown",
      title: "Mic Pack Failure",
      category: "Expense",
      description: "Your wireless mic pack starts cutting out right before a run of shows.",
      requires: { xp: 10 },
      choices: [
        {
          id: "replace",
          label: "Replace it properly — $35",
          cost: 35,
          delta: { reputation: 1 },
          result: "The problem is handled before it reaches the stage."
        },
        {
          id: "patch",
          label: "Patch it and keep moving — $10",
          cost: 10,
          delta: { reputation: -2 },
          effects: { showFanBonus: -3 },
          result: "The cheap fix works, but your next crowd may notice the rough edges."
        },
        {
          id: "borrow",
          label: "Borrow a house mic",
          cost: 0,
          delta: { reputation: -4 },
          effects: { showFanBonus: -5 },
          result: "You survive without spending cash, but the next performance looks less professional."
        }
      ]
    },
    {
      id: "merch-pop-up",
      title: "Merch Pop-Up",
      category: "Investment",
      description: "A local printer offers a short-run merch deal before your next show.",
      requires: { fans: 25 },
      choices: [
        {
          id: "full-run",
          label: "Invest $50 in a full run",
          cost: 50,
          effects: { showCashBonus: 90 },
          result: "If you perform again, the merch table can turn that investment into extra show income."
        },
        {
          id: "small-run",
          label: "Test a small run — $20",
          cost: 20,
          effects: { showCashBonus: 30 },
          result: "Lower upside, lower risk."
        },
        {
          id: "skip",
          label: "Skip merch for now",
          cost: 0,
          delta: {},
          result: "You keep your cash liquid."
        }
      ]
    },
    {
      id: "brand-sponsor",
      title: "Local Brand Wants In",
      category: "Sponsor",
      description: "A fast-growing streetwear brand offers cash for a post and stage mention.",
      requires: { fans: 25 },
      choices: [
        {
          id: "take-money",
          label: "Take the $120 deal",
          cost: 0,
          delta: { cash: 120, reputation: -4 },
          result: "The check clears, but some fans think the partnership feels forced."
        },
        {
          id: "protect-brand",
          label: "Turn it down",
          cost: 0,
          delta: { reputation: 3, xp: 2 },
          result: "You sacrifice the money and protect the artist brand."
        }
      ]
    },
    {
      id: "charity-benefit",
      title: "Community Benefit Show",
      category: "Reputation",
      description: "A neighborhood organizer asks you to support a benefit event with your name and time.",
      requires: { fans: 25 },
      choices: [
        {
          id: "show-up",
          label: "Cover $20 in costs and show up",
          cost: 20,
          delta: { fans: 10, xp: 8, reputation: 6 },
          result: "The community remembers that you showed up before the cameras did."
        },
        {
          id: "decline",
          label: "Decline the event",
          cost: 0,
          delta: { reputation: -1 },
          result: "You keep moving, but the missed goodwill costs a little."
        }
      ]
    },
    {
      id: "press-controversy",
      title: "Blog Headline Goes Sideways",
      category: "Crisis",
      description: "A local blog clips a quote out of context and the comments are getting ugly.",
      requires: { fans: 50 },
      choices: [
        {
          id: "publicist",
          label: "Pay $35 for a clean response",
          cost: 35,
          delta: { reputation: 6, xp: 2 },
          result: "The response slows the story and makes your team look professional."
        },
        {
          id: "clapback",
          label: "Clap back publicly",
          cost: 0,
          delta: { fans: 6, reputation: -6 },
          result: "The argument brings attention, but your reputation takes the hit."
        },
        {
          id: "ignore",
          label: "Ignore it",
          cost: 0,
          delta: { reputation: -2 },
          result: "The story cools off, but not before leaving a mark."
        }
      ]
    },
    {
      id: "dj-pool",
      title: "DJ Pool Window",
      category: "Radio",
      description: "Your manager gets a limited window with a DJ pool before your next radio push.",
      requires: { manager: true },
      choices: [
        {
          id: "service-record",
          label: "Spend $40 to service the record",
          cost: 40,
          delta: { reputation: 1 },
          effects: { radioDiscount: 20, radioInfluenceBonus: 5 },
          result: "Your next radio submission gets a discount and extra influence."
        },
        {
          id: "save-money",
          label: "Save the money",
          cost: 0,
          delta: { xp: 1 },
          result: "Your team passes on the window and keeps the budget intact."
        }
      ]
    },
    {
      id: "studio-bundle",
      title: "Content Package Deal",
      category: "Promotion",
      description: "A content crew offers a one-day package: cover art, vertical clips, and behind-the-scenes footage.",
      requires: { xp: 75, manager: true },
      choices: [
        {
          id: "buy-package",
          label: "Buy the package — $80",
          cost: 80,
          effects: { promotionFanBonus: 8, promotionXpBonus: 4 },
          result: "Your next manager campaign has more content to work with."
        },
        {
          id: "pass",
          label: "Keep the budget for shows",
          cost: 0,
          delta: {},
          result: "No campaign boost, but no new expense either."
        }
      ]
    },
    {
      id: "festival-deposit",
      title: "Festival Hold",
      category: "Big Bet",
      description: "A regional festival offers a performance hold if you can put down a deposit before the slot disappears.",
      requires: { fans: 50, xp: 75 },
      choices: [
        {
          id: "deposit",
          label: "Risk $75 on the slot",
          cost: 75,
          effects: { showCashBonus: 150, showFanBonus: 10, showXpBonus: 8 },
          result: "Your next show becomes a bigger-money, bigger-audience opportunity."
        },
        {
          id: "pass",
          label: "Pass on the festival",
          cost: 0,
          delta: {},
          result: "You avoid the risk and keep your bankroll."
        }
      ]
    },
    {
      id: "rival-diss",
      title: "A Rival Calls You Out",
      category: "Competition",
      description: "Another artist uses your name in a freestyle and the city is waiting to see what you do.",
      requires: { fans: 50 },
      choices: [
        {
          id: "respond",
          label: "Respond with a record",
          cost: 15,
          delta: { fans: 8, xp: 7, reputation: -3 },
          result: "The city loves the smoke, even if the business side looks a little messier."
        },
        {
          id: "outgrow",
          label: "Stay focused on the career",
          cost: 0,
          delta: { xp: 4, reputation: 3 },
          result: "You refuse the distraction and look more professional."
        }
      ]
    },
    {
      id: "business-license",
      title: "Paperwork Day",
      category: "Business Expense",
      description: "A permit and business filing come due at the worst possible time.",
      requires: { xp: 75 },
      choices: [
        {
          id: "pay-now",
          label: "Handle it now — $30",
          cost: 30,
          delta: { reputation: 2 },
          result: "The paperwork is clean and your operation stays professional."
        },
        {
          id: "delay",
          label: "Delay the filing",
          cost: 0,
          delta: { reputation: -4 },
          effects: { showCashBonus: -20 },
          result: "You keep the cash today, but the delay creates friction around your next paid show."
        }
      ]
    }
  ];

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

  function randomToken(prefix) {
    var raw = "";
    try {
      if (root.crypto && typeof root.crypto.randomUUID === "function") raw = root.crypto.randomUUID();
    } catch (error) {}
    if (!raw) raw = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
    return String(prefix || "mce") + "-" + raw;
  }

  function getPlayerId() {
    var store = storage();
    var existing = store.getItem(PLAYER_ID_KEY);
    if (existing) return String(existing);
    var id = randomToken("player");
    store.setItem(PLAYER_ID_KEY, id);
    return id;
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

  function normalizeManager(item) {
    var source = item && typeof item === "object" ? item : {};
    return {
      hired: Boolean(source.hired),
      profileId: source.profileId == null ? null : String(source.profileId),
      role: String(source.role || "Independent Manager"),
      hiredAt: source.hiredAt || null,
      totalCommission: toCount(source.totalCommission, 0),
      promotionSpend: toCount(source.promotionSpend, 0),
      radioSpend: toCount(source.radioSpend, 0),
      syncSpend: toCount(source.syncSpend, 0),
      cinemaSpend: toCount(source.cinemaSpend, 0)
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeBusiness(item) {
    var source = item && typeof item === "object" ? item : {};
    var effects = source.effects && typeof source.effects === "object" ? source.effects : {};
    var history = Array.isArray(source.history) ? source.history.slice(-20) : [];
    return {
      actionCount: toCount(source.actionCount, 0),
      meter: toCount(source.meter, 0),
      drawCursor: toCount(source.drawCursor, 0),
      pendingEventId: source.pendingEventId == null ? null : String(source.pendingEventId),
      history: history,
      effects: {
        showCashBonus: Math.floor(toNumber(effects.showCashBonus, 0)),
        showFanBonus: Math.floor(toNumber(effects.showFanBonus, 0)),
        showXpBonus: Math.floor(toNumber(effects.showXpBonus, 0)),
        promotionFanBonus: Math.floor(toNumber(effects.promotionFanBonus, 0)),
        promotionXpBonus: Math.floor(toNumber(effects.promotionXpBonus, 0)),
        radioDiscount: Math.max(0, Math.floor(toNumber(effects.radioDiscount, 0))),
        radioInfluenceBonus: Math.max(0, Math.floor(toNumber(effects.radioInfluenceBonus, 0)))
      }
    };
  }

  function businessEventById(id) {
    for (var i = 0; i < BUSINESS_EVENTS.length; i++) {
      if (BUSINESS_EVENTS[i].id === id) return BUSINESS_EVENTS[i];
    }
    return null;
  }

  function businessEventEligible(event, state) {
    var req = event && event.requires ? event.requires : {};
    if (req.fans != null && state.fans < req.fans) return false;
    if (req.xp != null && state.xp < req.xp) return false;
    if (req.manager && !(state.manager && state.manager.hired)) return false;
    return true;
  }

  function recentBusinessEventIds(state) {
    return (state.business.history || [])
      .slice(-3)
      .map(function (entry) { return entry.eventId; });
  }

  function queueBusinessEvent(state) {
    if (state.business.pendingEventId) return state;
    var recent = recentBusinessEventIds(state);
    var start = state.business.drawCursor % BUSINESS_EVENTS.length;
    var fallback = null;

    for (var offset = 0; offset < BUSINESS_EVENTS.length; offset++) {
      var index = (start + offset) % BUSINESS_EVENTS.length;
      var event = BUSINESS_EVENTS[index];
      if (!businessEventEligible(event, state)) continue;
      if (!fallback) fallback = { event: event, index: index };
      if (recent.indexOf(event.id) >= 0) continue;

      state.business.pendingEventId = event.id;
      state.business.drawCursor = index + 1;
      return state;
    }

    if (fallback) {
      state.business.pendingEventId = fallback.event.id;
      state.business.drawCursor = fallback.index + 1;
    }
    return state;
  }

  function advanceBusinessAction(state, trigger) {
    state.business.actionCount += 1;
    state.business.meter += 1;
    state.flags.lastBusinessAction = trigger || "career";
    if (state.business.meter >= 2 && !state.business.pendingEventId) {
      queueBusinessEvent(state);
    }
    return state;
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
      artistName: item.artistName == null ? undefined : String(item.artistName),
      source: String(item.source || "unknown"),
      day: item.day == null ? undefined : toCount(item.day, undefined),
      createdAt: item.createdAt || undefined,
      style: item.style == null ? undefined : String(item.style),
      studio: item.studio == null ? undefined : String(item.studio),
      beat: item.beat == null ? undefined : String(item.beat),
      provider: item.provider == null ? undefined : String(item.provider),
      audioKey: item.audioKey == null ? undefined : String(item.audioKey),
      craftScore: clamp(toCount(item.craftScore, 0), 0, 100),
      craftTier: item.craftTier == null ? "Quick Draft" : String(item.craftTier),
      craftBreakdown:
        item.craftBreakdown && typeof item.craftBreakdown === "object"
          ? clone(item.craftBreakdown)
          : {},
      revisionCount: toCount(item.revisionCount, 0),
      originalLyricsConfirmed: Boolean(item.originalLyricsConfirmed),
      releaseCraftBonusFans: toCount(item.releaseCraftBonusFans, 0),
      releaseCraftBonusXp: toCount(item.releaseCraftBonusXp, 0),
      releaseStatus: item.releaseStatus == null ? "draft" : String(item.releaseStatus),
      releasedAt: item.releasedAt || undefined,
      promotedAt: item.promotedAt || undefined,
      promotionCount: toCount(item.promotionCount, 0),
      promotionSpend: toCount(item.promotionSpend, 0),
      promotionManager: item.promotionManager == null ? undefined : String(item.promotionManager),
      radioStatus: item.radioStatus == null ? "not-submitted" : String(item.radioStatus),
      radioSubmittedAt: item.radioSubmittedAt || undefined,
      radioFeePaid: toCount(item.radioFeePaid, 0),
      radioManager: item.radioManager == null ? undefined : String(item.radioManager),
      radioInfluence: toCount(item.radioInfluence, 0),
      radioCraftInfluence: toCount(item.radioCraftInfluence, 0),
      syncSubmissions: Array.isArray(item.syncSubmissions)
        ? item.syncSubmissions.slice(-12).map(function (submission) {
            return {
              briefId: String(submission.briefId || "unknown"),
              briefTitle: String(submission.briefTitle || "Sync Brief"),
              submittedAt: submission.submittedAt || undefined,
              manager: String(submission.manager || "Artist Management"),
              feePaid: toCount(submission.feePaid, 0),
              score: clamp(toCount(submission.score, 0), 0, 100),
              outcome: submission.outcome === "placed" ? "placed" : "passed"
            };
          })
        : [],
      certificationStatus:
        item.certificationStatus == null ? "not-certified" : String(item.certificationStatus),
      passportId:
        item.passportId == null ? undefined : String(item.passportId),
      certificationId:
        item.certificationId == null ? undefined : String(item.certificationId),
      passportReadyAt: item.passportReadyAt || undefined,
      certifiedAt: item.certifiedAt || undefined,
      certificationMasterHash:
        item.certificationMasterHash == null ? undefined : String(item.certificationMasterHash),
      certificationMetadataHash:
        item.certificationMetadataHash == null ? undefined : String(item.certificationMetadataHash),
      blockchainStatus:
        item.blockchainStatus == null ? "not-minted" : String(item.blockchainStatus),
      blockchainNetwork:
        item.blockchainNetwork == null ? undefined : String(item.blockchainNetwork),
      blockchainContract:
        item.blockchainContract == null ? undefined : String(item.blockchainContract),
      blockchainTransaction:
        item.blockchainTransaction == null ? undefined : String(item.blockchainTransaction)
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
      reputation: clamp(toCount(src.reputation, DEFAULTS.reputation), 0, 100),
      day: Math.max(1, toCount(src.day, DEFAULTS.day)),
      level: numericLevel(src.xp, src.level),
      songs: songs,
      battles: toCount(src.battles, DEFAULTS.battles),
      manager: normalizeManager(src.manager),
      business: normalizeBusiness(src.business),
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
      merged.reputation = clamp(toCount(career.reputation, merged.reputation), 0, 100);
      merged.day = Math.max(1, toCount(career.day, merged.day));
      merged.songs = toCount(career.songs, merged.songs);
      merged.battles = toCount(career.battles, merged.battles);
      merged.level = toCount(career.level, merged.level);
      merged.manager = normalizeManager(career.manager);
      merged.business = normalizeBusiness(career.business);
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
      reputation: state.reputation,
      day: state.day,
      songs: state.songs,
      battles: state.battles,
      level: state.level,
      manager: state.manager,
      business: state.business,
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
    if (delta && delta.reputation != null) {
      next.reputation = clamp(
        toNumber(next.reputation, DEFAULTS.reputation) + toNumber(delta.reputation, 0),
        0,
        100
      );
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

  function findReleaseIndex(id, state) {
    var s = state || current || load();
    var target = String(id);
    for (var i = 0; i < s.releases.length; i++) {
      if (String(s.releases[i].id) === target) return i;
    }
    return -1;
  }

  function updateRelease(id, patch) {
    if (!current) load();
    var next = snapshot();
    var index = findReleaseIndex(id, next);
    if (index < 0) throw new Error("Song not found in Music City releases.");

    next.releases[index] = normalizeRelease(
      Object.assign({}, next.releases[index], patch || {}),
      index
    );

    return save(next);
  }

  function markReleasePassportReady(id, passport) {
    if (!current) load();
    var next = snapshot();
    var index = findReleaseIndex(id, next);
    if (index < 0) throw new Error("Song not found in Music City releases.");
    if (!passport || !passport.id || !passport.master) {
      throw new Error("A valid Music City Record Passport is required.");
    }

    var release = next.releases[index];
    release.certificationStatus = "passport-ready";
    release.passportId = String(passport.id);
    release.passportReadyAt = passport.passportReadyAt || passport.certifiedAt || new Date().toISOString();
    release.certificationMasterHash = String(passport.master.sha256 || "");
    release.certificationMetadataHash = String(
      passport.metadataHash && passport.metadataHash.sha256 || ""
    );
    release.blockchainStatus =
      passport.chain && passport.chain.status
        ? String(passport.chain.status)
        : "not-minted";

    next.releases[index] = normalizeRelease(release, index);
    return save(next);
  }

  function markReleaseCertified(id, certificate) {
    if (!certificate || !certificate.chain || certificate.chain.status !== "minted") {
      throw new Error("Music City certification requires a confirmed blockchain mint.");
    }

    if (!current) load();
    var next = snapshot();
    var index = findReleaseIndex(id, next);
    if (index < 0) throw new Error("Song not found in Music City releases.");

    var release = next.releases[index];
    var network = String(certificate.chain.network || "");
    var isMainnet = network.toLowerCase() === "mainnet";

    release.certificationStatus = isMainnet ? "certified" : "certified-testnet";
    release.passportId = String(certificate.id);
    release.certificationId = String(certificate.chain.tokenId || certificate.id);
    release.passportReadyAt = release.passportReadyAt || certificate.passportReadyAt || certificate.certifiedAt;
    release.certifiedAt = certificate.chain.mintedAt || new Date().toISOString();
    release.certificationMasterHash = String(certificate.master.sha256 || "");
    release.certificationMetadataHash = String(
      certificate.metadataHash && certificate.metadataHash.sha256 || ""
    );
    release.blockchainStatus = "minted";
    release.blockchainNetwork = network;
    release.blockchainContract = String(certificate.chain.contractAddress || "");
    release.blockchainTransaction = String(certificate.chain.transactionId || "");

    next.releases[index] = normalizeRelease(release, index);
    return save(next);
  }

  function getSongCraftImpact(release) {
    var score = clamp(toCount(release && release.craftScore, 0), 0, 100);

    var releaseFans = 0;
    var releaseXp = 0;

    if (score >= 85) {
      releaseFans = 6;
      releaseXp = 5;
    } else if (score >= 70) {
      releaseFans = 4;
      releaseXp = 3;
    } else if (score >= 55) {
      releaseFans = 2;
      releaseXp = 2;
    } else if (score >= 35) {
      releaseFans = 1;
      releaseXp = 1;
    }

    return {
      score: score,
      releaseFans: releaseFans,
      releaseXp: releaseXp,
      promotionFans: Math.floor(score / 20),
      promotionXp: Math.floor(score / 25),
      radioInfluence: Math.floor(score / 10)
    };
  }

  function releaseSong(id) {
    if (!current) load();
    var next = snapshot();
    var index = findReleaseIndex(id, next);
    if (index < 0) throw new Error("Song not found in Music City releases.");

    var release = next.releases[index];
    if (release.releaseStatus === "released") return snapshot();

    release.releaseStatus = "released";
    release.releasedAt = new Date().toISOString();
    var craftImpact = getSongCraftImpact(release);
    release.releaseCraftBonusFans = craftImpact.releaseFans;
    release.releaseCraftBonusXp = craftImpact.releaseXp;
    next.releases[index] = normalizeRelease(release, index);
    next.fans += 3 + craftImpact.releaseFans;
    next.xp += 5 + craftImpact.releaseXp;

    advanceBusinessAction(next, "release");
    return save(next);
  }


  function getStreetTeamStatus(id, state) {
    var s = state || current || load();
    var releaseId = String(id);
    var flags = s.flags && typeof s.flags === "object" ? s.flags : {};
    var invites = flags.streetTeamInvites && typeof flags.streetTeamInvites === "object"
      ? flags.streetTeamInvites
      : {};
    var count = clamp(toCount(invites[releaseId], 0), 0, 10);
    return {
      count: count,
      max: 10,
      remaining: Math.max(0, 10 - count),
      xpPerInvite: 5,
      earnedXp: count * 5
    };
  }

  function claimStreetTeamInvite(id) {
    if (!current) load();
    var next = snapshot();
    var index = findReleaseIndex(id, next);
    if (index < 0) throw new Error("Create or save the song before inviting people.");

    var releaseId = String(id);
    var status = getStreetTeamStatus(releaseId, next);
    if (status.remaining <= 0) {
      throw new Error("You already earned all 10 Street Team invite rewards for this song.");
    }

    next.flags = clone(next.flags || {});
    next.flags.streetTeamInvites = clone(next.flags.streetTeamInvites || {});
    next.flags.streetTeamInvites[releaseId] = status.count + 1;
    next.flags.totalStreetTeamInvites = toCount(next.flags.totalStreetTeamInvites, 0) + 1;
    next.xp += 5;
    return save(next);
  }

  var CAREER_HUSTLES = {
    rehearsal: {
      id: "rehearsal",
      label: "Rehearsal Session",
      xp: 2,
      cash: 0
    },
    "street-promo": {
      id: "street-promo",
      label: "Street Promo Run",
      xp: 2,
      cash: 10
    }
  };

  function getCareerHustleStatus(id, state) {
    var s = state || current || load();
    var releaseId = String(id);
    var flags = s.flags && typeof s.flags === "object" ? s.flags : {};
    var all = flags.careerHustles && typeof flags.careerHustles === "object"
      ? flags.careerHustles
      : {};
    var claimed = all[releaseId] && typeof all[releaseId] === "object"
      ? all[releaseId]
      : {};
    return {
      rehearsal: Boolean(claimed.rehearsal),
      streetPromo: Boolean(claimed["street-promo"])
    };
  }

  function claimCareerHustle(id, hustleId) {
    if (!current) load();
    var next = snapshot();
    var index = findReleaseIndex(id, next);
    if (index < 0) throw new Error("Create or save the song before doing career hustle tasks.");

    var hustle = CAREER_HUSTLES[String(hustleId)];
    if (!hustle) throw new Error("Unknown career hustle task.");

    var releaseId = String(id);
    next.flags = clone(next.flags || {});
    next.flags.careerHustles = clone(next.flags.careerHustles || {});
    next.flags.careerHustles[releaseId] = clone(next.flags.careerHustles[releaseId] || {});
    if (next.flags.careerHustles[releaseId][hustle.id]) {
      throw new Error(hustle.label + " reward was already claimed for this song.");
    }

    next.flags.careerHustles[releaseId][hustle.id] = new Date().toISOString();
    next.xp += hustle.xp;
    next.cash += hustle.cash;
    return save(next);
  }

  function getManagerProfile(state) {
    var s = state || current || load();
    if (!s.manager || !s.manager.hired) return null;
    return MANAGER_PROFILES[s.manager.profileId] || MANAGER_PROFILES.hustler;
  }

  function managerRequirementMet(profile, state) {
    var s = state || current || load();
    var req = profile && profile.requires ? profile.requires : {};
    if (req.fans != null && s.fans < req.fans) return false;
    if (req.xp != null && s.xp < req.xp) return false;
    return true;
  }

  function promoteRelease(id) {
    if (!current) load();
    var next = snapshot();
    var index = findReleaseIndex(id, next);
    if (index < 0) throw new Error("Song not found in Music City releases.");

    var release = next.releases[index];
    if (release.releaseStatus !== "released") {
      throw new Error("Release the song before promoting it.");
    }

    if (!next.manager.hired) {
      throw new Error("Hire a manager before running professional promotion.");
    }

    if (release.promotionCount > 0) return snapshot();

    var managerProfile = getManagerProfile(next);
    var promotionFee = managerProfile.promotionFee;

    if (next.cash < promotionFee) {
      throw new Error(
        managerProfile.name + " promotion costs $" + promotionFee +
        ". You currently have $" + next.cash + "."
      );
    }

    next.cash -= promotionFee;
    next.manager.promotionSpend += promotionFee;

    release.promotionCount = 1;
    release.promotedAt = new Date().toISOString();
    release.promotionSpend =
      toCount(release.promotionSpend, 0) + promotionFee;
    release.promotionManager = managerProfile.name;
    next.releases[index] = normalizeRelease(release, index);

    var craftImpact = getSongCraftImpact(release);
    next.fans +=
      managerProfile.promotionFans +
      craftImpact.promotionFans +
      next.business.effects.promotionFanBonus;
    next.xp +=
      managerProfile.promotionXp +
      craftImpact.promotionXp +
      next.business.effects.promotionXpBonus;
    next.business.effects.promotionFanBonus = 0;
    next.business.effects.promotionXpBonus = 0;

    advanceBusinessAction(next, "promotion");
    return save(next);
  }

  function submitReleaseToRadio(id) {
    if (!current) load();
    var next = snapshot();
    var index = findReleaseIndex(id, next);
    if (index < 0) throw new Error("Song not found in Music City releases.");

    var release = next.releases[index];
    if (release.releaseStatus !== "released") {
      throw new Error("Release the song before submitting it to radio.");
    }

    if (!next.manager.hired) {
      throw new Error("Your manager must handle radio submissions.");
    }

    if (!meets(UNLOCKS.radio, next)) {
      var gap = needed(UNLOCKS.radio, next);
      throw new Error(
        "Radio consideration unlocks at 100 fans and 150 XP. " +
        "You still need " + gap.fans + " fans and " + gap.xp + " XP."
      );
    }

    if (release.radioStatus === "submitted") return snapshot();

    var managerProfile = getManagerProfile(next);
    var radioFee = Math.max(
      0,
      managerProfile.radioFee - next.business.effects.radioDiscount
    );

    if (next.cash < radioFee) {
      throw new Error(
        managerProfile.name + " radio submission costs $" + radioFee +
        ". You currently have $" + next.cash + "."
      );
    }

    next.cash -= radioFee;
    next.manager.radioSpend += radioFee;

    release.radioStatus = "submitted";
    release.radioSubmittedAt = new Date().toISOString();
    release.radioFeePaid =
      toCount(release.radioFeePaid, 0) + radioFee;
    release.radioManager =
      managerProfile.name;
    var craftImpact = getSongCraftImpact(release);
    release.radioInfluence =
      managerProfile.radioInfluence +
      craftImpact.radioInfluence +
      next.business.effects.radioInfluenceBonus;
    release.radioCraftInfluence = craftImpact.radioInfluence;
    next.business.effects.radioDiscount = 0;
    next.business.effects.radioInfluenceBonus = 0;
    next.releases[index] = normalizeRelease(release, index);

    advanceBusinessAction(next, "radio");
    return save(next);
  }

  function syncBriefById(id) {
    for (var i = 0; i < SYNC_BRIEFS.length; i++) {
      if (SYNC_BRIEFS[i].id === String(id)) return SYNC_BRIEFS[i];
    }
    return null;
  }

  function submitReleaseToSync(id, briefId) {
    if (!current) load();
    var next = snapshot();
    var index = findReleaseIndex(id, next);
    if (index < 0) throw new Error("Song not found in Music City releases.");
    if (!next.manager.hired) throw new Error("A manager must unlock and handle sync submissions.");

    var release = next.releases[index];
    if (release.releaseStatus !== "released") {
      throw new Error("Release the song before submitting it for sync.");
    }

    var brief = syncBriefById(briefId);
    if (!brief) throw new Error("That sync brief is no longer available.");
    var alreadySubmitted = release.syncSubmissions.some(function (entry) {
      return entry.briefId === brief.id;
    });
    if (alreadySubmitted) throw new Error("Your manager already submitted this song to that brief.");
    if (next.cash < brief.fee) {
      throw new Error("This professional sync submission costs $" + brief.fee + ". You currently have $" + next.cash + ".");
    }

    var managerProfile = getManagerProfile(next);
    var searchable = [release.style, release.beat, release.title].filter(Boolean).join(" ").toLowerCase();
    var matchCount = brief.wants.reduce(function (total, keyword) {
      return total + (searchable.indexOf(keyword.toLowerCase()) >= 0 ? 1 : 0);
    }, 0);
    var score = clamp(
      toCount(release.craftScore, 0) + managerProfile.rank * 7 + matchCount * 6,
      0,
      100
    );
    var placed = score >= brief.threshold;

    next.cash -= brief.fee;
    next.manager.syncSpend += brief.fee;
    if (placed) {
      next.cash += brief.reward.cash;
      next.fans += brief.reward.fans;
      next.xp += brief.reward.xp;
    } else {
      next.xp += 3;
    }

    release.syncSubmissions.push({
      briefId: brief.id,
      briefTitle: brief.title,
      submittedAt: new Date().toISOString(),
      manager: managerProfile.name,
      feePaid: brief.fee,
      score: score,
      outcome: placed ? "placed" : "passed"
    });
    next.releases[index] = normalizeRelease(release, index);
    advanceBusinessAction(next, "sync");
    return save(next);
  }

  function submitCinemaVideo(submission) {
    if (!current) load();
    var next = snapshot();
    var item = submission && typeof submission === "object" ? submission : {};
    if (!next.manager.hired) throw new Error("A manager must unlock and handle cinema submissions.");
    if (!item.id || !String(item.title || "").trim()) throw new Error("Add a title before submitting the video.");
    if (CINEMA.contentTypes.indexOf(String(item.contentType)) < 0) throw new Error("Choose a valid cinema format.");
    if (CINEMA.productionMethods.indexOf(String(item.productionMethod)) < 0) throw new Error("Disclose how the video was produced.");
    if (!item.rightsConfirmed) throw new Error("Confirm that you control the video, music, likenesses, and required permissions.");
    if (next.cash < CINEMA.submissionFee) {
      throw new Error("Cinema submission costs $" + CINEMA.submissionFee + ". You currently have $" + next.cash + ".");
    }

    var submissions = Array.isArray(next.flags.cinemaSubmissions)
      ? next.flags.cinemaSubmissions.slice()
      : [];
    if (submissions.some(function (entry) { return String(entry.id) === String(item.id); })) {
      return snapshot();
    }

    var managerProfile = getManagerProfile(next);
    next.cash -= CINEMA.submissionFee;
    next.xp += CINEMA.submissionXp;
    next.manager.cinemaSpend += CINEMA.submissionFee;
    submissions.push({
      id: String(item.id),
      title: String(item.title).trim(),
      creator: String(item.creator || next.name || "Music City Creator").trim(),
      contentType: String(item.contentType),
      productionMethod: String(item.productionMethod),
      aiTools: String(item.aiTools || "").trim(),
      manager: managerProfile.name,
      submittedAt: new Date().toISOString(),
      feePaid: CINEMA.submissionFee,
      rightsConfirmed: true
    });
    next.flags.cinemaSubmissions = submissions.slice(-30);
    advanceBusinessAction(next, "cinema-video");
    return save(next);
  }

  function hireManager(profileId) {
    if (!current) load();
    var next = snapshot();
    var id = String(profileId || "hustler");
    var profile = MANAGER_PROFILES[id];

    if (!profile) {
      throw new Error("That manager is not available.");
    }

    if (!managerRequirementMet(profile, next)) {
      var fansNeeded = Math.max(0, toCount(profile.requires.fans, 0) - next.fans);
      var xpNeeded = Math.max(0, toCount(profile.requires.xp, 0) - next.xp);
      throw new Error(
        profile.name + " requires " +
        profile.requires.fans + " fans and " +
        profile.requires.xp + " XP. You still need " +
        fansNeeded + " fans and " + xpNeeded + " XP."
      );
    }

    if (next.manager.hired && next.manager.profileId === id) {
      return snapshot();
    }

    var currentProfile = getManagerProfile(next);
    if (currentProfile && currentProfile.rank >= profile.rank) {
      throw new Error("You can only move up to a higher management tier.");
    }

    if (next.cash < profile.signingFee) {
      throw new Error(
        "Signing " + profile.name + " costs $" + profile.signingFee +
        ". You currently have $" + next.cash + "."
      );
    }

    next.cash -= profile.signingFee;
    next.manager.hired = true;
    next.manager.profileId = profile.id;
    next.manager.role = profile.name;
    next.manager.hiredAt = new Date().toISOString();

    advanceBusinessAction(next, "manager");
    return save(next);
  }

  function hasManager(state) {
    var s = state || current || load();
    return Boolean(s.manager && s.manager.hired);
  }

  function performanceKey(songId, venue) {
    return String(venue || "show").toLowerCase() + "::" + String(songId || "unknown");
  }

  function demandData(state) {
    var s = state || current || load();
    var flags = s.flags && typeof s.flags === "object" ? s.flags : {};
    return {
      offers: flags.popularDemandOffers && typeof flags.popularDemandOffers === "object" ? flags.popularDemandOffers : {},
      pending: flags.popularDemandPending && typeof flags.popularDemandPending === "object" ? flags.popularDemandPending : {},
      seen: flags.popularDemandSeen && typeof flags.popularDemandSeen === "object" ? flags.popularDemandSeen : {},
      requesters: flags.popularDemandRequesters && typeof flags.popularDemandRequesters === "object" ? flags.popularDemandRequesters : {}
    };
  }

  function getPopularDemandStatus(songId, state) {
    var data = demandData(state);
    var list = Array.isArray(data.pending[String(songId)]) ? data.pending[String(songId)] : [];
    return {
      count: list.length,
      requests: clone(list)
    };
  }

  function createPopularDemandOffer(songId) {
    if (!current) load();
    var next = snapshot();
    var index = findReleaseIndex(songId, next);
    if (index < 0) throw new Error("Song not found in Music City releases.");

    next.flags = clone(next.flags || {});
    next.flags.popularDemandOffers = clone(next.flags.popularDemandOffers || {});
    var offer = {
      songId: String(songId),
      title: next.releases[index].title,
      artistName: next.name,
      artistId: getPlayerId(),
      token: randomToken("demand"),
      createdAt: new Date().toISOString()
    };
    next.flags.popularDemandOffers[String(songId)] = offer;
    save(next);
    return clone(offer);
  }

  function getPopularDemandOffer(songId, state) {
    var data = demandData(state);
    var offer = data.offers[String(songId)];
    return offer ? clone(offer) : null;
  }

  function acceptPopularDemandRequest(payload) {
    if (!current) load();
    var request = payload && typeof payload === "object" ? payload : {};
    var songId = String(request.songId || "");
    var artistId = String(request.artistId || "");
    var requesterId = String(request.requesterId || "");
    var requestId = String(request.requestId || "");
    var offerToken = String(request.offerToken || "");

    if (!songId || !artistId || !requesterId || !requestId || !offerToken) {
      throw new Error("This Popular Demand request is incomplete.");
    }
    if (artistId !== getPlayerId()) throw new Error("This request belongs to a different artist.");
    if (requesterId === artistId) throw new Error("Popular Demand must come from another real player or invited person.");

    var next = snapshot();
    var index = findReleaseIndex(songId, next);
    if (index < 0) throw new Error("Requested song is not in your Music City catalog.");

    next.flags = clone(next.flags || {});
    next.flags.popularDemandOffers = clone(next.flags.popularDemandOffers || {});
    var offer = next.flags.popularDemandOffers[songId];
    if (!offer || String(offer.token || "") !== offerToken) {
      throw new Error("This Popular Demand request does not match an active song-request link.");
    }

    next.flags.popularDemandSeen = clone(next.flags.popularDemandSeen || {});
    if (next.flags.popularDemandSeen[requestId]) return save(next);

    next.flags.popularDemandRequesters = clone(next.flags.popularDemandRequesters || {});
    var requesterKey = songId + "::" + requesterId;
    if (next.flags.popularDemandRequesters[requesterKey]) {
      throw new Error("This person already requested this song.");
    }

    next.flags.popularDemandPending = clone(next.flags.popularDemandPending || {});
    var pending = Array.isArray(next.flags.popularDemandPending[songId])
      ? next.flags.popularDemandPending[songId].slice()
      : [];
    pending.push({
      requestId: requestId,
      requesterId: requesterId,
      requesterName: String(request.requesterName || "Music City listener").slice(0, 40),
      requestedAt: request.requestedAt || new Date().toISOString(),
      source: "human-request-link"
    });
    next.flags.popularDemandPending[songId] = pending.slice(-20);
    next.flags.popularDemandSeen[requestId] = true;
    next.flags.popularDemandRequesters[requesterKey] = true;
    return save(next);
  }

  function consumePopularDemand(songId, state) {
    var next = state;
    next.flags = clone(next.flags || {});
    next.flags.popularDemandPending = clone(next.flags.popularDemandPending || {});
    var list = Array.isArray(next.flags.popularDemandPending[String(songId)])
      ? next.flags.popularDemandPending[String(songId)].slice()
      : [];
    var request = list.shift() || null;
    next.flags.popularDemandPending[String(songId)] = list;
    return request;
  }

  function getSongPerformanceStatus(songId, venue, state) {
    var s = state || current || load();
    var flags = s.flags && typeof s.flags === "object" ? s.flags : {};
    var history = flags.performanceHistory && typeof flags.performanceHistory === "object"
      ? flags.performanceHistory
      : {};
    var key = performanceKey(songId, venue);
    var item = history[key] && typeof history[key] === "object" ? history[key] : {};
    var demand = getPopularDemandStatus(songId, s);
    return {
      key: key,
      count: toCount(item.count, 0),
      lastPerformedAt: item.lastPerformedAt || null,
      popularDemandCount: demand.count
    };
  }

  function getPerformanceReward(input, state) {
    var s = state || current || load();
    var data = input && typeof input === "object" ? input : {};
    var songId = data.songId == null ? "" : String(data.songId);
    var venue = data.venue == null ? "" : String(data.venue);
    var tracked = Boolean(songId && venue);
    var status = tracked ? getSongPerformanceStatus(songId, venue, s) : {
      count: 0,
      popularDemandCount: 0
    };
    var repeat = tracked && status.count > 0;
    var popularDemand = repeat && status.popularDemandCount > 0;
    var multiplier = repeat && !popularDemand ? {
      cash: 0.35,
      xp: 0.25,
      fans: 0.25
    } : {
      cash: 1,
      xp: 1,
      fans: 1
    };

    function scaled(value, factor, minimum) {
      var original = Math.max(0, toCount(value, 0));
      if (!original) return 0;
      return Math.max(minimum, Math.floor(original * factor));
    }

    var baseCash = scaled(data.cash, multiplier.cash, repeat && !popularDemand ? 5 : 0);
    var baseXp = scaled(data.xp, multiplier.xp, repeat && !popularDemand ? 1 : 0);
    var baseFans = scaled(data.fans, multiplier.fans, repeat && !popularDemand ? 1 : 0);
    var payout = getShowPayout(baseCash, s);
    var effects = s.business && s.business.effects ? s.business.effects : {};

    return {
      songId: songId,
      venue: venue,
      repeat: repeat,
      popularDemand: popularDemand,
      mode: popularDemand ? "popular-demand" : (repeat ? "repeat" : "new-song"),
      previousPerformances: status.count,
      pendingDemand: status.popularDemandCount,
      cash: payout.net,
      grossCash: payout.gross,
      commission: payout.commission,
      fans: Math.max(0, baseFans + Math.floor(toNumber(effects.showFanBonus, 0))),
      xp: Math.max(0, baseXp + Math.floor(toNumber(effects.showXpBonus, 0))),
      base: {
        cash: Math.max(0, toCount(data.cash, 0)),
        fans: Math.max(0, toCount(data.fans, 0)),
        xp: Math.max(0, toCount(data.xp, 0))
      }
    };
  }

  function getShowPayout(grossCash, state) {
    var s = state || current || load();
    var gross = Math.max(
      0,
      toCount(grossCash, 0) +
      (s.business ? s.business.effects.showCashBonus : 0)
    );
    var profile = getManagerProfile(s);
    var commission = profile
      ? Math.floor(gross * profile.commissionPct / 100)
      : 0;

    return {
      gross: gross,
      commission: commission,
      net: Math.max(0, gross - commission)
    };
  }

  function payShow(delta) {
    if (!current) load();
    var next = snapshot();
    var input = delta && typeof delta === "object" ? delta : {};
    var reward = getPerformanceReward(input, next);

    next.cash += reward.cash;
    next.fans += reward.fans;
    next.xp += reward.xp;

    if (reward.songId && reward.venue) {
      next.flags = clone(next.flags || {});
      next.flags.performanceHistory = clone(next.flags.performanceHistory || {});
      var key = performanceKey(reward.songId, reward.venue);
      var previous = next.flags.performanceHistory[key] && typeof next.flags.performanceHistory[key] === "object"
        ? next.flags.performanceHistory[key]
        : {};
      next.flags.performanceHistory[key] = {
        count: toCount(previous.count, 0) + 1,
        lastPerformedAt: new Date().toISOString(),
        songId: reward.songId,
        venue: reward.venue,
        lastMode: reward.mode
      };
      if (reward.popularDemand) {
        var consumed = consumePopularDemand(reward.songId, next);
        next.flags.lastPopularDemandPerformance = consumed ? {
          songId: reward.songId,
          venue: reward.venue,
          requesterName: consumed.requesterName,
          requestId: consumed.requestId,
          performedAt: new Date().toISOString()
        } : null;
      }
      next.flags.lastShowReward = {
        songId: reward.songId,
        venue: reward.venue,
        mode: reward.mode,
        cash: reward.cash,
        fans: reward.fans,
        xp: reward.xp,
        performedAt: new Date().toISOString()
      };
    }

    next.business.effects.showCashBonus = 0;
    next.business.effects.showFanBonus = 0;
    next.business.effects.showXpBonus = 0;

    if (next.manager.hired) {
      next.manager.totalCommission += reward.commission;
    }

    advanceBusinessAction(next, "show");
    return save(next);
  }

  function getPendingBusinessEvent(state) {
    var s = state || current || load();
    return businessEventById(s.business.pendingEventId);
  }

  function drawBusinessEvent() {
    if (!current) load();
    var next = snapshot();

    if (!next.business.pendingEventId && next.business.meter >= 2) {
      queueBusinessEvent(next);
      save(next);
    }

    return getPendingBusinessEvent();
  }

  function resolveBusinessEvent(choiceId) {
    if (!current) load();
    var next = snapshot();
    var event = businessEventById(next.business.pendingEventId);

    if (!event) {
      throw new Error("There is no Music City business event waiting.");
    }

    var choice = null;
    for (var i = 0; i < event.choices.length; i++) {
      if (event.choices[i].id === choiceId) {
        choice = event.choices[i];
        break;
      }
    }

    if (!choice) {
      throw new Error("That event choice is not available.");
    }

    var cost = Math.max(0, toCount(choice.cost, 0));
    if (next.cash < cost) {
      throw new Error(
        "That choice costs $" + cost + ". You currently have $" + next.cash + "."
      );
    }

    next.cash -= cost;

    var delta = choice.delta || {};
    next.cash = Math.max(0, next.cash + Math.floor(toNumber(delta.cash, 0)));
    next.fans = Math.max(0, next.fans + Math.floor(toNumber(delta.fans, 0)));
    next.xp = Math.max(0, next.xp + Math.floor(toNumber(delta.xp, 0)));
    next.reputation = clamp(
      next.reputation + Math.floor(toNumber(delta.reputation, 0)),
      0,
      100
    );

    var effects = choice.effects || {};
    var effectKeys = [
      "showCashBonus",
      "showFanBonus",
      "showXpBonus",
      "promotionFanBonus",
      "promotionXpBonus",
      "radioDiscount",
      "radioInfluenceBonus"
    ];

    for (var j = 0; j < effectKeys.length; j++) {
      var key = effectKeys[j];
      if (effects[key] != null) {
        next.business.effects[key] += Math.floor(toNumber(effects[key], 0));
      }
    }

    next.business.history.push({
      eventId: event.id,
      eventTitle: event.title,
      choiceId: choice.id,
      choiceLabel: choice.label,
      result: choice.result,
      day: next.day,
      resolvedAt: new Date().toISOString()
    });
    next.business.history = next.business.history.slice(-20);
    next.business.pendingEventId = null;
    next.business.meter = 0;
    next.day += 1;

    return save(next);
  }

  function businessEventProgress(state) {
    var s = state || current || load();
    return {
      meter: s.business.meter,
      ready: Boolean(s.business.pendingEventId),
      actionsUntilNext: s.business.pendingEventId
        ? 0
        : Math.max(0, 2 - s.business.meter)
    };
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

  function hasPerk(id, state) {
    var s = state || current || load();
    return Boolean(s.flags && s.flags.perks && s.flags.perks[id]);
  }

  function perkStatus(id, state) {
    var s = state || current || load();
    var perk = PERKS[id];
    if (!perk) throw new Error("Unknown Music City perk.");
    return {
      owned: hasPerk(id, s),
      eligible: meets(perk.requires, s),
      affordable: s.cash >= perk.price,
      xpNeeded: Math.max(0, toCount(perk.requires && perk.requires.xp, 0) - s.xp),
      cashNeeded: Math.max(0, perk.price - s.cash),
      price: perk.price
    };
  }

  function purchasePerk(id) {
    if (!current) load();
    var perk = PERKS[id];
    if (!perk) throw new Error("Unknown Music City perk.");
    if (hasPerk(id, current)) return snapshot();
    if (!meets(perk.requires, current)) throw new Error(perk.label + " requires " + perk.requires.xp + " XP.");
    if (current.cash < perk.price) throw new Error("You need $" + perk.price + " to purchase " + perk.label + ".");
    var next = snapshot();
    next.cash -= perk.price;
    next.flags = clone(next.flags || {});
    next.flags.perks = clone(next.flags.perks || {});
    next.flags.perks[id] = { purchasedAt: new Date().toISOString(), price: perk.price };
    return save(next);
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
    PERKS: PERKS,
    CAREER_TITLES: CAREER_TITLES,
    ECONOMY: ECONOMY,
    BUSINESS_EVENTS: BUSINESS_EVENTS,
    MANAGER_PROFILES: MANAGER_PROFILES,
    SYNC_BRIEFS: SYNC_BRIEFS,
    CINEMA: CINEMA,
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
    updateRelease: updateRelease,
    markReleasePassportReady: markReleasePassportReady,
    markReleaseCertified: markReleaseCertified,
    releaseSong: releaseSong,
    getStreetTeamStatus: getStreetTeamStatus,
    claimStreetTeamInvite: claimStreetTeamInvite,
    CAREER_HUSTLES: CAREER_HUSTLES,
    getCareerHustleStatus: getCareerHustleStatus,
    claimCareerHustle: claimCareerHustle,
    promoteRelease: promoteRelease,
    submitReleaseToRadio: submitReleaseToRadio,
    submitReleaseToSync: submitReleaseToSync,
    submitCinemaVideo: submitCinemaVideo,
    hireManager: hireManager,
    hasManager: hasManager,
    getManagerProfile: getManagerProfile,
    managerRequirementMet: managerRequirementMet,
    getSongCraftImpact: getSongCraftImpact,
    getShowPayout: getShowPayout,
    getPlayerId: getPlayerId,
    createPopularDemandOffer: createPopularDemandOffer,
    getPopularDemandOffer: getPopularDemandOffer,
    acceptPopularDemandRequest: acceptPopularDemandRequest,
    getPopularDemandStatus: getPopularDemandStatus,
    getSongPerformanceStatus: getSongPerformanceStatus,
    getPerformanceReward: getPerformanceReward,
    payShow: payShow,
    getPendingBusinessEvent: getPendingBusinessEvent,
    drawBusinessEvent: drawBusinessEvent,
    resolveBusinessEvent: resolveBusinessEvent,
    businessEventProgress: businessEventProgress,
    meets: meets,
    isUnlocked: isUnlocked,
    hasPerk: hasPerk,
    perkStatus: perkStatus,
    purchasePerk: purchasePerk,
    needed: needed,
    getCareerTitle: getCareerTitle,
    numericLevel: numericLevel,
    resetForTests: resetForTests
  };

  root.MCE = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
