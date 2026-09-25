const ELEVENLABS_MODELS_URL = "https://api.elevenlabs.io/v1/models";

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
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });

  const origin = req.headers.origin || "";
  if (!originAllowed(req)) {
    return res.status(403).json({ error: "Origin is not allowed." });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      configured: false,
      connected: false,
      message: "Server integration is deployed and waiting for ELEVENLABS_API_KEY."
    });
  }

  try {
    const response = await fetch(ELEVENLABS_MODELS_URL, {
      headers: { "xi-api-key": apiKey }
    });

    if (!response.ok) {
      return res.status(200).json({
        configured: true,
        connected: false,
        message: "An ElevenLabs key is configured, but validation failed."
      });
    }

    const models = await response.json();
    const ids = Array.isArray(models)
      ? models.map(item => item && item.model_id).filter(Boolean)
      : [];

    return res.status(200).json({
      configured: true,
      connected: true,
      musicV25Listed: ids.includes("music_v2_5"),
      scribeV2Listed: ids.includes("scribe_v2"),
      flashV25Listed: ids.includes("eleven_flash_v2_5"),
      message: "Music City is connected to ElevenLabs."
    });
  } catch (error) {
    console.error("ElevenLabs status check failed", error);
    return res.status(200).json({
      configured: true,
      connected: false,
      message: "The ElevenLabs connection could not be validated right now."
    });
  }
};
