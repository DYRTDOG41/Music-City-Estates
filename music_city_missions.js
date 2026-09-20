(function (root) {
  "use strict";

  var MISSIONS = [
    {
      id: "artist",
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
      title: "Record Your First Song",
      description: "Enter the Bedroom Studio booth, record vocals, and save a track to your catalog.",
      action: "ENTER THE BOOTH",
      href: "bedroom_studio.html",
      reward: "A saved track opens the release and performance loop.",
      complete: function (state) { return (state.releases || []).length > 0; }
    },
    {
      id: "release",
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
      id: "first-show",
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
      title: "Build a 25-Fan Buzz",
      description: "Keep performing at the Cafe until Word Slaughter invites you into the battle circle.",
      action: "BUILD YOUR CROWD",
      href: "hiphop_cafe.html",
      reward: "Word Slaughter unlocks at 25 fans.",
      progress: function (state) { return { value: Number(state.fans || 0), goal: 25, unit: "fans" }; },
      complete: function (state) { return Number(state.fans || 0) >= 25; }
    },
    {
      id: "battle",
      title: "Enter Word Slaughter",
      description: "Step into the 3D arena and complete your first three-round battle.",
      action: "ENTER THE ARENA",
      href: "battle_room.html",
      reward: "Battle results raise your reputation and career momentum.",
      complete: function (state) { return Number(state.battles || 0) > 0; }
    },
    {
      id: "manager",
      title: "Hire Your First Manager",
      description: "Use your show money to sign representation and unlock professional promotion.",
      action: "MEET MANAGERS",
      href: "manager.html",
      reward: "Managers unlock promotion, radio, and Sync Cinema.",
      progress: function (state) { return { value: Number(state.cash || 0), goal: 200, unit: "cash" }; },
      complete: function (state) { return Boolean(state.manager && state.manager.hired); }
    },
    {
      id: "promotion",
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

  function styleDock() {
    if (!root.document || document.getElementById("mceMissionStyles")) return;
    var style = document.createElement("style");
    style.id = "mceMissionStyles";
    style.textContent =
      ".mce-mission-dock{position:fixed;z-index:145;left:14px;bottom:14px;width:min(390px,calc(100vw - 28px));font-family:Arial,Helvetica,sans-serif;color:#fff}" +
      ".mce-mission-card{overflow:hidden;border:1px solid #ffc84f;border-radius:15px;background:linear-gradient(145deg,#11182af2,#070a12f5);box-shadow:0 16px 45px #000b,0 0 24px #ffb62b2b;backdrop-filter:blur(14px)}" +
      ".mce-mission-head{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid #73551e;background:#171304}" +
      ".mce-mission-badge{width:29px;height:29px;display:grid;place-items:center;border-radius:50%;background:#ffc84f;color:#171006;font-size:14px;font-weight:900}" +
      ".mce-mission-label{flex:1}.mce-mission-label small{display:block;color:#d5b861;font-size:8px;font-weight:900;letter-spacing:.18em}.mce-mission-label b{display:block;margin-top:2px;font-size:13px}" +
      ".mce-mission-toggle{border:0;background:transparent;color:#fff;font-size:17px;cursor:pointer}" +
      ".mce-mission-body{padding:12px}.mce-mission-body p{margin:0;color:#cad2df;font-size:11px;line-height:1.45}.mce-mission-reward{margin-top:9px!important;color:#ffd97a!important}" +
      ".mce-mission-meter{height:7px;margin-top:10px;overflow:hidden;border-radius:9px;background:#202637}.mce-mission-meter i{display:block;height:100%;background:linear-gradient(90deg,#ff8a29,#ffe46d);box-shadow:0 0 12px #ffc34d}" +
      ".mce-mission-progress{margin-top:5px;color:#9fabc0;font-size:8px;text-align:right;text-transform:uppercase;letter-spacing:.08em}" +
      ".mce-mission-action{display:block;margin-top:11px;padding:11px;border:1px solid #ffe08a;border-radius:9px;background:linear-gradient(135deg,#d06e12,#f0b829);color:#130b02;text-align:center;text-decoration:none;font-size:10px;font-weight:900;letter-spacing:.08em}" +
      ".mce-mission-dock.collapsed .mce-mission-body{display:none}.mce-mission-complete .mce-mission-badge{background:#65e69a}.mce-mission-complete .mce-mission-card{border-color:#65e69a}" +
      ".mce-mission-dock.room-mode{z-index:23;left:12px;top:72px;bottom:auto;width:min(280px,calc(100vw - 24px))}.mce-mission-dock.room-mode .mce-mission-head{padding:7px 9px}.mce-mission-dock.room-mode .mce-mission-badge{width:25px;height:25px;font-size:12px}.mce-mission-dock.room-mode .mce-mission-label small{font-size:6px}.mce-mission-dock.room-mode .mce-mission-label b{font-size:10px}.mce-mission-dock.room-mode .mce-mission-toggle{font-size:15px}" +
      "@media(max-width:700px),(pointer:coarse){.mce-mission-dock:not(.room-mode){left:8px;bottom:8px;width:calc(100vw - 16px)}.mce-mission-body{padding:10px}.mce-mission-head{padding:8px 10px}.mce-mission-dock.room-mode{left:8px;top:164px;bottom:auto;width:min(210px,calc(100vw - 16px))}}" +
      "@media(pointer:coarse) and (orientation:landscape){.mce-mission-dock.room-mode{left:8px;top:70px;width:220px}}";
    document.head.appendChild(style);
  }

  function renderDock() {
    if (!root.document || !root.MCE) return;
    styleDock();
    var state = root.MCE.get ? root.MCE.get() : root.MCE.load();
    var result = career(state, contextFromStorage());
    var dock = document.getElementById("mceMissionDock");
    if (!dock) {
      dock = document.createElement("aside");
      dock.id = "mceMissionDock";
      dock.className = "mce-mission-dock";
      var compactRooms = /\/(avatar_studio|bedroom_studio|begenius_studio|hip_hop_heights|hiphop_cafe|battle_room|warehouse)\.html$/;
      if (compactRooms.test(String(root.location && root.location.pathname || ""))) {
        dock.classList.add("collapsed", "room-mode");
      }
      dock.setAttribute("aria-live", "polite");
      document.body.appendChild(dock);
    }
    var mission = result.current;
    var progress = progressFor(mission, state);
    var step = result.finished ? result.total : result.completedCount + 1;
    dock.classList.toggle("mce-mission-complete", result.finished);
    dock.innerHTML = '<div class="mce-mission-card"><div class="mce-mission-head">' +
      '<span class="mce-mission-badge">' + (result.finished ? "✓" : step) + '</span>' +
      '<span class="mce-mission-label"><small>' + (result.finished ? "CAREER RUN COMPLETE" : "NEXT CAREER MOVE • " + step + "/" + result.total) + '</small><b>' +
      (result.finished ? "You Put Music City On Notice" : mission.title) + '</b></span>' +
      '<button class="mce-mission-toggle" type="button" aria-label="Toggle career mission">' + (dock.classList.contains("collapsed") ? "+" : "−") + '</button></div>' +
      '<div class="mce-mission-body"><p>' +
      (result.finished ? "You created, released, performed, battled, built a team, and reached radio. Keep growing your catalog and empire." : mission.description) + '</p>' +
      (progress ? '<div class="mce-mission-meter"><i style="width:' + progress.percent + '%"></i></div><div class="mce-mission-progress">' +
        (progress.unit === "cash" ? "$" : "") + progress.value + ' / ' + (progress.unit === "cash" ? "$" : "") + progress.goal + ' ' + progress.unit + '</div>' : '') +
      '<p class="mce-mission-reward">' + (result.finished ? "The city is now yours to explore." : "WHY IT MATTERS: " + mission.reward) + '</p>' +
      (result.finished ? '<a class="mce-mission-action" href="city_map.html">EXPLORE MUSIC CITY</a>' : '<a class="mce-mission-action" href="' + mission.href + '">' + mission.action + '</a>') +
      '</div></div>';
    dock.querySelector(".mce-mission-toggle").onclick = function () {
      dock.classList.toggle("collapsed");
      this.textContent = dock.classList.contains("collapsed") ? "+" : "−";
    };
    return result;
  }

  var api = {
    MISSIONS: MISSIONS,
    career: career,
    progressFor: progressFor,
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
