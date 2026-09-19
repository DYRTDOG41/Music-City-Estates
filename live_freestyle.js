(function () {
"use strict";

var byId = function (id) { return document.getElementById(id); };
var setupView = byId("setupView");
var roomView = byId("roomView");
var hostStatus = byId("hostStatus");
var joinStatus = byId("joinStatus");
var connectionStatus = byId("connectionStatus");
var participantsEl = byId("participants");
var battleLog = byId("battleLog");
var hostControls = byId("hostControls");
var votePanel = byId("votePanel");
var micButton = byId("micButton");
var audioButton = byId("audioButton");
var tapAudio = byId("tapAudio");
var remoteAudioMount = byId("remoteAudioMount");

var peer = null;
var hostConn = null;
var isHost = false;
var soloMode = false;
var localRole = "audience";
var assignedRole = "audience";
var localName = "Guest";
var roomCode = "";
var localStream = null;
var remotePerformerStream = null;
var micMuted = false;
var audioContext = null;
var mixerContext = null;
var mixerDestination = null;
var mixerSources = {};
var beatMaster = null;
var hostOffsetMs = 0;
var syncSamples = [];
var connections = new Map();
var participants = new Map();
var mediaCalls = new Map();
var battle = null;
var battleTimer = null;
var voteCloseTimer = null;
var votedBattleId = "";
var votesByPeer = new Map();
var votes = { a: 0, b: 0 };
var rewardHandled = {};
var myPeerId = "";

function setStatus(el, message, kind) {
  if (!el) return;
  el.textContent = message;
  el.className = "status" + (kind ? " " + kind : "");
}

function log(message) {
  setStatus(battleLog, message, "");
}

function safeName(value, fallback) {
  var name = String(value || "").trim().replace(/[<>]/g, "");
  return name.slice(0, 28) || fallback;
}

function defaultPlayerName() {
  try {
    if (window.MCE) {
      var player = window.MCE.load();
      if (player && player.name && player.name !== "Rookie") return player.name;
    }
  } catch (err) {}
  return "";
}

function makeRoomCode() {
  var alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  var value = "mce-";
  for (var i = 0; i < 6; i++) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return value;
}

function normalizeRoomCode(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

function currentHostTime() {
  return Date.now() + hostOffsetMs;
}

function roleLabel(role) {
  if (role === "rapper-a") return "RAPPER A";
  if (role === "rapper-b") return "RAPPER B";
  return "AUDIENCE";
}

function notifyArenaUi(phase) { try { window.dispatchEvent(new CustomEvent("mce-live-arena-ui", { detail: { phase: phase } })); } catch (err) {} }

function showRoom() {
  setupView.classList.add("hidden");
  roomView.classList.remove("hidden");
  byId("roomCode").textContent = roomCode.toUpperCase();
  hostControls.classList.toggle("hidden", !isHost);
  updateMicUi();
  renderParticipants();
  notifyArenaUi("room");
}

function renderParticipants() {
  if (!participantsEl) return;
  participantsEl.innerHTML = "";
  var list = Array.from(participants.values());
  list.sort(function (a, b) {
    var rank = { "rapper-a": 0, "rapper-b": 1, "audience": 2 };
    return (rank[a.role] || 9) - (rank[b.role] || 9);
  });
  list.forEach(function (person) {
    var row = document.createElement("div");
    row.className = "person";
    var details = document.createElement("div");
    var strong = document.createElement("strong");
    strong.textContent = person.name || "Guest";
    var small = document.createElement("small");
    small.textContent = person.id === myPeerId ? "This device" : "Connected";
    details.appendChild(strong);
    details.appendChild(small);
    var badge = document.createElement("span");
    badge.className = "role";
    badge.textContent = roleLabel(person.role);
    row.appendChild(details);
    row.appendChild(badge);
    participantsEl.appendChild(row);
  });
  if (!list.length) {
    participantsEl.innerHTML = '<div class="note">Waiting for people to join.</div>';
  }
}

function participantPacket() {
  return Array.from(participants.values()).map(function (p) {
    return { id: p.id, name: p.name, role: p.role };
  });
}

function broadcast(payload) {
  connections.forEach(function (entry) {
    if (entry.conn && entry.conn.open) {
      try { entry.conn.send(payload); } catch (err) {}
    }
  });
}

function broadcastParticipants() {
  if (!isHost) return;
  broadcast({ type: "participants", participants: participantPacket() });
  renderParticipants();
}

function bootAudioContexts() {
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) throw new Error("This browser does not support Web Audio.");
  if (!audioContext || audioContext.state === "closed") audioContext = new AudioCtx();
  if (audioContext.state === "suspended") audioContext.resume().catch(function () {});
}

function ensureMixer() {
  if (!isHost) return;
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!mixerContext || mixerContext.state === "closed") {
    mixerContext = new AudioCtx();
    mixerDestination = mixerContext.createMediaStreamDestination();
  }
  if (mixerContext.state === "suspended") mixerContext.resume().catch(function () {});
}

function addStreamToMixer(key, stream) {
  if (!isHost || !stream) return;
  ensureMixer();
  if (mixerSources[key]) {
    try { mixerSources[key].disconnect(); } catch (err) {}
  }
  try {
    var source = mixerContext.createMediaStreamSource(stream);
    source.connect(mixerDestination);
    mixerSources[key] = source;
  } catch (err) {
    console.warn("Mixer source failed", err);
  }
}

function removeMixerSource(key) {
  if (!mixerSources[key]) return;
  try { mixerSources[key].disconnect(); } catch (err) {}
  delete mixerSources[key];
}

async function requestMic() {
  if (localStream) return localStream;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Microphone access requires HTTPS and a supported browser.");
  }
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    video: false
  });
  if (isHost) addStreamToMixer("host", localStream);
  updateMicUi();
  return localStream;
}

