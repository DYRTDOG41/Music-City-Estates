/* Music City Estates - ElevenLabs-only Studio Engine
 *
 * All AI generation routes through Music City's secure backend.
 * ELEVENLABS_API_KEY must never be placed in browser code.
 */
(function (global) {
  "use strict";

  const providers = {
    elevenlabs: {
      id: "elevenlabs",
      name: "ElevenLabs Music v2.5",
      live: true,
      requiresBackend: true,
      output: "music",
      description: "Music City Estates studio AI engine."
    }
  };

  const DEFAULT_BACKEND_ENDPOINT =
    "https://music-city-estates-api-willwill3515-5514s-projects.vercel.app/api/music/generate";

  const storedEndpoint = (() => {
    try {
      return localStorage.getItem("musicCityAIBackend") || "";
    } catch (error) {
      return "";
    }
  })();

  let backendEndpoint = String(
    global.MUSIC_CITY_AI_BACKEND ||
    storedEndpoint ||
    DEFAULT_BACKEND_ENDPOINT
  ).trim();

  const queryBackend = new URLSearchParams(global.location.search).get("aiBackend");
  if (queryBackend && /^https?:\/\//i.test(queryBackend)) {
    backendEndpoint = queryBackend.trim();
    try {
      localStorage.setItem("musicCityAIBackend", backendEndpoint);
    } catch (error) {}
  }

  function clean(value, fallback) {
    const text = String(value == null ? "" : value).trim();
    return text || fallback || "";
  }

  function clamp(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback == null ? min : fallback;
    return Math.max(min, Math.min(max, number));
  }

  function makeId(prefix) {
    return (prefix || "mce") + "-" + Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 8);
  }

  function normalizeRequest(input) {
    const request = input || {};
    return {
      provider: "elevenlabs",
      title: clean(request.title, "Untitled Song"),
      lyrics: clean(request.lyrics),
      style: clean(request.style, "Original Style"),
      mode: clean(request.mode, "Generate Instrumental"),
      vocalStyle: clean(request.vocalStyle, "Instrumental Only"),
      creativity: clamp(request.creativity, 0, 100, 50),
      influence: clamp(request.influence, 0, 100, 50),
      studio: clean(request.studio, "begenius"),
      beat: clean(request.beat, "No beat selected"),
      audioAttached: Boolean(request.audioAttached),
      musicLengthMs: clamp(request.musicLengthMs, 3000, 30000, 12000),
      referenceSongId: clean(request.referenceSongId),
      referenceDurationMs: clamp(request.referenceDurationMs, 0, 30000, 0),
      bpm: clamp(request.bpm, 0, 200, 0),
      key: clean(request.key, "Auto"),
      variationSeed: Number(request.variationSeed || 0)
    };
  }

  async function readError(response) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        const payload = await response.json();
        return payload && payload.error
          ? payload.error
          : "ElevenLabs music request failed.";
      } catch (error) {
        return "ElevenLabs music request failed.";
      }
    }
    try {
      return (await response.text()).trim() || "ElevenLabs music request failed.";
    } catch (error) {
      return "ElevenLabs music request failed.";
    }
  }

  function referenceEndpoint() {
    return backendEndpoint.replace(/\/generate\/?$/i, "/reference");
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const value = String(reader.result || "");
        const comma = value.indexOf(",");
        resolve(comma >= 0 ? value.slice(comma + 1) : value);
      };
      reader.onerror = () => reject(
        new Error("Music City could not read the reference audio.")
      );
      reader.readAsDataURL(blob);
    });
  }

  async function uploadReference(blob, options) {
    if (!backendEndpoint) {
      throw new Error("Music City secure ElevenLabs backend is not configured.");
    }
    if (!(blob instanceof Blob) || !blob.size) {
      throw new Error("Record or upload an audio reference first.");
    }
    if (blob.size > 3 * 1024 * 1024) {
      throw new Error("Reference audio must be 3 MB or smaller.");
    }

    const config = options || {};
    const audioBase64 = await blobToBase64(blob);
    const response = await fetch(referenceEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audioBase64,
        mimeType: clean(blob.type, "audio/webm"),
        filename: clean(config.filename, "music-city-reference.webm")
      })
    });

    if (!response.ok) throw new Error(await readError(response));
    const payload = await response.json();
    if (!payload || !payload.songId) {
      throw new Error("ElevenLabs did not return a reference song ID.");
    }
    return payload;
  }

  async function generateThroughBackend(request) {
    if (!backendEndpoint) {
      throw new Error("Music City secure ElevenLabs backend is not configured.");
    }

    const response = await fetch(backendEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request)
    });

    if (!response.ok) throw new Error(await readError(response));

    const contentType = response.headers.get("content-type") || "";
    if (contentType.startsWith("audio/")) {
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const songId = response.headers.get("x-music-city-song-id") || makeId("song");

      return {
        id: songId,
        provider: "elevenlabs",
        providerName: providers.elevenlabs.name,
        status: "audio-ready",
        title: request.title,
        summary: request.style,
        beat: "",
        bpm: request.bpm || 0,
        key: request.key,
        audioUrl,
        audioBlob: blob,
        message: "ElevenLabs audio is ready for the Music City session.",
        createdAt: new Date().toISOString()
      };
    }

    let payload = {};
    try { payload = await response.json(); } catch (error) {}

    return {
      id: payload.id || makeId("job"),
      provider: "elevenlabs",
      providerName: providers.elevenlabs.name,
      status: payload.status || "submitted",
      title: payload.title || request.title,
      summary: payload.summary || request.style,
      beat: payload.beat || "",
      bpm: payload.bpm || request.bpm || 0,
      key: payload.key || request.key,
      audioUrl: payload.audioUrl || null,
      message: payload.message || "ElevenLabs generation submitted.",
      createdAt: payload.createdAt || new Date().toISOString()
    };
  }

  const api = {
    configure(options) {
      const config = options || {};
      if (typeof config.backendEndpoint === "string") {
        backendEndpoint = config.backendEndpoint.trim();
        try {
          if (backendEndpoint) localStorage.setItem("musicCityAIBackend", backendEndpoint);
          else localStorage.removeItem("musicCityAIBackend");
        } catch (error) {}
      }
      return this.getStatus();
    },

    getProviders() {
      return [{ ...providers.elevenlabs }];
    },

    getStatus() {
      return {
        backendConfigured: Boolean(backendEndpoint),
        backendConnected: Boolean(backendEndpoint),
        backendEndpoint: backendEndpoint || null,
        providers: this.getProviders()
      };
    },

    async uploadReference(blob, options) {
      return uploadReference(blob, options);
    },

    async generate(input) {
      return generateThroughBackend(normalizeRequest(input));
    }
  };

  global.MusicCityAI = api;
})(window);
