(function(root){
  "use strict";

  // Music City Estates soundtrack / station rotation.
  // Use tracks here only when Music City has permission to play them.
  root.MusicCitySoundtrackCatalog = [
    {
      id:"organ-donor",
      title:"Organ Donor",
      artist:"willwill3515",
      instrumental:true,
      source:"Artist-provided instrumental",
      src:"https://music-city-radio-assets.floot.app/_cdn/static/f70669ce-7e4a-43ad-8321-5dc11147744b-organ-donor.mp3",
      zones:["all"]
    }
  ];

  // Load the shared Music City realtime layer once on every game page that
  // already uses the global soundtrack catalog. The realtime UI stays
  // collapsed until the player opens LIVE, so it does not cover gameplay.
  if (root.document && !document.querySelector('script[data-mce-realtime-loader]')) {
    var script = document.createElement('script');
    script.src = 'music_city_realtime.js?v=realtime-1';
    script.async = true;
    script.dataset.mceRealtimeLoader = '1';
    document.head.appendChild(script);
  }
})(window);