function stopLocalMic() {
  if (!localStream) return;
  localStream.getTracks().forEach(function (track) { track.stop(); });
  localStream = null;
  removeMixerSource("host");
  updateMicUi();
}

function updateMicUi() {
  if (!micButton) return;
  var rapper = assignedRole === "rapper-a" || assignedRole === "rapper-b";
  if (!rapper) {
    micButton.textContent = "MIC: AUDIENCE";
    micButton.disabled = true;
    return;
  }
  micButton.disabled = !localStream;
  micButton.textContent = micMuted ? "MIC: MUTED" : "MIC: ON";
}

function toggleMic() {
  if (!localStream) return;
  micMuted = !micMuted;
  localStream.getAudioTracks().forEach(function (track) {
    track.enabled = !micMuted;
  });
  updateMicUi();
  log(micMuted ? "Your microphone is muted." : "Your microphone is live.");
}

function attachRemoteAudio(stream, label) {
  if (!stream) return;
  var id = "remote-" + label;
  var audio = byId(id);
  if (!audio) {
    audio = document.createElement("audio");
    audio.id = id;
    audio.autoplay = true;
    audio.playsInline = true;
    audio.controls = false;
    remoteAudioMount.appendChild(audio);
  }
  audio.srcObject = stream;
  audio.play().then(function () {
    tapAudio.style.display = "none";
  }).catch(function () {
    tapAudio.style.display = "block";
  });
}

function enableLiveAudio() {
  try { bootAudioContexts(); } catch (err) {}
  if (mixerContext && mixerContext.state === "suspended") {
    mixerContext.resume().catch(function () {});
  }
  Array.from(remoteAudioMount.querySelectorAll("audio")).forEach(function (audio) {
    audio.play().catch(function () {});
  });
  tapAudio.style.display = "none";
  setStatus(byId("audioStatus"), "Live audio enabled. Keep headphones on while rapping.", "good");
}

function attachPeerCommon(p) {
  p.on("error", function (err) {
    var msg = err && err.type ? err.type : (err && err.message ? err.message : "Peer connection error");
    setStatus(connectionStatus, "Connection error: " + msg, "bad");
    if (!roomView.classList.contains("hidden")) log("Network error: " + msg);
  });

  p.on("disconnected", function () {
    setStatus(connectionStatus, "Signaling disconnected. Existing peer audio may continue while reconnecting.", "warn");
    try { p.reconnect(); } catch (err) {}
  });

  p.on("close", function () {
    setStatus(connectionStatus, "Live room connection closed.", "bad");
  });
}

