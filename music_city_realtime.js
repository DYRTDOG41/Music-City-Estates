(function (root) {
  "use strict";

  var SUPABASE_URL = "https://zjjuvexrufpigzknkmyo.supabase.co";
  var SUPABASE_PUBLISHABLE_KEY = "sb_publishable_CtwasWrnVk_01ztx0xPL-w_L1ALHLGt";
  var CLIENT_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  var sessionId = (root.crypto && root.crypto.randomUUID) ? root.crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2));
  var channel = null;
  var client = null;
  var localStream = null;
  var peers = new Map();
  var players = new Map();
  var messages = [];
  var seenMessages = new Set();
  var voiceEnabled = false;
  var started = false;
  var ui = {};

  var ROOM_LABELS = {
    "city-map": "City Map",
    "social-world": "Social World",
    "bedroom-studio": "Bedroom Studio",
    "begenius-studio": "BeGenius Studio",
    "studio-booth": "Recording Studio",
    "hiphop-heights": "Hip-Hop Heights",
    "hiphop-cafe": "Hip-Hop Café",
    "warehouse-lobby": "Da Warehouse Lobby",
    "battle-room": "Word Slaughter",
    "nightclub": "Nightclub",
    "manager-office": "Manager Office",
    "radio": "Music City Radio",
    "artist-catalog": "Artist Catalog"
  };

  function pageFile() {
    return String(root.location && root.location.pathname || "").split("/").pop().toLowerCase();
  }

  function roomForPage() {
    var file = pageFile();
    var map = {
      "city_map.html": "city-map",
      "social_hub.html": "social-world",
      "social_media_room.html": "social-world",
      "bedroom_studio.html": "bedroom-studio",
      "begenius_studio.html": "begenius-studio",
      "begenius_studio_interactive.html": "begenius-studio",
      "record_music.html": "studio-booth",
      "advanced_recording_studio.html": "studio-booth",
      "pro_studio.html": "studio-booth",
      "hip_hop_heights.html": "hiphop-heights",
      "hip_hop_heights_viewer.html": "hiphop-heights",
      "hiphop_cafe.html": "hiphop-cafe",
      "warehouse.html": "warehouse-lobby",
      "warehouse_hangout_viewer.html": "warehouse-lobby",
      "battle_room.html": "battle-room",
      "live_freestyle.html": "battle-room",
      "nightclub.html": "nightclub",
      "manager.html": "manager-office",
      "music_city_radio.html": "radio",
      "artist_catalog.html": "artist-catalog"
    };
    return map[file] || "music-city";
  }

  function stablePlayerId() {
    var key = "mce-social-player-id";
    try {
      var existing = root.localStorage && root.localStorage.getItem(key);
      if (existing) return existing;
      var created = (root.crypto && root.crypto.randomUUID) ? root.crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2));
      if (root.localStorage) root.localStorage.setItem(key, created);
      return created;
    } catch (error) {
      return sessionId;
    }
  }

  function safeParse(value, fallback) {
    try { return JSON.parse(value || "null") || fallback; } catch (error) { return fallback; }
  }

  function profile() {
    var name = "Artist";
    var role = "Artist";
    var color = "#59dfff";
    try {
      if (root.MCE && root.MCE.get) {
        var state = root.MCE.get();
        if (state && state.name && state.name !== "Rookie") name = state.name;
      }
    } catch (error) {}
    try {
      var avatar = safeParse(root.localStorage && root.localStorage.getItem("mceAvatar"), null);
      if (avatar) {
        if (avatar.name && avatar.name !== "New Artist") name = avatar.name;
        if (avatar.type) role = avatar.type;
        if (/^#[0-9a-f]{6}$/i.test(avatar.shirtColor || "")) color = avatar.shirtColor;
      }
    } catch (error) {}
    try {
      var saved = safeParse(root.localStorage && root.localStorage.getItem("mce-social-profile"), null);
      if (saved) {
        if (saved.name) name = saved.name;
        if (saved.role) role = saved.role;
        if (/^#[0-9a-f]{6}$/i.test(saved.color || "")) color = saved.color;
      }
    } catch (error) {}
    return { id: sessionId, playerId: stablePlayerId(), name: String(name).slice(0, 24), role: String(role).slice(0, 20), color: color, voice: voiceEnabled };
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (root.supabase && root.supabase.createClient) return resolve();
      var existing = document.querySelector('script[data-mce-realtime-client]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      var script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.dataset.mceRealtimeClient = "1";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function esc(text) {
    return String(text || "").replace(/[&<>"']/g, function (ch) { return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[ch]; });
  }

  function mountUI(roomId) {
    if (document.getElementById("mceRealtimeDock")) return;
    var style = document.createElement("style");
    style.textContent = ".mce-live-dock{position:fixed;right:10px;bottom:10px;z-index:1200;font-family:Arial,sans-serif;color:#fff}.mce-live-pill{min-height:40px;padding:9px 13px;border:1px solid #4edcff88;border-radius:999px;background:#061321e8;color:#fff;font-weight:900;letter-spacing:.08em;cursor:pointer;backdrop-filter:blur(10px)}.mce-live-panel{display:none;width:min(330px,calc(100vw - 20px));max-height:min(520px,75vh);overflow:auto;margin-bottom:8px;border:1px solid #368bc288;border-radius:16px;background:#04101df5;box-shadow:0 14px 40px #0009}.mce-live-panel.open{display:block}.mce-live-head{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:11px 12px;border-bottom:1px solid #234761}.mce-live-head b{font-size:11px;letter-spacing:.08em}.mce-live-head small{display:block;color:#7fb4d5;margin-top:3px}.mce-live-close{border:0;background:transparent;color:#fff;font-size:20px;cursor:pointer}.mce-live-players,.mce-live-msgs{padding:10px 12px}.mce-live-players{display:flex;gap:6px;flex-wrap:wrap;border-bottom:1px solid #18384d}.mce-live-person{padding:5px 8px;border-radius:999px;background:#0b2337;font-size:9px}.mce-live-msgs{height:190px;overflow:auto;display:grid;align-content:start;gap:7px}.mce-live-msg{padding:7px 8px;border-radius:10px;background:#0a1a28;font-size:11px;line-height:1.35}.mce-live-msg b{color:#83dcff}.mce-live-compose{display:grid;grid-template-columns:1fr 62px;gap:6px;padding:10px 12px}.mce-live-compose input{min-width:0;padding:9px 10px;border:1px solid #2c5c7b;border-radius:9px;background:#06111d;color:#fff;font-size:16px}.mce-live-compose button,.mce-live-voice{border:1px solid #4edcff88;border-radius:9px;background:#0c6fa2;color:#fff;font-weight:900;cursor:pointer}.mce-live-voice{width:calc(100% - 24px);margin:0 12px 12px;padding:10px}.mce-live-voice.on{background:#177443;border-color:#6de59b}.mce-live-status{padding:0 12px 10px;color:#8ba5b6;font-size:9px;line-height:1.4}@media(max-width:480px){.mce-live-dock{right:7px;bottom:7px}.mce-live-panel{width:calc(100vw - 14px);max-height:70vh}}";
    document.head.appendChild(style);

    var dock = document.createElement("div");
    dock.id = "mceRealtimeDock";
    dock.className = "mce-live-dock";
    dock.innerHTML = '<div class="mce-live-panel" id="mceLivePanel"><div class="mce-live-head"><div><b>LIVE ROOM</b><small>' + esc(ROOM_LABELS[roomId] || roomId) + '</small></div><button class="mce-live-close" type="button" aria-label="Close live room">×</button></div><div class="mce-live-players" id="mceLivePlayers"><span class="mce-live-person">Connecting…</span></div><div class="mce-live-msgs" id="mceLiveMsgs"></div><form class="mce-live-compose" id="mceLiveForm"><input id="mceLiveInput" maxlength="280" placeholder="Message this room…" autocomplete="off"><button type="submit">SEND</button></form><button class="mce-live-voice" id="mceLiveVoice" type="button">🎙️ JOIN VOICE</button><div class="mce-live-status" id="mceLiveStatus">Connecting to Music City realtime…</div></div><button class="mce-live-pill" id="mceLivePill" type="button">● LIVE <span id="mceLiveCount">0</span></button>';
    document.body.appendChild(dock);
    ui.panel = document.getElementById("mceLivePanel");
    ui.players = document.getElementById("mceLivePlayers");
    ui.messages = document.getElementById("mceLiveMsgs");
    ui.input = document.getElementById("mceLiveInput");
    ui.voice = document.getElementById("mceLiveVoice");
    ui.status = document.getElementById("mceLiveStatus");
    ui.count = document.getElementById("mceLiveCount");
    document.getElementById("mceLivePill").onclick = function () { ui.panel.classList.toggle("open"); };
    dock.querySelector(".mce-live-close").onclick = function () { ui.panel.classList.remove("open"); };
    document.getElementById("mceLiveForm").onsubmit = function (event) {
      event.preventDefault();
      sendChat(ui.input.value);
      ui.input.value = "";
      ui.input.focus();
    };
    ui.voice.onclick = toggleVoice;
  }

  function emitUpdate() {
    try {
      root.dispatchEvent(new CustomEvent("mce:realtime:update", {
        detail: {
          roomId: roomForPage(),
          players: Array.from(players.values()),
          messages: messages.slice(-40),
          voiceEnabled: voiceEnabled
        }
      }));
    } catch (error) {}
  }

  function renderPresence() {
    if (!ui.players) return;
    ui.count.textContent = players.size;
    emitUpdate();
    ui.players.innerHTML = "";
    if (!players.size) {
      ui.players.innerHTML = '<span class="mce-live-person">No one else here yet</span>';
      return;
    }
    Array.from(players.values()).sort(function (a,b) { return String(a.name).localeCompare(String(b.name)); }).forEach(function (p) {
      var chip = document.createElement("span");
      chip.className = "mce-live-person";
      chip.textContent = (p.voice ? "🎙️ " : "") + p.name;
      chip.title = p.role || "Artist";
      ui.players.appendChild(chip);
    });
  }

  function appendMessage(message) {
    if (!message || !message.id || seenMessages.has(message.id)) return false;
    seenMessages.add(message.id);
    messages.push(message);
    messages = messages.slice(-40);
    renderMessages();
    return true;
  }

  async function loadRoomHistory(roomId) {
    if (!client) return;
    try {
      var response = await client
        .from("room_messages")
        .select("client_message_id,player_id,name,role,color,body,created_at")
        .eq("room", roomId)
        .order("created_at", { ascending: false })
        .limit(40);
      if (response.error) throw response.error;
      var rows = (response.data || []).slice().reverse();
      messages = [];
      seenMessages.clear();
      rows.forEach(function (row) {
        var message = {
          id: row.client_message_id,
          playerId: row.player_id,
          name: row.name,
          role: row.role,
          color: row.color,
          text: row.body,
          sentAt: new Date(row.created_at).getTime()
        };
        if (!seenMessages.has(message.id)) {
          seenMessages.add(message.id);
          messages.push(message);
        }
      });
      renderMessages();
    } catch (error) {
      if (ui.status) ui.status.textContent = "Live now. Recent room history could not load.";
    }
  }

  function renderMessages() {
    if (!ui.messages) return;
    ui.messages.innerHTML = "";
    messages.slice(-40).forEach(function (m) {
      var row = document.createElement("div");
      row.className = "mce-live-msg";
      row.innerHTML = "<b>" + esc(m.name) + ":</b> " + esc(m.text);
      ui.messages.appendChild(row);
    });
    ui.messages.scrollTop = ui.messages.scrollHeight;
    emitUpdate();
  }

  async function sendChat(text) {
    var body = String(text || "").trim().slice(0, 280);
    if (!body || !channel || !client) return;
    var p = profile();
    var msg = {
      id: sessionId + ":" + Date.now(),
      playerId: p.playerId,
      name: p.name,
      role: p.role,
      color: p.color,
      text: body,
      sentAt: Date.now()
    };
    appendMessage(msg);

    // Broadcast keeps the room instant; the database insert makes the
    // conversation visible to players who enter a few minutes later.
    channel.send({ type: "broadcast", event: "chat", payload: msg });
    try {
      var response = await client.from("room_messages").insert({
        client_message_id: msg.id,
        room: roomForPage(),
        player_id: msg.playerId,
        name: msg.name,
        role: msg.role,
        color: msg.color,
        body: msg.text
      });
      if (response.error) throw response.error;
    } catch (error) {
      if (ui.status) ui.status.textContent = "Message sent live, but history save is retrying.";
    }
  }

  function rebuildPresence() {
    if (!channel) return;
    players.clear();
    var state = channel.presenceState();
    Object.keys(state || {}).forEach(function (key) {
      var entries = state[key] || [];
      entries.forEach(function (entry) { if (entry && entry.id) players.set(entry.id, entry); });
    });
    renderPresence();
  }

  function remoteAudio(peerId) {
    var id = "mceRemoteAudio_" + peerId.replace(/[^a-z0-9_-]/gi, "");
    var audio = document.getElementById(id);
    if (!audio) {
      audio = document.createElement("audio");
      audio.id = id;
      audio.autoplay = true;
      audio.playsInline = true;
      audio.style.display = "none";
      document.body.appendChild(audio);
    }
    return audio;
  }

  function peerFor(peerId) {
    if (peers.has(peerId)) return peers.get(peerId);
    var pc = new RTCPeerConnection({ iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun.cloudflare.com:3478" }
    ]});
    if (localStream) localStream.getTracks().forEach(function (track) { pc.addTrack(track, localStream); });
    pc.onicecandidate = function (event) {
      if (event.candidate && channel) channel.send({ type: "broadcast", event: "rtc-signal", payload: { from: sessionId, to: peerId, candidate: event.candidate } });
    };
    pc.ontrack = function (event) {
      var audio = remoteAudio(peerId);
      if (event.streams && event.streams[0]) audio.srcObject = event.streams[0];
    };
    pc.onconnectionstatechange = function () {
      if (["failed","closed","disconnected"].includes(pc.connectionState)) {
        try { pc.close(); } catch (error) {}
        peers.delete(peerId);
      }
    };
    peers.set(peerId, pc);
    return pc;
  }

  async function offerTo(peerId) {
    if (!voiceEnabled || peerId === sessionId) return;
    var pc = peerFor(peerId);
    if (pc.signalingState !== "stable") return;
    var offer = await pc.createOffer({ offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);
    channel.send({ type: "broadcast", event: "rtc-signal", payload: { from: sessionId, to: peerId, description: pc.localDescription } });
  }

  async function receiveSignal(payload) {
    if (!payload || payload.to !== sessionId || payload.from === sessionId || !voiceEnabled) return;
    var pc = peerFor(payload.from);
    try {
      if (payload.description) {
        await pc.setRemoteDescription(payload.description);
        if (payload.description.type === "offer") {
          var answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel.send({ type: "broadcast", event: "rtc-signal", payload: { from: sessionId, to: payload.from, description: pc.localDescription } });
        }
      } else if (payload.candidate) {
        await pc.addIceCandidate(payload.candidate);
      }
    } catch (error) {
      if (ui.status) ui.status.textContent = "Voice connection is retrying…";
    }
  }

  async function toggleVoice() {
    if (!channel) return;
    if (voiceEnabled) {
      voiceEnabled = false;
      if (localStream) localStream.getTracks().forEach(function (t) { t.stop(); });
      localStream = null;
      peers.forEach(function (pc) { try { pc.close(); } catch (error) {} });
      peers.clear();
      ui.voice.classList.remove("on");
      ui.voice.textContent = "🎙️ JOIN VOICE";
      ui.status.textContent = "Voice off. Chat and presence stay live.";
      try { root.dispatchEvent(new CustomEvent("mce-audio-session", { detail: { active: false, source: "realtime-voice" } })); } catch (error) {}
      emitUpdate();
      await channel.track(profile());
      channel.send({ type: "broadcast", event: "voice-ready", payload: { id: sessionId, enabled: false } });
      return;
    }
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      voiceEnabled = true;
      ui.voice.classList.add("on");
      ui.voice.textContent = "🔊 LEAVE VOICE";
      ui.status.textContent = "Voice on. People in this room can hear you.";
      try { root.dispatchEvent(new CustomEvent("mce-audio-session", { detail: { active: true, source: "realtime-voice" } })); } catch (error) {}
      emitUpdate();
      await channel.track(profile());
      channel.send({ type: "broadcast", event: "voice-ready", payload: { id: sessionId, enabled: true } });
      Array.from(players.keys()).filter(function (id) { return id !== sessionId && sessionId < id; }).forEach(function (id) { offerTo(id); });
    } catch (error) {
      try { root.dispatchEvent(new CustomEvent("mce-audio-session", { detail: { active: false, source: "realtime-voice" } })); } catch (dispatchError) {}
      ui.status.textContent = "Microphone permission was not granted.";
    }
  }

  function connect(roomId) {
    client = root.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    channel = client.channel("mce-room:" + roomId, { config: { broadcast: { self: false }, presence: { key: sessionId } } });
    channel.on("presence", { event: "sync" }, rebuildPresence);
    channel.on("presence", { event: "join" }, rebuildPresence);
    channel.on("presence", { event: "leave" }, rebuildPresence);
    channel.on("broadcast", { event: "chat" }, function (packet) {
      var msg = packet && packet.payload;
      if (!msg || msg.id && seenMessages.has(msg.id)) return;
      appendMessage(msg);
    });
    channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "room_messages", filter: "room=eq." + roomId }, function (packet) {
      var row = packet && packet.new;
      if (!row) return;
      appendMessage({
        id: row.client_message_id,
        playerId: row.player_id,
        name: row.name,
        role: row.role,
        color: row.color,
        text: row.body,
        sentAt: new Date(row.created_at).getTime()
      });
    });
    channel.on("broadcast", { event: "voice-ready" }, function (packet) {
      var data = packet && packet.payload;
      if (!data || data.id === sessionId) return;
      if (voiceEnabled && data.enabled && sessionId < data.id) offerTo(data.id);
    });
    channel.on("broadcast", { event: "rtc-signal" }, function (packet) { receiveSignal(packet && packet.payload); });
    channel.subscribe(async function (status) {
      if (status === "SUBSCRIBED") {
        await channel.track(profile());
        await loadRoomHistory(roomId);
        if (ui.status) ui.status.textContent = "Connected. Live chat and recent room history are synced across devices.";
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        if (ui.status) ui.status.textContent = "Realtime connection is retrying…";
      }
    });
  }

  async function start() {
    if (started || !root.document) return;
    started = true;
    var roomId = roomForPage();
    mountUI(roomId);
    try {
      await loadScript(CLIENT_CDN);
      connect(roomId);
    } catch (error) {
      if (ui.status) ui.status.textContent = "Realtime could not load on this connection.";
    }
  }

  root.MCERealtime = {
    start: start,
    roomForPage: roomForPage,
    sessionId: sessionId,
    open: function () { if (ui.panel) ui.panel.classList.add("open"); },
    close: function () { if (ui.panel) ui.panel.classList.remove("open"); },
    send: sendChat,
    toggleVoice: toggleVoice,
    getSnapshot: function () {
      return { roomId: roomForPage(), players: Array.from(players.values()), messages: messages.slice(-40), voiceEnabled: voiceEnabled };
    }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
  root.addEventListener("mce-audio-session", function (event) {
    var detail = event && event.detail || {};
    if (detail.active && detail.source !== "realtime-voice" && voiceEnabled) {
      toggleVoice();
    }
  });

  root.addEventListener("beforeunload", function () {
    try { if (channel) channel.untrack(); } catch (error) {}
    try { if (client && channel) client.removeChannel(channel); } catch (error) {}
    if (localStream) localStream.getTracks().forEach(function (track) { track.stop(); });
    try { root.dispatchEvent(new CustomEvent("mce-audio-session", { detail: { active: false, source: "realtime-voice" } })); } catch (error) {}
  });
})(typeof window !== "undefined" ? window : globalThis);
