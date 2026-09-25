/* Music City Estates - ElevenLabs Studio Engine
 *
 * ElevenLabs is the studio's only AI provider.
 * The browser sends session inputs to Music City's secure backend;
 * ELEVENLABS_API_KEY never appears in client code.
 *
 * NEVER place provider API keys in this file.
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
      description: "The only AI generation engine used by Music City Estates studio."
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

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function makeId(prefix) {
    return (prefix || "mce") + "-" + Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 8);
  }

  function hashText(text) {
    let hash = 2166136261;
    const input = String(text || "");
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function createRandom(seed) {
    let value = seed >>> 0 || 1;
    return function () {
      value += 0x6D2B79F5;
      let t = value;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function normalizeRequest(input) {
    const request = input || {};
    let provider = clean(request.provider, "elevenlabs");
    if (provider !== "elevenlabs") provider = "elevenlabs";

    return {
      provider,
      title: clean(request.title, "Untitled Song"),
      lyrics: clean(request.lyrics),
      style: clean(request.style, "Original Style"),
      mode: clean(request.mode, "Generate Instrumental"),
      vocalStyle: clean(request.vocalStyle, "Instrumental Only"),
      creativity: clamp(request.creativity || 50, 0, 100),
      influence: clamp(request.influence || 50, 0, 100),
      studio: clean(request.studio, "begenius"),
      beat: clean(request.beat, "No beat selected"),
      audioAttached: Boolean(request.audioAttached),
      musicLengthMs: clamp(request.musicLengthMs || 12000, 4000, 30000),
      referenceSongId: clean(request.referenceSongId),
      referenceDurationMs: Number(request.referenceDurationMs || 0),
      bpm: clamp(request.bpm || 0, 0, 200),
      key: clean(request.key, "Auto"),
      variationSeed: Number(request.variationSeed || 0)
    };
  }

  function inferBpm(request) {
    if (request.bpm >= 60) return Math.round(request.bpm);
    const style = request.style.toLowerCase();
    if (/drill|trap|rage/.test(style)) return 142;
    if (/r&b|rnb|soul|slow/.test(style)) return 78;
    if (/afro|amapiano/.test(style)) return 104;
    if (/latin|reggaeton/.test(style)) return 96;
    if (/pop|dance/.test(style)) return 118;
    if (/boom bap|boom-bap/.test(style)) return 92;
    return 90;
  }

  function noteFromKey(key, seed) {
    const notes = {
      "C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5,
      "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11
    };
    const match = String(key || "").match(/^([A-G](?:#)?)/i);
    if (match) {
      const normalized = match[1].charAt(0).toUpperCase() + match[1].slice(1);
      if (Object.prototype.hasOwnProperty.call(notes, normalized)) return notes[normalized];
    }
    return seed % 12;
  }

  function frequencyForMidi(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function createNoiseBuffer(context, seconds, random) {
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = random() * 2 - 1;
    return buffer;
  }

  function envelope(gain, start, peak, attack, release, endFloor) {
    const floor = endFloor || 0.0001;
    gain.gain.setValueAtTime(floor, start);
    gain.gain.linearRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(floor, start + attack + release);
  }

  function scheduleKick(context, destination, time, strong) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(strong ? 150 : 122, time);
    osc.frequency.exponentialRampToValueAtTime(44, time + 0.16);
    envelope(gain, time, strong ? 0.86 : 0.68, 0.002, 0.22);
    osc.connect(gain).connect(destination);
    osc.start(time);
    osc.stop(time + 0.25);
  }

  function scheduleNoiseHit(context, destination, noiseBuffer, time, kind, energy) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = noiseBuffer;
    filter.type = kind === "snare" ? "bandpass" : "highpass";
    filter.frequency.value = kind === "snare" ? 1750 : 6800;
    filter.Q.value = kind === "snare" ? 0.7 : 0.35;
    const peak = kind === "snare" ? 0.26 + energy * 0.12 : 0.055 + energy * 0.055;
    envelope(gain, time, peak, 0.001, kind === "snare" ? 0.12 : 0.04);
    source.connect(filter).connect(gain).connect(destination);
    source.start(time);
    source.stop(time + 0.15);
  }

  function scheduleBass(context, destination, time, midi, duration, energy, glideTo) {
    const osc = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    osc.type = "sine";
    const startFrequency = frequencyForMidi(midi);
    osc.frequency.setValueAtTime(startFrequency, time);
    if (glideTo != null) {
      osc.frequency.exponentialRampToValueAtTime(frequencyForMidi(glideTo), time + Math.min(duration * 0.65, 0.35));
    }
    filter.type = "lowpass";
    filter.frequency.value = 240 + energy * 260;
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.24 + energy * 0.12, time + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(filter).connect(gain).connect(destination);
    osc.start(time);
    osc.stop(time + duration + 0.03);
  }

  function schedulePadChord(context, destination, time, midiRoot, duration, brightness) {
    const chord = [0, 3, 7];
    chord.forEach(function (offset, index) {
      const osc = context.createOscillator();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      osc.type = index === 0 ? "triangle" : "sine";
      osc.frequency.value = frequencyForMidi(midiRoot + offset + 12);
      filter.type = "lowpass";
      filter.frequency.value = 850 + brightness * 1800;
      filter.Q.value = 0.55;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.04 + brightness * 0.025, time + 0.12);
      gain.gain.setValueAtTime(0.04 + brightness * 0.025, Math.max(time + 0.13, time + duration - 0.18));
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      osc.connect(filter).connect(gain).connect(destination);
      osc.start(time);
      osc.stop(time + duration + 0.02);
    });
  }

  function schedulePluck(context, destination, time, midi, brightness) {
    const osc = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    osc.type = brightness > 0.55 ? "triangle" : "sine";
    osc.frequency.value = frequencyForMidi(midi + 12);
    filter.type = "lowpass";
    filter.frequency.value = 1200 + brightness * 4200;
    filter.Q.value = 1.1;
    envelope(gain, time, 0.045 + brightness * 0.035, 0.006, 0.19);
    osc.connect(filter).connect(gain).connect(destination);
    osc.start(time);
    osc.stop(time + 0.23);
  }

  function audioBufferToWave(buffer) {
    const channelCount = Math.min(2, buffer.numberOfChannels);
    const sampleCount = buffer.length;
    const output = new ArrayBuffer(44 + sampleCount * channelCount * 2);
    const view = new DataView(output);
    let offset = 0;
    const writeText = function (text) {
      for (let i = 0; i < text.length; i += 1) view.setUint8(offset++, text.charCodeAt(i));
    };
    const write16 = function (value) {
      view.setUint16(offset, value, true);
      offset += 2;
    };
    const write32 = function (value) {
      view.setUint32(offset, value, true);
      offset += 4;
    };

    writeText("RIFF");
    write32(36 + sampleCount * channelCount * 2);
    writeText("WAVEfmt ");
    write32(16);
    write16(1);
    write16(channelCount);
    write32(buffer.sampleRate);
    write32(buffer.sampleRate * channelCount * 2);
    write16(channelCount * 2);
    write16(16);
    writeText("data");
    write32(sampleCount * channelCount * 2);

    const channels = [];
    for (let channel = 0; channel < channelCount; channel += 1) {
      channels.push(buffer.getChannelData(channel));
    }

    for (let sample = 0; sample < sampleCount; sample += 1) {
      for (let channel = 0; channel < channelCount; channel += 1) {
        const value = Math.max(-1, Math.min(1, channels[channel][sample]));
        view.setInt16(offset, value < 0 ? value * 32768 : value * 32767, true);
        offset += 2;
      }
    }

    return new Blob([output], { type: "audio/wav" });
  }

  async function generateNativeInstrumental(request) {
    const OfflineContext = global.OfflineAudioContext || global.webkitOfflineAudioContext;
    if (!OfflineContext) {
      throw new Error("This browser cannot render the Music City native instrumental engine.");
    }

    const seconds = Math.max(4, Math.min(15, request.musicLengthMs / 1000));
    const sampleRate = 44100;
    const frameCount = Math.ceil(seconds * sampleRate);
    const context = new OfflineContext(2, frameCount, sampleRate);

    const seed = hashText(
      request.title + "|" + request.style + "|" + request.key + "|" +
      request.creativity + "|" + request.influence + "|" + request.variationSeed
    );
    const random = createRandom(seed);
    const bpm = inferBpm(request);
    const rootIndex = noteFromKey(request.key, seed);
    const quarter = 60 / bpm;
    const sixteenth = quarter / 4;
    const energy = clamp(request.creativity / 100, 0.15, 1);
    const brightness = clamp(request.influence / 100, 0.1, 1);
    const style = request.style.toLowerCase();

    const master = context.createGain();
    master.gain.value = 0.84;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.22;
    master.connect(compressor).connect(context.destination);

    const drumBus = context.createGain();
    const bassBus = context.createGain();
    const musicBus = context.createGain();
    drumBus.gain.value = 0.92;
    bassBus.gain.value = 0.78;
    musicBus.gain.value = 0.72;
    drumBus.connect(master);
    bassBus.connect(master);
    musicBus.connect(master);

    const noiseBuffer = createNoiseBuffer(context, 0.18, random);
    const progression = [0, -3, -5, -2];
    const minorScale = [0, 3, 5, 7, 10, 12];
    const totalSteps = Math.ceil(seconds / sixteenth);
    const isTrap = /trap|drill|rage/.test(style);
    const isRnB = /r&b|rnb|soul/.test(style);
    const isAfro = /afro|amapiano/.test(style);

    for (let step = 0; step < totalSteps; step += 1) {
      const time = step * sixteenth;
      const pattern = step % 16;
      const bar = Math.floor(step / 16);
      const chordOffset = progression[bar % progression.length];
      const bassMidi = 36 + rootIndex + chordOffset;

      let kick = pattern === 0 || pattern === 8;
      if (isTrap && (pattern === 3 || pattern === 11 || (bar % 2 && pattern === 14))) kick = true;
      if (isRnB && pattern === 10) kick = true;
      if (isAfro && (pattern === 6 || pattern === 14)) kick = true;
      if (kick) scheduleKick(context, drumBus, time, pattern === 0);

      if (pattern === 4 || pattern === 12) {
        scheduleNoiseHit(context, drumBus, noiseBuffer, time, "snare", energy);
      }

      const hatEvery = isTrap ? 2 : isRnB ? 4 : 2;
      if (pattern % hatEvery === 0 || (isTrap && pattern >= 12 && pattern % 2 === 1 && energy > 0.55)) {
        scheduleNoiseHit(context, drumBus, noiseBuffer, time, "hat", energy);
      }

      if (pattern % 4 === 0) {
        const nextOffset = progression[(bar + (pattern >= 12 ? 1 : 0)) % progression.length];
        const glide = isTrap && pattern === 12 && energy > 0.6
          ? 36 + rootIndex + nextOffset
          : null;
        scheduleBass(context, bassBus, time, bassMidi, Math.min(quarter * 0.92, seconds - time), energy, glide);
      }

      if (pattern === 0) {
        schedulePadChord(
          context,
          musicBus,
          time,
          48 + rootIndex + chordOffset,
          Math.min(quarter * 4, seconds - time),
          brightness
        );
      }

      const melodyChance = isRnB ? 0.38 : isTrap ? 0.28 : 0.33;
      if (pattern % 2 === 0 && random() < melodyChance * (0.6 + energy * 0.8)) {
        const interval = minorScale[Math.floor(random() * minorScale.length)];
        schedulePluck(
          context,
          musicBus,
          time + sixteenth * (random() > 0.72 ? 0.45 : 0),
          60 + rootIndex + chordOffset + interval,
          brightness
        );
      }
    }

    const rendered = await context.startRendering();
    const blob = audioBufferToWave(rendered);
    const audioUrl = URL.createObjectURL(blob);

    return {
      id: makeId("native"),
      provider: "music-city-native",
      providerName: providers["music-city-native"].name,
      status: "instrumental-ready",
      title: request.title,
      summary: request.style + " • " + bpm + " BPM • " + request.key,
      beat: "",
      bpm,
      key: request.key,
      audioUrl,
      audioBlob: blob,
      message:
        "Music City Native generated an instrumental inside the app and loaded real audio. " +
        "This is the self-contained prototype engine; a fine-tuned model can replace it later without changing the studio workflow.",
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
      throw new Error("Music City secure backend is not configured.");
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
      throw new Error("Music City did not receive a reference song ID.");
    }
    return payload;
  }

  async function generateThroughBackend(request) {
    if (!backendEndpoint) {
      throw new Error("This provider needs the Music City secure backend.");
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
        provider: request.provider,
        providerName: (providers[request.provider] && providers[request.provider].name) || request.provider,
        status: "audio-ready",
        title: request.title,
        summary: request.style,
        beat: "",
        bpm: request.bpm || 0,
        key: request.key,
        audioUrl,
        audioBlob: blob,
        message: "Music City received live provider audio and it is ready for Track 01.",
        createdAt: new Date().toISOString()
      };
    }

    let payload = {};
    try {
      payload = await response.json();
    } catch (error) {}

    return {
      id: payload.id || makeId("job"),
      provider: request.provider,
      providerName: (providers[request.provider] && providers[request.provider].name) || request.provider,
      status: payload.status || "submitted",
      title: payload.title || request.title,
      summary: payload.summary || request.style,
      beat: payload.beat || "",
      bpm: payload.bpm || request.bpm || 0,
      key: payload.key || request.key,
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
          if (backendEndpoint) localStorage.setItem("musicCityAIBackend", backendEndpoint);
          else localStorage.removeItem("musicCityAIBackend");
        } catch (error) {}
      }
      return this.getStatus();
    },

    getProviders() {
      return Object.keys(providers).map(key => ({ ...providers[key] }));
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
      const request = normalizeRequest(input);
      if (!providers[request.provider]) {
        throw new Error("Unknown AI provider: " + request.provider);
      }

      return generateThroughBackend(request);
    }
  };

  global.MusicCityAI = api;
})(window);