function setupHostPeerHandlers() {
  peer.on("connection", function (conn) {
    attachHostDataConnection(conn);
  });

  peer.on("call", function (call) {
    var metadata = call.metadata || {};
    var participant = participants.get(call.peer);
    if (!participant || participant.role !== "rapper-b") {
      call.close();
      return;
    }
    if (!localStream) {
      call.close();
      return;
    }
    call.answer(localStream);
    mediaCalls.set(call.peer, call);
    call.on("stream", function (stream) {
      remotePerformerStream = stream;
      addStreamToMixer("rapper-b", stream);
      attachRemoteAudio(stream, "rapper-b");
      setStatus(byId("audioStatus"), "Rapper B audio connected. Headphones recommended.", "good");
      log((participant.name || "Rapper B") + " microphone is live.");
    });
    call.on("close", function () {
      mediaCalls.delete(call.peer);
      removeMixerSource("rapper-b");
      remotePerformerStream = null;
    });
    call.on("error", function () {
      removeMixerSource("rapper-b");
      remotePerformerStream = null;
    });
  });
}

function rapperBPresent() {
  var found = null;
  participants.forEach(function (p) {
    if (p.role === "rapper-b") found = p;
  });
  return found;
}

function attachHostDataConnection(conn) {
  var entry = { conn: conn, name: "Guest", role: "audience" };
  connections.set(conn.peer, entry);

  conn.on("open", function () {
    setStatus(connectionStatus, "Room live. A guest connected and is checking in.", "good");
  });

  conn.on("data", function (data) {
    handleHostData(conn, data || {});
  });

  conn.on("close", function () {
    var person = participants.get(conn.peer);
    connections.delete(conn.peer);
    participants.delete(conn.peer);
    mediaCalls.delete(conn.peer);
    if (person && person.role === "rapper-b") {
      removeMixerSource("rapper-b");
      remotePerformerStream = null;
    }
    broadcastParticipants();
    log((person ? person.name : "A guest") + " left the live room.");
  });

  conn.on("error", function () {
    connections.delete(conn.peer);
    participants.delete(conn.peer);
    broadcastParticipants();
  });
}

function handleHostData(conn, data) {
  if (data.type === "hello") {
    var requestedRole = data.role === "rapper" ? "rapper" : "audience";
    var assigned = "audience";
    if (requestedRole === "rapper" && !rapperBPresent()) assigned = "rapper-b";

    var person = {
      id: conn.peer,
      name: safeName(data.name, assigned === "rapper-b" ? "Rapper B" : "Music Fan"),
      role: assigned
    };
    participants.set(conn.peer, person);
    if (connections.has(conn.peer)) {
      connections.get(conn.peer).name = person.name;
      connections.get(conn.peer).role = person.role;
    }

    conn.send({
      type: "welcome",
      role: assigned,
      roomCode: roomCode,
      hostName: localName,
      hostNow: Date.now(),
      soloMode: soloMode
    });

    if (assigned === "audience") {
      callAudience(conn.peer);
    }

    broadcastParticipants();
    log(person.name + " joined as " + roleLabel(assigned) + ".");
    return;
  }

  if (data.type === "ping") {
    conn.send({ type: "pong", echo: Number(data.t0 || 0), hostNow: Date.now() });
    return;
  }

  if (data.type === "vote") {
    registerVote(conn.peer, data.choice, data.battleId);
    return;
  }

  if (data.type === "audio-ready") {
    var p = participants.get(conn.peer);
    if (p && p.role === "audience") callAudience(conn.peer);
  }
}

function callAudience(peerId) {
  if (!isHost || !peer || !mixerDestination) return;
  var participant = participants.get(peerId);
  if (!participant || participant.role !== "audience") return;
  try {
    var existing = mediaCalls.get("aud-" + peerId);
    if (existing) {
      try { existing.close(); } catch (err) {}
    }
    var call = peer.call(peerId, mixerDestination.stream, { metadata: { role: "audience-feed" } });
    mediaCalls.set("aud-" + peerId, call);
    call.on("close", function () { mediaCalls.delete("aud-" + peerId); });
  } catch (err) {
    console.warn("Audience audio call failed", err);
  }
}

