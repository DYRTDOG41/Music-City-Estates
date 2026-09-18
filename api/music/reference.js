const ELEVENLABS_UPLOAD_URL = "https://api.elevenlabs.io/v1/music/upload";
const MAX_REFERENCE_BYTES = 5 * 1024 * 1024;

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

function originAllowed(origin) {
  return !origin || allowedOrigins().includes(origin);
}

function setCors(req, res) {
  const origin = req.headers.origin || "";

  if (origin && originAllowed(origin)) {
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

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!originAllowed(req.headers.origin || "")) {
    return res.status(403).json({ error: "Origin is not allowed." });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error:
        "Music City audio reference is deployed, but ELEVENLABS_API_KEY has not been configured on the server yet."
    });
  }

  let body = req.body || {};
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (error) {
      return res.status(400).json({ error: "Invalid JSON request." });
    }
  }

  const audioBase64 = clean(body.audioBase64);
  const mimeType = clean(body.mimeType, "audio/webm").slice(0, 100);
  const filename = clean(body.filename, "music-city-reference.webm")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);

  if (!audioBase64) {
    return res.status(400).json({ error: "No reference audio was supplied." });
  }

  let audioBuffer;
  try {
    audioBuffer = Buffer.from(audioBase64, "base64");
  } catch (error) {
    return res.status(400).json({ error: "Reference audio could not be decoded." });
  }

  if (!audioBuffer.length) {
    return res.status(400).json({ error: "Reference audio is empty." });
  }

  if (audioBuffer.length > MAX_REFERENCE_BYTES) {
    return res.status(413).json({
      error: "Reference audio must be 5 MB or smaller for the Music City preview workflow."
    });
  }

  const form = new FormData();
  form.append(
    "file",
    new Blob([audioBuffer], { type: mimeType }),
    filename
  );

  let providerResponse;
  try {
    providerResponse = await fetch(ELEVENLABS_UPLOAD_URL, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey
      },
      body: form
    });
  } catch (error) {
    console.error("ElevenLabs reference upload failed", error);
    return res.status(502).json({
      error: "Music City could not reach the audio reference provider."
    });
  }

  let payload = null;
  try {
    payload = await providerResponse.json();
  } catch (error) {
    payload = null;
  }

  if (!providerResponse.ok) {
    console.error("ElevenLabs reference upload error", {
      status: providerResponse.status,
      payload
    });

    const providerMessage =
      payload?.detail?.message ||
      payload?.detail?.status ||
      payload?.message;

    return res.status(providerResponse.status).json({
      error: providerMessage
        ? `Music provider: ${providerMessage}`
        : "The music provider rejected this audio reference."
    });
  }

  if (!payload || !payload.song_id) {
    return res.status(502).json({
      error: "The music provider did not return a reference song ID."
    });
  }

  return res.status(200).json({
    songId: payload.song_id,
    status: "reference-ready",
    message: "Reference audio is ready for Music City generation."
  });
};
