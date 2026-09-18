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
      live: false,
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

  let backendEndpoint = "";

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
      audioAttached: Boolean(request.audioAttached)
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

  async function generateThroughBackend(request) {
    if (!backendEndpoint) {
      throw new Error(
        "This provider needs the Music City secure backend. " +
        "The interface is ready, but no backend endpoint is configured yet."
      );
    }

    const response = await fetch(backendEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request)
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = {};
    }

    if (!response.ok) {
      throw new Error(
        payload && payload.error
          ? payload.error
          : "Music generation request failed."
      );
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