async function createRoom(solo) {
  if (peer) return;
  if (typeof window.Peer !== "function") {
    setStatus(hostStatus, "PeerJS did not load. Check internet access and reload.", "bad");
    return;
  }

  isHost = true;
  soloMode = Boolean(solo);
  localRole = "rapper";
  assignedRole = "rapper-a";
  localName = safeName(byId("hostName").value, "Rapper A");
  roomCode = makeRoomCode();

  try {
    bootAudioContexts();
    ensureMixer();
    await requestMic();
  } catch (err) {
    setStatus(hostStatus, "Microphone error: " + err.message, "bad");
    return;
  }

  setStatus(hostStatus, "Opening live room…", "warn");
  peer = new window.Peer(roomCode);
  attachPeerCommon(peer);
  setupHostPeerHandlers();

  peer.on("open", function (id) {
    myPeerId = id;
    roomCode = id;
    participants.set(id, { id: id, name: localName, role: "rapper-a" });
    showRoom();
    setStatus(connectionStatus, soloMode ? "Solo test room ready. You can start immediately." : "Room live. Send the Rapper invite to your opponent and Fan invite to listeners.", "good");
    log(soloMode ? "Solo test ready." : "Waiting for Rapper B.");
  });
}

function setupGuestPeerHandlers() {
  peer.on("call", function (call) {
    var metadata = call.metadata || {};
    if (metadata.role === "audience-feed" || assignedRole === "audience") {
      call.answer();
      call.on("stream", function (stream) {
        attachRemoteAudio(stream, "audience-mix");
        setStatus(byId("audioStatus"), "Live rapper audio connected.", "good");
      });
    } else {
      call.close();
    }
  });
}

async function joinRoom() {
  if (peer) return;
  if (typeof window.Peer !== "function") {
    setStatus(joinStatus, "PeerJS did not load. Check internet access and reload.", "bad");
    return;
  }

  roomCode = normalizeRoomCode(byId("roomInput").value);
  if (!roomCode) {
    setStatus(joinStatus, "Enter the room code first.", "bad");
    return;
  }

  localName = safeName(byId("joinName").value, byId("joinRole").value === "rapper" ? "Rapper B" : "Music Fan");
  localRole = byId("joinRole").value === "rapper" ? "rapper" : "audience";
  assignedRole = localRole === "rapper" ? "rapper-b" : "audience";

  try {
    bootAudioContexts();
    if (localRole === "rapper") await requestMic();
  } catch (err) {
    setStatus(joinStatus, "Microphone error: " + err.message, "bad");
    return;
  }

  setStatus(joinStatus, "Connecting to " + roomCode.toUpperCase() + "…", "warn");
  peer = new window.Peer();
  attachPeerCommon(peer);
  setupGuestPeerHandlers();

  peer.on("open", function (id) {
    myPeerId = id;
    hostConn = peer.connect(roomCode, { reliable: true });
    attachGuestDataConnection(hostConn);
  });
}

function attachGuestDataConnection(conn) {
  conn.on("open", function () {
    conn.send({ type: "hello", name: localName, role: localRole });
    sendSyncPing();
    setStatus(connectionStatus, "Connected to battle host. Finalizing room role…", "good");
  });

  conn.on("data", function (data) {
    handleGuestData(data || {});
  });

  conn.on("close", function () {
    setStatus(connectionStatus, "The host ended or left the live room.", "bad");
    log("Room connection closed.");
  });

  conn.on("error", function () {
    setStatus(connectionStatus, "Could not reach the battle host.", "bad");
  });
}

function sendSyncPing() {
  if (!hostConn || !hostConn.open) return;
  hostConn.send({ type: "ping", t0: Date.now() });
}

function handleGuestData(data) {
  if (data.type === "welcome") {
    assignedRole = data.role || "audience";
    soloMode = Boolean(data.soloMode);

    if (assignedRole === "audience" && localStream) {
      stopLocalMic();
    }

    participants.set(myPeerId, { id: myPeerId, name: localName, role: assignedRole });
    showRoom();
    setStatus(connectionStatus, "Joined " + roomCode.toUpperCase() + " as " + roleLabel(assignedRole) + ".", "good");
    log("You joined as " + roleLabel(assignedRole) + ".");

    if (assignedRole === "rapper-b") startRapperMediaCall();
    if (assignedRole === "audience") hostConn.send({ type: "audio-ready" });

    sendSyncPing();
    setTimeout(sendSyncPing, 250);
    setTimeout(sendSyncPing, 650);
    return;
  }

  if (data.type === "pong") {
    var now = Date.now();
    var sent = Number(data.echo || now);
    var hostNow = Number(data.hostNow || now);
    var midpoint = sent + (now - sent) / 2;
    syncSamples.push(hostNow - midpoint);
    if (syncSamples.length > 5) syncSamples.shift();
    var total = syncSamples.reduce(function (sum, n) { return sum + n; }, 0);
    hostOffsetMs = total / syncSamples.length;
    return;
  }

  if (data.type === "participants") {
    participants.clear();
    (data.participants || []).forEach(function (p) {
      participants.set(p.id, p);
    });
    renderParticipants();
    return;
  }

  if (data.type === "battle-start") {
    beginBattle(data);
    return;
  }

  if (data.type === "battle-stop") {
    stopBattleLocal(data.reason || "Battle stopped by host.");
    return;
  }

  if (data.type === "voting-open") {
    openVoting(data);
    return;
  }

  if (data.type === "vote-score") {
    votes.a = Number(data.a || 0);
    votes.b = Number(data.b || 0);
    updateVoteUi();
    return;
  }

  if (data.type === "battle-result") {
    showBattleResult(data);
  }
}

