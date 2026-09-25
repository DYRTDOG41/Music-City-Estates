const ELEVENLABS_AUDIO_ISOLATION_URL = "https://api.elevenlabs.io/v1/audio-isolation";
const MAX_AUDIO_BYTES = 3 * 1024 * 1024;

function allowedOrigins() {
  return [
    "https://dyrtdog41.github.io",
    "http://localhost:8000",
    "http://localhost:8001",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:8001",
    ...String(process.env.MUSIC_CITY_ALLOWED_ORIGINS || "")
      .split(",")
      .map(value => value.trim())
      .filter(Boolean)
  ];
}

function originAllowed(req) {
  const origin = req.headers.origin || "";
  if (!origin) return true;
  try {
    const url = new URL(origin);
    const forwardedHost = String(req.headers["x-forwarded-host"] || "")
      .split(",")[0].trim();
    const requestHost = forwardedHost || String(req.headers.host || "").trim();
    if (requestHost && url.host === requestHost) return true;
  } catch (error) {}
  return allowedOrigins().includes(origin);
}

function setCors(req, res) {
  const origin = req.headers.origin || "";
  if (origin && originAllowed(req)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Expose-Headers", "Content-Type, X-Music-City-Provider");
}

function clean(value, fallback = "") {
  const text = String(value == null ? "" : value).trim();
  return text || fallback;
}

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  const origin = req.headers.origin || "";
  if (!originAllowed(req)) {
    return res.status(403).json({ error: "Origin is not allowed." });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "ELEVENLABS_API_KEY is not configured on the Music City server."
    });
  }

  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); }
    catch (error) { return res.status(400).json({ error: "Invalid JSON request." }); }
  }

  const audioBase64 = clean(body.audioBase64);
  if (!audioBase64) return res.status(400).json({ error: "No vocal audio was supplied." });

  const mimeType = clean(body.mimeType, "audio/webm").slice(0, 100);
  const filename = clean(body.filename, "music-city-vocal.webm")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);

  let audioBuffer;
  try { audioBuffer = Buffer.from(audioBase64, "base64"); }
  catch (error) { return res.status(400).json({ error: "Vocal audio could not be decoded." }); }

  if (!audioBuffer.length) return res.status(400).json({ error: "Vocal audio is empty." });
  if (audioBuffer.length > MAX_AUDIO_BYTES) {
    return res.status(413).json({
      error: "Keep the vocal-cleanup take under 3 MB for this browser build."
    });
  }

  const form = new FormData();
  form.append("audio", new Blob([audioBuffer], { type: mimeType }), filename);
  form.append("file_format", "other");

  let providerResponse;
  try {
    providerResponse = await fetch(ELEVENLABS_AUDIO_ISOLATION_URL, {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form
    });
  } catch (error) {
    console.error("ElevenLabs audio isolation request failed", error);
    return res.status(502).json({
      error: "Music City could not reach ElevenLabs Voice Isolator."
    });
  }

  if (!providerResponse.ok) {
    let payload = null;
    try { payload = await providerResponse.json(); } catch (error) {}
    const message =
      payload?.detail?.message ||
      payload?.detail?.status ||
      payload?.message ||
      "ElevenLabs rejected the vocal-cleanup request.";
    return res.status(providerResponse.status).json({ error: message });
  }

  const audio = Buffer.from(await providerResponse.arrayBuffer());
  const contentType = providerResponse.headers.get("content-type") || "audio/mpeg";
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Length", String(audio.length));
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Music-City-Provider", "elevenlabs");
  return res.status(200).send(audio);
};
