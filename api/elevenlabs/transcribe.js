const ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

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
    return res.status(503).json({ error: "ELEVENLABS_API_KEY is not configured on the Music City server." });
  }

  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); }
    catch (error) { return res.status(400).json({ error: "Invalid JSON request." }); }
  }

  const audioBase64 = clean(body.audioBase64);
  if (!audioBase64) return res.status(400).json({ error: "No audio was supplied." });

  const mimeType = clean(body.mimeType, "audio/webm").slice(0, 100);
  const filename = clean(body.filename, "music-city-take.webm")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);

  let audioBuffer;
  try { audioBuffer = Buffer.from(audioBase64, "base64"); }
  catch (error) { return res.status(400).json({ error: "Audio could not be decoded." }); }

  if (!audioBuffer.length) return res.status(400).json({ error: "Audio is empty." });
  if (audioBuffer.length > MAX_AUDIO_BYTES) {
    return res.status(413).json({ error: "Keep the demo take under 8 MB." });
  }

  const form = new FormData();
  form.append("file", new Blob([audioBuffer], { type: mimeType }), filename);
  form.append("model_id", clean(process.env.ELEVENLABS_STT_MODEL, "scribe_v2"));

  let providerResponse;
  try {
    providerResponse = await fetch(ELEVENLABS_STT_URL, {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form
    });
  } catch (error) {
    console.error("ElevenLabs STT request failed", error);
    return res.status(502).json({ error: "Music City could not reach ElevenLabs speech-to-text." });
  }

  let payload = null;
  try { payload = await providerResponse.json(); } catch (error) {}

  if (!providerResponse.ok) {
    const message =
      payload?.detail?.message ||
      payload?.detail?.status ||
      payload?.message ||
      "ElevenLabs rejected the transcription request.";
    return res.status(providerResponse.status).json({ error: message });
  }

  return res.status(200).json({
    provider: "elevenlabs",
    model: process.env.ELEVENLABS_STT_MODEL || "scribe_v2",
    text: clean(payload?.text),
    languageCode: payload?.language_code || null,
    languageProbability: payload?.language_probability ?? null
  });
};