function startRapperMediaCall() {
  if (!peer || !localStream || !roomCode) return;
  try {
    var call = peer.call(roomCode, localStream, { metadata: { role: "rapper-b", name: localName } });
    mediaCalls.set("host", call);
    call.on("stream", function (stream) {
      attachRemoteAudio(stream, "rapper-a");
      setStatus(byId("audioStatus"), "Rapper A audio connected. Headphones recommended.", "good");
    });
    call.on("close", function () {
      mediaCalls.delete("host");
    });
  } catch (err) {
    setStatus(byId("audioStatus"), "Could not open rapper audio: " + err.message, "bad");
  }
}

function startBattleFromHost() {
  if (!isHost || battle && (battle.phase === "countdown" || battle.phase === "active")) return;

  var opponent = rapperBPresent();
  if (!opponent && !soloMode) {
    setStatus(connectionStatus, "Rapper B has not joined yet. Send the Rapper invite first.", "warn");
    return;
  }

  var bpm = Number(byId("bpm").value || 90);
  var roundSeconds = Number(byId("roundSeconds").value || 30);
  var startAt = Date.now() + 4000;
  var packet = {
    type: "battle-start",
    battleId: "battle-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    startAt: startAt,
    bpm: bpm,
    roundSeconds: roundSeconds,
    turns: 4,
    rapperA: localName,
    rapperB: opponent ? opponent.name : "Open Mic"
  };

  votes = { a: 0, b: 0 };
  votesByPeer.clear();
  votedBattleId = "";
  broadcast(packet);
  beginBattle(packet);
}

function beginBattle(data) {
  clearBattleTimers();
  closeVotePanel();

  battle = {
    id: data.battleId,
    startAt: Number(data.startAt),
    bpm: Number(data.bpm || 90),
    roundSeconds: Number(data.roundSeconds || 30),
    turns: Number(data.turns || 4),
    rapperA: data.rapperA || "Rapper A",
    rapperB: data.rapperB || "Rapper B",
    phase: "countdown",
    votingOpened: false
  };

  byId("stopBattle").disabled = !isHost;
  byId("startBattle").disabled = true;
  byId("stageLabel").innerHTML = '<span class="dot"></span> LIVE BATTLE';
  byId("battleMeta").textContent = battle.bpm + " BPM • " + battle.roundSeconds + " sec per turn • 2 rounds each";
  log("Battle count-in started. Beat drops in 4 seconds.");
  notifyArenaUi("battle");
  scheduleBeat(battle);

  tickBattle();
  battleTimer = setInterval(tickBattle, 100);
}

