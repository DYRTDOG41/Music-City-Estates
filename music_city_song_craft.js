(function (root) {
  "use strict";

  var TIERS = [
    { min: 85, id: "signature", label: "Signature Record", short: "SIGNATURE" },
    { min: 70, id: "standout", label: "Standout", short: "STANDOUT" },
    { min: 55, id: "artist-driven", label: "Artist-Driven", short: "ARTIST-DRIVEN" },
    { min: 35, id: "developing", label: "Developing", short: "DEVELOPING" },
    { min: 0, id: "quick-draft", label: "Quick Draft", short: "QUICK DRAFT" }
  ];

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function wordCount(text) {
    var cleaned = clean(text);
    if (!cleaned) return 0;
    return cleaned.split(/\s+/).filter(Boolean).length;
  }

  function uniqueWordCount(text) {
    var words = clean(text)
      .toLowerCase()
      .replace(/[^a-z0-9'\-\s]/g, " ")
      .split(/\s+/)
      .filter(function (word) { return word.length > 2; });
    return new Set(words).size;
  }

  function tierFor(score) {
    for (var i = 0; i < TIERS.length; i++) {
      if (score >= TIERS[i].min) return TIERS[i];
    }
    return TIERS[TIERS.length - 1];
  }

  function scoreSong(input) {
    var data = input && typeof input === "object" ? input : {};
    var lyrics = clean(data.lyrics);
    var style = clean(data.style);
    var title = clean(data.title);
    var lyricWords = wordCount(lyrics);
    var lyricUnique = uniqueWordCount(lyrics);
    var styleWords = wordCount(style);
    var revisionCount = clamp(Number(data.revisionCount || 0), 0, 20);
    var referenceSeconds = clamp(Number(data.referenceDurationMs || 0) / 1000, 0, 30);
    var originalLyrics = Boolean(data.originalLyricsConfirmed);
    var hasReference = Boolean(data.audioAttached);
    var beatSelected = Boolean(clean(data.beat));
    var creativity = Number(data.creativity == null ? 50 : data.creativity);
    var influence = Number(data.influence == null ? 50 : data.influence);

    var authorship = 0;
    if (originalLyrics) {
      authorship += 12;
      if (lyricWords >= 16) authorship += 4;
      if (lyricWords >= 40) authorship += 5;
      if (lyricWords >= 80) authorship += 4;
      if (lyricUnique >= 25) authorship += 3;
      if (/\n/.test(lyrics)) authorship += 2;
    } else if (lyricWords >= 20) {
      authorship += 4;
    }
    authorship = clamp(authorship, 0, 30);

    var performance = 0;
    if (hasReference) {
      performance += 10;
      if (referenceSeconds >= 5) performance += 3;
      if (referenceSeconds >= 12) performance += 4;
      if (clean(data.mode) === "Use Recording as Reference") performance += 3;
    }
    performance = clamp(performance, 0, 20);

    var direction = 0;
    if (title && !/^untitled song$/i.test(title)) direction += 2;
    if (styleWords >= 2) direction += 4;
    if (styleWords >= 5) direction += 4;
    if (uniqueWordCount(style) >= 5) direction += 3;
    if (beatSelected) direction += 4;
    if (Math.abs(creativity - 50) >= 10) direction += 1;
    if (Math.abs(influence - 50) >= 10) direction += 1;
    if (clean(data.vocalStyle) && clean(data.vocalStyle) !== "AI Generated Vocal") direction += 1;
    direction = clamp(direction, 0, 20);

    var revision = 0;
    if (revisionCount >= 1) revision = 6;
    if (revisionCount >= 2) revision = 12;
    if (revisionCount >= 3) revision = 17;
    if (revisionCount >= 4) revision = 20;

    var intentionalitySignals = 0;
    if (originalLyrics) intentionalitySignals += 1;
    if (hasReference) intentionalitySignals += 1;
    if (beatSelected) intentionalitySignals += 1;
    if (styleWords >= 4) intentionalitySignals += 1;
    if (revisionCount >= 1) intentionalitySignals += 1;

    var intentionality = intentionalitySignals * 2;

    var score = clamp(
      Math.round(authorship + performance + direction + revision + intentionality),
      0,
      100
    );

    var tier = tierFor(score);
    var nextSteps = [];

    if (authorship < 18) {
      nextSteps.push(
        originalLyrics
          ? "Develop the lyrics further: add more specific lines, structure, or personal detail."
          : "Write or substantially rewrite your own lyrics, then mark them as artist-written."
      );
    }
    if (performance < 12) {
      nextSteps.push("Record a vocal, melody, cadence, or performance reference so the AI has more of you to work from.");
    }
    if (direction < 14) {
      nextSteps.push("Give more specific production direction: mood, instrumentation, era, tempo feel, vocal treatment, or beat choice.");
    }
    if (revision < 12) {
      nextSteps.push("Do another intentional revision pass instead of accepting the first generation.");
    }
    if (!nextSteps.length) {
      nextSteps.push("The creative process is strong. Focus the next pass on taste: arrangement, performance details, and what makes the record unmistakably yours.");
    }

    return {
      score: score,
      tier: tier.label,
      tierId: tier.id,
      tierShort: tier.short,
      breakdown: {
        authorship: authorship,
        performance: performance,
        direction: direction,
        revision: revision,
        intentionality: intentionality
      },
      maxima: {
        authorship: 30,
        performance: 20,
        direction: 20,
        revision: 20,
        intentionality: 10
      },
      signals: {
        originalLyricsConfirmed: originalLyrics,
        lyricWordCount: lyricWords,
        lyricUniqueWordCount: lyricUnique,
        audioAttached: hasReference,
        referenceSeconds: Math.round(referenceSeconds),
        beatSelected: beatSelected,
        revisionCount: revisionCount
      },
      nextSteps: nextSteps,
      note: "Craft Score measures creative input and process signals. It is not an AI detector and it does not claim to objectively measure musical taste."
    };
  }

  root.MusicCitySongCraft = {
    TIERS: TIERS,
    scoreSong: scoreSong,
    tierFor: tierFor
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = root.MusicCitySongCraft;
  }
})(typeof window !== "undefined" ? window : globalThis);
