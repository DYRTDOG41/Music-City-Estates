const ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech";

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

function setCors(req, res) {
  const origin = req.headers.origin || "";
  if (origin && allowedOrigins().includes(origin)) {
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
  if (origin && !allowedOrigins().includes(origin)) {
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

  const text = clean(body.text).slice(0, 700);
  if (!text) return res.status(400).json({ error: "Text is required." });

  const voiceId = clean(
    process.env.ELEVENLABS_VOICE_ID,
    "JBFqnCBsd6RMkjVDRZzb"
  );
  const modelId = clean(
    process.env.ELEVENLABS_TTS_MODEL,
    "eleven_flash_v2_5"
  );

  let providerResponse;
  try {
    providerResponse = await fetch(
      `${ELEVENLABS_TTS_URL}/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text,
          model_id: modelId
        })
      }
    );
  } catch (error) {
    console.error("ElevenLabs TTS request failed", error);
    return res.status(502).json({ error: "Music City could not reach ElevenLabs text-to-speech." });
  }

  if (!providerResponse.ok) {
    let details = null;
    try { details = await providerResponse.json(); } catch (error) {}
    const message =
      details?.detail?.message ||
      details?.detail?.status ||
      details?.message ||
      "ElevenLabs rejected the text-to-speech request.";
    return res.status(providerResponse.status).json({ error: message });
  }

  const audio = Buffer.from(await providerResponse.arrayBuffer());
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Content-Length", String(audio.length));
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Music-City-Provider", "elevenlabs");
  return res.status(200).send(audio);
};