function tickBattle() {
  if (!battle) return;
  var now = currentHostTime();
  var elapsed = now - battle.startAt;
  var segmentMs = battle.roundSeconds * 1000;
  var totalMs = segmentMs * battle.turns;

  if (elapsed < 0) {
    battle.phase = "countdown";
    var count = Math.max(1, Math.ceil((-elapsed) / 1000));
    byId("countdown").textContent = String(count);
    byId("turnLabel").textContent = "Beat drops on zero";
    byId("clock").textContent = "00:00";
    byId("battleProgress").style.width = "0%";
    return;
  }

  if (elapsed < totalMs) {
    battle.phase = "active";
    var segment = Math.floor(elapsed / segmentMs);
    var within = elapsed - segment * segmentMs;
    var remaining = Math.max(0, Math.ceil((segmentMs - within) / 1000));
    var isA = segment % 2 === 0;
    var roundNumber = Math.floor(segment / 2) + 1;
    byId("countdown").textContent = isA ? "A" : "B";
    byId("turnLabel").textContent = (isA ? battle.rapperA : battle.rapperB) + " — ROUND " + roundNumber;
    byId("clock").textContent = "00:" + String(remaining).padStart(2, "0");
    byId("battleProgress").style.width = Math.min(100, elapsed / totalMs * 100) + "%";
    return;
  }

  byId("battleProgress").style.width = "100%";
  if (battle.phase !== "voting" && battle.phase !== "done") {
    if (isHost) {
      hostOpenVoting();
    } else {
      battle.phase = "waiting-vote";
      byId("countdown").textContent = "VOTE";
      byId("turnLabel").textContent = "Waiting for the host to open fan voting";
      byId("clock").textContent = "00:00";
    }
  }
}

function clearBattleTimers() {
  if (battleTimer) clearInterval(battleTimer);
  battleTimer = null;
  if (voteCloseTimer) clearTimeout(voteCloseTimer);
  voteCloseTimer = null;
}

function hostOpenVoting() {
  if (!isHost || !battle || battle.votingOpened) return;
  battle.votingOpened = true;
  battle.phase = "voting";
  var packet = {
    type: "voting-open",
    battleId: battle.id,
    closesAt: Date.now() + 20000,
    rapperA: battle.rapperA,
    rapperB: battle.rapperB
  };
  broadcast(packet);
  openVoting(packet);
  voteCloseTimer = setTimeout(function () {
    hostFinalizeBattle();
  }, 20200);
}

function openVoting(data) {
  if (!battle || data.battleId !== battle.id) return;
  battle.phase = "voting";
  byId("countdown").textContent = "VOTE";
  byId("turnLabel").textContent = "Fan vote is open";
  byId("clock").textContent = "00:20";
  byId("voteA").textContent = "VOTE " + (data.rapperA || battle.rapperA).toUpperCase();
  byId("voteB").textContent = "VOTE " + (data.rapperB || battle.rapperB).toUpperCase();
  votePanel.classList.remove("hidden");
  notifyArenaUi("voting");

  var canVote = assignedRole === "audience" && votedBattleId !== battle.id;
  byId("voteA").disabled = !canVote;
  byId("voteB").disabled = !canVote;
  byId("votePrompt").textContent = canVote ? "Fans have 20 seconds to choose a winner." : "Rappers can watch the live fan count but cannot vote in their own battle.";

  var closesAt = Number(data.closesAt || currentHostTime() + 20000);
  var voteClock = setInterval(function () {
    if (!battle || battle.phase !== "voting") {
      clearInterval(voteClock);
      return;
    }
    var remaining = Math.max(0, Math.ceil((closesAt - currentHostTime()) / 1000));
    byId("clock").textContent = "00:" + String(remaining).padStart(2, "0");
    if (remaining <= 0) clearInterval(voteClock);
  }, 250);
}

function closeVotePanel() {
  votePanel.classList.add("hidden");
  byId("votesA").textContent = "0";
  byId("votesB").textContent = "0";
}

function castVote(choice) {
  if (!battle || battle.phase !== "voting" || assignedRole !== "audience") return;
  if (votedBattleId === battle.id) return;
  votedBattleId = battle.id;
  byId("voteA").disabled = true;
  byId("voteB").disabled = true;
  byId("votePrompt").textContent = "Vote locked. Waiting for the final count.";
  if (isHost) {
    registerVote(myPeerId, choice, battle.id);
  } else if (hostConn && hostConn.open) {
    hostConn.send({ type: "vote", choice: choice, battleId: battle.id });
  }
}

function registerVote(peerId, choice, battleId) {
  if (!isHost || !battle || battleId !== battle.id || battle.phase !== "voting") return;
  var person = participants.get(peerId);
  if (!person || person.role !== "audience" || votesByPeer.has(peerId)) return;
  if (choice !== "a" && choice !== "b") return;

  votesByPeer.set(peerId, choice);
  votes[choice] += 1;
  var packet = { type: "vote-score", a: votes.a, b: votes.b };
  broadcast(packet);
  updateVoteUi();
}

