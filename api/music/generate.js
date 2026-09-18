const ELEVENLABS_MUSIC_URL = "https://api.elevenlabs.io/v1/music";

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
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Type, X-Music-City-Song-Id, X-Music-City-Provider"
  );
}

function clean(value, fallback = "") {
  const text = String(value == null ? "" : value).trim();
  return text || fallback;
}

function clamp(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function buildPrompt(body) {
  const title = clean(body.title, "Untitled Song");
  const style = clean(body.style, "original contemporary music");
  const mode = clean(body.mode, "Create Full Song");
  const beat = clean(body.beat, "no specific Music City beat selected");
  const studio = clean(body.studio, "Music City studio");
  const lyrics = clean(body.lyrics);
  const instrumental =
    mode === "Generate Instrumental" ||
    clean(body.vocalStyle) === "Instrumental Only";

  const parts = [
    "Create an original track for the Music City Estates game.",
    `Working title: "${title}".`,
    `Style and production direction: ${style}.`,
    `Session location: ${studio}.`,
    `Music City beat selection/reference label: ${beat}.`,
    "Use professional arrangement, polished mix balance, a memorable structure, and an original composition."
  ];

  if (instrumental) {
    parts.push("Instrumental only. Do not include vocals or lyrics.");
  } else if (lyrics) {
    parts.push("Use the following user-supplied original lyrics as creative direction:");
    parts.push(lyrics);
  } else {
    parts.push("Create an original vocal concept and lyrics that fit the requested style.");
  }

  return parts.join("\n").slice(0, 4100);
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
        "Music City live generation is deployed, but ELEVENLABS_API_KEY has not been configured on the server yet."
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

  if (clean(body.provider, "elevenlabs") !== "elevenlabs") {
    return res.status(400).json({
      error: "This endpoint currently supports the ElevenLabs Music adapter only."
    });
  }

  const mode = clean(body.mode);
  if (
    Boolean(body.audioAttached) &&
    (mode === "Build Music Around My Voice" || mode === "Remix My Recording")
  ) {
    return res.status(422).json({
      error:
        "The first live ElevenLabs adapter is prompt-to-music only. Recorded-voice/audio-reference generation is the next adapter and is not enabled yet."
    });
  }

  const maxGenerationMs = clamp(
    process.env.MUSIC_CITY_MAX_GENERATION_MS,
    3000,
    30000,
    30000
  );

  const musicLengthMs = clamp(
    body.musicLengthMs ?? body.durationMs,
    3000,
    maxGenerationMs,
    12000
  );

  const forceInstrumental =
    mode === "Generate Instrumental" ||
    clean(body.vocalStyle) === "Instrumental Only";

  const providerRequest = {
    prompt: buildPrompt(body),
    music_length_ms: musicLengthMs,
    model_id: process.env.ELEVENLABS_MUSIC_MODEL || "music_v2_5",
    force_instrumental: forceInstrumental
  };

  let providerResponse;
  try {
    providerResponse = await fetch(
      `${ELEVENLABS_MUSIC_URL}?output_format=mp3_48000_192`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(providerRequest)
      }
    );
  } catch (error) {
    console.error("ElevenLabs request failed", error);
    return res.status(502).json({
      error: "Music City could not reach the music provider."
    });
  }

  if (!providerResponse.ok) {
    let details = null;
    try {
      details = await providerResponse.json();
    } catch (error) {
      details = null;
    }

    console.error("ElevenLabs music error", {
      status: providerResponse.status,
      details
    });

    const providerMessage =
      details?.detail?.data?.prompt_suggestion ||
      details?.detail?.message ||
      details?.detail?.status ||
      details?.message;

    return res.status(providerResponse.status).json({
      error: providerMessage
        ? `Music provider: ${providerMessage}`
        : "The music provider rejected this generation request."
    });
  }

  const audio = Buffer.from(await providerResponse.arrayBuffer());
  const songId = providerResponse.headers.get("song-id") || "";

  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Content-Length", String(audio.length));
  res.setHeader("Content-Disposition", 'inline; filename="music-city-preview.mp3"');
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Music-City-Provider", "elevenlabs");

  if (songId) {
    res.setHeader("X-Music-City-Song-Id", songId);
  }

  return res.status(200).send(audio);
};
