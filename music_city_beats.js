(function(root){
  "use strict";

  // Persistent Music City Originals live here.
  // Add same-origin audio files (MP3/WAV/M4A) and one catalog entry per beat.
  // Example:
  // {
  //   title: "Night Shift",
  //   src: "beats/night-shift.mp3",
  //   genre: "Hip-Hop",
  //   mood: "Dark / Melodic",
  //   bpm: 92,
  //   producer: "Music City Estates",
  //   source: "Suno original"
  // }

  root.MusicCityBeatCatalog = [];
  root.MusicCityBeatCatalogVersion = 1;
})(typeof window !== "undefined" ? window : globalThis);