function updateVoteUi() {
  byId("votesA").textContent = String(votes.a);
  byId("votesB").textContent = String(votes.b);
}

function hostFinalizeBattle() {
  if (!isHost || !battle || battle.phase === "done") return;
  var winner = "tie";
  if (votes.a > votes.b) winner = "a";
  if (votes.b > votes.a) winner = "b";
  var packet = {
    type: "battle-result",
    battleId: battle.id,
    winner: winner,
    votesA: votes.a,
    votesB: votes.b,
    rapperA: battle.rapperA,
    rapperB: battle.rapperB
  };
  broadcast(packet);
  showBattleResult(packet);
}

function showBattleResult(data) {
  if (!battle || data.battleId !== battle.id) return;
  battle.phase = "done";
  clearBattleTimers();
  stopBeat();
  votes.a = Number(data.votesA || 0);
  votes.b = Number(data.votesB || 0);
  updateVoteUi();

  var result;
  if (data.winner === "a") result = (data.rapperA || battle.rapperA) + " wins the live fan vote!";
  else if (data.winner === "b") result = (data.rapperB || battle.rapperB) + " wins the live fan vote!";
  else result = "The fan vote ends in a tie.";

  byId("countdown").textContent = data.winner === "tie" ? "TIE" : "WIN";
  byId("turnLabel").textContent = result;
  byId("clock").textContent = votes.a + " – " + votes.b;
  byId("stageLabel").innerHTML = '<span class="dot"></span> BATTLE COMPLETE';
  byId("startBattle").disabled = !isHost;
  byId("stopBattle").disabled = true;
  byId("voteA").disabled = true;
  byId("voteB").disabled = true;
  byId("votePrompt").textContent = result;
  log(result + " Career rewards are saved locally only when the battle venue is unlocked.");
  notifyArenaUi("done");
  applyCareerReward(data);
}

function applyCareerReward(data) {
  if (rewardHandled[data.battleId]) return;
  rewardHandled[data.battleId] = true;
  if (assignedRole !== "rapper-a" && assignedRole !== "rapper-b") return;

  try {
    if (!window.MCE || !window.MCE.isUnlocked("battle")) {
      log("Battle completed in test mode. Reach 25 fans to earn career rewards from live battles.");
      return;
    }

    var mySide = assignedRole === "rapper-a" ? "a" : "b";
    var won = data.winner === mySide;
    var tied = data.winner === "tie";
    var reward = tied
      ? { battles: 1, xp: 5, fans: 2, reputation: 1 }
      : won
        ? { battles: 1, xp: 10, fans: 6, reputation: 2 }
        : { battles: 1, xp: 6, fans: 3, reputation: 1 };

    window.MCE.add(reward);
    log((won ? "Battle win" : tied ? "Battle tie" : "Battle complete") + " saved: +" + reward.xp + " XP, +" + reward.fans + " fans.");
  } catch (err) {
    console.warn("Reward save failed", err);
  }
}

function stopBattleFromHost() {
  if (!isHost || !battle) return;
  broadcast({ type: "battle-stop", reason: "Host ended the battle." });
  stopBattleLocal("Host ended the battle.");
}

function stopBattleLocal(reason) {
  clearBattleTimers();
  stopBeat();
  if (battle) battle.phase = "done";
  byId("countdown").textContent = "STOP";
  byId("turnLabel").textContent = reason || "Battle stopped.";
  byId("clock").textContent = "00:00";
  byId("battleProgress").style.width = "0%";
  byId("startBattle").disabled = !isHost;
  byId("stopBattle").disabled = true;
  closeVotePanel();
  log(reason || "Battle stopped.");
  notifyArenaUi("done");
}

function scheduleBeat(b) {
  try {
    bootAudioContexts();
  } catch (err) {
    log("Beat audio unavailable: " + err.message);
    return;
  }

  stopBeat();

  var localStartMs = b.startAt - hostOffsetMs;
  var delaySeconds = Math.max(0, (localStartMs - Date.now()) / 1000);
  var startTime = audioContext.currentTime + delaySeconds;
  var totalSeconds = b.roundSeconds * b.turns;
  var beatSeconds = 60 / b.bpm;
  var eighth = beatSeconds / 2;

  beatMaster = audioContext.createGain();
  beatMaster.gain.value = 0.42;
  beatMaster.connect(audioContext.destination);

  var steps = Math.ceil(totalSeconds / eighth);
  for (var i = 0; i < steps; i++) {
    var t = startTime + i * eighth;
    scheduleHat(t, i % 2 === 0 ? 0.055 : 0.035);
    if (i % 8 === 0 || i % 8 === 6) scheduleKick(t);
    if (i % 8 === 4) scheduleSnare(t);
  }
}

