(function () {
  const PROFILE_KEY = 'mce-social-profile';
  const HISTORY_PREFIX = 'mce-social-history:';
  const sessionId = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

  function safeParse(value, fallback) {
    try { return JSON.parse(value); } catch (error) { return fallback; }
  }

  function loadProfile() {
    return safeParse(localStorage.getItem(PROFILE_KEY), { name: '', role: 'Artist', color: '#59dfff' });
  }

  function saveProfile(profile) {
    const clean = {
      name: String(profile.name || '').trim().slice(0, 24),
      role: String(profile.role || 'Artist').slice(0, 20),
      color: /^#[0-9a-f]{6}$/i.test(profile.color || '') ? profile.color : '#59dfff'
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(clean));
    return clean;
  }

  function createRoom(roomId, onUpdate) {
    const profile = loadProfile();
    const channelName = `mce-social:${roomId}`;
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel(channelName) : null;
    const presence = new Map();
    const seenMessages = new Set();
    let closed = false;
    const historyKey = HISTORY_PREFIX + roomId;
    let messages = safeParse(localStorage.getItem(historyKey), []).slice(-50);
    messages.forEach((message) => seenMessages.add(message.id));

    function snapshot() {
      const now = Date.now();
      for (const [id, player] of presence) if (now - player.lastSeen > 9000) presence.delete(id);
      onUpdate({ players: [...presence.values()], messages: messages.slice(-50), roomId, transport: channel ? 'local-realtime' : 'single-tab' });
    }

    function announce(type) {
      const player = { id: sessionId, name: profile.name, role: profile.role, color: profile.color, lastSeen: Date.now() };
      presence.set(sessionId, player);
      if (channel) channel.postMessage({ type, player });
      snapshot();
    }

    function receive(event) {
      const packet = event.data || {};
      if (packet.type === 'join' || packet.type === 'heartbeat') {
        if (packet.player && packet.player.id) presence.set(packet.player.id, { ...packet.player, lastSeen: Date.now() });
        if (packet.type === 'join') announce('heartbeat');
      }
      if (packet.type === 'leave' && packet.playerId) presence.delete(packet.playerId);
      if (packet.type === 'chat' && packet.message && !seenMessages.has(packet.message.id)) {
        seenMessages.add(packet.message.id);
        messages.push(packet.message);
        messages = messages.slice(-50);
        localStorage.setItem(historyKey, JSON.stringify(messages));
      }
      snapshot();
    }

    if (channel) channel.onmessage = receive;
    announce('join');
    const heartbeat = setInterval(() => announce('heartbeat'), 3000);
    const cleanup = setInterval(snapshot, 2500);

    function send(text) {
      const body = String(text || '').trim().slice(0, 280);
      if (!body || closed) return;
      const message = { id: `${sessionId}:${Date.now()}`, playerId: sessionId, name: profile.name, role: profile.role, color: profile.color, text: body, sentAt: Date.now() };
      seenMessages.add(message.id);
      messages.push(message);
      messages = messages.slice(-50);
      localStorage.setItem(historyKey, JSON.stringify(messages));
      if (channel) channel.postMessage({ type: 'chat', message });
      snapshot();
    }

    function close() {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      clearInterval(cleanup);
      if (channel) { channel.postMessage({ type: 'leave', playerId: sessionId }); channel.close(); }
    }

    return { send, close, profile, sessionId };
  }

  window.MCESocial = { loadProfile, saveProfile, createRoom };
})();
