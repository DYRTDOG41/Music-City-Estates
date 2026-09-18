/* Music City Estates - AI Studio Engine
 *
 * Browser-side orchestration only. NEVER place provider API keys in this file.
 * Real AI providers must be called through a secure backend endpoint.
 */
(function (global) {
  "use strict";

  const providers = {
    demo: {
      id: "demo",
      name: "Music City Demo Engine",
      live: true,
      requiresBackend: false
    },
    elevenlabs: {
      id: "elevenlabs",
      name: "ElevenLabs Music",
      live: true,
      requiresBackend: true
    },
    "stable-audio": {
      id: "stable-audio",
      name: "Stable Audio",
      live: false,
      requiresBackend: true
    },
    "google-lyria": {
      id: "google-lyria",
      name: "Google Lyria",
      live: false,
      requiresBackend: true
    },
    partner: {
      id: "partner",
      name: "Partner API (Suno / MyTunes)",
      live: false,
      requiresBackend: true
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

  let backendEndpoint =
    String(
      global.MUSIC_CITY_AI_BACKEND ||
      storedEndpoint ||
      DEFAULT_BACKEND_ENDPOINT
    ).trim();

  const queryBackend =
    new URLSearchParams(global.location.search).get("aiBackend");

  if (queryBackend && /^https?:\/\//i.test(queryBackend)) {
    backendEndpoint = queryBackend.trim();
    try {
      localStorage.setItem("musicCityAIBackend", backendEndpoint);
    } catch (error) {
      // Storage is optional. The current page can still use the endpoint.
    }
  }

  function clean(value, fallback) {
    const text = String(value == null ? "" : value).trim();
    return text || fallback || "";
  }

  function makeId(prefix) {
    return (prefix || "mce") + "-" + Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 8);
  }

  function normalizeRequest(input) {
    const request = input || {};
    return {
      provider: clean(request.provider, "demo"),
      title: clean(request.title, "Untitled Song"),
      lyrics: clean(request.lyrics),
      style: clean(request.style, "Original Style"),
      mode: clean(request.mode, "Create Full Song"),
      vocalStyle: clean(request.vocalStyle, "Use My Voice"),
      creativity: Number(request.creativity || 50),
      influence: Number(request.influence || 50),
      studio: clean(request.studio, "begenius"),
      beat: clean(request.beat, "No beat selected"),
      audioAttached: Boolean(request.audioAttached),
      musicLengthMs: Number(request.musicLengthMs || 12000),
      referenceSongId: clean(request.referenceSongId),
      referenceDurationMs: Number(request.referenceDurationMs || 0)
    };
  }

  async function generateDemo(request) {
    await new Promise(resolve => setTimeout(resolve, 700));

    return {
      id: makeId("demo"),
      provider: "demo",
      providerName: providers.demo.name,
      status: "demo-ready",
      title: request.title,
      summary:
        request.style + " • " +
        request.mode + " • " +
        request.vocalStyle,
      beat: request.beat,
      audioUrl: null,
      message:
        "Music City created the production job successfully. " +
        "Demo mode does not generate provider audio yet.",
      createdAt: new Date().toISOString()
    };
  }

  async function readError(response) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      try {
        const payload = await response.json();
        return payload && payload.error
          ? payload.error
          : "Music generation request failed.";
      } catch (error) {
        return "Music generation request failed.";
      }
    }

    try {
      const message = (await response.text()).trim();
      return message || "Music generation request failed.";
    } catch (error) {
      return "Music generation request failed.";
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
      throw new Error("Music City secure backend is not connected.");
    }

    if (!(blob instanceof Blob) || !blob.size) {
      throw new Error("Record or upload an audio reference first.");
    }

    if (blob.size > 5 * 1024 * 1024) {
      throw new Error("Reference audio must be 5 MB or smaller.");
    }

    const config = options || {};
    const audioBase64 = await blobToBase64(blob);
    const response = await fetch(referenceEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        audioBase64,
        mimeType: clean(blob.type, "audio/webm"),
        filename: clean(config.filename, "music-city-reference.webm")
      })
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    const payload = await response.json();

    if (!payload || !payload.songId) {
      throw new Error("Music City did not receive a reference song ID.");
    }

    return payload;
  }

  async function generateThroughBackend(request) {
    if (!backendEndpoint) {
      throw new Error(
        "This provider needs the Music City secure backend. " +
        "The backend code is ready, but its live URL has not been connected yet."
      );
    }

    const response = await fetch(backendEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.startsWith("audio/")) {
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const songId =
        response.headers.get("x-music-city-song-id") || makeId("song");

      return {
        id: songId,
        provider: request.provider,
        providerName:
          (providers[request.provider] && providers[request.provider].name) ||
          request.provider,
        status: "audio-ready",
        title: request.title,
        summary: request.style,
        beat: request.beat,
        audioUrl: audioUrl,
        message:
          "Music City generated a live AI music preview. " +
          "Play it below.",
        createdAt: new Date().toISOString()
      };
    }

    let payload = {};
    try {
      payload = await response.json();
    } catch (error) {
      payload = {};
    }

    return {
      id: payload.id || makeId("job"),
      provider: request.provider,
      providerName:
        (providers[request.provider] && providers[request.provider].name) ||
        request.provider,
      status: payload.status || "submitted",
      title: payload.title || request.title,
      summary: payload.summary || request.style,
      beat: payload.beat || request.beat,
      audioUrl: payload.audioUrl || null,
      message: payload.message || "Generation submitted.",
      createdAt: payload.createdAt || new Date().toISOString()
    };
  }

  const api = {
    configure(options) {
      const config = options || {};
      if (typeof config.backendEndpoint === "string") {
        backendEndpoint = config.backendEndpoint.trim();
        try {
          if (backendEndpoint) {
            localStorage.setItem("musicCityAIBackend", backendEndpoint);
          } else {
            localStorage.removeItem("musicCityAIBackend");
          }
        } catch (error) {
          // Storage is optional.
        }
      }
      return this.getStatus();
    },

    getProviders() {
      return Object.keys(providers).map(key => ({ ...providers[key] }));
    },

    getStatus() {
      return {
        backendConnected: Boolean(backendEndpoint),
        backendEndpoint: backendEndpoint || null,
        providers: this.getProviders()
      };
    },

    async uploadReference(blob, options) {
      return uploadReference(blob, options);
    },

    async generate(input) {
      const request = normalizeRequest(input);
      if (!providers[request.provider]) {
        throw new Error("Unknown AI provider: " + request.provider);
      }

      if (request.provider === "demo") {
        return generateDemo(request);
      }

      return generateThroughBackend(request);
    }
  };

  global.MusicCityAI = api;
})(window);