function scheduleKick(time) {
  if (!audioContext || !beatMaster) return;
  var osc = audioContext.createOscillator();
  var gain = audioContext.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(48, time + 0.12);
  gain.gain.setValueAtTime(0.9, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
  osc.connect(gain);
  gain.connect(beatMaster);
  osc.start(time);
  osc.stop(time + 0.2);
}

function noiseBuffer() {
  var length = Math.floor(audioContext.sampleRate * 0.2);
  var buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
  var data = buffer.getChannelData(0);
  for (var i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function scheduleSnare(time) {
  if (!audioContext || !beatMaster) return;
  var noise = audioContext.createBufferSource();
  var filter = audioContext.createBiquadFilter();
  var gain = audioContext.createGain();
  noise.buffer = noiseBuffer();
  filter.type = "highpass";
  filter.frequency.value = 900;
  gain.gain.setValueAtTime(0.34, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(beatMaster);
  noise.start(time);
  noise.stop(time + 0.18);
}

function scheduleHat(time, level) {
  if (!audioContext || !beatMaster) return;
  var noise = audioContext.createBufferSource();
  var filter = audioContext.createBiquadFilter();
  var gain = audioContext.createGain();
  noise.buffer = noiseBuffer();
  filter.type = "highpass";
  filter.frequency.value = 5000;
  gain.gain.setValueAtTime(level, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(beatMaster);
  noise.start(time);
  noise.stop(time + 0.05);
}

function stopBeat() {
  if (!beatMaster || !audioContext) return;
  try {
    beatMaster.gain.cancelScheduledValues(audioContext.currentTime);
    beatMaster.gain.setValueAtTime(0, audioContext.currentTime);
    beatMaster.disconnect();
  } catch (err) {}
  beatMaster = null;
}

function copyInvite(role) {
  if (!roomCode) return;
  var url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("room", roomCode);
  url.searchParams.set("role", role);

  var text = url.toString();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () {
      log((role === "rapper" ? "Rapper" : "Fan") + " invite copied.");
    }).catch(function () {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  var area = document.createElement("textarea");
  area.value = text;
  document.body.appendChild(area);
  area.select();
  try { document.execCommand("copy"); } catch (err) {}
  area.remove();
  log("Invite link copied.");
}

function preloadInviteFromUrl() {
  var params = new URLSearchParams(window.location.search);
  var room = normalizeRoomCode(params.get("room"));
  var role = params.get("role");
  if (room) byId("roomInput").value = room.toUpperCase();
  if (role === "audience" || role === "rapper") byId("joinRole").value = role;
  if (room) {
    setStatus(joinStatus, "Invite loaded for " + room.toUpperCase() + ". Enter your name and tap Join Live Room.", "good");
  }
}

function initNames() {
  var name = defaultPlayerName();
  if (name) {
    byId("hostName").value = name;
    byId("joinName").value = name;
  }
}

byId("createRoom").addEventListener("click", function () { createRoom(false); });
byId("quickSolo").addEventListener("click", function () { createRoom(true); });
byId("joinRoom").addEventListener("click", joinRoom);
byId("copyRapper").addEventListener("click", function () { copyInvite("rapper"); });
byId("copyAudience").addEventListener("click", function () { copyInvite("audience"); });
byId("startBattle").addEventListener("click", startBattleFromHost);
byId("stopBattle").addEventListener("click", stopBattleFromHost);
byId("voteA").addEventListener("click", function () { castVote("a"); });
byId("voteB").addEventListener("click", function () { castVote("b"); });
micButton.addEventListener("click", toggleMic);
audioButton.addEventListener("click", enableLiveAudio);
tapAudio.addEventListener("click", enableLiveAudio);

window.addEventListener("beforeunload", function () {
  clearBattleTimers();
  stopBeat();
  try { if (peer) peer.destroy(); } catch (err) {}
  if (localStream) localStream.getTracks().forEach(function (track) { track.stop(); });
});

initNames();
preloadInviteFromUrl();
})();