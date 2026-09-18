const DEFAULT_ALLOWED_ORIGIN = "https://dyrtdog41.github.io";

function setCors(req, res) {
  const configured = process.env.MUSIC_CITY_ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGIN;
  const requestOrigin = req.headers.origin || "";
  const localOrigin =
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin);

  if (requestOrigin === configured || localOrigin) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", configured);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader(
    "Access-Control-Expose-Headers",
    "X-Music-City-Song-Id, X-Music-City-Provider"
  );
}

function clean(value, fallback = "") {
  const text = String(value == null ? "" : value).trim();
  return text || fallback;
}

function clamp(number, min, max) {
  return Math.max(min, Math.min(max, number));
}

function buildPrompt(body) {
  const title = clean(body.title, "Untitled Song");
  const style = clean(body.style, "original contemporary production");
  const mode = clean(body.mode, "Create Full Song");
  const vocalStyle = clean(body.vocalStyle, "Use My Voice");
  const beat = clean(body.beat, "No beat selected");
  const lyrics = clean(body.lyrics);

  const parts = [
    `Create a polished music track for a fictional game recording studio called Music City Estates.`,
    `Song title: ${title}.`,
    `Style: ${style}.`,
    `Creation mode: ${mode}.`,
    `Vocal direction: ${vocalStyle}.`,
    `Beat selection/reference label: ${beat}.`,
    "Use an original composition and arrangement."
  ];

  if (lyrics) {
    parts.push(`Lyrics or creative direction:\n${lyrics}`);
  }

  return parts.join("\n").slice(0, 4000);
}

module.exports = async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error:
        "ElevenLabs is not connected yet. Add ELEVENLABS_API_KEY to the secure server environment."
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
      error: "This endpoint currently supports the ElevenLabs provider only."
    });
  }

  const maxConfigured = Number(process.env.MUSIC_CITY_MAX_MUSIC_MS || 15000);
  const maxMusicMs = clamp(
    Number.isFinite(maxConfigured) ? maxConfigured : 15000,
    3000,
    30000
  );

  const requestedLength = Number(body.musicLengthMs || 12000);
  const musicLengthMs = clamp(
    Number.isFinite(requestedLength) ? requestedLength : 12000,
    3000,
    maxMusicMs
  );

  const mode = clean(body.mode);
  const vocalStyle = clean(body.vocalStyle);
  const forceInstrumental =
    /instrumental/i.test(mode) || /instrumental/i.test(vocalStyle);

  const elevenLabsResponse = await fetch(
    "https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey
      },
      body: JSON.stringify({
        prompt: buildPrompt(body),
        music_length_ms: musicLengthMs,
        model_id: "music_v2",
        force_instrumental: forceInstrumental
      })
    }
  );

  if (!elevenLabsResponse.ok) {
    let providerMessage = "";
    try {
      providerMessage = (await elevenLabsResponse.text()).slice(0, 500);
    } catch (error) {
      providerMessage = "";
    }

    console.error(
      "ElevenLabs Music request failed",
      elevenLabsResponse.status,
      providerMessage
    );

    return res.status(elevenLabsResponse.status).json({
      error:
        elevenLabsResponse.status === 401 ||
        elevenLabsResponse.status === 403
          ? "ElevenLabs rejected the secure API credentials."
          : "ElevenLabs could not generate this music preview."
    });
  }

  const audioBuffer = Buffer.from(await elevenLabsResponse.arrayBuffer());
  const songId = elevenLabsResponse.headers.get("song-id") || "";

  res.statusCode = 200;
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Content-Length", String(audioBuffer.length));
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Disposition", 'inline; filename="music-city-preview.mp3"');
  res.setHeader("X-Music-City-Provider", "elevenlabs");
  if (songId) {
    res.setHeader("X-Music-City-Song-Id", songId);
  }

  return res.end(audioBuffer);
};
