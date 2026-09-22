(function (root) {
  "use strict";

  var MISSIONS = [
    {
      id: "artist",
      location: "Avatar Studio",
      focus: "CUSTOMIZE",
      onsite: "Create or edit your artist identity, then save it so Music City can track your career.",
      title: "Create Your Artist",
      description: "Choose a stage name and save your 3D artist identity.",
      action: "CREATE ARTIST",
      href: "avatar_studio.html",
      reward: "Your identity follows you across Music City.",
      complete: function (state, context) {
        var name = String(state.name || "").trim().toLowerCase();
        var avatarName = String(context.avatar && context.avatar.name || "").trim().toLowerCase();
        return Boolean(
          (name && name !== "rookie" && name !== "new artist") ||
          (avatarName && avatarName !== "rookie" && avatarName !== "new artist")
        );
      }
    },
    {
      id: "record",
      location: "Bedroom Studio",
      focus: "VOCAL BOOTH",
      onsite: "Walk to the Vocal Booth and tap the booth interaction. The fast path is: describe the song, make it, then bring the finished audio back.",
      title: "Record Your First Song",
      description: "Enter the Bedroom Studio booth, record vocals, and save a track to your catalog.",
      action: "ENTER THE BOOTH",
      href: "bedroom_studio.html",
      reward: "A saved track opens the release and performance loop.",
      complete: function (state) { return (state.releases || []).length > 0; }
    },
    {
      id: "release",
      location: "Artist Catalog",
      onsite: "Find the song marked UNRELEASED and use the release control. Creating the record was the easy part; this begins the career work around it.",
      title: "Release Your Record",
      description: "Open the Artist Catalog and release your saved song to Music City.",
      action: "OPEN CATALOG",
      href: "artist_catalog.html",
      reward: "First release reward: fans and XP.",
      complete: function (state) {
        return (state.releases || []).some(function (release) {
          return release.releaseStatus === "released";
        });
      }
    },
    {
      id: "cafe-access",
      location: "Artist Catalog",
      onsite: "You need 10 XP to unlock the Hip-Hop Café. Use the Street Team invite button on one of your songs for +5 XP per completed invite, or claim the rehearsal / street-promo hustle rewards.",
      title: "Earn 10 XP for Your First Show",
      description: "Build enough early career XP to unlock the Hip-Hop Café without getting stuck.",
      action: "BUILD EARLY MOMENTUM",
      href: "artist_catalog.html",
      reward: "Hip-Hop Café unlocks at 10 XP.",
      progress: function (state) { return { value: Number(state.xp || 0), goal: 10, unit: "XP" }; },
      complete: function (state) { return Number(state.xp || 0) >= 10; }
    },
    {
      id: "first-show",
      location: "Hip-Hop Café",
      focus: "PERFORM",
      onsite: "Go to the performance stage, choose your released song, and complete the three-part set.",
      title: "Perform Your First Show",
      description: "Take your released song to the Hip-Hop Cafe and work the crowd.",
      action: "PLAY THE CAFE",
      href: "hiphop_cafe.html",
      reward: "Shows earn cash, fans, and XP.",
      complete: function (state, context) {
        return context.cafePerformances > 0 || Boolean(state.flags && state.flags.firstShowComplete);
      }
    },
    {
      id: "battle-access",
      location: "Hip-Hop Café",
      focus: "PERFORM",
      onsite: "Keep performing at the Café and working the crowd. Fresh songs earn the strongest show rewards; repeat songs pay less unless a real listener requests them through Popular Demand. When you reach 25 fans, Word Slaughter unlocks.",
      title: "Build a 25-Fan Buzz",
      description: "Build the crowd with performances. New songs earn full show rewards; repeats earn reduced rewards unless Popular Demand is waiting.",
      action: "BUILD YOUR CROWD",
      href: "hiphop_cafe.html",
      reward: "Word Slaughter unlocks at 25 fans.",
      progress: function (state) { return { value: Number(state.fans || 0), goal: 25, unit: "fans" }; },
      complete: function (state) { return Number(state.fans || 0) >= 25; }
    },
    {
      id: "battle",
      location: "Word Slaughter",
      focus: "BATTLE CIRCLE",
      onsite: "Walk into the battle circle and start your first battle. The arena is open to tour even before the battle requirement is met.",
      title: "Enter Word Slaughter",
      description: "Step into the 3D arena and complete your first three-round battle.",
      action: "ENTER THE ARENA",
      href: "battle_room.html",
      reward: "Battle results raise your reputation and career momentum.",
      complete: function (state) { return Number(state.battles || 0) > 0; }
    },
    {
      id: "manager",
      location: "Manager Office",
      onsite: "Review the available managers, make sure you can afford the signing fee, then sign the manager you want representing your career.",
      title: "Hire Your First Manager",
      description: "Use your show money to sign representation and unlock professional promotion. If you are under $200, keep playing the Café; bring fresh songs for full pay or use Popular Demand to revive an older record.",
      action: "MEET MANAGERS",
      href: "manager.html",
      route: function (state) { return Number(state.cash || 0) >= 200 ? "manager.html" : "hiphop_cafe.html"; },
      reward: "Managers unlock promotion, radio, and Sync Cinema.",
      progress: function (state) { return { value: Number(state.cash || 0), goal: 200, unit: "cash" }; },
      complete: function (state) { return Boolean(state.manager && state.manager.hired); }
    },
    {
      id: "promotion",
      location: "Artist Catalog",
      onsite: "Open a released record and run its first manager-led promotion campaign.",
      title: "Run Your First Campaign",
      description: "Return to the Artist Catalog and have your manager promote a released song.",
      action: "PROMOTE A RELEASE",
      href: "artist_catalog.html",
      reward: "Promotion accelerates fan and XP growth.",
      complete: function (state) {
        return (state.releases || []).some(function (release) {
          return Number(release.promotionCount || 0) > 0;
        });
      }
    },
    {
      id: "radio-access",
      location: "Nightclub",
      onsite: "Keep performing and building until you reach 100 fans and 150 XP. Bigger shows accelerate the path.",
      title: "Become Radio Ready",
      description: "Perform larger shows and build the 100 fans and 150 XP required for radio consideration.",
      action: "KEEP PERFORMING",
      href: "nightclub.html",
      reward: "Radio consideration becomes available at 100 fans and 150 XP.",
      progress: function (state) {
        var fans = Math.min(100, Number(state.fans || 0));
        var xp = Math.min(150, Number(state.xp || 0));
        return { value: fans + xp, goal: 250, unit: "radio readiness" };
      },
      complete: function (state) {
        return Number(state.fans || 0) >= 100 && Number(state.xp || 0) >= 150;
      }
    },
    {
      id: "radio",
      location: "Artist Catalog / Music City Radio",
      onsite: "In the Artist Catalog, choose your strongest released record and use the radio submission control. Your manager handles the submission fee.",
      title: "Submit to Music City Radio",
      description: "Choose your strongest released record and let your manager submit it for airplay.",
      action: "SUBMIT YOUR RECORD",
      href: "artist_catalog.html",
      reward: "Complete the first Music City career run.",
      complete: function (state) {
        return (state.releases || []).some(function (release) {
          return release.radioStatus === "submitted";
        });
      }
    }
  ];

  function safeParse(value) {
    try { return JSON.parse(value || "null"); } catch (error) { return null; }
  }

  function contextFromStorage(storage) {
    var source = storage || (root && root.localStorage);
    if (!source) return { avatar: null, cafePerformances: 0 };
    return {
      avatar: safeParse(source.getItem("mceAvatar")),
      cafePerformances: Math.max(0, Number(source.getItem("mceCafePerformances")) || 0)
    };
  }

  function career(state, context) {
    var player = state || {};
    var facts = context || { avatar: null, cafePerformances: 0 };
    var completed = [];
    var current = null;
    for (var i = 0; i < MISSIONS.length; i++) {
      if (MISSIONS[i].complete(player, facts)) completed.push(MISSIONS[i].id);
      else if (!current) current = MISSIONS[i];
    }
    return {
      current: current,
      completed: completed,
      completedCount: completed.length,
      total: MISSIONS.length,
      finished: !current
    };
  }

  function progressFor(mission, state) {
    if (!mission || !mission.progress) return null;
    var progress = mission.progress(state || {});
    var goal = Math.max(1, Number(progress.goal || 1));
    var value = Math.max(0, Number(progress.value || 0));
    return {
      value: value,
      goal: goal,
      unit: progress.unit || "progress",
      percent: Math.max(0, Math.min(100, Math.round(value / goal * 100)))
    };
  }

  function pageName() {
    var path = String(root.location && root.location.pathname || "");
    return path.split("/").pop() || "index.html";
  }

  function samePage(href) {
    return pageName().toLowerCase() === String(href || "").split("?")[0].split("#")[0].toLowerCase();
  }

  function missionHref(mission, state) {
    if (!mission) return "city_map.html";
    return typeof mission.route === "function" ? mission.route(state || {}) : mission.href;
  }

  function guideAnswer(kind, mission, state, progress, result) {
    if (result.finished) {
      if (kind === "where") return "Your first career run is complete. Explore Music City, grow your catalog, and choose the next part of your career.";
      if (kind === "why") return "You have completed the core path. From here, the city opens into repeatable shows, releases, battles, promotion, radio, business opportunities, and future districts.";
      return "You put the core career loop together. Keep building your audience and catalog.";
    }
    if (kind === "where") {
      if (mission.id === "manager" && Number(state.cash || 0) < 200) {
        return "You need $" + Math.max(0, 200 - Number(state.cash || 0)) + " more before signing the starter manager. Go back to the Hip-Hop Café. A fresh song earns full show pay; repeating the same song earns less unless a real listener requested it through Popular Demand.";
      }
      return "Go to " + (mission.location || "the highlighted destination") + ". Tap SHOW ME WHERE and I will take you to the correct part of Music City.";
    }
    if (kind === "why") return mission.reward || "This step moves your career forward.";
    if (kind === "progress") {
      if (progress) {
        return "You are at " + progress.value + " of " + progress.goal + " " + progress.unit + " — " + progress.percent + "% complete.";
      }
      return result.completedCount + " of " + result.total + " core career steps are complete. Finish this task to unlock the next move.";
    }
    return mission.description;
  }

  function styleDock() {
    if (!root.document || document.getElementById("mceMissionStyles")) return;
    var style = document.createElement("style");
    style.id = "mceMissionStyles";
    style.textContent =
      ".mce-mission-dock{position:fixed;z-index:145;left:14px;bottom:14px;width:min(400px,calc(100vw - 28px));font-family:Arial,Helvetica,sans-serif;color:#fff}" +
      ".mce-mission-card{overflow:hidden;border:1px solid #5bd8ff88;border-radius:16px;background:linear-gradient(145deg,#0b1522f2,#050811f7);box-shadow:0 16px 46px #000a,0 0 25px #3abcf526;backdrop-filter:blur(15px)}" +
      ".mce-mission-head{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid #31556f;background:#071522eb}" +
      ".mce-mission-badge{width:31px;height:31px;display:grid;place-items:center;border-radius:50%;background:linear-gradient(135deg,#53ddff,#8f78ff);color:#071018;font-size:14px;font-weight:1000;box-shadow:0 0 16px #50d9ff55}" +
      ".mce-mission-label{flex:1;min-width:0}.mce-mission-label small{display:block;color:#7ee9ff;font-size:7px;font-weight:1000;letter-spacing:.18em}.mce-mission-label b{display:block;margin-top:2px;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".mce-mission-toggle{border:0;background:#ffffff0d;color:#fff;width:30px;height:30px;border-radius:8px;font-size:16px;cursor:pointer}" +
      ".mce-mission-body{padding:12px}.mce-mission-location{margin:0 0 7px!important;color:#92e7ff!important;font-size:9px!important;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.mce-mission-body p{margin:0;color:#cbd6e2;font-size:11px;line-height:1.45}" +
      ".mce-mission-reward{margin-top:9px!important;color:#f5d982!important}.mce-mission-guide{display:none;margin-top:10px;padding:9px;border:1px solid #40627a;border-radius:10px;background:#09131e;color:#dbe8f3;font-size:10px;line-height:1.45}.mce-mission-guide.show{display:block}" +
      ".mce-mission-questions{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.mce-mission-questions button{border:1px solid #42697f;border-radius:999px;background:#10202d;color:#cceeff;padding:6px 8px;font-size:8px;font-weight:900;cursor:pointer}" +
      ".mce-mission-meter{height:7px;margin-top:10px;overflow:hidden;border-radius:9px;background:#202b38}.mce-mission-meter i{display:block;height:100%;background:linear-gradient(90deg,#4ed8ff,#9a77ff);box-shadow:0 0 12px #5bdfff}" +
      ".mce-mission-progress{margin-top:5px;color:#99a9ba;font-size:8px;text-align:right;text-transform:uppercase;letter-spacing:.08em}" +
      ".mce-mission-actions{display:grid;grid-template-columns:1fr auto;gap:7px;margin-top:11px}.mce-mission-action,.mce-mission-ask{display:grid;place-items:center;padding:11px;border-radius:9px;font-size:9px;font-weight:1000;letter-spacing:.07em;text-decoration:none;cursor:pointer}" +
      ".mce-mission-action{border:1px solid #9aeeff;background:linear-gradient(135deg,#45cee9,#8174f2);color:#071018}.mce-mission-ask{border:1px solid #49677e;background:#0d1a27;color:#def5ff}" +
      ".mce-mission-dock.collapsed{width:auto;max-width:min(320px,calc(100vw - 28px))}.mce-mission-dock.collapsed .mce-mission-body{display:none}.mce-mission-dock.collapsed .mce-mission-card{border-radius:999px}.mce-mission-dock.collapsed .mce-mission-head{border-bottom:0;border-radius:999px;padding:7px 8px}.mce-mission-dock.collapsed .mce-mission-label small{font-size:6px}.mce-mission-complete .mce-mission-badge{background:#65e69a}.mce-mission-complete .mce-mission-card{border-color:#65e69a}" +
      ".mce-mission-dock.room-mode{z-index:24;left:8px;top:max(78px,calc(env(safe-area-inset-top) + 68px));bottom:auto;width:min(290px,calc(100vw - 16px))}" +
      ".mce-mission-dock.room-mode .mce-mission-head{padding:7px 8px}.mce-mission-dock.room-mode .mce-mission-badge{width:27px;height:27px;font-size:12px}.mce-mission-dock.room-mode .mce-mission-label b{font-size:10px}.mce-mission-dock.room-mode .mce-mission-toggle{width:27px;height:27px}" +
      "@media(max-width:700px),(pointer:coarse){.mce-mission-dock:not(.room-mode){left:8px;bottom:max(8px,env(safe-area-inset-bottom));width:calc(100vw - 16px)}.mce-mission-body{padding:10px}.mce-mission-head{padding:8px 9px}.mce-mission-dock.room-mode{top:max(76px,calc(env(safe-area-inset-top) + 66px));width:min(235px,calc(100vw - 16px))}.mce-mission-actions{grid-template-columns:1fr}.mce-mission-ask{padding:9px}}" +
      "@media(pointer:coarse) and (orientation:landscape){.mce-mission-dock.room-mode{left:8px;top:max(62px,env(safe-area-inset-top));width:225px}.mce-mission-dock.room-mode:not(.collapsed){max-height:72vh;overflow:auto}}";
    document.head.appendChild(style);
  }

  function renderDock() {
    if (!root.document || !root.MCE) return;
    styleDock();
    var state = root.MCE.get ? root.MCE.get() : root.MCE.load();
    var result = career(state, contextFromStorage());
    var dock = document.getElementById("mceMissionDock");
    var savedGuideKind = dock && dock.dataset ? (dock.dataset.guideKind || "") : "";
    var savedGuideMission = dock && dock.dataset ? (dock.dataset.guideMission || "") : "";
    var roomMode = /\/(avatar_studio|bedroom_studio|begenius_studio|hip_hop_heights|hiphop_cafe|battle_room|warehouse|nightclub)\.html$/i.test(String(root.location && root.location.pathname || ""));
    var seen = false;
    try { seen = root.localStorage && root.localStorage.getItem("mceNavigatorSeenV1") === "1"; } catch (error) {}

    if (!dock) {
      dock = document.createElement("aside");
      dock.id = "mceMissionDock";
      dock.className = "mce-mission-dock";
      if (roomMode) dock.classList.add("room-mode");
      if (roomMode && seen) dock.classList.add("collapsed");
      dock.setAttribute("aria-live", "polite");
      dock.setAttribute("aria-label", "Music City Navigator");
      document.body.appendChild(dock);
      try { if (root.localStorage) root.localStorage.setItem("mceNavigatorSeenV1", "1"); } catch (error) {}
    }

    var mission = result.current;
    var targetHref = missionHref(mission, state);
    var progress = progressFor(mission, state);
    var step = result.finished ? result.total : result.completedCount + 1;
    var wasCollapsed = dock.classList.contains("collapsed");
    dock.classList.toggle("mce-mission-complete", result.finished);

    dock.innerHTML = '<div class="mce-mission-card"><div class="mce-mission-head">' +
      '<span class="mce-mission-badge">🧭</span>' +
      '<span class="mce-mission-label"><small>' + (result.finished ? "MUSIC CITY NAVIGATOR • CORE PATH COMPLETE" : "MUSIC CITY NAVIGATOR • NEXT MOVE " + step + "/" + result.total) + '</small><b>' +
      (result.finished ? "Choose Your Next Career Move" : mission.title) + '</b></span>' +
      '<button class="mce-mission-toggle" type="button" aria-label="Open or close Music City Navigator">' + (wasCollapsed ? "+" : "−") + '</button></div>' +
      '<div class="mce-mission-body">' +
      '<p class="mce-mission-location">📍 ' + (result.finished ? "Music City" : (mission.location || "Music City")) + '</p>' +
      '<p>' + (result.finished ? "Your first career run is complete. Keep releasing, performing, networking, and building your audience." : mission.description) + '</p>' +
      (progress ? '<div class="mce-mission-meter"><i style="width:' + progress.percent + '%"></i></div><div class="mce-mission-progress">' +
        (progress.unit === "cash" ? "$" : "") + progress.value + ' / ' + (progress.unit === "cash" ? "$" : "") + progress.goal + ' ' + progress.unit + '</div>' : '') +
      '<p class="mce-mission-reward">' + (result.finished ? "You decide what kind of artist and business you build next." : "WHY IT MATTERS: " + mission.reward) + '</p>' +
      '<div class="mce-mission-guide" id="mceNavigatorAnswer"></div>' +
      '<div class="mce-mission-questions"><button type="button" data-guide="next">WHAT NEXT?</button><button type="button" data-guide="where">WHERE?</button><button type="button" data-guide="progress">HOW CLOSE?</button><button type="button" data-guide="why">WHY?</button></div>' +
      '<div class="mce-mission-actions">' +
      (result.finished
        ? '<a class="mce-mission-action" href="city_map.html">SHOW ME THE CITY</a>'
        : '<a class="mce-mission-action" href="' + targetHref + '" data-navigator-go="1">SHOW ME WHERE</a>') +
      '<button class="mce-mission-ask" type="button">ASK GUIDE</button></div>' +
      '</div></div>';

    var toggle = dock.querySelector(".mce-mission-toggle");
    toggle.onclick = function () {
      dock.classList.toggle("collapsed");
      this.textContent = dock.classList.contains("collapsed") ? "+" : "−";
    };

    var answer = dock.querySelector("#mceNavigatorAnswer");
    function showAnswer(kind) {
      answer.textContent = guideAnswer(kind, mission, state, progress, result);
      answer.classList.add("show");
      dock.dataset.guideKind = kind;
      dock.dataset.guideMission = mission ? mission.id : "complete";
      dock.classList.remove("collapsed");
      toggle.textContent = "−";
    }
    if (savedGuideKind && savedGuideMission === (mission ? mission.id : "complete")) {
      answer.textContent = guideAnswer(savedGuideKind, mission, state, progress, result);
      answer.classList.add("show");
      dock.dataset.guideKind = savedGuideKind;
      dock.dataset.guideMission = savedGuideMission;
    } else if (dock.dataset) {
      dock.dataset.guideKind = "";
      dock.dataset.guideMission = mission ? mission.id : "complete";
    }
    dock.querySelector(".mce-mission-ask").onclick = function () { showAnswer("next"); };
    dock.querySelectorAll("[data-guide]").forEach(function (button) {
      button.onclick = function () { showAnswer(button.getAttribute("data-guide")); };
    });

    var go = dock.querySelector("[data-navigator-go]");
    if (go && mission && samePage(targetHref)) {
      go.setAttribute("href", "#");
      go.onclick = function (event) {
        event.preventDefault();
        showAnswer("where");
        answer.textContent = mission.onsite || ("You are already at " + (mission.location || "the right location") + ". Look for the highlighted interaction or entrance for: " + mission.title + ".");
        try {
          root.dispatchEvent(new CustomEvent("mce:navigator:focus", { detail: { mission: mission } }));
        } catch (error) {}
      };
    }

    if (roomMode && !seen && !dock.dataset.autoCollapseArmed) {
      dock.dataset.autoCollapseArmed = "1";
      root.setTimeout(function () {
        if (dock && !dock.matches(":hover") && !dock.contains(document.activeElement)) {
          dock.classList.add("collapsed");
          var button = dock.querySelector(".mce-mission-toggle");
          if (button) button.textContent = "+";
        }
      }, 7000);
    }
    return result;
  }

  var api = {
    MISSIONS: MISSIONS,
    career: career,
    progressFor: progressFor,
    missionHref: missionHref,
    contextFromStorage: contextFromStorage,
    render: renderDock
  };

  root.MusicCityMissions = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root.document) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", renderDock);
    else renderDock();
    root.setInterval(renderDock, 2000);
  }
})(typeof window !== "undefined" ? window : globalThis);
